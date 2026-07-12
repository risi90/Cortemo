import { useEffect, useState } from 'react'
import { Lock, Minus, Plus, ShoppingCart, Trash2, Truck, X } from 'lucide-react'
import { euro, GROUP_IMG } from '../data/catalog'
import {
  ACCELERATOR,
  cartTotal,
  cartWeight,
  VAT_RATE,
  type CartItem,
} from '../lib/cart'
import { ProductImage } from './ProductImage'

export function CartDrawer({
  open,
  items,
  onClose,
  onSetQty,
  onRemove,
  onAddAccelerator,
  onCheckout,
  onBrowse,
}: {
  open: boolean
  items: CartItem[]
  onClose: () => void
  onSetQty: (key: string, qty: number) => void
  onRemove: (key: string) => void
  onAddAccelerator: () => void
  onCheckout: () => void
  onBrowse: () => void
}) {
  const [exVat, setExVat] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const total = cartTotal(items)
  const shown = exVat ? total / (1 + VAT_RATE) : total
  const hasAccelerator = items.some((i) => i.key === ACCELERATOR.key)

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        className={
          'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ' +
          (open ? 'opacity-100' : 'pointer-events-none opacity-0')
        }
      />
      <aside
        role="dialog"
        aria-label="Winkelwagen"
        aria-hidden={!open}
        // inert houdt de gesloten drawer buiten de tabvolgorde (WCAG 2.4.3);
        // als attribuut gezet omdat React 18 de property nog niet kent
        ref={(el) => el?.toggleAttribute('inert', !open)}
        className={
          'panel-deep fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-white/10 text-white shadow-2xl backdrop-blur-2xl transition-transform duration-300 sm:max-w-[420px] sm:rounded-l-2xl ' +
          (open ? 'translate-x-0' : 'translate-x-full')
        }
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="text-[17px] font-extrabold tracking-[-.02em]">
            Jouw bestelling
            {items.length > 0 && (
              <span className="ml-2 text-[13px] font-semibold text-white/40">
                {items.reduce((s, i) => s + i.qty, 0)}{' '}
                {items.reduce((s, i) => s + i.qty, 0) === 1 ? 'artikel' : 'artikelen'}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Sluit winkelwagen"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={17} strokeWidth={2} />
          </button>
        </div>

        {items.length === 0 ? (
          /* lege staat */
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-white/30">
              <ShoppingCart size={22} strokeWidth={2} />
            </span>
            <div>
              <div className="text-[15px] font-semibold">Je winkelwagen is leeg</div>
              <div className="mt-1 text-[13px] text-white/50">
                Ontdek onze collecties of ontwerp zelf iets op maat.
              </div>
            </div>
            <button
              onClick={onBrowse}
              className="rounded-xl bg-rust px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-rust-deep"
            >
              Ontdek de collecties
            </button>
          </div>
        ) : (
          <>
            {/* artikelen */}
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
              {items.map((item) => (
                <div key={item.key} className="flex gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white/5">
                    <ProductImage
                      src={item.img || (item.group ? GROUP_IMG[item.group] : undefined)}
                      label={item.name}
                      radius={0}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[14px] font-bold leading-tight">{item.name}</div>
                        <div className="text-[11px] text-white/55">{item.sub}</div>
                      </div>
                      <button
                        onClick={() => onRemove(item.key)}
                        aria-label={'Verwijder ' + item.name}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <Trash2 size={14} strokeWidth={2} />
                      </button>
                    </div>
                    {/* gekozen configuratie */}
                    <ul className="mt-2 space-y-0.5 rounded-lg bg-white/5 px-3 py-2">
                      {item.config.map((line) => (
                        <li key={line} className="flex items-baseline gap-1.5 text-[11px] leading-relaxed text-white/60">
                          <span className="inline-block h-1 w-1 shrink-0 translate-y-[-2px] rounded-full bg-rust/70" />
                          {line}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onSetQty(item.key, item.qty - 1)}
                          aria-label="Aantal verlagen"
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          <Minus size={13} strokeWidth={2} />
                        </button>
                        <span className="w-7 text-center text-[13px] font-semibold tabular-nums">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => onSetQty(item.key, item.qty + 1)}
                          aria-label="Aantal verhogen"
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          <Plus size={13} strokeWidth={2} />
                        </button>
                      </div>
                      <div className="text-[14px] font-bold tabular-nums">
                        {euro(item.unitPrice * item.qty)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* logistiek */}
              <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3">
                <Truck size={16} strokeWidth={2} className="shrink-0 text-white/40" />
                <span className="text-[12px] leading-relaxed text-white/60">
                  Totaal gewicht: <span className="font-semibold text-white/80">± {cartWeight(items)} kg</span>
                  {' '}&middot; levering via pallettransport.
                </span>
              </div>

              {/* upsell */}
              {!hasAccelerator && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-rust/30 bg-rust/10 px-4 py-3">
                  <span className="text-[12px] leading-relaxed text-white/80">
                    Maak het af met <span className="font-semibold">Corten-roestversneller</span> voor
                    een egale roestlaag in weken in plaats van maanden.
                  </span>
                  <button
                    onClick={onAddAccelerator}
                    aria-label={'Voeg Corten-roestversneller toe voor ' + euro(ACCELERATOR.unitPrice)}
                    className="shrink-0 whitespace-nowrap rounded-lg bg-rust px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-rust-deep"
                  >
                    + {euro(ACCELERATOR.unitPrice)}
                  </button>
                </div>
              )}
            </div>

            {/* footer */}
            <div className="border-t border-white/10 px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex items-end justify-between">
                <div>
                  <div className="flex items-center gap-1 rounded-lg bg-white/5 p-0.5">
                    {(['incl.', 'excl.'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setExVat(mode === 'excl.')}
                        className={
                          'rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ' +
                          ((mode === 'excl.') === exVat
                            ? 'bg-white/15 text-white'
                            : 'text-white/40 hover:text-white/70')
                        }
                      >
                        {mode} btw
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 text-[11px] text-white/35">Levertijd 5 tot 8 werkdagen</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-white/40">Totaal {exVat ? 'excl.' : 'incl.'} btw</div>
                  <div className="text-[24px] font-extrabold leading-tight tabular-nums">
                    {euro(shown)}
                  </div>
                </div>
              </div>
              <button
                onClick={onCheckout}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-rust py-3.5 text-[15px] font-semibold text-white transition-all hover:bg-rust-deep active:scale-[.99]"
              >
                <Lock size={15} strokeWidth={2} /> Veilig afrekenen
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
