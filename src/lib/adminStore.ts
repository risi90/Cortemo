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

/* ---------- orders ---------- */

export type OrderStatus = 'nieuw' | 'in productie' | 'verzonden' | 'geannuleerd'

export type Order = {
  id: string
  date: string
  name: string
  email: string
  city: string
  items: Pick<CartItem, 'name' | 'qty' | 'unitPrice' | 'config'>[]
  total: number
  status: OrderStatus
}

const ORDERS_KEY = 'cortemo-orders'

export const getOrders = (): Order[] => read<Order[]>(ORDERS_KEY, [])

export function saveOrder(order: Order): void {
  write(ORDERS_KEY, [order, ...getOrders()])
  // fire-and-forget naar de database; de bestelling is lokaal al geborgd
  void supabase?.from('cortemo_orders').insert({
    id: order.id,
    name: order.name,
    email: order.email,
    city: order.city,
    items: order.items,
    total: order.total,
    status: order.status,
  })
}

export async function fetchOrders(): Promise<Order[]> {
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
        items: r.items,
        total: Number(r.total),
        status: r.status as OrderStatus,
      }))
      write(ORDERS_KEY, orders)
      return orders
    }
  }
  return getOrders()
}

export function setOrderStatus(id: string, status: OrderStatus): Order[] {
  const next = getOrders().map((o) => (o.id === id ? { ...o, status } : o))
  write(ORDERS_KEY, next)
  void supabase?.from('cortemo_orders').update({ status }).eq('id', id)
  return next
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
  void supabase?.from('cortemo_quotes').insert({
    id: quote.id,
    type: quote.type,
    dims: quote.dims,
    name: quote.name,
    email: quote.email,
    note: quote.note,
    handled: quote.handled,
  })
}

export async function fetchQuotes(): Promise<Quote[]> {
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
  return getQuotes()
}

export function setQuoteHandled(id: string, handled: boolean): Quote[] {
  const next = getQuotes().map((q) => (q.id === id ? { ...q, handled } : q))
  write(QUOTES_KEY, next)
  void supabase?.from('cortemo_quotes').update({ handled }).eq('id', id)
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
  return getPricing()
}

export function savePricing(settings: PricingSettings): void {
  write(PRICING_KEY, settings)
  void supabase?.from('cortemo_settings').upsert({ key: 'pricing', value: settings })
}

export function resetPricing(): void {
  try {
    localStorage.removeItem(PRICING_KEY)
  } catch {
    /* ignore */
  }
  void supabase?.from('cortemo_settings').upsert({ key: 'pricing', value: PRICING })
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
  return getPartners()
}

export function setPartnerDiscount(id: string, discount: number): Partner[] {
  const next = getPartners().map((p) => (p.id === id ? { ...p, discount } : p))
  write(PARTNERS_KEY, next)
  void supabase?.from('cortemo_partners').update({ discount }).eq('id', id)
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
  void supabase?.auth.signOut()
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
  void supabase?.auth.signOut()
}
