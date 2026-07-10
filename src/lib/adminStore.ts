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
): Promise<{ url?: string; error?: string }> {
  if (!supabase) return { error: 'Geen backend gekoppeld.' }
  const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')
  const path = 'products/' + Date.now() + '-' + safe
  const { error } = await supabase.storage.from('cortemo-media').upload(path, file, {
    cacheControl: '31536000',
    contentType: file.type || 'image/jpeg',
  })
  if (error) return { error: error.message }
  const { data } = supabase.storage.from('cortemo-media').getPublicUrl(path)
  return { url: data.publicUrl }
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
  items: Pick<CartItem, 'name' | 'qty' | 'unitPrice' | 'config'>[]
  total: number
  discountCode: string
  discountAmount: number
  status: OrderStatus
}

const ORDERS_KEY = 'cortemo-orders'

export const getOrders = (): Order[] => read<Order[]>(ORDERS_KEY, [])

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
        status: r.status as OrderStatus,
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

/** Synchling voor de prijsberekening: schema-defaults + cache-overrides. */
export function getPricing(): PricingSettings {
  const overrides = read<Partial<PricingSettings>>(PRICING_KEY, {})
  return { ...PRICING, ...overrides }
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
      return { ...PRICING, ...data.value }
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
  },
  {
    id: 'buro-buiten',
    company: 'Buro Buiten Tuinarchitectuur',
    contact: 'S. de Vries',
    email: 'sanne@burobuiten.nl',
    discount: 12,
  },
  {
    id: 'terra-nova',
    company: 'Terra Nova Projectinrichting',
    contact: 'M. Kamps',
    email: 'inkoop@terranova.nl',
    discount: 18,
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
