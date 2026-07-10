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

export type ConfigTypeId =
  | 'plantenbak'
  | 'keerwand'
  | 'borderrand'
  | 'schutting'
  | 'staptegel'
  | 'naambord'
  | 'figuur'

export type DecoState = {
  fig: string
  x: number
  y: number
  s: number
  text: string
  tx: number
  ty: number
  ts: number
  nr: string
  nx: number
  ny: number
  ns: number
  mode?: 'uitsnede' | 'graveren'
  logo?: boolean
  custom?: [number, number][][]
}

export type ConfigState = {
  typeId: ConfigTypeId
  dims: { l: number; b: number; h: number }
  thickness: number
  options: Record<string, boolean>
  deco?: DecoState
}

/**
 * Omtrek/oppervlak per eenheid figuurhoogte — identiek aan FIGURES in
 * src/data/figures.ts (herbereken met figureStats bij puntwijzigingen).
 */
const FIG_STATS: Record<string, { per: number; area: number; paths: number }> = {
  hart: { per: 3.39, area: 0.68, paths: 1 },
  ster: { per: 3.95, area: 0.36, paths: 1 },
  zon: { per: 5.3, area: 0.47, paths: 1 },
  vlinder: { per: 4.71, area: 0.79, paths: 1 },
  vogel: { per: 3.29, area: 0.34, paths: 1 },
  hond: { per: 3.61, area: 0.44, paths: 1 },
  kat: { per: 4.47, area: 0.47, paths: 1 },
  hert: { per: 4.37, area: 0.33, paths: 1 },
  boom: { per: 3.37, area: 0.3, paths: 1 },
  tulp: { per: 3.31, area: 0.29, paths: 1 },
  molen: { per: 4.24, area: 0.21, paths: 2 },
  kerk: { per: 3.52, area: 0.55, paths: 1 },
}

/** Zelfde rekengang als figureStats client-side, voor eigen silhouetten. */
function customStats(paths: [number, number][][]): { per: number; area: number; paths: number } {
  const ys = paths.flat().map((p) => p[1])
  const hgt = Math.max(...ys) - Math.min(...ys) || 1
  let per = 0
  let area = 0
  for (const pts of paths) {
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i]
      const [x2, y2] = pts[(i + 1) % pts.length]
      per += Math.hypot(x2 - x1, y2 - y1)
      area += x1 * y2 - x2 * y1
    }
  }
  return {
    per: Math.round((per / hgt) * 100) / 100,
    area: Math.round((Math.abs(area) / 2 / (hgt * hgt)) * 100) / 100,
    paths: paths.length,
  }
}

function decoStats(deco: DecoState | undefined): { per: number; area: number; paths: number } {
  if (!deco || !deco.fig) return { per: 0, area: 0, paths: 0 }
  if (deco.fig === 'custom') {
    return deco.custom?.length ? customStats(deco.custom) : { per: 0, area: 0, paths: 0 }
  }
  return FIG_STATS[deco.fig] ?? { per: 0, area: 0, paths: 0 }
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
    letterFactor: 3.2,
    graveerFactor: 0.4,
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
  staptegel: {
    dims: { l: [300, 800] },
    thicknesses: [4, 5],
    options: { roest: 25 },
  },
  naambord: {
    dims: { l: [250, 1000], h: [120, 500] },
    thicknesses: [2, 3],
    options: { roest: 25 },
  },
  figuur: {
    dims: { h: [300, 1500] },
    thicknesses: [2, 3, 4],
    options: { pennen: 9, roest: 35 },
  },
}

/** Deco-blok decoderen — zelfde formaat als encodeDeco in src/lib/cfg.ts. */
function decodeDeco(raw: string): DecoState {
  const deco: DecoState = {
    fig: '', x: 0.5, y: 0.5, s: 0.5,
    text: '', tx: 0.5, ty: 0.38, ts: 0.28,
    nr: '', nx: 0.78, ny: 0.66, ns: 0.4,
  }
  const kv = raw.split('~')
  const num = (v: string) => (parseInt(v, 10) || 0) / 1000
  for (let i = 0; i + 1 < kv.length; i += 2) {
    const value = kv[i + 1]
    switch (kv[i]) {
      case 'f': deco.fig = decodeURIComponent(value); break
      case 'x': deco.x = num(value); break
      case 'y': deco.y = num(value); break
      case 's': deco.s = num(value); break
      case 't': deco.text = decodeURIComponent(value).slice(0, 60); break
      case 'a': deco.tx = num(value); break
      case 'b': deco.ty = num(value); break
      case 'c': deco.ts = num(value); break
      case 'n': deco.nr = decodeURIComponent(value).slice(0, 6); break
      case 'd': deco.nx = num(value); break
      case 'e': deco.ny = num(value); break
      case 'g': deco.ns = num(value); break
      case 'm': deco.mode = value === 'g' ? 'graveren' : 'uitsnede'; break
      case 'l': deco.logo = value !== '0'; break
      case 'p':
        deco.custom = value
          .split('!')
          .map((path) =>
            path
              .split('_')
              .map((pair) => pair.split('-').map((n) => parseInt(n, 10) || 0) as [number, number])
              .filter((p) => p.length === 2),
          )
          .filter((path) => path.length >= 3)
        break
    }
  }
  return deco
}

export function parseCfg(raw: string): ConfigState | null {
  const [typeId, dims, thickness, opts, ...decoRest] = raw.split('.')
  if (!typeId || !(typeId in TYPES)) return null
  const [l, b, h] = (dims || '').split('x').map((n) => parseInt(n, 10) || 0)
  const options: Record<string, boolean> = {}
  for (const o of (opts || '').split('-')) if (o) options[o] = true
  const state: ConfigState = {
    typeId: typeId as ConfigTypeId,
    dims: { l, b, h },
    thickness: parseInt(thickness, 10) || 3,
    options,
  }
  // ook de plaatproducten dragen een deco-blok (accent-ontwerp)
  const hasDeco =
    typeId === 'staptegel' ||
    typeId === 'naambord' ||
    typeId === 'figuur' ||
    ACCENT_TYPES.has(typeId as ConfigTypeId)
  if (hasDeco) {
    state.deco = decoRest.length > 0 ? decodeDeco(decoRest.join('.')) : decodeDeco('')
    if (typeId === 'naambord' && decoRest.length === 0) {
      state.deco.text = 'Cortemo'
      state.deco.nr = '12'
      state.deco.s = 0.34
    }
    if (typeId === 'figuur' && decoRest.length === 0) {
      state.deco.fig = 'hert'
      state.deco.s = 1
    }
  }
  return state
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
  graveerM?: number
}

const ACCENT_TYPES = new Set<ConfigTypeId>(['plantenbak', 'keerwand', 'borderrand', 'schutting'])

function applyAccentDeco(g: Geometry, state: ConfigState, P: PricingSettings): Geometry {
  const d = state.deco
  if (!d || !ACCENT_TYPES.has(state.typeId)) return g
  const H = (state.dims.h || 0) * M
  const fig = decoStats(d)
  const chars = (d.text ?? '').replace(/\s+/g, '').length
  const figLen = fig.per * d.s * H
  const textLen = chars * P.optieTarieven.letterFactor * d.ts * H
  const len = figLen + textLen
  if (len === 0) return g
  if (d.mode !== 'graveren') {
    g.cutM += len
    g.piercings += (d.fig ? fig.paths : 0) + 2 * chars
  } else {
    g.graveerM = (g.graveerM ?? 0) + len
  }
  return g
}

function geometryFor(state: ConfigState, P: PricingSettings): Geometry {
  return applyAccentDeco(baseGeometry(state, P), state, P)
}

function baseGeometry(state: ConfigState, P: PricingSettings): Geometry {
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
    case 'staptegel': {
      const d = state.deco
      const fig = decoStats(d)
      const figLen = fig.per * (d?.s ?? 0.5) * L
      const uitsnede = d?.mode !== 'graveren'
      return {
        areaM2: Math.PI * (L / 2) ** 2,
        cutM: Math.PI * L + (uitsnede ? figLen : 0),
        piercings: 1 + (uitsnede ? fig.paths : 0),
        bends: 0,
        longBends: 0,
        weldM: 0,
        couplers: 0,
        segments: 1,
        graveerM: uitsnede ? 0 : figLen,
      }
    }
    case 'naambord': {
      const d = state.deco
      const fig = decoStats(d)
      // spaties en regeleinden snijden niet mee — identiek aan letterCount
      // in src/lib/pricing.ts
      const chars = (tekst: string) => tekst.replace(/\s+/g, '').length
      const letterLen = (tekst: string, hoogteFr: number) =>
        chars(tekst) * P.optieTarieven.letterFactor * hoogteFr * H
      const decoLen =
        fig.per * (d?.s ?? 0.3) * H +
        letterLen(d?.text ?? '', d?.ts ?? 0.28) +
        letterLen(d?.nr ?? '', d?.ns ?? 0.4)
      const letters = chars(d?.text ?? '') + chars(d?.nr ?? '')
      const uitsnede = d?.mode !== 'graveren'
      return {
        areaM2: L * H,
        cutM: 2 * (L + H) + (uitsnede ? decoLen : 0),
        piercings: 1 + 4 + (uitsnede ? 2 * letters + fig.paths : 0),
        bends: 0,
        longBends: 0,
        weldM: 0,
        couplers: 0,
        segments: 1,
        graveerM: uitsnede ? 0 : decoLen,
      }
    }
    case 'figuur': {
      const fig = decoStats(state.deco)
      return {
        areaM2: fig.area * H * H,
        cutM: fig.per * H,
        piercings: Math.max(1, fig.paths),
        bends: 0,
        longBends: 0,
        weldM: 0,
        couplers: 0,
        segments: 1,
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
  const cutting =
    g.cutM * rateFor(P.snijden.tariefPerM, state.thickness) +
    g.piercings * P.snijden.insteek +
    (g.graveerM ?? 0) * rateFor(P.snijden.tariefPerM, state.thickness) * P.optieTarieven.graveerFactor
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
  if (state.typeId === 'figuur' && decoStats(state.deco).per === 0) {
    errors.push('Een silhouet vereist een figuur uit de bibliotheek of een eigen foto-silhouet.')
  }
  return errors
}
