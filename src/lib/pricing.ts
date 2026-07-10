import {
  configType,
  type ConfigTypeId,
  type DimensionKey,
} from '../data/configuratorSchema'
import { getPricing } from './adminStore'

export type ConfigState = {
  typeId: ConfigTypeId
  /** Maten in mm. */
  dims: Record<DimensionKey, number>
  /** Staaldikte in mm. */
  thickness: number
  options: Record<string, boolean>
}

export type PriceBreakdown = {
  /** Plaatoppervlak in m² (uitgeslagen). */
  areaM2: number
  /** Lasnaadlengte in m. */
  weldM: number
  /** Gewicht in kg, incl. optie-gewicht. */
  weightKg: number
  material: number
  labor: number
  optionsTotal: number
  base: number
  total: number
}

const M = 1 / 1000 // mm → m

/**
 * Uitgeslagen plaatoppervlak en lasnaadlengte per producttype. Bewust simpele,
 * eerlijke benaderingen: dit is een calculator, geen CAM-nesting.
 */
function geometryFor(state: ConfigState): { areaM2: number; weldM: number } {
  const { l = 0, b = 0, h = 0 } = state.dims
  const [L, B, H] = [l * M, b * M, h * M]
  switch (state.typeId) {
    case 'plantenbak': {
      let area = 2 * (L * H) + 2 * (B * H)
      if (state.options.bodem) area += L * B
      const weld = 4 * H + (state.options.bodem ? 2 * (L + B) : 0)
      return { areaM2: area, weldM: weld }
    }
    case 'keerwand': {
      // wand + gevouwen voet van 30 cm; vouwen is geen laswerk
      const foot = 0.3
      return { areaM2: L * (H + foot), weldM: 0.4 /* koppelstrips */ }
    }
    case 'borderrand':
      return { areaM2: L * H, weldM: 0.2 }
    case 'schutting': {
      // paneel + 2 verborgen staanders (koker 60 mm, 4 zijden)
      const posts = 2 * (H * 0.06 * 4)
      return { areaM2: L * H + posts, weldM: 4 * H * 0.06 * 4 }
    }
  }
}

export function calcPrice(state: ConfigState): PriceBreakdown {
  // tarieven komen uit het schema, met eventuele admin-overrides eroverheen
  const PRICING = getPricing()
  const type = configType(state.typeId)
  const { areaM2, weldM } = geometryFor(state)
  const t = state.thickness * M
  const steelKg = areaM2 * t * PRICING.density
  const optionWeight = type.options.reduce(
    (s, o) => s + (state.options[o.id] ? (o.weightKg ?? 0) : 0),
    0,
  )

  const material = steelKg * PRICING.steelPerKg
  const labor = weldM * PRICING.weldPerM
  const perMeterFactor = (state.dims.l ?? 0) * M
  const optionsTotal = type.options.reduce((s, o) => {
    if (!state.options[o.id]) return s
    // opties "per meter" (zoals grondpennen) schalen met de lengte
    const qty = o.label.includes('per meter') ? Math.max(1, Math.ceil(perMeterFactor)) : 1
    return s + o.price * qty
  }, 0)

  const total = material + labor + optionsTotal + PRICING.base
  return {
    areaM2,
    weldM,
    weightKg: Math.round((steelKg + optionWeight) * 10) / 10,
    material,
    labor,
    optionsTotal,
    base: PRICING.base,
    total: Math.round(total * 100) / 100,
  }
}
