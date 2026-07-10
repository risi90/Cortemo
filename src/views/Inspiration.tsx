import { useState } from 'react'
import { Flame, Leaf, TreePine } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { GROUP_IMG, type GroupId } from '../data/catalog'

type ProjectTag = 'Stadstuinen' | 'Voortuinen' | 'Zakelijk & Horeca'

type Project = {
  id: string
  title: string
  desc: string
  tag: ProjectTag
  /** Groep waarnaar "Shop deze look" verwijst. */
  group: GroupId
  img?: string
  icon: LucideIcon
  /** Hoogte van de kaart, voor het editorial masonry-ritme. */
  h: string
}

const PROJECTS: Project[] = [
  {
    id: 'stadstuin-keerwanden',
    title: 'Moderne stadstuin met U-vormige keerwanden',
    desc: 'Twee niveaus, gescheiden door naadloos gelaste keerwanden van 60 cm hoog. Het gazon loopt strak door tot tegen het staal.',
    tag: 'Stadstuinen',
    group: 'hoogte',
    img: GROUP_IMG.hoogte,
    icon: TreePine,
    h: 'h-[420px]',
  },
  {
    id: 'entree-cubo',
    title: 'Symmetrische entree met Cubo-bakken',
    desc: 'Twee kubusbakken van 80 cm flankeren de voordeur, beplant met meerstammige krentenboompjes.',
    tag: 'Voortuinen',
    group: 'planten',
    img: GROUP_IMG.planten,
    icon: Leaf,
    h: 'h-[300px]',
  },
  {
    id: 'lounge-vuurschaal',
    title: 'Loungehoek rond vuurschaal Fuoco',
    desc: 'Een verdiepte zithoek met de vuurschaal als middelpunt, omzoomd door een cortenstalen borderrand.',
    tag: 'Stadstuinen',
    group: 'vuurwater',
    img: GROUP_IMG.vuurwater,
    icon: Flame,
    h: 'h-[340px]',
  },
  {
    id: 'terras-brasserie',
    title: 'Terrasafscheiding voor Brasserie De Linde',
    desc: 'Veertig meter plantenbakken als windluwe terrasrand, met geïntegreerde parasolvoeten.',
    tag: 'Zakelijk & Horeca',
    group: 'planten',
    img: GROUP_IMG.planten,
    icon: Leaf,
    h: 'h-[360px]',
  },
  {
    id: 'daktuin-strijp',
    title: 'Daktuin kantoor Strijp-S',
    desc: 'Lichtgewicht bakken op maat rond de dakranden, gecombineerd met een watertafel als middelpunt.',
    tag: 'Zakelijk & Horeca',
    group: 'vuurwater',
    img: GROUP_IMG.vuurwater,
    icon: Flame,
    h: 'h-[300px]',
  },
  {
    id: 'voortuin-borderrand',
    title: 'Onderhoudsvrije voortuin met borderranden',
    desc: 'Grind, siergrassen en een strak cortenstalen lijnenspel dat het pad naar de voordeur begeleidt.',
    tag: 'Voortuinen',
    group: 'hoogte',
    img: GROUP_IMG.hoogte,
    icon: TreePine,
    h: 'h-[280px]',
  },
  {
    id: 'wandkunst-patio',
    title: 'Patio met lasergesneden wandkunst',
    desc: 'Wandpaneel Silva vangt het avondlicht en werpt een boomsilhouet op de witte tuinmuur.',
    tag: 'Stadstuinen',
    group: 'deco',
    icon: TreePine,
    h: 'h-[260px]',
  },
  {
    id: 'moestuin-verde',
    title: 'Kweektuin op werkhoogte',
    desc: 'Drie Verde-moestuinbakken in carré-opstelling, met slakkenrand en geïntegreerde beregening.',
    tag: 'Voortuinen',
    group: 'planten',
    img: GROUP_IMG.planten,
    icon: Leaf,
    h: 'h-[320px]',
  },
]

const TAGS: ('Alle projecten' | ProjectTag)[] = [
  'Alle projecten',
  'Stadstuinen',
  'Voortuinen',
  'Zakelijk & Horeca',
]

function ProjectCard({ p, onShop }: { p: Project; onShop: (g: GroupId) => void }) {
  const Icon = p.icon
  return (
    <button
      onClick={() => onShop(p.group)}
      className={'group relative mb-4 block w-full overflow-hidden rounded-2xl text-left ' + p.h}
    >
      {p.img ? (
        <img
          src={p.img}
          alt={p.title}
          draggable={false}
          className="absolute inset-0 h-full w-full select-none object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[#EAE8E3]">
          <Icon size={40} strokeWidth={1.5} className="text-ink/25" />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent transition-opacity duration-300 group-hover:opacity-90" />
      <div className="on-media pointer-events-none absolute inset-x-0 bottom-0 p-5">
        <div className="text-[10px] font-semibold uppercase tracking-[.16em] text-white/60">
          {p.tag}
        </div>
        <div className="mt-1 text-[17px] font-bold leading-snug tracking-[-.01em] text-white">
          {p.title}
        </div>
        <div className="mt-1 hidden text-[12px] leading-relaxed text-white/75 opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:block">
          {p.desc}
        </div>
        <span className="mt-3 inline-flex items-center rounded-full bg-white/90 px-4 py-2 text-[12px] font-semibold text-ink shadow-sm transition-opacity duration-300 sm:opacity-0 sm:group-hover:opacity-100">
          Shop deze look &rarr;
        </span>
      </div>
    </button>
  )
}

export function Inspiration({ onShop }: { onShop: (g: GroupId) => void }) {
  const [tag, setTag] = useState<(typeof TAGS)[number]>('Alle projecten')
  const projects = PROJECTS.filter((p) => tag === 'Alle projecten' || p.tag === tag)

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-16">
      <p className="text-[12px] font-semibold uppercase tracking-[.2em] text-rust">
        Cortemo Projecten
      </p>
      <h1 className="serif mt-5 max-w-3xl text-[34px] leading-[1.0] tracking-[-.03em] text-white sm:text-[40px] md:text-[56px]">
        Laat je <em className="text-white/50">inspireren.</em>
      </h1>
      <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/60">
        Echte tuinen, terrassen en daktuinen met Cortemo cortenstaal. Zie je iets moois? Elke look
        is direct te shoppen of na te bouwen in de configurator.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        {TAGS.map((t) => (
          <button
            key={t}
            onClick={() => setTag(t)}
            className={
              'rounded-full px-4 py-2 text-[13px] font-semibold transition-all ' +
              (tag === t
                ? 'border border-rust bg-white/10 text-white shadow-sm'
                : 'border border-transparent bg-white/5 text-white/50 hover:text-white')
            }
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-10 columns-1 gap-4 sm:columns-2 lg:columns-3">
        {projects.map((p) => (
          <div key={p.id} className="break-inside-avoid">
            <ProjectCard p={p} onShop={onShop} />
          </div>
        ))}
      </div>
    </div>
  )
}
