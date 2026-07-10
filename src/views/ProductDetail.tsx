import { useEffect, useState } from 'react'
import { Check, ChevronDown, ChevronLeft, Ruler, ShoppingCart } from 'lucide-react'
import { euro, GROUP_IMG, GROUPS, PRODUCTS } from '../data/catalog'
import { ProductImage } from '../components/ProductImage'
import type { CartItem } from '../lib/cart'

export function ProductDetail({
  productId,
  onBack,
  onAdd,
  onConfigurator,
}: {
  productId: string
  onBack: () => void
  onAdd: (item: Omit<CartItem, 'qty'>) => void
  onConfigurator: () => void
}) {
  const p = PRODUCTS.find((x) => x.id === productId)!
  const [variant, setVariant] = useState(0)
  const [opts, setOpts] = useState<Record<string, boolean>>({})
  const [added, setAdded] = useState(false)

  useEffect(() => {
    setVariant(0)
    setOpts({})
  }, [productId])

  const total =
    p.price +
    p.variants[variant][1] +
    p.options.reduce((s, [label, price]) => s + (opts[label] ? price : 0), 0)

  const add = () => {
    const selected = p.options.filter(([label]) => opts[label]).map(([label]) => label)
    onAdd({
      key: [p.id, variant, ...selected].join('|'),
      productId: p.id,
      name: p.name,
      sub: p.sub,
      group: p.group,
      img: p.img,
      config: [p.variants[variant][0] + ' · 3 mm corten', ...selected],
      unitPrice: total,
      // Ruwe schatting op basis van de prijs; volstaat voor de logistiek-indicatie.
      weightKg: Math.max(2, Math.round(total / 3.5)),
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6 sm:pt-10 lg:pb-10">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-[13px] font-semibold text-white/50 transition-colors hover:text-white"
      >
        <ChevronLeft size={15} strokeWidth={2} /> Terug naar{' '}
        {GROUPS.find((g) => g.id === p.group)!.label.toLowerCase()}
      </button>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row">
        {/* foto */}
        <div className="min-w-0 flex-1">
          <div className="h-[300px] sm:h-[420px] lg:h-[520px]">
            <ProductImage src={p.img || GROUP_IMG[p.group]} label={p.name} radius={20} />
          </div>
        </div>

        {/* aankoop-sidebar */}
        <div className="w-full shrink-0 lg:w-[400px]">
          <div className="liquid-glass flex flex-col gap-5 rounded-2xl p-6 text-white sm:p-8">
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-[.08em] text-white/40">
                {p.sub}
              </div>
              <h1 className="serif mt-1.5 text-[26px] leading-[1.05] tracking-[-.02em]">{p.name}</h1>
              <p className="mt-2 text-[14px] leading-relaxed text-white/60">{p.desc}</p>
            </div>

            <div>
              <div className="mb-2 text-[13px] font-semibold">Kies afmeting</div>
              <div className="relative">
                <select
                  value={variant}
                  onChange={(e) => setVariant(+e.target.value)}
                  className="w-full appearance-none rounded-xl border border-white/15 bg-white/5 px-4 py-3 pr-10 text-[16px] font-medium text-white outline-none transition focus:border-rust sm:text-[13px]"
                  style={{ colorScheme: 'dark' }}
                >
                  {p.variants.map(([label, extra], i) => (
                    <option key={label} value={i} style={{ backgroundColor: '#14191E' }}>
                      {label}
                      {extra > 0 ? ' (+ ' + euro(extra) + ')' : ''}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40">
                  <ChevronDown size={14} strokeWidth={2} />
                </span>
              </div>
            </div>

            <div>
              <div className="mb-2 text-[13px] font-semibold">Opties</div>
              <div className="divide-y divide-white/5 rounded-xl bg-white/5 px-1">
                {p.options.map(([label, price]) => (
                  <label
                    key={label}
                    className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3"
                  >
                    <span className="flex items-center gap-2.5 text-[13px] text-white/80">
                      <input
                        type="checkbox"
                        checked={!!opts[label]}
                        onChange={() => setOpts((s) => ({ ...s, [label]: !s[label] }))}
                        className="h-4 w-4 rounded accent-[#D95A2B]"
                      />
                      {label}
                    </span>
                    <span className="text-[12px] tabular-nums text-white/50">+ {euro(price)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-end justify-between border-t border-white/10 pt-4">
              <div>
                <div className="text-[12px] text-white/50">Totaal incl. btw</div>
                <div className="text-[11px] text-white/35">Levertijd 5 tot 8 werkdagen</div>
              </div>
              <div className="text-[26px] font-extrabold leading-none tabular-nums">
                {euro(total)}
              </div>
            </div>

            <button
              onClick={add}
              className={
                'flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-semibold text-white transition-all ' +
                (added ? 'bg-ok' : 'bg-rust hover:bg-rust-deep active:scale-[.99]')
              }
            >
              {added ? (
                <>
                  <Check size={16} strokeWidth={2} /> Toegevoegd
                </>
              ) : (
                <>
                  <ShoppingCart size={16} strokeWidth={2} /> In winkelwagen
                </>
              )}
            </button>
          </div>

          {/* upsell naar configurator */}
          <button
            onClick={onConfigurator}
            className="liquid-glass mt-4 flex w-full flex-wrap items-center gap-4 rounded-2xl p-5 text-left text-white transition-all hover:-translate-y-0.5"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-rust">
              <Ruler size={18} strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1 basis-48">
              <span className="block text-[14px] font-semibold">
                Zit jouw perfecte maat er niet tussen?
              </span>
              <span className="block text-[12px] text-white/70">
                Ontwerp hem zelf tot op de millimeter.
              </span>
            </span>
            <span className="whitespace-nowrap text-[13px] font-semibold text-rust">
              Naar de 3D Configurator &rarr;
            </span>
          </button>
        </div>
      </div>

      {/* sticky koopbalk op mobiel: prijs + CTA altijd in beeld */}
      <div className="liquid-glass fixed inset-x-3 bottom-3 z-30 flex items-center justify-between gap-3 rounded-2xl p-3 pl-5 text-white lg:hidden">
        <div>
          <div className="text-[11px] text-white/55">Totaal incl. btw</div>
          <div className="text-[18px] font-extrabold leading-tight tabular-nums">{euro(total)}</div>
        </div>
        <button
          onClick={add}
          className={
            'flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 py-3 text-[14px] font-semibold text-white transition-all ' +
            (added ? 'bg-ok' : 'bg-rust hover:bg-rust-deep active:scale-[.99]')
          }
        >
          {added ? (
            <>
              <Check size={15} strokeWidth={2} /> Toegevoegd
            </>
          ) : (
            <>
              <ShoppingCart size={15} strokeWidth={2} /> In winkelwagen
            </>
          )}
        </button>
      </div>
    </div>
  )
}
