type FooterCol = { title: string; links: [string, string][] }

const FOOTER_COLS: FooterCol[] = [
  {
    title: 'Assortiment',
    links: [
      ['Planten & bomen', '?cat=planten'],
      ['Maatwerk componenten', '?cat=hoogte'],
      ['Vuur & water', '?cat=vuurwater'],
      ['Decoratie & praktisch', '?cat=deco'],
      ['Configurator', '#'],
    ],
  },
  {
    title: 'Bedrijf',
    links: [
      ['Ons verhaal', '?page=verhaal'],
      ['Zakelijk portal (B2B)', '?page=b2b'],
      ['Contact', '#'],
      ['Werken bij Cortemo', '#'],
      ['Beheer', '?page=admin'],
    ],
  },
  {
    title: 'Service',
    links: [
      ['Algemene voorwaarden', '#'],
      ['Privacyverklaring', '#'],
      ['Levering & retour', '#'],
      ['Veelgestelde vragen', '#'],
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
        {FOOTER_COLS.map((col) => (
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
