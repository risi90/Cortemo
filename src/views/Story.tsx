import { ArrowRight, Factory, Heart, MapPin, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const VALUES: [LucideIcon, string, string][] = [
  [
    Heart,
    'Liefhebbers van staal',
    'Wij werken elke dag met onze handen aan een materiaal dat mooier wordt naarmate het ouder wordt. Dat is geen werk, dat is een voorrecht.',
  ],
  [
    MapPin,
    'Roots in Drenthe',
    'Nuchter, betrouwbaar en recht door zee. Niet zeuren maar poetsen: wij leveren kwaliteit en zorgen voor blije klanten.',
  ],
  [
    Factory,
    'Onderdeel van een grote fabriek',
    'Cortemo is de webshop van een volwaardige metaalfabriek met jarenlange ervaring in de staalindustrie. Grote machines, korte lijnen.',
  ],
]

const CAPABILITIES = [
  'Metaalbewerking',
  'CNC-verspaning',
  'Lasersnijden',
  'Lassen',
  'Assemblage',
  'Plaatbewerking',
  'CNC-draaien',
  'Frezen',
  'Kanten',
]

export function Story({ onConfigurator }: { onConfigurator: () => void }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-16">
      <p className="text-[12px] font-semibold uppercase tracking-[.2em] text-rust">Ons verhaal</p>
      <h1 className="serif mt-5 max-w-3xl text-[34px] leading-[1.02] tracking-[-.03em] text-white sm:text-[44px] md:text-[56px]">
        Wij zijn liefhebbers <em className="text-white/50">van staal.</em>
      </h1>
      <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-white/65">
        Cortemo komt niet uit een kantoortuin, maar van de werkvloer. Met jarenlange ervaring in
        de staalindustrie en onze roots stevig in Drenthe maken we cortenstaal waar we zelf trots
        op zijn. Ons motto is simpel: niet zeuren maar poetsen. Kwaliteit leveren, blije klanten
        — daar doen we het voor.
      </p>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {VALUES.map(([Icon, title, text]) => (
          <div key={title} className="liquid-glass rounded-2xl p-6 text-white">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-rust">
              <Icon size={19} strokeWidth={2} />
            </span>
            <h2 className="mt-4 text-[16px] font-bold tracking-[-.01em]">{title}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-white/55">{text}</p>
          </div>
        ))}
      </div>

      {/* de fabriek achter Cortemo */}
      <div className="liquid-glass mt-12 rounded-2xl p-6 text-white sm:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-14">
          <div className="lg:max-w-md">
            <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-white/40">
              Meer dan corten
            </p>
            <h2 className="serif mt-2 text-[26px] leading-[1.05] tracking-[-.02em] sm:text-[34px]">
              Zoek je andere staalproducten? <em className="text-white/50">Alles kunnen we maken.</em>
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-white/60">
              Achter Cortemo staat een complete metaalfabriek. Van enkel stuk tot serie, van
              tekening tot gemonteerd eindproduct: onze machines en vakmensen staan ook voor jouw
              project klaar.
            </p>
            <button
              onClick={onConfigurator}
              className="mt-6 flex items-center gap-2 rounded-xl bg-rust px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-rust-deep"
            >
              Leg ons je project voor <ArrowRight size={15} strokeWidth={2} />
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2">
              {CAPABILITIES.map((c) => (
                <span
                  key={c}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-[13px] font-semibold text-white/80"
                >
                  <Sparkles size={12} strokeWidth={2} className="text-rust" />
                  {c}
                </span>
              ))}
            </div>
            <p className="mt-5 text-[12px] leading-relaxed text-white/40">
              Van cortenstaal tot RVS en constructiestaal — vraag gerust naar de mogelijkheden.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
