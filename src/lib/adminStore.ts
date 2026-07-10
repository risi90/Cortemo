import type { CartItem } from './cart'
import { PRICING } from '../data/configuratorSchema'
import { supabase, hasBackend } from './supabase'

/**
 * Beheerdata voor admin, shop en B2B-portal. Elke functie werkt in twee
 * standen: met geconfigureerde Supabase-backend praat hij met de database
 * (en spiegelt naar localStorage als cache), zonder backend draait alles
 * volledig op localStorage zodat de site altijd blijft werken.
 */

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage may be unavailable */
  }
}


/**
 * Vuur-en-vergeet naar de database. PostgREST-queries zijn lazy (ze vuren
 * pas bij .then/await), dus expliciet uitvoeren; fouten negeren we omdat
 * localStorage de bron van waarheid blijft tot de volgende fetch.
 */
function fire(query: PromiseLike<unknown> | undefined) {
  void query?.then(undefined, () => {})
}

export { hasBackend }

/* ---------- catalogus ---------- */

export type DbProduct = {
  id: string
  group_id: string
  sub: string
  name: string
  dims: string
  img: string
  price: number
  descr: string
  variants: [string, number][]
  options: [string, number][]
  leadtime: string
  stock: number | null
}

export async function fetchDbProducts(): Promise<DbProduct[] | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('cortemo_products')
    .select('*')
    .order('sort', { ascending: true })
  if (error || !data?.length) return null
  return data as DbProduct[]
}

export async function updateProduct(
  id: string,
  patch: Partial<Pick<DbProduct, 'name' | 'price' | 'descr'>>,
): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('cortemo_products').update(patch).eq('id', id)
  return !error
}

/** Upload een productfoto naar Supabase Storage en geef de publieke URL terug. */
export async function uploadProductImage(
  file: File,
  folder = 'products',
): Promise<{ url?: string; error?: string }> {
  if (!supabase) return { error: 'Geen backend gekoppeld.' }
  const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')
  const path = folder + '/' + Date.now() + '-' + safe
  const { error } = await supabase.storage.from('cortemo-media').upload(path, file, {
    cacheControl: '31536000',
    contentType: file.type || 'image/jpeg',
  })
  if (error) return { error: error.message }
  const { data } = supabase.storage.from('cortemo-media').getPublicUrl(path)
  return { url: data.publicUrl }
}

/* ---------- collecties ---------- */

export type Collection = { id: string; label: string; sub: string; img: string }

const COLLECTIONS_KEY = 'cortemo-collections'

export const getCollections = (): Collection[] => read<Collection[]>(COLLECTIONS_KEY, [])

/** Collectiepresentatie uit de database; valt terug op de lokale cache. */
export async function fetchCollections(): Promise<Collection[]> {
  try {
    if (supabase) {
      const { data, error } = await supabase.from('cortemo_collections').select('*').order('id')
      if (!error && data) {
        const rows = data.map((r) => ({
          id: r.id,
          label: r.label,
          sub: r.sub ?? '',
          img: r.img ?? '',
        }))
        write(COLLECTIONS_KEY, rows)
        return rows
      }
    }
  } catch {
    /* netwerkfout: val terug op de lokale cache */
  }
  return getCollections()
}

export function saveCollection(collection: Collection): Collection[] {
  const next = [collection, ...getCollections().filter((c) => c.id !== collection.id)]
  write(COLLECTIONS_KEY, next)
  fire(
    supabase?.from('cortemo_collections').upsert({
      id: collection.id,
      label: collection.label,
      sub: collection.sub,
      img: collection.img,
    }),
  )
  return next
}

/* ---------- orders ---------- */

export type OrderStatus = 'nieuw' | 'in productie' | 'verzonden' | 'geannuleerd'

export type Order = {
  id: string
  date: string
  name: string
  email: string
  city: string
  address: string
  items: Pick<CartItem, 'name' | 'qty' | 'unitPrice' | 'config' | 'key'>[]
  total: number
  discountCode: string
  discountAmount: number
  projectId: string
  status: OrderStatus
  /** true = prijzen zijn server-side herrekend door de place-order functie. */
  verified?: boolean
  paymentStatus?: string
}

const ORDERS_KEY = 'cortemo-orders'

export const getOrders = (): Order[] => read<Order[]>(ORDERS_KEY, [])

/**
 * Plaatst een klantorder via de place-order edge function: de server
 * herrekent alle prijzen, valideert de kortingscode en slaat pas dan op.
 * Retourneert een foutmelding als de server de bestelling weigert
 * (prijsafwijking, onmogelijke maat, ongeldige code). Alleen als de
 * functie onbereikbaar is (netwerk/demo) valt hij terug op lokale opslag.
 */
export async function placeOrder(
  input: Omit<Order, 'id' | 'date' | 'status'>,
): Promise<{ ok: boolean; orderId?: string; error?: string }> {
  const localFallback = () => {
    const id = 'CM-' + String(Date.now()).slice(-6)
    saveOrder({ ...input, id, date: new Date().toISOString(), status: 'nieuw' })
    return { ok: true, orderId: id }
  }
  if (!supabase) return localFallback()
  try {
    const { data, error } = await supabase.functions.invoke('place-order', {
      body: {
        name: input.name,
        email: input.email,
        address: input.address,
        city: input.city,
        items: input.items,
        discountCode: input.discountCode,
        projectId: input.projectId || '',
      },
    })
    if (data?.ok && data.orderId) {
      // lokale cache bijwerken zodat de order direct zichtbaar is in admin
      write(ORDERS_KEY, [
        {
          ...input,
          id: data.orderId as string,
          date: new Date().toISOString(),
          status: 'nieuw' as OrderStatus,
          verified: true,
          paymentStatus: 'open',
        },
        ...getOrders(),
      ])
      return { ok: true, orderId: data.orderId as string }
    }
    // heeft de server geantwoord met een weigering, geef de reden terug;
    // kwam er geen antwoord (FunctionsFetchError e.d.), dan lokaal borgen
    if (error && error.name === 'FunctionsHttpError') {
      let message = error.message
      try {
        message = (await (error as unknown as { context: Response }).context.json()).error
      } catch {
        /* houd de generieke melding */
      }
      return { ok: false, error: String(message) }
    }
    if (data?.error) return { ok: false, error: String(data.error) }
    return localFallback()
  } catch {
    // netwerkfout: bestelling niet kwijtraken
    return localFallback()
  }
}

export function saveOrder(order: Order): void {
  write(ORDERS_KEY, [order, ...getOrders()])
  // fire-and-forget naar de database; de bestelling is lokaal al geborgd
  fire(
    supabase?.from('cortemo_orders').insert({
      id: order.id,
      name: order.name,
      email: order.email,
      city: order.city,
      address: order.address,
      items: order.items,
      total: order.total,
      discount_code: order.discountCode,
      discount_amount: order.discountAmount,
      project_id: order.projectId || null,
      status: order.status,
    }),
  )
}

export async function fetchOrders(): Promise<Order[]> {
  try {
    if (supabase) {
    const { data, error } = await supabase
      .from('cortemo_orders')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) {
      const orders = data.map((r) => ({
        id: r.id,
        date: r.created_at,
        name: r.name,
        email: r.email,
        city: r.city,
        address: r.address ?? '',
        items: r.items,
        total: Number(r.total),
        discountCode: r.discount_code ?? '',
        discountAmount: Number(r.discount_amount ?? 0),
        projectId: r.project_id ?? '',
        status: r.status as OrderStatus,
        verified: r.verified ?? false,
        paymentStatus: r.payment_status ?? '',
      }))
      write(ORDERS_KEY, orders)
      return orders
    }
  }
  } catch {
    /* netwerkfout: val terug op de lokale cache */
  }
  return getOrders()
}

export function setOrderStatus(id: string, status: OrderStatus): Order[] {
  const next = getOrders().map((o) => (o.id === id ? { ...o, status } : o))
  write(ORDERS_KEY, next)
  fire(
    supabase?.from('cortemo_orders').update({ status }).eq('id', id),
  )
  return next
}

/** Mailt de klant over de huidige orderstatus via de send-status functie. */
export async function sendStatusMail(order: Order): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Geen backend gekoppeld.' }
  const { data, error } = await supabase.functions.invoke('send-status', {
    body: { orderId: order.id, name: order.name, email: order.email, status: order.status },
  })
  let message = data?.error || error?.message
  if (error && 'context' in error) {
    try {
      message = (await (error as { context: Response }).context.json()).error
    } catch {
      /* houd de generieke melding */
    }
  }
  if (error || data?.error) return { ok: false, error: String(message) }
  return { ok: true }
}

/* ---------- offerte-aanvragen ---------- */

export type Quote = {
  id: string
  date: string
  type: string
  dims: string
  name: string
  email: string
  note: string
  handled: boolean
}

const QUOTES_KEY = 'cortemo-quotes'

export const getQuotes = (): Quote[] => read<Quote[]>(QUOTES_KEY, [])

export function saveQuote(quote: Quote): void {
  write(QUOTES_KEY, [quote, ...getQuotes()])
  fire(
    supabase?.from('cortemo_quotes').insert({
    id: quote.id,
    type: quote.type,
    dims: quote.dims,
    name: quote.name,
    email: quote.email,
    note: quote.note,
    handled: quote.handled,
    }),
  )
}

export async function fetchQuotes(): Promise<Quote[]> {
  try {
    if (supabase) {
    const { data, error } = await supabase
      .from('cortemo_quotes')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) {
      const quotes = data.map((r) => ({
        id: r.id,
        date: r.created_at,
        type: r.type,
        dims: r.dims,
        name: r.name,
        email: r.email,
        note: r.note,
        handled: r.handled,
      }))
      write(QUOTES_KEY, quotes)
      return quotes
    }
  }
  } catch {
    /* netwerkfout: val terug op de lokale cache */
  }
  return getQuotes()
}

export function setQuoteHandled(id: string, handled: boolean): Quote[] {
  const next = getQuotes().map((q) => (q.id === id ? { ...q, handled } : q))
  write(QUOTES_KEY, next)
  fire(
    supabase?.from('cortemo_quotes').update({ handled }).eq('id', id),
  )
  return next
}

/* ---------- configurator-tarieven ---------- */

export type PricingSettings = typeof PRICING

const PRICING_KEY = 'cortemo-pricing'

/**
 * Genormaliseerde merge: per blok (staal, snijden, …) en per subtabel worden
 * opgeslagen waarden over de bladdefaults gelegd, zodat nieuw toegevoegde
 * parameters altijd een default houden. Overrides in het oude platte formaat
 * worden genegeerd.
 */
function normalizePricing(raw: unknown): PricingSettings {
  const base = structuredClone(PRICING) as unknown as Record<string, Record<string, unknown>>
  if (!raw || typeof raw !== 'object' || !('staal' in (raw as object))) {
    return base as unknown as PricingSettings
  }
  const source = raw as Record<string, Record<string, unknown>>
  for (const blok of Object.keys(base)) {
    const rawBlok = source[blok]
    if (!rawBlok || typeof rawBlok !== 'object') continue
    for (const key of Object.keys(base[blok])) {
      const d = base[blok][key]
      const r = rawBlok[key]
      if (r === undefined) continue
      base[blok][key] = d && typeof d === 'object' ? { ...(d as object), ...(r as object) } : r
    }
  }
  return base as unknown as PricingSettings
}

/** Synchling voor de prijsberekening: bladdefaults + cache-overrides. */
export function getPricing(): PricingSettings {
  return normalizePricing(read<unknown>(PRICING_KEY, null))
}

/** Haalt de tarieven uit de database en ververst de lokale cache. */
export async function fetchPricing(): Promise<PricingSettings> {
  try {
    if (supabase) {
    const { data } = await supabase
      .from('cortemo_settings')
      .select('value')
      .eq('key', 'pricing')
      .maybeSingle()
    if (data?.value) {
      write(PRICING_KEY, data.value)
      return normalizePricing(data.value)
    }
  }
  } catch {
    /* netwerkfout: val terug op de lokale cache */
  }
  return getPricing()
}

export function savePricing(settings: PricingSettings): void {
  write(PRICING_KEY, settings)
  fire(
    supabase?.from('cortemo_settings').upsert({ key: 'pricing', value: settings }),
  )
}

export function resetPricing(): void {
  try {
    localStorage.removeItem(PRICING_KEY)
  } catch {
    /* ignore */
  }
  fire(
    supabase?.from('cortemo_settings').upsert({ key: 'pricing', value: PRICING }),
  )
}

/* ---------- b2b-partners ---------- */

export type Partner = {
  id: string
  company: string
  contact: string
  email: string
  discount: number
  /** Betaaltermijn in dagen; 0 = vooruitbetaling, >0 = op rekening. */
  terms: number
}

const PARTNERS_KEY = 'cortemo-partners'
const ACTIVE_PARTNER_KEY = 'cortemo-partner'

const DEFAULT_PARTNERS: Partner[] = [
  {
    id: 'groenwerk',
    company: 'Groenwerk Hoveniers B.V.',
    contact: 'J. Timmer',
    email: 'jan@groenwerk.nl',
    discount: 15,
    terms: 30,
  },
  {
    id: 'buro-buiten',
    company: 'Buro Buiten Tuinarchitectuur',
    contact: 'S. de Vries',
    email: 'sanne@burobuiten.nl',
    discount: 12,
    terms: 0,
  },
  {
    id: 'terra-nova',
    company: 'Terra Nova Projectinrichting',
    contact: 'M. Kamps',
    email: 'inkoop@terranova.nl',
    discount: 18,
    terms: 0,
  },
]

export const getPartners = (): Partner[] => read<Partner[]>(PARTNERS_KEY, DEFAULT_PARTNERS)

export async function fetchPartners(): Promise<Partner[]> {
  try {
    if (supabase) {
    const { data, error } = await supabase.from('cortemo_partners').select('*').order('company')
    if (!error && data) {
      const partners = data.map((r) => ({
        id: r.id,
        company: r.company,
        contact: r.contact,
        email: r.email,
        discount: Number(r.discount),
        terms: Number(r.payment_terms ?? 0),
      }))
      write(PARTNERS_KEY, partners)
      return partners
    }
  }
  } catch {
    /* netwerkfout: val terug op de lokale cache */
  }
  return getPartners()
}

export function setPartnerDiscount(id: string, discount: number): Partner[] {
  const next = getPartners().map((p) => (p.id === id ? { ...p, discount } : p))
  write(PARTNERS_KEY, next)
  fire(
    supabase?.from('cortemo_partners').update({ discount }).eq('id', id),
  )
  return next
}

/** Betaaltermijn (dagen); >0 laat de partner op rekening bestellen. */
export function setPartnerTerms(id: string, terms: number): Partner[] {
  const next = getPartners().map((p) => (p.id === id ? { ...p, terms } : p))
  write(PARTNERS_KEY, next)
  fire(
    supabase?.from('cortemo_partners').update({ payment_terms: terms }).eq('id', id),
  )
  return next
}

/** Ingelogde B2B-partner (voor kortingsweergave in shop en configurator). */
export const getActivePartner = (): Partner | null =>
  read<Partner | null>(ACTIVE_PARTNER_KEY, null)

export async function signInPartner(
  email: string,
  password: string,
): Promise<{ partner?: Partner; error?: string }> {
  if (!supabase) {
    // demo: match op e-mail in de lokale partnerlijst
    const partner = getPartners().find((p) => p.email.toLowerCase() === email.toLowerCase())
    if (!partner) return { error: 'Geen partneraccount gevonden voor dit e-mailadres.' }
    write(ACTIVE_PARTNER_KEY, partner)
    return { partner }
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: 'Inloggen mislukt: ' + error.message }
  const { data } = await supabase.from('cortemo_partners').select('*').limit(1)
  const row = data?.[0]
  if (!row) {
    await supabase.auth.signOut()
    return { error: 'Dit account is (nog) niet gekoppeld aan een B2B-partner.' }
  }
  const partner: Partner = {
    id: row.id,
    company: row.company,
    contact: row.contact,
    email: row.email,
    discount: Number(row.discount),
    terms: Number(row.payment_terms ?? 0),
  }
  write(ACTIVE_PARTNER_KEY, partner)
  return { partner }
}

export function signOutPartner(): void {
  try {
    localStorage.removeItem(ACTIVE_PARTNER_KEY)
  } catch {
    /* ignore */
  }
  fire(
    supabase?.auth.signOut(),
  )
}

/* ---------- kortingscodes ---------- */

export type Discount = {
  code: string
  percent: number
  active: boolean
  expires: string
}

const DISCOUNTS_KEY = 'cortemo-discounts'

export const getDiscounts = (): Discount[] => read<Discount[]>(DISCOUNTS_KEY, [])

export async function fetchDiscounts(): Promise<Discount[]> {
  try {
    if (supabase) {
      const { data, error } = await supabase.from('cortemo_discounts').select('*').order('code')
      if (!error && data) {
        const discounts = data.map((r) => ({
          code: r.code,
          percent: Number(r.percent),
          active: r.active,
          expires: r.expires ?? '',
        }))
        write(DISCOUNTS_KEY, discounts)
        return discounts
      }
    }
  } catch {
    /* netwerkfout: val terug op de lokale cache */
  }
  return getDiscounts()
}

export function saveDiscount(discount: Discount): Discount[] {
  const next = [discount, ...getDiscounts().filter((d) => d.code !== discount.code)]
  write(DISCOUNTS_KEY, next)
  fire(
    supabase?.from('cortemo_discounts').upsert({
      code: discount.code,
      percent: discount.percent,
      active: discount.active,
      expires: discount.expires || null,
    }),
  )
  return next
}

export function deleteDiscount(code: string): Discount[] {
  const next = getDiscounts().filter((d) => d.code !== code)
  write(DISCOUNTS_KEY, next)
  fire(supabase?.from('cortemo_discounts').delete().eq('code', code))
  return next
}

/** Valideert een code voor de checkout; RLS geeft anon alleen actieve codes.
 *  Met een timeout zodat een trage verbinding het afrekenen nooit blokkeert. */
export async function validateDiscount(code: string): Promise<number | null> {
  const clean = code.trim().toUpperCase()
  if (!clean) return null
  try {
    if (supabase) {
      const query = supabase
        .from('cortemo_discounts')
        .select('percent')
        .eq('code', clean)
        .maybeSingle()
        .then((r) => r)
      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
      const { data } = await Promise.race([query, timeout])
      if (data) return Number(data.percent)
      return null
    }
  } catch {
    /* netwerkfout of timeout: probeer de lokale cache */
  }
  const local = getDiscounts().find(
    (d) => d.code === clean && d.active && (!d.expires || d.expires >= new Date().toISOString().slice(0, 10)),
  )
  return local ? local.percent : null
}

/* ---------- mailings ---------- */

export type Mailing = {
  id: string
  date: string
  subject: string
  body: string
  audience: string
  recipients: number
}

const MAILINGS_KEY = 'cortemo-mailings'

export const getMailings = (): Mailing[] => read<Mailing[]>(MAILINGS_KEY, [])

export async function fetchMailings(): Promise<Mailing[]> {
  try {
    if (supabase) {
    const { data, error } = await supabase
      .from('cortemo_mailings')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) {
      const mailings = data.map((r) => ({
        id: r.id,
        date: r.created_at,
        subject: r.subject,
        body: r.body,
        audience: r.audience,
        recipients: r.recipients,
      }))
      write(MAILINGS_KEY, mailings)
      return mailings
    }
  }
  } catch {
    /* netwerkfout: val terug op de lokale cache */
  }
  return getMailings()
}

/** Verstuurt via de send-mailing edge function (Resend); zonder backend wordt
 *  de mailing alleen lokaal gelogd. */
export async function sendMailing(
  subject: string,
  body: string,
  audience: string,
): Promise<{ recipients?: number; error?: string }> {
  if (supabase) {
    const { data, error } = await supabase.functions.invoke('send-mailing', {
      body: { subject, body, audience },
    })
    if (error) return { error: 'Versturen mislukt: ' + error.message }
    if (data?.error) return { error: data.error }
    return { recipients: data?.recipients ?? 0 }
  }
  const recipients = audience === 'B2B-partners' ? getPartners().length : 248
  write(MAILINGS_KEY, [
    {
      id: 'ML-' + String(Date.now()).slice(-6),
      date: new Date().toISOString(),
      subject,
      body,
      audience,
      recipients,
    },
    ...getMailings(),
  ])
  return { recipients }
}

/* ---------- projecten ---------- */

export type Project = {
  id: string
  date: string
  partnerEmail: string
  name: string
  reference: string
  siteAddress: string
  status: 'actief' | 'afgerond'
}

const PROJECTS_KEY = 'cortemo-projects'

export const getProjects = (): Project[] => read<Project[]>(PROJECTS_KEY, [])

export async function fetchProjects(): Promise<Project[]> {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('cortemo_projects')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data) {
        const projects = data.map((r) => ({
          id: r.id,
          date: r.created_at,
          partnerEmail: r.partner_email,
          name: r.name,
          reference: r.reference,
          siteAddress: r.site_address,
          status: r.status as Project['status'],
        }))
        write(PROJECTS_KEY, projects)
        return projects
      }
    }
  } catch {
    /* netwerkfout: val terug op de lokale cache */
  }
  return getProjects()
}

export function saveProject(project: Project): Project[] {
  const next = [project, ...getProjects().filter((p) => p.id !== project.id)]
  write(PROJECTS_KEY, next)
  fire(
    supabase?.from('cortemo_projects').upsert({
      id: project.id,
      partner_email: project.partnerEmail,
      name: project.name,
      reference: project.reference,
      site_address: project.siteAddress,
      status: project.status,
    }),
  )
  return next
}

export function setOrderProject(orderId: string, projectId: string): Order[] {
  const next = getOrders().map((o) => (o.id === orderId ? { ...o, projectId } : o))
  write(ORDERS_KEY, next)
  fire(supabase?.from('cortemo_orders').update({ project_id: projectId || null }).eq('id', orderId))
  return next
}

export function setOfferStatus(id: string, status: OfferStatus): Offer[] {
  const next = getOffers().map((o) => (o.id === id ? { ...o, status } : o))
  write(OFFERS_KEY, next)
  fire(supabase?.from('cortemo_offers').update({ status }).eq('id', id))
  return next
}

/* ---------- facturen (onveranderlijk, doorlopend genummerd) ---------- */

export type Invoice = {
  /** Factuurnummer, bijv. 2026-0001. */
  id: string
  orderId: string
  date: string
  /** Vastgelegde ordergegevens op factuurmoment. */
  order: Order
}

const INVOICES_KEY = 'cortemo-invoices'

export const getInvoices = (): Invoice[] => read<Invoice[]>(INVOICES_KEY, [])

function rowToInvoice(r: {
  id: string
  order_id: string
  created_at: string
  snapshot: Record<string, unknown>
}): Invoice {
  const s = r.snapshot
  return {
    id: r.id,
    orderId: r.order_id,
    date: r.created_at,
    order: {
      id: String(s.id ?? r.order_id),
      date: String(s.created_at ?? r.created_at),
      name: String(s.name ?? ''),
      email: String(s.email ?? ''),
      city: String(s.city ?? ''),
      address: String(s.address ?? ''),
      items: (s.items ?? []) as Order['items'],
      total: Number(s.total ?? 0),
      discountCode: String(s.discount_code ?? ''),
      discountAmount: Number(s.discount_amount ?? 0),
      projectId: String(s.project_id ?? ''),
      status: (s.status ?? 'nieuw') as OrderStatus,
    },
  }
}

/** RLS bepaalt de scope: admins zien alles, partners alleen eigen facturen. */
export async function fetchInvoices(): Promise<Invoice[]> {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('cortemo_invoices')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data) {
        const invoices = data.map(rowToInvoice)
        write(INVOICES_KEY, invoices)
        return invoices
      }
    }
  } catch {
    /* netwerkfout: val terug op de lokale cache */
  }
  return getInvoices()
}

/**
 * Legt een order vast als factuur met het volgende doorlopende nummer.
 * Idempotent: bestaat er al een factuur voor de order, dan komt die terug.
 * Zonder backend (demo) wordt lokaal genummerd op volgorde van aanmaak.
 */
export async function createInvoice(order: Order): Promise<Invoice | null> {
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('cortemo_create_invoice', { p_order_id: order.id })
      if (!error && data) {
        const invoice = rowToInvoice(data as Parameters<typeof rowToInvoice>[0])
        write(INVOICES_KEY, [invoice, ...getInvoices().filter((i) => i.orderId !== invoice.orderId)])
        return invoice
      }
      // expliciete databaseweigering (bijv. geen beheerrechten): niet lokaal
      // doen alsof er gefactureerd is; bij netwerkfouten wél lokaal verder
      if (error?.code) return null
    } catch {
      /* netwerkfout: val terug op lokale nummering */
    }
  }
  // demo-modus: lokaal doornummeren
  const existing = getInvoices().find((i) => i.orderId === order.id)
  if (existing) return existing
  const year = new Date().getFullYear()
  const seq = getInvoices().filter((i) => i.id.startsWith(String(year))).length + 1
  const invoice: Invoice = {
    id: `${year}-${String(seq).padStart(4, '0')}`,
    orderId: order.id,
    date: new Date().toISOString(),
    order,
  }
  write(INVOICES_KEY, [invoice, ...getInvoices()])
  return invoice
}

/* ---------- partner-datatoegang (RLS filtert op de ingelogde partner) ---------- */

export async function fetchPartnerOrders(partner: Partner): Promise<Order[]> {
  const all = await fetchOrders().catch(() => getOrders())
  // met live backend filtert RLS al; de e-mailfilter dekt de demo-modus
  return all.filter(
    (o) => o.email.toLowerCase() === partner.email.toLowerCase() || getProjects().some((p) => p.id === o.projectId && p.partnerEmail === partner.email),
  )
}

export async function fetchPartnerOffers(partner: Partner): Promise<Offer[]> {
  const all = await fetchOffers().catch(() => getOffers())
  return all.filter((o) => o.email.toLowerCase() === partner.email.toLowerCase())
}

export async function fetchPartnerProjects(partner: Partner): Promise<Project[]> {
  const all = await fetchProjects()
  return all.filter((p) => p.partnerEmail.toLowerCase() === partner.email.toLowerCase())
}

/* ---------- admin-sessie ---------- */

const AUTH_KEY = 'cortemo-admin-auth'

export const isAdminAuthed = (): boolean => read<boolean>(AUTH_KEY, false)

export async function signInAdmin(
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) {
    // demo-modus zonder backend
    write(AUTH_KEY, true)
    return { ok: true }
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { ok: false, error: 'Inloggen mislukt: ' + error.message }
  const { data: isAdmin } = await supabase.rpc('is_cortemo_admin')
  if (!isAdmin) {
    await supabase.auth.signOut()
    return {
      ok: false,
      error: 'Dit account heeft geen beheerrechten. Voeg het toe aan cortemo_admins.',
    }
  }
  write(AUTH_KEY, true)
  return { ok: true }
}

export function signOutAdmin(): void {
  write(AUTH_KEY, false)
  fire(
    supabase?.auth.signOut(),
  )
}

/* ---------- uitgaande offertes ---------- */

export type OfferLine = { descr: string; qty: number; price: number }

export type OfferStatus = 'concept' | 'verzonden' | 'geaccepteerd' | 'afgewezen'

export type Offer = {
  id: string
  date: string
  customer: string
  email: string
  lines: OfferLine[]
  /** Kortingsfractie (0.15 = 15%). */
  discount: number
  total: number
  note: string
  validUntil: string
  projectId: string
  status: OfferStatus
}

const OFFERS_KEY = 'cortemo-offers'

export const getOffers = (): Offer[] => read<Offer[]>(OFFERS_KEY, [])

export const offerTotal = (lines: OfferLine[], discount: number): number =>
  Math.round(lines.reduce((s, l) => s + l.price * l.qty, 0) * (1 - discount) * 100) / 100

export async function fetchOffers(): Promise<Offer[]> {
  try {
    if (supabase) {
    const { data, error } = await supabase
      .from('cortemo_offers')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) {
      const offers = data.map((r) => ({
        id: r.id,
        date: r.created_at,
        customer: r.customer,
        email: r.email,
        lines: r.lines,
        discount: Number(r.discount),
        total: Number(r.total),
        note: r.note,
        validUntil: r.valid_until ?? '',
        projectId: r.project_id ?? '',
        status: r.status as OfferStatus,
      }))
      write(OFFERS_KEY, offers)
      return offers
    }
  }
  } catch {
    /* netwerkfout: val terug op de lokale cache */
  }
  return getOffers()
}

export function saveOffer(offer: Offer): void {
  const rest = getOffers().filter((o) => o.id !== offer.id)
  write(OFFERS_KEY, [offer, ...rest])
  fire(
    supabase?.from('cortemo_offers').upsert({
    id: offer.id,
    customer: offer.customer,
    email: offer.email,
    lines: offer.lines,
    discount: offer.discount,
    total: offer.total,
    note: offer.note,
    valid_until: offer.validUntil || null,
    project_id: offer.projectId || null,
    status: offer.status,
    }),
  )
}

export function deleteOffer(id: string): Offer[] {
  const next = getOffers().filter((o) => o.id !== id)
  write(OFFERS_KEY, next)
  fire(
    supabase?.from('cortemo_offers').delete().eq('id', id),
  )
  return next
}

/** Verstuurt de offerte per mail (edge function + Resend) en zet de status. */
export async function sendOffer(offer: Offer): Promise<{ ok: boolean; error?: string }> {
  if (supabase) {
    const { data, error } = await supabase.functions.invoke('send-quote', {
      body: {
        id: offer.id,
        customer: offer.customer,
        email: offer.email,
        lines: offer.lines,
        discount: offer.discount,
        total: offer.total,
        note: offer.note,
        validUntil: offer.validUntil,
      },
    })
    let message = data?.error || error?.message
    if (error && 'context' in error) {
      try {
        message = (await (error as { context: Response }).context.json()).error
      } catch {
        /* houd de generieke melding */
      }
    }
    if (error || data?.error) return { ok: false, error: String(message) }
  }
  saveOffer({ ...offer, status: 'verzonden' })
  return { ok: true }
}

/* ---------- product-CRUD (beheer volledig in de admin) ---------- */

export async function insertProduct(product: DbProduct): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Geen database gekoppeld.' }
  const { error } = await supabase.from('cortemo_products').insert({ ...product, sort: 999 })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function updateProductFull(
  id: string,
  patch: Partial<Omit<DbProduct, 'id'>>,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Geen database gekoppeld.' }
  const { error } = await supabase.from('cortemo_products').update(patch).eq('id', id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function deleteProduct(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Geen database gekoppeld.' }
  const { error } = await supabase.from('cortemo_products').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/* ---------- partnerbeheer ---------- */

export async function addPartner(
  partner: Omit<Partner, 'id'>,
): Promise<{ ok: boolean; error?: string }> {
  if (supabase) {
    const { error } = await supabase.from('cortemo_partners').insert({
      company: partner.company,
      contact: partner.contact,
      email: partner.email,
      discount: partner.discount,
      payment_terms: partner.terms,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }
  write(PARTNERS_KEY, [{ ...partner, id: 'p' + Date.now() }, ...getPartners()])
  return { ok: true }
}

export async function deletePartner(id: string): Promise<void> {
  write(PARTNERS_KEY, getPartners().filter((p) => p.id !== id))
  await supabase?.from('cortemo_partners').delete().eq('id', id)
}

/* ---------- klanten (afgeleid uit orders) ---------- */

export type Customer = {
  name: string
  email: string
  orders: number
  revenue: number
  lastOrder: string
}

export function deriveCustomers(orders: Order[]): Customer[] {
  const map = new Map<string, Customer>()
  for (const o of orders) {
    if (o.status === 'geannuleerd') continue
    const existing = map.get(o.email)
    if (existing) {
      existing.orders += 1
      existing.revenue += o.total
      if (o.date > existing.lastOrder) existing.lastOrder = o.date
    } else {
      map.set(o.email, { name: o.name, email: o.email, orders: 1, revenue: o.total, lastOrder: o.date })
    }
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue)
}
