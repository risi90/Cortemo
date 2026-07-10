import type { GroupId } from '../data/catalog'

export type CartItem = {
  /** Uniek per product + gekozen configuratie, zodat identieke configuraties samenvoegen. */
  key: string
  productId: string
  name: string
  sub: string
  group?: GroupId
  /** Thumbnail voor in de winkelwagen. */
  img?: string
  /** Regels met de gekozen configuratie (afmeting, opties). */
  config: string[]
  /** Stukprijs incl. btw, inclusief variant- en optiemeerprijzen. */
  unitPrice: number
  /** Geschat gewicht per stuk in kg, voor de logistiek-indicatie. */
  weightKg: number
  qty: number
}

export const cartCount = (items: CartItem[]): number =>
  items.reduce((s, i) => s + i.qty, 0)

export const cartTotal = (items: CartItem[]): number =>
  items.reduce((s, i) => s + i.unitPrice * i.qty, 0)

export const cartWeight = (items: CartItem[]): number =>
  items.reduce((s, i) => s + i.weightKg * i.qty, 0)

export const VAT_RATE = 0.21

export const ACCELERATOR: Omit<CartItem, 'qty'> = {
  key: 'roestversneller',
  productId: 'roestversneller',
  name: 'Corten-roestversneller',
  sub: 'Accessoire',
  config: ['5 liter · dekt ± 15 m²'],
  unitPrice: 29.95,
  weightKg: 5,
}
