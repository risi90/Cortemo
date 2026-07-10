import { useMemo, useState } from 'react'
import { ArrowRight, Calculator } from 'lucide-react'
import { euro } from '../../data/catalog'
import { CONFIG_TYPES, configType, type ConfigTypeId, type DimensionKey } from '../../data/configuratorSchema'
import { calcPrice, type ConfigState } from '../../lib/pricing'
import { getPricing, type OfferLine } from '../../lib/adminStore'
import { Card, fieldSm } from './ui'

/**
 * Interne CPQ-calculator: dezelfde prijsengine als de klant-configurator,
 * maar met inkoop-inzicht (gewicht, plaat, laswerk) en partnerkorting, en
 * met één klik om te zetten naar een offerteregel.
 */
export function CalculationAdmin({ onOffer }: { onOffer: (line: OfferLine) => void }) {
  const [typeId, setTypeId] = useState<ConfigTypeId>('plantenbak')
  const type = configType(typeId)
  const defaults = () => {
    const d = { l: 0, b: 0, h: 0 } as Record<DimensionKey, number>
    for (const spec of configType(typeId).dimensions) d[spec.key] = spec.default
    return d
  }
  const [dims, setDims] = useState<Record<DimensionKey, number>>(defaults)
  const [thickness, setThickness] = useState(type.defaultThickness)
  const [options, setOptions] = useState<Record<string, boolean>>({})
  const [qty, setQty] = useState(1)
  const [discount, setDiscount] = useState(Math.round(getPricing().b2bDiscount * 100))

  const pickType = (id: ConfigTypeId) => {
    setTypeId(id)
    const t = configType(id)
    const d = { l: 0, b: 0, h: 0 } as Record<DimensionKey, number>
    for (const spec of t.dimensions) d[spec.key] = spec.default
    setDims(d)
    setThickness(t.defaultThickness)
    setOptions({})
  }

  const state: ConfigState = { typeId, dims, thickness, options }
  const price = useMemo(
    () => calcPrice(state),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [typeId, dims.l, dims.b, dims.h, thickness, JSON.stringify(options)],
  )
  const partnerPrice = price.total * (1 - discount / 100)

  const descr =
    type.label +
    ' op maat, ' +
    type.dimensions.map((d) => dims[d.key]).join(' × ') +
    ' mm, ' +
    thickness +
    ' mm corten' +
    type.options
      .filter((o) => options[o.id])
      .map((o) => ', ' + o.label.toLowerCase())
      .join('')

  return (
    <div className="space-y-4">
      <Card title="Calculatie maatwerk">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {CONFIG_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => pickType(t.id)}
                  className={
                    'rounded-lg border px-3 py-2 text-[13px] font-semibold transition-all ' +
                    (t.id === typeId
                      ? 'border-rust bg-white/10 text-white'
                      : 'border-transparent bg-white/5 text-white/55 hover:text-white')
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {type.dimensions.map((spec) => (
                <label key={spec.key} className="block">
                  <span className="mb-1 block text-[12px] font-semibold text-white/70">
                    {spec.label}
                  </span>
                  <input
                    type="number"
                    value={dims[spec.key]}
                    min={spec.min}
                    max={spec.max}
                    onChange={(e) =>
                      setDims((d) => ({
                        ...d,
                        [spec.key]: Math.min(spec.max, Math.max(spec.min, +e.target.value || spec.min)),
                      }))
                    }
                    className={fieldSm + ' w-full tabular-nums'}
                  />
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              {type.thicknesses.map((t) => (
                <button
                  key={t}
                  onClick={() => setThickness(t)}
                  className={
                    'flex-1 rounded-lg border py-2 text-[13px] font-semibold tabular-nums transition-all ' +
                    (t === thickness
                      ? 'border-rust bg-white/10 text-white'
                      : 'border-transparent bg-white/5 text-white/55 hover:text-white')
                  }
                >
                  {t} mm
                </button>
              ))}
            </div>
            <div className="space-y-1">
              {type.options.map((o) => (
                <label key={o.id} className="flex cursor-pointer items-center gap-2.5 text-[13px] text-white/80">
                  <input
                    type="checkbox"
                    checked={!!options[o.id]}
                    onChange={() => setOptions((s) => ({ ...s, [o.id]: !s[o.id] }))}
                    className="h-4 w-4 rounded accent-[#C14A19]"
                  />
                  {o.label}
                  <span className="text-[12px] text-white/45">
                    {o.price > 0 ? '+ ' + euro(o.price) : ''}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-xl bg-white/5 p-4 text-[13px]">
            <div className="mb-1 flex items-center gap-2 font-bold">
              <Calculator size={14} strokeWidth={2} className="text-rust" /> Kostprijsopbouw
            </div>
            <div className="flex justify-between text-white/60">
              <span>Uitgeslagen plaat</span>
              <span className="tabular-nums">{price.areaM2.toFixed(2)} m²</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>Gewicht</span>
              <span className="tabular-nums">{price.weightKg} kg</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>Materiaal</span>
              <span className="tabular-nums">{euro(price.material)}</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>Lassen &amp; afwerken ({price.weldM.toFixed(1)} m naad)</span>
              <span className="tabular-nums">{euro(price.labor)}</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>Opties + startkosten</span>
              <span className="tabular-nums">{euro(price.optionsTotal + price.base)}</span>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-2 text-[15px] font-extrabold">
              <span>Verkoopprijs incl. btw</span>
              <span className="tabular-nums">{euro(price.total)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-white/70">
              <label className="flex items-center gap-2">
                Partnerkorting
                <input
                  type="number"
                  min={0}
                  max={40}
                  value={discount}
                  onChange={(e) => setDiscount(+e.target.value)}
                  className={fieldSm + ' w-16 text-right tabular-nums'}
                />
                %
              </label>
              <span className="font-bold tabular-nums text-rust">{euro(partnerPrice)}</span>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <label className="flex items-center gap-2 text-white/70">
                Aantal
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, +e.target.value))}
                  className={fieldSm + ' w-16 text-right tabular-nums'}
                />
              </label>
              <button
                onClick={() => onOffer({ descr, qty, price: Math.round(price.total * 100) / 100 })}
                className="ml-auto flex items-center gap-2 rounded-xl bg-rust px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-rust-deep"
              >
                Zet om naar offerte <ArrowRight size={14} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </Card>
      <Card>
        <p className="text-[13px] leading-relaxed text-white/55">
          Deze calculator gebruikt exact dezelfde prijsengine als de klant-configurator (tarieven
          uit &ldquo;Configurator &amp; prijzen&rdquo;). De regel gaat met verkoopprijs de offerte
          in; pas daar eventueel handmatig aan.
        </p>
      </Card>
    </div>
  )
}
