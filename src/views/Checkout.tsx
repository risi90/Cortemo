import { useState } from 'react'
import { ArrowRight, Check, Lock, ShoppingCart, Truck } from 'lucide-react'
import { euro } from '../data/catalog'
import { cartTotal, cartWeight, VAT_RATE, type CartItem } from '../lib/cart'
import { placeOrder, validateDiscount } from '../lib/adminStore'

const PAYMENT_METHODS = ['iDEAL', 'Bancontact', 'Creditcard', 'Bankoverschrijving']

const field =
  'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-[16px] font-medium text-white outline-none transition placeholder:text-white/30 focus:border-rust sm:text-[14px]'

export function Checkout({
  items,
  onClear,
  onShop,
}: {
  items: CartItem[]
  onClear: () => void
  onShop: () => void
}) {
  const [placed, setPlaced] = useState<string | null>(null)
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [serverError, setServerError] = useState('')
  const [payment, setPayment] = useState(PAYMENT_METHODS[0])
  const [form, setForm] = useState({ name: '', email: '', street: '', zip: '', city: '' })
  const set = (key: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }))
  const [codeInput, setCodeInput] = useState('')
  const [discount, setDiscount] = useState<{ code: string; percent: number } | null>(null)
  const [codeMsg, setCodeMsg] = useState('')

  const applyCode = async () => {
    const percent = await validateDiscount(codeInput)
    if (percent === null) {
      setDiscount(null)
      setCodeMsg('Deze code is niet (meer) geldig.')
      return
    }
    setDiscount({ code: codeInput.trim().toUpperCase(), percent })
    setCodeMsg('')
  }

  const subtotal = cartTotal(items)
  const discountAmount = discount ? Math.round(subtotal * (discount.percent / 100) * 100) / 100 : 0
  const total = subtotal - discountAmount
  const valid =
    form.name.trim().length > 1 &&
    /\S+@\S+\.\S+/.test(form.email) &&
    form.street.trim() &&
    form.zip.trim() &&
    form.city.trim()

  const place = async () => {
    setTried(true)
    if (!valid || busy) return
    setBusy(true)
    setServerError('')
    // de server herrekent alle prijzen en weigert gemanipuleerde of
    // verouderde bedragen — zie supabase/functions/place-order
    const result = await placeOrder({
      name: form.name,
      email: form.email,
      city: form.city,
      address: form.street + ', ' + form.zip + ' ' + form.city,
      items: items.map(({ name, qty, unitPrice, config, key }) => ({ name, qty, unitPrice, config, key })),
      total,
      discountCode: discount?.code ?? '',
      discountAmount,
      projectId: '',
    })
    setBusy(false)
    if (!result.ok) {
      setServerError(result.error || 'Bestellen lukte niet, probeer het opnieuw.')
      return
    }
    setPlaced(result.orderId!)
    onClear()
  }

  if (placed) {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-16">
        <div className="liquid-glass flex flex-col items-start gap-4 rounded-2xl p-6 text-white sm:p-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ok text-white">
            <Check size={22} strokeWidth={2} />
          </span>
          <div>
            <h1 className="serif text-[28px] leading-[1.05] tracking-[-.02em]">
              Bedankt voor je bestelling
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-white/60">
              Je bestelling <span className="font-semibold text-white">{placed}</span> is
              geplaatst. Je ontvangt de bevestiging en track &amp; trace op {form.email}. Ons
              pallettransport levert binnen 5 tot 8 werkdagen.
            </p>
          </div>
          <button
            onClick={onShop}
            className="mt-2 flex items-center gap-2 rounded-xl bg-rust px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-rust-deep"
          >
            Verder winkelen <ArrowRight size={15} strokeWidth={2} />
          </button>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 pb-16 pt-20 text-center sm:px-6">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-white/30">
          <ShoppingCart size={22} strokeWidth={2} />
        </span>
        <div>
          <h1 className="text-[18px] font-bold text-white">Je winkelwagen is leeg</h1>
          <p className="mt-1 text-[14px] text-white/50">
            Voeg eerst een product toe voordat je afrekent.
          </p>
        </div>
        <button
          onClick={onShop}
          className="rounded-xl bg-rust px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-rust-deep"
        >
          Ontdek de collecties
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10">
      <p className="text-[12px] font-semibold uppercase tracking-[.2em] text-rust">Afrekenen</p>
      <h1 className="serif mt-3 text-[30px] leading-[1.0] tracking-[-.03em] text-white sm:text-[40px]">
        Bijna klaar.
      </h1>

      <div className="mt-8 flex flex-col gap-6 lg:flex-row">
        {/* gegevens */}
        <div className="liquid-glass min-w-0 flex-1 space-y-5 self-start rounded-2xl p-6 text-white sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <div className="mb-2 text-[13px] font-semibold">Naam</div>
              <input
                type="text"
                autoComplete="name"
                placeholder="Voor- en achternaam"
                value={form.name}
                onChange={(e) => set('name')(e.target.value)}
                className={field}
              />
            </div>
            <div>
              <div className="mb-2 text-[13px] font-semibold">E-mailadres</div>
              <input
                type="email"
                autoComplete="email"
                placeholder="naam@voorbeeld.nl"
                value={form.email}
                onChange={(e) => set('email')(e.target.value)}
                className={field}
              />
            </div>
          </div>
          <div>
            <div className="mb-2 text-[13px] font-semibold">Straat en huisnummer</div>
            <input
              type="text"
              autoComplete="street-address"
              placeholder="Staalstraat 12"
              value={form.street}
              onChange={(e) => set('street')(e.target.value)}
              className={field}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <div className="mb-2 text-[13px] font-semibold">Postcode</div>
              <input
                type="text"
                autoComplete="postal-code"
                placeholder="5223 AL"
                value={form.zip}
                onChange={(e) => set('zip')(e.target.value)}
                className={field}
              />
            </div>
            <div>
              <div className="mb-2 text-[13px] font-semibold">Plaats</div>
              <input
                type="text"
                autoComplete="address-level2"
                placeholder="'s-Hertogenbosch"
                value={form.city}
                onChange={(e) => set('city')(e.target.value)}
                className={field}
              />
            </div>
          </div>

          <div>
            <div className="mb-2 text-[13px] font-semibold">Betaalwijze</div>
            <div className="divide-y divide-white/5 rounded-xl bg-white/5 px-1">
              {PAYMENT_METHODS.map((method) => (
                <label
                  key={method}
                  className="flex cursor-pointer items-center gap-2.5 px-4 py-3 text-[13px] text-white/80"
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={payment === method}
                    onChange={() => setPayment(method)}
                    className="h-4 w-4 accent-[#D95A2B]"
                  />
                  {method}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* besteloverzicht */}
        <div className="w-full shrink-0 lg:w-[400px]">
          <div className="liquid-glass flex flex-col gap-4 rounded-2xl p-6 text-white sm:p-8">
            <h2 className="text-[15px] font-bold">Je bestelling</h2>
            <ul className="divide-y divide-white/5">
              {items.map((item) => (
                <li key={item.key} className="flex items-baseline justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold">
                      {item.qty} × {item.name}
                    </span>
                    <span className="block truncate text-[11px] text-white/50">
                      {item.config[0]}
                    </span>
                  </span>
                  <span className="shrink-0 text-[13px] font-bold tabular-nums">
                    {euro(item.unitPrice * item.qty)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3">
              <Truck size={16} strokeWidth={2} className="shrink-0 text-white/40" />
              <span className="text-[12px] leading-relaxed text-white/60">
                ± {cartWeight(items)} kg &middot; pallettransport &middot; 5 tot 8 werkdagen
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Kortingscode"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && void applyCode()}
                aria-label="Kortingscode"
                className={field + ' min-w-0 flex-1 uppercase'}
              />
              <button
                onClick={() => void applyCode()}
                className="shrink-0 rounded-xl bg-white/10 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-white/15"
              >
                Pas toe
              </button>
            </div>
            {codeMsg && <p className="-mt-2 text-[12px] font-medium text-rust">{codeMsg}</p>}
            {discount && (
              <p className="-mt-2 text-[12px] font-semibold text-ok">
                Code {discount.code} toegepast: −{discount.percent}%
              </p>
            )}
            <div className="space-y-1 border-t border-white/10 pt-4 text-[13px]">
              {discount && (
                <div className="flex justify-between text-white/55">
                  <span>Korting ({discount.code})</span>
                  <span className="tabular-nums">−{euro(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-white/55">
                <span>Subtotaal excl. btw</span>
                <span className="tabular-nums">{euro(total / (1 + VAT_RATE))}</span>
              </div>
              <div className="flex justify-between text-white/55">
                <span>Btw (21%)</span>
                <span className="tabular-nums">{euro(total - total / (1 + VAT_RATE))}</span>
              </div>
              <div className="flex justify-between pt-1 text-[16px] font-extrabold text-white">
                <span>Totaal</span>
                <span className="tabular-nums">{euro(total)}</span>
              </div>
            </div>
            {tried && !valid && (
              <p className="text-[13px] font-medium text-rust">
                Vul je naam, een geldig e-mailadres en het volledige bezorgadres in.
              </p>
            )}
            {serverError && (
              <p className="rounded-lg bg-rust/10 px-3 py-2 text-[13px] font-medium text-rust" role="alert">
                {serverError}
              </p>
            )}
            <button
              onClick={() => void place()}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-rust py-3.5 text-[15px] font-semibold text-white transition-all hover:bg-rust-deep active:scale-[.99] disabled:opacity-60"
            >
              <Lock size={15} strokeWidth={2} /> {busy ? 'Bezig met plaatsen…' : 'Bestelling plaatsen'}
            </button>
            <p className="text-center text-[12px] text-white/40">
              Betaling via {payment} &middot; beveiligde verbinding
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
