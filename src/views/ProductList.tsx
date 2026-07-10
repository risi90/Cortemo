import { useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import {
  euro,
  GROUP_IMG,
  GROUPS,
  PRODUCTS,
  SUBCATS,
  type GroupId,
} from '../data/catalog'
import { ProductImage } from '../components/ProductImage'

/** Vaste hoogte per product, zodat het masonry-ritme niet verspringt bij filteren. */
const CARD_HEIGHTS = ['h-80', 'h-60', 'h-72']
const cardHeight = (id: string) => CARD_HEIGHTS[id.charCodeAt(0) % CARD_HEIGHTS.length]

export function ProductList({
  groupId,
  initialSub,
  onBack,
  onPick,
}: {
  groupId: GroupId
  /** Voorgeselecteerde subcategorie, bijv. vanuit "Shop deze look". */
  initialSub?: string
  onBack: () => void
  onPick: (id: string) => void
}) {
  const group = GROUPS.find((g) => g.id === groupId)!
  const validSub = (s?: string) => (s && SUBCATS[groupId].includes(s) ? s : 'Alles')
  const [sub, setSub] = useState(validSub(initialSub))
  useEffect(() => setSub(validSub(initialSub)), [groupId, initialSub]) // eslint-disable-line react-hooks/exhaustive-deps
  const subs = ['Alles', ...SUBCATS[groupId]]
  const items = PRODUCTS.filter(
    (p) => p.group === groupId && (sub === 'Alles' || p.sub === sub),
  )

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-[13px] font-semibold text-white/50 transition-colors hover:text-white"
      >
        <ChevronLeft size={15} strokeWidth={2} /> Terug naar collecties
      </button>
      <p className="mt-8 text-[12px] font-semibold uppercase tracking-[.2em] text-rust">Collectie</p>
      <h1 className="serif mt-3 text-[36px] leading-[1.0] tracking-[-.03em] text-white md:text-[48px]">
        {group.label}
      </h1>
      <p className="mt-3 max-w-md text-[14px] text-white/60">
        {group.sub}. {items.length} {items.length === 1 ? 'product' : 'producten'}.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        {subs.map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className={
              'rounded-full px-4 py-2 text-[13px] font-semibold transition-all ' +
              (sub === s
                ? 'border border-rust bg-white/10 text-white shadow-sm'
                : 'border border-transparent bg-white/5 text-white/50 hover:text-white')
            }
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-10 grid grid-cols-1 items-start gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <button key={p.id} onClick={() => onPick(p.id)} className="group text-left">
            <div
              className={'relative overflow-hidden rounded-2xl bg-white/[.04] ' + cardHeight(p.id)}
            >
              <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
                <ProductImage src={GROUP_IMG[p.group]} label={p.name} radius={0} />
              </div>
              <span className="pointer-events-none absolute bottom-4 right-4 rounded-full bg-white/90 px-4 py-2 text-[12px] font-semibold text-ink shadow-sm transition-opacity duration-300 sm:opacity-0 sm:group-hover:opacity-100">
                Configureer &rarr;
              </span>
            </div>
            <div className="mt-3.5 flex items-baseline justify-between gap-3 px-1">
              <div>
                <div className="text-[15px] font-bold text-white">{p.name}</div>
                <div className="text-[12px] text-white/55">{p.dims}</div>
              </div>
              <div className="shrink-0 whitespace-nowrap text-right">
                <span className="text-[11px] text-white/55">vanaf </span>
                <span className="text-[14px] font-bold tabular-nums text-white">
                  {euro(p.price)}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
