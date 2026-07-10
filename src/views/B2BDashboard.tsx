import {
  ChevronLeft,
  FileUp,
  FolderOpen,
  LayoutDashboard,
  Package,
  Ruler,
  Settings,
  Store,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { euro } from '../data/catalog'

const NAV_ITEMS: [string, LucideIcon][] = [
  ['Dashboard', LayoutDashboard],
  ['Projecten', FolderOpen],
  ['Bestellingen', Package],
  ['DXF-uploads', FileUp],
  ['Instellingen', Settings],
]

type SavedProject = {
  name: string
  date: string
  items: number
  /** Totaal excl. btw, met partnerkorting verrekend. */
  total: number
}

const SAVED_PROJECTS: SavedProject[] = [
  { name: 'Achtertuin Fam. Jansen', date: '8 jul 2026', items: 6, total: 2840 },
  { name: 'Daktuin kantoor Strijp-S', date: '2 jul 2026', items: 14, total: 9620 },
  { name: 'Terras Brasserie De Linde', date: '27 jun 2026', items: 9, total: 5310 },
  { name: 'Voortuin project Meerhoven', date: '19 jun 2026', items: 4, total: 1265 },
]

function QuickAction({
  icon: Icon,
  title,
  sub,
  onClick,
}: {
  icon: LucideIcon
  title: string
  sub: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="liquid-glass group flex flex-col items-start gap-3 rounded-2xl p-5 text-left transition-all hover:-translate-y-0.5"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-rust">
        <Icon size={18} strokeWidth={2} />
      </span>
      <span>
        <span className="block text-[14px] font-bold text-white">{title}</span>
        <span className="mt-0.5 block text-[12px] leading-relaxed text-white/50">{sub}</span>
      </span>
    </button>
  )
}

export function B2BDashboard({
  onShop,
  onConfigure,
}: {
  onShop: () => void
  onConfigure: () => void
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10">
      <button
        onClick={onShop}
        className="flex items-center gap-1.5 text-[13px] font-semibold text-white/50 transition-colors hover:text-white"
      >
        <ChevronLeft size={15} strokeWidth={2} /> Terug naar de webshop
      </button>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* zijbalk: op mobiel een horizontale tab-rij */}
        <aside className="liquid-glass shrink-0 self-start rounded-2xl p-2 max-lg:w-full lg:w-56 lg:p-3">
          <nav className="flex gap-1 overflow-x-auto lg:flex-col">
            {NAV_ITEMS.map(([label, Icon], i) => (
              <a
                key={label}
                href="#"
                onClick={(e) => e.preventDefault()}
                className={
                  'flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-[13px] font-semibold transition-colors ' +
                  (i === 0
                    ? 'bg-white/10 text-white'
                    : 'text-white/50 hover:bg-white/5 hover:text-white')
                }
              >
                <Icon size={15} strokeWidth={2} className={i === 0 ? 'text-rust' : ''} />
                {label}
              </a>
            ))}
          </nav>
        </aside>

        {/* hoofdvlak */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-white/40">
                B2B Professionals Portal
              </p>
              <h1 className="serif mt-1 text-[28px] leading-[1.05] tracking-[-.02em] text-white sm:text-[34px]">
                Welkom terug, Groenwerk Hoveniers
              </h1>
            </div>
            <span className="rounded-full border border-rust/40 bg-rust/10 px-4 py-2 text-[13px] font-semibold text-rust">
              Jouw B2B-voordeel: 15%
            </span>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <QuickAction
              icon={Ruler}
              title="Nieuw maatwerk starten"
              sub="Ontwerp tot op de millimeter in de 3D-configurator."
              onClick={onConfigure}
            />
            <QuickAction
              icon={FileUp}
              title="Eigen DXF uploaden"
              sub="Upload je tekening en ontvang direct een calculatie."
              onClick={onConfigure}
            />
            <QuickAction
              icon={Store}
              title="Standaard assortiment"
              sub="Bestel uit de collecties met je partnerkorting."
              onClick={onShop}
            />
          </div>

          {/* opgeslagen offertes / projecten */}
          <div className="liquid-glass mt-6 rounded-2xl p-2 sm:p-3">
            <div className="flex items-baseline justify-between px-3 pb-2 pt-3 sm:px-4">
              <h2 className="text-[15px] font-bold text-white">Opgeslagen projecten</h2>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="text-[12px] font-semibold text-white/40 transition-colors hover:text-white"
              >
                Bekijk alles
              </a>
            </div>
            <div className="hidden grid-cols-[1.6fr_1fr_.7fr_1fr_1.4fr] gap-3 border-b border-white/10 px-4 pb-2 text-[11px] font-semibold uppercase tracking-[.08em] text-white/35 md:grid">
              <span>Projectnaam</span>
              <span>Datum</span>
              <span>Items</span>
              <span className="text-right">B2B-prijs</span>
              <span />
            </div>
            <ul>
              {SAVED_PROJECTS.map((p) => (
                <li
                  key={p.name}
                  className="grid grid-cols-1 gap-2 border-b border-white/5 px-3 py-4 last:border-0 sm:px-4 md:grid-cols-[1.6fr_1fr_.7fr_1fr_1.4fr] md:items-center md:gap-3"
                >
                  <span className="text-[14px] font-bold text-white">{p.name}</span>
                  <span className="text-[12px] text-white/50">
                    <span className="md:hidden">Opgeslagen op </span>
                    {p.date}
                  </span>
                  <span className="text-[12px] text-white/50">
                    {p.items} items
                  </span>
                  <span className="text-[13px] font-bold tabular-nums text-white md:text-right">
                    {euro(p.total)}
                    <span className="ml-1 text-[11px] font-medium text-white/55">excl. btw</span>
                  </span>
                  <span className="mt-1 flex items-center gap-2 md:mt-0 md:justify-end">
                    <a
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      className="whitespace-nowrap rounded-lg bg-white/5 px-3 py-2 text-[12px] font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      Hervat bewerking
                    </a>
                    <a
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      className="whitespace-nowrap rounded-lg bg-rust px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-rust-deep"
                    >
                      Direct bestellen
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
