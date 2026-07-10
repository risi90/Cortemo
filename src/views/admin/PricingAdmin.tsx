import { useEffect, useState } from 'react'
import { PRICING } from '../../data/configuratorSchema'
import { fetchPricing, getPricing, resetPricing, savePricing, type PricingSettings } from '../../lib/adminStore'
import { Card, fieldSm } from './ui'

type ParamDef = {
  path: string
  label: string
  unit: string
  hint?: string
  /** Fractie in het model, percentage in de UI. */
  percent?: boolean
}

/** 1-op-1 de parameters uit het blad "Parameters prijsmodel". */
const PARAM_GROUPS: [string, ParamDef[]][] = [
  [
    'A. Staal (Corten A / S355J0WP)',
    [
      { path: 'staal.prijsPerKg.2', label: 'Staalprijs plaat 2 mm', unit: '€/kg', hint: 'inkoop incl. certificaat' },
      { path: 'staal.prijsPerKg.3', label: 'Staalprijs plaat 3 mm', unit: '€/kg' },
      { path: 'staal.prijsPerKg.4', label: 'Staalprijs plaat 4 mm', unit: '€/kg' },
      { path: 'staal.prijsPerKg.5', label: 'Staalprijs plaat 5 mm', unit: '€/kg' },
      { path: 'staal.uitvalPct', label: 'Uitval / nesting-toeslag', unit: '%', percent: true, hint: 'snijverlies dat wél betaald wordt' },
      { path: 'staal.maxPlaatL', label: 'Max. plaatlengte leverancier', unit: 'mm' },
      { path: 'staal.maxPlaatB', label: 'Max. plaatbreedte leverancier', unit: 'mm' },
    ],
  ],
  [
    'B. Lasersnijden',
    [
      { path: 'snijden.tariefPerM.2', label: 'Snijtarief 2 mm', unit: '€/m' },
      { path: 'snijden.tariefPerM.3', label: 'Snijtarief 3 mm', unit: '€/m' },
      { path: 'snijden.tariefPerM.4', label: 'Snijtarief 4 mm', unit: '€/m' },
      { path: 'snijden.tariefPerM.5', label: 'Snijtarief 5 mm', unit: '€/m' },
      { path: 'snijden.insteek', label: 'Insteekprijs (piercing)', unit: '€/insteek' },
    ],
  ],
  [
    'C. Zetwerk (kantbank)',
    [
      { path: 'zetten.perZetting', label: 'Prijs per zetting', unit: '€/zetting' },
      { path: 'zetten.toeslagLang', label: 'Toeslag lange zetting', unit: '€/zetting' },
      { path: 'zetten.drempelLang', label: 'Drempel lange zetting', unit: 'mm' },
      { path: 'zetten.maxZetlengte', label: 'Max. zetlengte kantbank', unit: 'mm' },
      { path: 'zetten.flensBreedte', label: 'Breedte gezette rand (flens)', unit: 'mm' },
    ],
  ],
  [
    'D. Lassen, walsen & koppelen',
    [
      { path: 'lassen.zichtnaadPerM', label: 'Lassen + strak slijpen (zichtnaad)', unit: '€/m' },
      { path: 'lassen.walsenPerM', label: 'Walsen mantel', unit: '€/m' },
      { path: 'lassen.randRondPerM', label: 'Randafwerking / bodemnaad', unit: '€/m' },
      { path: 'lassen.koppelset', label: 'Koppelset segmentverbinding', unit: '€/stuk' },
    ],
  ],
  [
    'E. Opties & up-sells',
    [
      { path: 'optieTarieven.afwateringsgat', label: 'Afwateringsgat', unit: '€/gat' },
      { path: 'optieTarieven.roestPerM2', label: 'Versneld roestproces', unit: '€/m²' },
      { path: 'optieTarieven.coatingPerM2', label: 'Anti-vlek coating', unit: '€/m²' },
      { path: 'optieTarieven.wielenset', label: 'Verborgen wielenset', unit: '€/set' },
      { path: 'optieTarieven.grondpen', label: 'Grondpen borderrand', unit: '€/stuk' },
      { path: 'optieTarieven.pennenPerStuk', label: 'Grondpennen per border-stuk', unit: 'stuks' },
      { path: 'optieTarieven.maxStukBorder', label: 'Max. stuklengte borderrand', unit: 'mm' },
      { path: 'optieTarieven.overlapBorder', label: 'Overlap per koppeling', unit: 'mm' },
    ],
  ],
  [
    'F. Order, verpakking & transport',
    [
      { path: 'order.startkosten', label: 'Orderstartkosten', unit: '€/order' },
      { path: 'order.programmeren', label: 'Programmeerkosten uniek ontwerp', unit: '€/ontwerp' },
      { path: 'order.dxfToeslag', label: 'DXF-verwerkingstoeslag', unit: '€/bestand' },
      { path: 'order.nestingfactorDxf', label: 'Nestingfactor DXF', unit: 'factor' },
      { path: 'logistiek.verpakking.S', label: 'Verpakking klasse S', unit: '€' },
      { path: 'logistiek.verpakking.M', label: 'Verpakking klasse M', unit: '€' },
      { path: 'logistiek.verpakking.L', label: 'Verpakking klasse L', unit: '€' },
      { path: 'logistiek.verpakking.XL', label: 'Verpakking klasse XL', unit: '€' },
      { path: 'logistiek.gewichtsgrens.S', label: 'Gewichtsgrens klasse S', unit: 'kg' },
      { path: 'logistiek.gewichtsgrens.M', label: 'Gewichtsgrens klasse M', unit: 'kg' },
      { path: 'logistiek.gewichtsgrens.L', label: 'Gewichtsgrens klasse L', unit: 'kg', hint: 'daarboven = XL' },
      { path: 'logistiek.transportNL.S', label: 'Transport NL — S', unit: '€' },
      { path: 'logistiek.transportNL.M', label: 'Transport NL — M', unit: '€' },
      { path: 'logistiek.transportNL.L', label: 'Transport NL — L', unit: '€' },
      { path: 'logistiek.transportNL.XL', label: 'Transport NL — XL', unit: '€' },
      { path: 'logistiek.transportBE.S', label: 'Transport BE — S', unit: '€' },
      { path: 'logistiek.transportBE.M', label: 'Transport BE — M', unit: '€' },
      { path: 'logistiek.transportBE.L', label: 'Transport BE — L', unit: '€' },
      { path: 'logistiek.transportBE.XL', label: 'Transport BE — XL', unit: '€' },
    ],
  ],
  [
    'G. Commercieel',
    [
      { path: 'commercieel.margePct', label: 'Marge op productiekost (B2C)', unit: '%', percent: true },
      { path: 'commercieel.b2bBasis', label: 'B2B-korting — basis', unit: '%', percent: true },
      { path: 'commercieel.b2bZilver', label: 'B2B-korting — zilver', unit: '%', percent: true },
      { path: 'commercieel.b2bGoud', label: 'B2B-korting — goud', unit: '%', percent: true },
      { path: 'commercieel.btwPct', label: 'Btw-tarief', unit: '%', percent: true },
    ],
  ],
  [
    'H. Fabricage (uitslagen voor Profirst & Delem)',
    [
      { path: 'fabricage.kFactor', label: 'K-factor uitslagberekening', unit: 'factor', hint: '0,40–0,45 bij luchtbuigen; kalibreer op de kantbank' },
      { path: 'fabricage.radiusFactor', label: 'Binnenradius (× plaatdikte)', unit: '× t', hint: '≈ 1 bij V-opening 8×t' },
    ],
  ],
]

function getPath(obj: unknown, path: string): number {
  return path.split('.').reduce<unknown>((acc, key) => (acc as Record<string, unknown>)?.[key], obj) as number
}

function setPath(obj: Record<string, unknown>, path: string, value: number): void {
  const keys = path.split('.')
  let cursor = obj
  for (const key of keys.slice(0, -1)) cursor = cursor[key] as Record<string, unknown>
  cursor[keys[keys.length - 1]] = value
}

export function PricingAdmin() {
  const [settings, setSettings] = useState<PricingSettings>(getPricing)
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    void fetchPricing().then(setSettings)
  }, [])

  const update = (def: ParamDef, raw: string) => {
    const num = parseFloat(raw)
    if (isNaN(num)) return
    const next = structuredClone(settings)
    setPath(next as unknown as Record<string, unknown>, def.path, def.percent ? num / 100 : num)
    setSettings(next)
  }

  const save = () => {
    savePricing(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  return (
    <Card
      title="Prijsmodel (1-op-1 met het calculatieblad)"
      aside={
        <button
          onClick={() => {
            resetPricing()
            setSettings(structuredClone(PRICING))
          }}
          className="text-[12px] font-semibold text-white/40 transition-colors hover:text-white"
        >
          Herstel bladwaarden
        </button>
      }
    >
      <div className="space-y-6">
        {PARAM_GROUPS.map(([title, defs]) => (
          <div key={title}>
            <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[.1em] text-rust">
              {title}
            </h3>
            <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
              {defs.map((def) => {
                const value = getPath(settings, def.path)
                return (
                  <label key={def.path} className="flex items-center justify-between gap-3 py-0.5">
                    <span className="min-w-0 text-[13px] text-white/70">
                      {def.label}
                      {def.hint && <span className="block text-[11px] text-white/40">{def.hint}</span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <input
                        type="number"
                        step="0.01"
                        value={def.percent ? Math.round(value * 1000) / 10 : value}
                        onChange={(e) => update(def, e.target.value)}
                        aria-label={def.label}
                        className={fieldSm + ' w-24 text-right tabular-nums'}
                      />
                      <span className="w-14 text-[11px] text-white/40">{def.unit}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={save}
        className={
          'mt-6 rounded-xl px-5 py-2.5 text-[14px] font-semibold text-white transition-all ' +
          (saved ? 'bg-ok' : 'bg-rust hover:bg-rust-deep')
        }
      >
        {saved ? 'Opgeslagen — direct actief in shop en calculator' : 'Opslaan'}
      </button>
    </Card>
  )
}
