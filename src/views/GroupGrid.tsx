import { ArrowRight, Shapes } from 'lucide-react'
import { GROUP_IMG, GROUPS, PRODUCTS, type Group, type GroupId } from '../data/catalog'
import { ProductImage } from '../components/ProductImage'
import { MiniConfigurator } from '../components/MiniConfigurator'
import { useConfiguratorStore } from '../store/configuratorStore'

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
  const setType = useConfiguratorStore((s) => s.setType)

  const quickLinks: [string, GroupId][] = [
    ['Plantenbakken', 'planten'],
    ['Borderranden', 'hoogte'],
    ['Naamborden', 'deco'],
    ['Vuurschalen', 'vuurwater'],
  ]

  return (
    <div>
      {/* video-hero zoals in het ontwerp: één afgeronde, viewport-hoge kaart
          met de video full-bleed, headline linksonder en de mini-configurator
          rechtsonder. De -mt trekt hem tot bovenin de page-shell, achter de
          zwevende navbar. */}
      <section className="on-media relative -mt-24 flex min-h-[calc(100vh-24px)] flex-col overflow-hidden rounded-2xl sm:-mt-28 sm:min-h-[calc(100vh-32px)] sm:rounded-3xl md:-mt-32 md:min-h-[calc(100vh-48px)]">
        {/* corten-fallback achter de video */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg,#8A3A1B 0%,#B45309 28%,#93441E 55%,#A85520 78%,#7C2D12 100%)',
          }}
        />
        <video
          className="absolute inset-0 h-full w-full object-cover"
          poster="/img/hero-poster.jpg"
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
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />

        {/* onderste rij: headline + mini-configurator */}
        <div className="relative z-10 mt-auto flex flex-col gap-6 p-4 pb-8 pt-36 sm:p-6 sm:pb-10 md:p-8 md:pb-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="shrink-0 lg:max-w-lg xl:max-w-2xl">
            <h1 className="text-3xl font-medium leading-tight text-white drop-shadow-lg sm:text-4xl xl:text-5xl">
              Cortenstaal met <span className="serif-accent">emotie</span>,
              <br />
              ontworpen door jou
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium drop-shadow">
              {quickLinks.map(([label, group], i) => (
                <span key={label} className="flex items-center gap-x-5">
                  {i > 0 && <span className="text-white/40">&middot;</span>}
                  <button
                    onClick={() => onPick(group)}
                    className="text-white/85 transition-opacity hover:text-white hover:opacity-100"
                  >
                    {label}
                  </button>
                </span>
              ))}
            </div>
          </div>
          <MiniConfigurator
            onStart={(cfgType) => {
              if (cfgType) setType(cfgType)
              onConfigurator()
            }}
          />
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
