import type { CartItem } from './cart'
import { PRICING } from '../data/configuratorSchema'

/**
 * Beheerdata voor de admin-omgeving. In deze demo-fase leeft alles in
 * localStorage; elke functie is zo opgezet dat hij later 1-op-1 door een
 * API-call vervangen kan worden.
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
}

export function setOrderStatus(id: string, status: OrderStatus): Order[] {
  const next = getOrders().map((o) => (o.id === id ? { ...o, status } : o))
  write(ORDERS_KEY, next)
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
}

export function setQuoteHandled(id: string, handled: boolean): Quote[] {
  const next = getQuotes().map((q) => (q.id === id ? { ...q, handled } : q))
  write(QUOTES_KEY, next)
  return next
}

/* ---------- configurator-tarieven ---------- */

export type PricingSettings = typeof PRICING

const PRICING_KEY = 'cortemo-pricing'

/** Actieve tarieven: schema-defaults met admin-overrides eroverheen. */
export function getPricing(): PricingSettings {
  const overrides = read<Partial<PricingSettings>>(PRICING_KEY, {})
  return { ...PRICING, ...overrides }
}

export function savePricing(settings: PricingSettings): void {
  write(PRICING_KEY, settings)
}

export function resetPricing(): void {
  try {
    localStorage.removeItem(PRICING_KEY)
  } catch {
    /* ignore */
  }
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

export function setPartnerDiscount(id: string, discount: number): Partner[] {
  const next = getPartners().map((p) => (p.id === id ? { ...p, discount } : p))
  write(PARTNERS_KEY, next)
  return next
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

export function saveMailing(mailing: Mailing): void {
  write(MAILINGS_KEY, [mailing, ...getMailings()])
}

/* ---------- admin-sessie ---------- */

const AUTH_KEY = 'cortemo-admin-auth'

export const isAdminAuthed = (): boolean => read<boolean>(AUTH_KEY, false)
export const setAdminAuthed = (v: boolean): void => write(AUTH_KEY, v)
