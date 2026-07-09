import { ArrowRight } from 'lucide-react'
import { GROUP_IMG, GROUPS, PRODUCTS, type Group, type GroupId } from '../data/catalog'
import { ProductImage } from '../components/ProductImage'

const count = (id: GroupId) => PRODUCTS.filter((p) => p.group === id).length

function Cell({
  g,
  extra,
  big,
  onPick,
}: {
  g: Group
  extra: string
  big: boolean
  onPick: (id: GroupId) => void
}) {
  const hasImage = !!GROUP_IMG[g.id]
  return (
    <button
      onClick={() => onPick(g.id)}
      className={
        'cat-card group relative overflow-hidden rounded-3xl text-left ' +
        (hasImage ? 'bg-white/[.04] ' : 'is-empty bg-[#EAE8E3] ') +
        extra
      }
    >
      <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
        <ProductImage src={GROUP_IMG[g.id]} label={g.label} radius={0} />
      </div>
      {hasImage && (
        <div className="cat-grad pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      )}
      <div
        className={
          'pointer-events-none absolute bottom-0 left-0 p-6 md:p-8 ' + (hasImage ? 'on-media' : '')
        }
      >
        {hasImage && (
          <div className="text-[11px] font-semibold uppercase tracking-[.16em] text-white/70">
            {count(g.id)} producten
          </div>
        )}
        <div
          className={
            'mt-1 font-extrabold tracking-[-.02em] ' +
            (hasImage ? 'text-white ' : 'text-ink ') +
            (big ? 'text-[26px] md:text-[34px]' : 'text-[20px] md:text-[24px]')
          }
        >
          {g.label}
        </div>
        {hasImage && <div className="mt-0.5 text-[13px] text-white/70">{g.sub}</div>}
      </div>
      <span className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink opacity-0 shadow-sm transition-all duration-300 group-hover:opacity-100">
        <ArrowRight size={15} strokeWidth={2} />
      </span>
    </button>
  )
}

export function GroupGrid({ onPick }: { onPick: (id: GroupId) => void }) {
  return (
    <div className="mx-auto max-w-6xl px-6 pb-20 pt-16 md:pt-24">
      <p className="text-[12px] font-semibold uppercase tracking-[.2em] text-rust">
        Cortemo Collecties
      </p>
      <h1 className="serif mt-5 max-w-3xl text-[40px] leading-[1.0] tracking-[-.03em] text-white md:text-[56px]">
        Ontdek onze <em className="text-white/50">collecties.</em>
      </h1>
      <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/60">
        Standaard formaten, vaste prijzen, geleverd binnen acht werkdagen. Alles naadloos gelast uit
        3 mm cortenstaal.
      </p>
      <div className="mt-14 grid auto-rows-[220px] grid-cols-1 gap-4 md:grid-cols-3">
        <Cell g={GROUPS[0]} extra="md:col-span-2 md:row-span-2" big onPick={onPick} />
        <Cell g={GROUPS[1]} extra="" big={false} onPick={onPick} />
        <Cell g={GROUPS[2]} extra="" big={false} onPick={onPick} />
        <Cell g={GROUPS[3]} extra="md:col-span-3" big onPick={onPick} />
      </div>
    </div>
  )
}
