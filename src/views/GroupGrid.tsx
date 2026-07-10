import { ArrowRight, Shapes } from 'lucide-react'
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
        'cat-card group relative overflow-hidden rounded-3xl bg-white/[.04] text-left ' + extra
      }
    >
      {hasImage ? (
        <>
          <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
            <ProductImage src={GROUP_IMG[g.id]} label={g.label} radius={0} />
          </div>
          <div className="cat-grad pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Shapes
            size={88}
            strokeWidth={1}
            className="text-rust/25 transition-transform duration-700 group-hover:scale-110"
          />
        </div>
      )}
      <div
        className={
          'pointer-events-none absolute bottom-0 left-0 p-6 md:p-8 ' + (hasImage ? 'on-media' : '')
        }
      >
        <div
          className={
            'text-[11px] font-semibold uppercase tracking-[.16em] ' +
            (hasImage ? 'text-white/70' : 'text-white/50')
          }
        >
          {count(g.id)} producten
        </div>
        <div
          className={
            'mt-1 font-extrabold tracking-[-.02em] text-white ' +
            (big ? 'text-[26px] md:text-[34px]' : 'text-[20px] md:text-[24px]')
          }
        >
          {g.label}
        </div>
        <div className={'mt-0.5 text-[13px] ' + (hasImage ? 'text-white/70' : 'text-white/50')}>
          {g.sub}
        </div>
      </div>
      <span className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink opacity-0 shadow-sm transition-all duration-300 group-hover:opacity-100">
        <ArrowRight size={15} strokeWidth={2} />
      </span>
    </button>
  )
}

export function GroupGrid({
  onPick,
  onConfigurator,
}: {
  onPick: (id: GroupId) => void
  onConfigurator: () => void
}) {
  return (
    <div>
      {/* video-hero, full-bleed over de volledige breedte en hoogte van de
          hero-sectie; het configurator-blok ligt over de achtergrondvideo */}
      <section className="on-media relative -mt-24 flex min-h-[72vh] flex-col justify-end overflow-hidden rounded-t-2xl sm:-mt-28 sm:rounded-t-3xl md:-mt-32 md:min-h-[82vh]">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          poster="/img/plantenbak.webp"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden
          // React zet het muted-attribuut niet altijd in de DOM; autoplay-beleid
          // vereist het wél, dus we forceren het en starten expliciet.
          ref={(el) => {
            if (el) {
              el.muted = true
              void el.play().catch(() => {})
            }
          }}
        >
          <source src="/video/hero.webm" type="video/webm" />
          <source src="/video/hero.mp4" type="video/mp4" />
        </video>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/20" />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-14 pt-40 sm:px-6 sm:pb-16 lg:pb-20">
          <p className="text-[12px] font-semibold uppercase tracking-[.2em] text-white/70">
            Maatwerk cortenstaal
          </p>
          <h1 className="serif mt-4 max-w-2xl text-[36px] leading-[1.02] tracking-[-.03em] text-white sm:text-[46px] md:text-[58px]">
            Tot op de millimeter, <em className="text-white/60">naadloos gelast.</em>
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/75">
            Ontwerp je plantenbak, keerwand of schutting in 3D en zie direct wat hij kost.
            Geleverd door heel Nederland en Belgi&euml;.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              onClick={onConfigurator}
              className="flex items-center gap-2 rounded-xl bg-rust px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-rust-deep"
            >
              Start de configurator <ArrowRight size={16} strokeWidth={2} />
            </button>
            <a
              href="#collecties"
              className="rounded-xl bg-white/15 px-6 py-3.5 text-[15px] font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/25"
            >
              Bekijk de collecties
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
      <div id="collecties" className="pt-12 sm:pt-16 md:pt-20">
        <p className="text-[12px] font-semibold uppercase tracking-[.2em] text-rust">
          Cortemo Collecties
        </p>
        <h2 className="serif mt-5 max-w-3xl text-[34px] leading-[1.0] tracking-[-.03em] text-white sm:text-[40px] md:text-[56px]">
          Ontdek onze <em className="text-white/50">collecties.</em>
        </h2>
        <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/60">
          Standaard formaten, vaste prijzen, geleverd binnen acht werkdagen. Alles naadloos gelast
          uit 3 mm cortenstaal.
        </p>
      </div>
      <div className="mt-10 grid auto-rows-[200px] grid-cols-1 gap-4 sm:mt-14 sm:auto-rows-[220px] sm:grid-cols-2 md:grid-cols-3">
        <Cell g={GROUPS[0]} extra="sm:col-span-2 md:row-span-2" big onPick={onPick} />
        <Cell g={GROUPS[1]} extra="" big={false} onPick={onPick} />
        <Cell g={GROUPS[2]} extra="" big={false} onPick={onPick} />
        <Cell g={GROUPS[3]} extra="sm:col-span-2 md:col-span-3" big onPick={onPick} />
      </div>
      </div>
    </div>
  )
}
