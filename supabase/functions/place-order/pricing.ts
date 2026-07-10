/**
 * Deno-port van de prijsengine voor server-side orderverificatie.
 *
 * LET OP: dit is bewust een kopie van src/lib/pricing.ts + de relevante
 * delen van src/data/configuratorSchema.ts. Wijzig je daar de formules,
 * maatgrenzen of bladdefaults, werk dan ook dit bestand bij en herdeploy
 * de place-order functie — anders keurt de server correcte klantprijzen af.
 * De tarieven zelf komen live uit cortemo_settings (key 'pricing') en
 * hoeven hier dus NIET bijgewerkt te worden.
 */

export type ConfigTypeId = 'plantenbak' | 'keerwand' | 'borderrand' | 'schutting'

export type ConfigState = {
  typeId: ConfigTypeId
  dims: { l: number; b: number; h: number }
  thickness: number
  options: Record<string, boolean>
}

/** Bladdefaults — identiek aan PRICING in configuratorSchema.ts. */
export const PRICING = {
  staal: {
    prijsPerKg: { 2: 1.85, 3: 1.75, 4: 1.7, 5: 1.65 } as Record<number, number>,
    uitvalPct: 0.12,
    dichtheid: 7850,
    maxPlaatL: 3000,
    maxPlaatB: 1500,
  },
  snijden: {
    tariefPerM: { 2: 1.4, 3: 1.8, 4: 2.2, 5: 2.7 } as Record<number, number>,
    insteek: 0.35,
  },
  zetten: {
    perZetting: 6.5,
    toeslagLang: 4,
    drempelLang: 3000,
    maxZetlengte: 4000,
    flensBreedte: 40,
  },
  lassen: { zichtnaadPerM: 28, walsenPerM: 12, randRondPerM: 9, koppelset: 17.5 },
  optieTarieven: {
    afwateringsgat: 0.9,
    roestPerM2: 14,
    coatingPerM2: 19,
    wielenset: 65,
    grondpen: 2.4,
    pennenPerStuk: 2,
    maxStukBorder: 2300,
    overlapBorder: 60,
  },
  order: { startkosten: 15, programmeren: 12.5, dxfToeslag: 7.5, nestingfactorDxf: 1.15 },
  logistiek: {
    verpakking: { S: 6, M: 14, L: 32, XL: 55 },
    gewichtsgrens: { S: 30, M: 100, L: 250 },
    transportNL: { S: 8.5, M: 14.5, L: 39, XL: 89 },
    transportBE: { S: 10.5, M: 17.5, L: 49, XL: 109 },
  },
  commercieel: { margePct: 0.45, b2bBasis: 0.1, b2bZilver: 0.15, b2bGoud: 0.2, btwPct: 0.21 },
}

export type PricingSettings = typeof PRICING

/** Maatgrenzen, diktes en opties per type — identiek aan CONFIG_TYPES. */
const TYPES: Record<
  ConfigTypeId,
  {
    dims: Partial<Record<'l' | 'b' | 'h', [number, number]>>
    thicknesses: number[]
    options: Record<string, number>
  }
> = {
  plantenbak: {
    dims: { l: [300, 3000], b: [300, 1500], h: [200, 1200] },
    thicknesses: [2, 3, 4],
    options: { bodem: 0, wielen: 39, roest: 45 },
  },
  keerwand: {
    dims: { l: [500, 4000], h: [300, 1500] },
    thicknesses: [3, 4, 5],
    options: { coating: 29, roest: 45 },
  },
  borderrand: {
    dims: { l: [1000, 4000], h: [100, 400] },
    thicknesses: [2, 3],
    options: { pennen: 7, roest: 25 },
  },
  schutting: {
    dims: { l: [900, 2400], h: [1200, 2000] },
    thicknesses: [2, 3],
    options: { laser: 140, poeren: 49, roest: 45 },
  },
}

export function parseCfg(raw: string): ConfigState | null {
  const [typeId, dims, thickness, opts] = raw.split('.')
  if (!typeId || !(typeId in TYPES)) return null
  const [l, b, h] = (dims || '').split('x').map((n) => parseInt(n, 10) || 0)
  const options: Record<string, boolean> = {}
  for (const o of (opts || '').split('-')) if (o) options[o] = true
  return { typeId: typeId as ConfigTypeId, dims: { l, b, h }, thickness: parseInt(thickness, 10) || 3, options }
}

/** Per-blok merge van opgeslagen tarieven over de bladdefaults. */
export function mergePricing(raw: unknown): PricingSettings {
  const base = structuredClone(PRICING) as unknown as Record<string, Record<string, unknown>>
  if (!raw || typeof raw !== 'object' || !('staal' in (raw as object))) {
    return base as unknown as PricingSettings
  }
  const source = raw as Record<string, Record<string, unknown>>
  for (const blok of Object.keys(base)) {
    const rawBlok = source[blok]
    if (!rawBlok || typeof rawBlok !== 'object') continue
    for (const key of Object.keys(base[blok])) {
      const d = base[blok][key]
      const r = rawBlok[key]
      if (r === undefined) continue
      base[blok][key] = d && typeof d === 'object' ? { ...(d as object), ...(r as object) } : r
    }
  }
  return base as unknown as PricingSettings
}

const M = 1 / 1000

type Geometry = {
  areaM2: number
  cutM: number
  piercings: number
  bends: number
  longBends: number
  weldM: number
  couplers: number
  segments: number
}

function geometryFor(state: ConfigState, P: PricingSettings): Geometry {
  const { l = 0, b = 0, h = 0 } = state.dims
  const [L, B, H] = [l * M, b * M, h * M]
  const flens = P.zetten.flensBreedte * M

  switch (state.typeId) {
    case 'plantenbak': {
      const strip = 2 * (L + B)
      const stripSegments = Math.max(1, Math.ceil(strip / (P.zetten.maxZetlengte * M)))
      let area = strip * (H + flens)
      let cut = 2 * strip + 2 * stripSegments * (H + flens)
      let piercings = stripSegments
      const bends = Math.max(0, 4 - stripSegments) + 4
      const longBends = [l, b, l, b].filter((zijde) => zijde > P.zetten.drempelLang).length
      const weld = stripSegments * H
      const bodem = state.options.bodem || state.options.wielen
      if (bodem) {
        area += L * B
        cut += 2 * (L + B)
        piercings += 1 + 4
      }
      return { areaM2: area, cutM: cut, piercings, bends, longBends, weldM: weld, couplers: 0, segments: stripSegments }
    }
    case 'keerwand': {
      const voet = 0.3
      const segments = Math.max(1, Math.ceil(l / P.staal.maxPlaatL))
      const segL = L / segments
      const area = L * (H + voet + flens)
      const cut = segments * (2 * segL + 2 * (H + voet + flens))
      const bends = segments * 2
      const longBends = segL * 1000 > P.zetten.drempelLang ? segments * 2 : 0
      return { areaM2: area, cutM: cut, piercings: segments, bends, longBends, weldM: 0, couplers: segments - 1, segments }
    }
    case 'borderrand': {
      const maxStuk = P.optieTarieven.maxStukBorder - P.optieTarieven.overlapBorder
      const segments = Math.max(1, Math.ceil(l / maxStuk))
      const totL = L + (segments - 1) * P.optieTarieven.overlapBorder * M
      const area = totL * H
      const cut = segments * 2 * (totL / segments + H)
      return { areaM2: area, cutM: cut, piercings: segments, bends: 0, longBends: 0, weldM: 0, couplers: 0, segments }
    }
    case 'schutting': {
      const staanderOmtrek = 0.06 * 4
      const area = L * H + 2 * H * staanderOmtrek
      let cut = 2 * (L + H) + 2 * (2 * H + 2 * staanderOmtrek)
      let piercings = 3
      const panelSplit = Math.min(L, H) > P.staal.maxPlaatB * M && Math.max(L, H) > P.staal.maxPlaatB * M
      if (state.options.laser) {
        cut += L * H * 4
        piercings += Math.round(L * H * 25)
      }
      return {
        areaM2: area,
        cutM: cut,
        piercings,
        bends: 2 * 3,
        longBends: 0,
        weldM: 1.2 + (panelSplit ? Math.min(L, H) : 0),
        couplers: 0,
        segments: panelSplit ? 2 : 1,
      }
    }
  }
}

function rateFor(table: Record<number, number>, thickness: number): number {
  const keys = Object.keys(table).map(Number)
  const nearest = keys.reduce((a, k) => (Math.abs(k - thickness) < Math.abs(a - thickness) ? k : a), keys[0])
  return table[nearest]
}

const r2 = (v: number) => Math.round(v * 100) / 100

/** Verkoopprijs incl. btw — identieke rekengang als calcPrice client-side. */
export function calcTotal(state: ConfigState, P: PricingSettings): number {
  const g = geometryFor(state, P)
  const t = state.thickness * M

  const areaVerrekend = g.areaM2 * (1 + P.staal.uitvalPct)
  const weightKg = Math.round(g.areaM2 * t * P.staal.dichtheid * 10) / 10
  const material = areaVerrekend * t * P.staal.dichtheid * rateFor(P.staal.prijsPerKg, state.thickness)
  const cutting = g.cutM * rateFor(P.snijden.tariefPerM, state.thickness) + g.piercings * P.snijden.insteek
  const bending = g.bends * P.zetten.perZetting + g.longBends * P.zetten.toeslagLang

  const bodemRand =
    state.typeId === 'plantenbak' && (state.options.bodem || state.options.wielen)
      ? 2 * (state.dims.l + state.dims.b) * M * P.lassen.randRondPerM
      : 0
  const welding = g.weldM * P.lassen.zichtnaadPerM + g.couplers * P.lassen.koppelset + bodemRand

  let optionsTotal = 0
  for (const optId of Object.keys(TYPES[state.typeId].options)) {
    if (!state.options[optId]) continue
    switch (optId) {
      case 'roest':
        optionsTotal += g.areaM2 * P.optieTarieven.roestPerM2
        break
      case 'coating':
        optionsTotal += g.areaM2 * P.optieTarieven.coatingPerM2
        break
      case 'wielen':
        optionsTotal += P.optieTarieven.wielenset
        break
      case 'pennen':
        optionsTotal += g.segments * P.optieTarieven.pennenPerStuk * P.optieTarieven.grondpen
        break
      case 'bodem':
      case 'laser':
        break
      default:
        optionsTotal += TYPES[state.typeId].options[optId]
    }
  }

  const orderCosts = P.order.startkosten + P.order.programmeren
  const shippingClass =
    weightKg <= P.logistiek.gewichtsgrens.S
      ? 'S'
      : weightKg <= P.logistiek.gewichtsgrens.M
        ? 'M'
        : weightKg <= P.logistiek.gewichtsgrens.L
          ? 'L'
          : 'XL'
  const packaging = P.logistiek.verpakking[shippingClass]
  const transport = P.logistiek.transportNL[shippingClass]

  const production = material + cutting + bending + welding + optionsTotal + orderCosts
  const margin = production * P.commercieel.margePct
  const exVat = production + margin + packaging + transport
  return r2(exVat * (1 + P.commercieel.btwPct))
}

/** Blokkerende fabricage-/maatvalidatie; leeg = bestelbaar. */
export function validateConfig(state: ConfigState, P: PricingSettings): string[] {
  const errors: string[] = []
  const type = TYPES[state.typeId]
  const { l = 0, b = 0, h = 0 } = state.dims

  // schema-grenzen: buiten de sliderranges is geen geldige configuratie
  for (const [key, range] of Object.entries(type.dims)) {
    const value = state.dims[key as 'l' | 'b' | 'h'] || 0
    if (value < range[0] || value > range[1]) {
      errors.push(`Maat ${key} = ${value} mm valt buiten het toegestane bereik ${range[0]}–${range[1]} mm.`)
    }
  }
  if (!type.thicknesses.includes(state.thickness)) {
    errors.push(`Staaldikte ${state.thickness} mm is niet beschikbaar voor dit producttype.`)
  }
  for (const optId of Object.keys(state.options)) {
    if (state.options[optId] && !(optId in type.options)) {
      errors.push(`Optie "${optId}" bestaat niet voor dit producttype.`)
    }
  }

  const g = geometryFor(state, P)
  const longest = Math.max(l, b, h)
  const stukL = state.typeId === 'keerwand' || state.typeId === 'borderrand' ? l / g.segments : longest
  if (stukL > P.staal.maxPlaatL) {
    errors.push(`Deelstuk van ${Math.round(stukL)} mm overschrijdt de plaat-/transportgrens van ${P.staal.maxPlaatL} mm.`)
  }
  if (state.typeId === 'keerwand' && l / g.segments > P.zetten.maxZetlengte) {
    errors.push(`De voetzetting per segment overschrijdt de maximale zetlengte van ${P.zetten.maxZetlengte} mm.`)
  }
  return errors
}
