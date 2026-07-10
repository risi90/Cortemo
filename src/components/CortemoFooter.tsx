import { GROUPS } from '../data/catalog'

type FooterCol = { title: string; links: [string, string][] }

// bij render opgebouwd zodat beheerde collectienamen meebewegen
const footerCols = (): FooterCol[] => [
  {
    title: 'Assortiment',
    links: [
      ...GROUPS.map((g): [string, string] => [g.label, '/collectie/' + g.id]),
      ['Configurator', '/maatwerk'],
    ],
  },
  {
    title: 'Bedrijf',
    links: [
      ['Ons verhaal', '/verhaal'],
      ['Zakelijk portal (B2B)', '/zakelijk'],
      ['Contact', 'mailto:hallo@cortemo.nl'],
      ['Werken bij Cortemo', 'mailto:hallo@cortemo.nl?subject=Werken%20bij%20Cortemo'],
      ['Beheer', '/beheer'],
    ],
  },
  {
    title: 'Service',
    links: [
      ['Veelgestelde vragen', '/service#faq'],
      ['Levering & retour', '/service#levering'],
      ['Algemene voorwaarden', '/service#voorwaarden'],
      ['Privacyverklaring', '/service#privacy'],
    ],
  },
]

export function CortemoFooter() {
  return (
    <footer className="cortemo-footer mt-3 rounded-2xl px-6 py-10 text-white sm:mt-4 sm:rounded-3xl md:mt-6 md:px-12 md:py-14">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="col-span-2 md:col-span-1">
          <div className="text-[17px] font-extrabold tracking-[-.03em] text-white">
            CORTEMO<span className="text-rust">.</span>
          </div>
          <p className="mt-3 max-w-[260px] text-[13px] leading-relaxed text-white/50">
            Maatwerk cortenstaal. Tot op de millimeter, naadloos gelast, geleverd door heel
            Nederland en Belgi&euml;.
          </p>
          <div className="mt-5 space-y-1 text-[13px] text-white/50">
            <div>
              <a
                href="mailto:hallo@cortemo.nl"
                className="text-white/70 transition-colors hover:text-white"
              >
                hallo@cortemo.nl
              </a>
            </div>
            <div>Staalstraat 12, 5223 AL &rsquo;s-Hertogenbosch</div>
            <div>KvK 87654321 &middot; BTW NL003456789B01</div>
          </div>
        </div>
        {footerCols().map((col) => (
          <div key={col.title}>
            <div className="text-[11px] font-semibold uppercase tracking-[.16em] text-white/40">
              {col.title}
            </div>
            <ul className="mt-4 space-y-2.5">
              {col.links.map(([label, href]) => (
                <li key={label}>
                  <a
                    href={href}
                    className="text-[13px] text-white/70 transition-colors hover:text-white"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-10 flex max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-[12px] text-white/40">
        <span>&copy; 2026 Cortemo. Alle prijzen incl. btw.</span>
        <span>Corten 3 mm &middot; 10 tot 15 werkdagen levertijd</span>
      </div>
    </footer>
  )
}
