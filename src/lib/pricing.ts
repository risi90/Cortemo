import {
  configType,
  type ConfigTypeId,
  type DimensionKey,
} from '../data/configuratorSchema'
import { figure, figureStats, type FigurePath } from '../data/figures'
import { getPricing } from './adminStore'

/**
 * Ontwerp-editor-staat: figuur, tekst en huisnummer met versleepbare
 * posities. x/y = middelpunt als fractie van de plaat, s = hoogte als
 * fractie van de plaathoogte (bij staptegel: van de diameter).
 */
export type DecoState = {
  /** Figuur-id uit FIGURES, 'custom' (eigen silhouet) of '' (geen). */
  fig: string
  x: number
  y: number
  s: number
  /** Tekst, meerdere regels via \n (bijv. alle bewoners). */
  text: string
  tx: number
  ty: number
  ts: number
  nr: string
  nx: number
  ny: number
  ns: number
  /** Lettertype voor tekst en nummer. */
  font: 'modern' | 'klassiek' | 'mono'
  /**
   * Doorlaseren (uitsnede, écht gat) of lasergraveren (donkere markering
   * in het oppervlak). Printen bieden we bewust niet: dat hecht niet
   * duurzaam op een roestlaag — gravure veroudert mee met het staal.
   */
  mode: 'uitsnede' | 'graveren'
  /** Subtiel Cortemo-merkje op het product; uit = white label (gratis). */
  logo: boolean
  /** Eigen silhouet: genormaliseerde punten 0–100 (y omlaag). */
  custom?: FigurePath[]
}

/** Aantal te snijden tekens (spaties en regeleinden snijden niet). */
export const letterCount = (tekst: string): number => tekst.replace(/\s+/g, '').length

export function defaultDeco(typeId: ConfigTypeId): DecoState {
  const base: DecoState = {
    fig: '',
    x: 0.5,
    y: 0.5,
    s: 0.5,
    text: '',
    tx: 0.5,
    ty: 0.38,
    ts: 0.28,
    nr: '',
    nx: 0.72,
    ny: 0.66,
    ns: 0.4,
    font: 'modern',
    mode: 'uitsnede',
    logo: true,
  }
  if (typeId === 'naambord') return { ...base, text: 'Cortemo', nr: '12', fig: '', x: 0.16, y: 0.6, s: 0.34 }
  if (typeId === 'figuur') return { ...base, fig: 'hert', s: 1 }
  if (configType(typeId).deco === 'accent') {
    // subtiel accent: standaard gegraveerd, klein, gecentreerd
    return { ...base, mode: 'graveren', s: 0.3, ts: 0.16, tx: 0.5, ty: 0.5 }
  }
  return base
}

/** Omtrek/oppervlak per eenheid hoogte van het gekozen figuur. */
export function decoStats(deco: DecoState | undefined): { per: number; area: number; paths: number } {
  if (!deco || !deco.fig) return { per: 0, area: 0, paths: 0 }
  if (deco.fig === 'custom' && deco.custom?.length) {
    const s = figureStats(deco.custom)
    return { ...s, paths: deco.custom.length }
  }
  const f = figure(deco.fig)
  return f ? { per: f.per, area: f.area, paths: f.paths.length } : { per: 0, area: 0, paths: 0 }
}

export type ConfigState = {
  typeId: ConfigTypeId
  /** Maten in mm. */
  dims: Record<DimensionKey, number>
  /** Staaldikte in mm. */
  thickness: number
  options: Record<string, boolean>
  deco?: DecoState
}

export type PriceBreakdown = {
  /** Verrekend plaatoppervlak in m² (uitgeslagen, incl. uitvaltoeslag). */
  areaM2: number
  /** Snijlengte in m en aantal insteken. */
  cutM: number
  piercings: number
  /** Aantal zettingen (kantbank). */
  bends: number
  /** Zichtnaad-laslengte in m. */
  weldM: number
  /** Segmenten (bij lengtes boven de plaat-/zetgrens). */
  segments: number
  /** Gewicht in kg. */
  weightKg: number
  /* kostprijsposten (excl. btw) */
  material: number
  cutting: number
  bending: number
  welding: number
  optionsTotal: number
  orderCosts: number
  packaging: number
  transport: number
  /** Volledige productiekost excl. btw. */
  productionCost: number
  /** Marge (commercieel blok). */
  margin: number
  /** Verkoopprijs excl. btw. */
  exVat: number
  /** Verkoopprijs incl. btw — dit ziet de klant. */
  total: number
  /** Verpakkings-/transportklasse. */
  shippingClass: 'S' | 'M' | 'L' | 'XL'
}

const M = 1 / 1000 // mm → m

type Geometry = {
  /** Netto plaatoppervlak m² (vóór uitvaltoeslag). */
  areaM2: number
  cutM: number
  piercings: number
  bends: number
  longBends: number
  weldM: number
  /** Koppelsets tussen segmenten. */
  couplers: number
  segments: number
  /** Lasergraveerlengte in m (tarief = snijtarief × graveerFactor). */
  graveerM?: number
}

/**
 * Uitslag per producttype: plaatoppervlak, snijlengte, zettingen en naden.
 * Bewust eenvoudige, uitlegbare benaderingen van de werkelijke uitslagen;
 * de tarieven komen 1-op-1 uit het parametersblad.
 */
/**
 * Accent-ontwerp (figuur + tekst op het vlak) bijtellen: doorgelaserd
 * telt als snijlengte met insteekjes, gegraveerd als graveerlengte.
 */
function applyAccentDeco(g: Geometry, state: ConfigState, P: ReturnType<typeof getPricing>): Geometry {
  const d = state.deco
  if (!d || configType(state.typeId).deco !== 'accent') return g
  const H = (state.dims.h || 0) * M
  const fig = decoStats(d)
  const figLen = fig.per * d.s * H
  const textLen = letterCount(d.text) * P.optieTarieven.letterFactor * d.ts * H
  const len = figLen + textLen
  if (len === 0) return g
  if (d.mode === 'uitsnede') {
    g.cutM += len
    g.piercings += (d.fig ? fig.paths : 0) + 2 * letterCount(d.text)
  } else {
    g.graveerM = (g.graveerM ?? 0) + len
  }
  return g
}

function geometryFor(state: ConfigState, P: ReturnType<typeof getPricing>): Geometry {
  return applyAccentDeco(baseGeometry(state, P), state, P)
}

function baseGeometry(state: ConfigState, P: ReturnType<typeof getPricing>): Geometry {
  const { l = 0, b = 0, h = 0 } = state.dims
  const [L, B, H] = [l * M, b * M, h * M]
  const flens = P.zetten.flensBreedte * M

  switch (state.typeId) {
    case 'plantenbak': {
      // wandstrip (2(L+B) lang, H + flens hoog). Past de strip niet op de
      // kantbank, dan wordt hij gesegmenteerd: elke extra naad is een
      // zichtnaad-hoeklas in plaats van een zetting.
      const strip = 2 * (L + B)
      const stripSegments = Math.max(1, Math.ceil(strip / (P.zetten.maxZetlengte * M)))
      let area = strip * (H + flens)
      let cut = 2 * strip + 2 * stripSegments * (H + flens)
      let piercings = stripSegments
      const bends = Math.max(0, 4 - stripSegments) + 4 // hoekzettingen + flensranden
      const longBends = [l, b, l, b].filter((zijde) => zijde > P.zetten.drempelLang).length
      let weld = stripSegments * H // zichtnaad per segmentovergang/hoek
      const bodem = state.options.bodem || state.options.wielen
      if (bodem) {
        area += L * B
        cut += 2 * (L + B)
        piercings += 1 + 4 // bodemcontour + afwateringsgaten
      }
      return { areaM2: area, cutM: cut, piercings, bends, longBends, weldM: weld, couplers: 0, segments: stripSegments }
    }
    case 'keerwand': {
      // wand + gevouwen voet (300 mm) + omgezette bovenrand; lange lengtes
      // worden gesegmenteerd op de maximale plaatlengte en gekoppeld
      const voet = 0.3
      const segments = Math.max(1, Math.ceil(l / P.staal.maxPlaatL))
      const segL = L / segments
      const area = L * (H + voet + flens)
      const cut = segments * (2 * segL + 2 * (H + voet + flens))
      const bends = segments * 2 // voetzetting + bovenrand per segment
      const longBends = segL * 1000 > P.zetten.drempelLang ? segments * 2 : 0
      return {
        areaM2: area,
        cutM: cut,
        piercings: segments,
        bends,
        longBends,
        weldM: 0,
        couplers: segments - 1,
        segments,
      }
    }
    case 'borderrand': {
      // handzame stukken met overlap; grondpennen zijn een optie
      const maxStuk = P.optieTarieven.maxStukBorder - P.optieTarieven.overlapBorder
      const segments = Math.max(1, Math.ceil(l / maxStuk))
      const totL = L + (segments - 1) * P.optieTarieven.overlapBorder * M
      const area = totL * H
      const cut = segments * 2 * (totL / segments + H)
      return {
        areaM2: area,
        cutM: cut,
        piercings: segments,
        bends: 0,
        longBends: 0,
        weldM: 0,
        couplers: 0,
        segments,
      }
    }
    case 'schutting': {
      // paneel + 2 verborgen kokerstaanders (gezette U-profielen, ingelast)
      const staanderOmtrek = 0.06 * 4
      const area = L * H + 2 * H * staanderOmtrek
      let cut = 2 * (L + H) + 2 * (2 * H + 2 * staanderOmtrek)
      let piercings = 3
      // past het paneel niet binnen de plaatmaat, dan wordt het gedeeld en
      // met een afgewerkte zichtnaad samengelast
      const panelSplit =
        Math.min(L, H) > P.staal.maxPlaatB * M && Math.max(L, H) > P.staal.maxPlaatB * M
      if (state.options.laser) {
        // organisch gatenpatroon: extra snijlengte + insteken per m² paneel
        cut += L * H * 4
        piercings += Math.round(L * H * 25)
      }
      return {
        areaM2: area,
        cutM: cut,
        piercings,
        bends: 2 * 3, // 3 zettingen per staander
        longBends: 0,
        weldM: 1.2 + (panelSplit ? Math.min(L, H) : 0),
        couplers: 0,
        segments: panelSplit ? 2 : 1,
      }
    }
    case 'staptegel': {
      // ronde schijf (l = diameter); motief doorgelaserd of gegraveerd
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
      // plaat met tekst/nummer/figuur (doorgelaserd of gegraveerd) + 4 gaten
      const d = state.deco
      const fig = decoStats(d)
      const letterLen = (tekst: string, hoogteFr: number) =>
        letterCount(tekst) * P.optieTarieven.letterFactor * hoogteFr * H
      const decoLen =
        fig.per * (d?.s ?? 0.3) * H +
        letterLen(d?.text ?? '', d?.ts ?? 0.28) +
        letterLen(d?.nr ?? '', d?.ns ?? 0.4)
      const letters = letterCount(d?.text ?? '') + letterCount(d?.nr ?? '')
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
      // het silhouet ís het product; genormaliseerde stats × hoogte
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

/** Dichtstbijzijnde geconfigureerde dikte (tarieven zijn per dikte). */
function rateFor(table: Record<number, number>, thickness: number): number {
  const keys = Object.keys(table).map(Number)
  const nearest = keys.reduce((a, k) => (Math.abs(k - thickness) < Math.abs(a - thickness) ? k : a), keys[0])
  return table[nearest]
}

export function calcPrice(state: ConfigState): PriceBreakdown {
  const P = getPricing()
  const type = configType(state.typeId)
  const g = geometryFor(state, P)
  const t = state.thickness * M

  /* A. materiaal: plaat × dikte × dichtheid × uitvaltoeslag × kg-prijs */
  const areaVerrekend = g.areaM2 * (1 + P.staal.uitvalPct)
  const weightKg = Math.round(g.areaM2 * t * P.staal.dichtheid * 10) / 10
  const material = areaVerrekend * t * P.staal.dichtheid * rateFor(P.staal.prijsPerKg, state.thickness)

  /* B. lasersnijden + lasergraveren */
  const cutting =
    g.cutM * rateFor(P.snijden.tariefPerM, state.thickness) +
    g.piercings * P.snijden.insteek +
    (g.graveerM ?? 0) * rateFor(P.snijden.tariefPerM, state.thickness) * P.optieTarieven.graveerFactor

  /* C. zetwerk */
  const bending = g.bends * P.zetten.perZetting + g.longBends * P.zetten.toeslagLang

  /* D. lassen & koppelen (bodem plantenbak via randafwerkingstarief) */
  const bodemRand =
    state.typeId === 'plantenbak' && (state.options.bodem || state.options.wielen)
      ? 2 * (state.dims.l + state.dims.b) * M * P.lassen.randRondPerM
      : 0
  const welding = g.weldM * P.lassen.zichtnaadPerM + g.couplers * P.lassen.koppelset + bodemRand

  /* E. opties */
  let optionsTotal = 0
  for (const o of type.options) {
    if (!state.options[o.id]) continue
    switch (o.id) {
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
        break // verrekend in materiaal/snijden/lassen hierboven
      default:
        optionsTotal += o.price // niet-gemodelleerde opties: vaste schemaprijs
    }
  }

  /* F. order, verpakking & transport (NL) */
  const orderCosts = P.order.startkosten + P.order.programmeren
  const shippingClass: PriceBreakdown['shippingClass'] =
    weightKg <= P.logistiek.gewichtsgrens.S
      ? 'S'
      : weightKg <= P.logistiek.gewichtsgrens.M
        ? 'M'
        : weightKg <= P.logistiek.gewichtsgrens.L
          ? 'L'
          : 'XL'
  const packaging = P.logistiek.verpakking[shippingClass]
  const transport = P.logistiek.transportNL[shippingClass]

  /* G. commercieel: marge over de productie, logistiek tegen kostprijs */
  const production = material + cutting + bending + welding + optionsTotal + orderCosts
  const margin = production * P.commercieel.margePct
  const exVat = production + margin + packaging + transport
  const total = exVat * (1 + P.commercieel.btwPct)

  return {
    areaM2: Math.round(areaVerrekend * 100) / 100,
    cutM: Math.round(g.cutM * 10) / 10,
    piercings: g.piercings,
    bends: g.bends,
    weldM: Math.round(g.weldM * 10) / 10,
    segments: g.segments,
    weightKg,
    material: r2(material),
    cutting: r2(cutting),
    bending: r2(bending),
    welding: r2(welding),
    optionsTotal: r2(optionsTotal),
    orderCosts: r2(orderCosts),
    packaging: r2(packaging),
    transport: r2(transport),
    productionCost: r2(production),
    margin: r2(margin),
    exVat: r2(exVat),
    total: r2(total),
    shippingClass,
  }
}

const r2 = (v: number) => Math.round(v * 100) / 100

export type ConfigValidation = {
  /** Blokkerend: dit kan niet gemaakt of geleverd worden. */
  errors: string[]
  /** Advies/kostenwaarschuwing; bestellen kan gewoon. */
  warnings: string[]
}

/**
 * Fysieke restricties en adviezen — de "kan dit wel gemaakt worden"-laag
 * boven de maatgrenzen van het schema.
 */
export function validateConfig(state: ConfigState): ConfigValidation {
  const P = getPricing()
  const errors: string[] = []
  const warnings: string[] = []
  const { l = 0, b = 0, h = 0 } = state.dims
  const longest = Math.max(l, b, h)

  // transport: geen enkel deelstuk mag boven de pallet-/plaatgrens uitkomen
  const g = geometryFor(state, P)
  const stukL = state.typeId === 'keerwand' || state.typeId === 'borderrand' ? l / g.segments : longest
  if (stukL > P.staal.maxPlaatL) {
    errors.push(
      `Deze maat vraagt een deelstuk van ${Math.round(stukL)} mm; boven ${P.staal.maxPlaatL} mm is transport en plaatmateriaal niet mogelijk.`,
    )
  }

  // dunne plaat op grote overspanning trekt bol
  if (state.thickness <= 2 && longest > 2000) {
    warnings.push('Bij 2 mm kan een zijde langer dan 2 meter bol trekken; wij adviseren 3 mm.')
  }

  // stabiliteit plantenbak: hoog en smal valt om
  if (state.typeId === 'plantenbak' && b > 0 && h > 1.5 * Math.min(l, b)) {
    warnings.push(
      'Deze bak is hoog ten opzichte van zijn voetafdruk en kan instabiel zijn; kies een bredere voet of laat hem verankeren.',
    )
  }

  // segmentatie zichtbaar maken (meer naden = andere look en prijs)
  if (state.typeId === 'plantenbak' && g.segments > 1) {
    warnings.push(
      `De wand is langer dan de kantbank aankan en wordt uit ${g.segments} segmenten samengelast (afgewerkte zichtnaden).`,
    )
  }
  if (state.typeId === 'schutting' && g.segments > 1) {
    warnings.push(
      'Dit paneel is groter dan één plaat en wordt uit twee delen samengelast met een afgewerkte zichtnaad.',
    )
  }
  if ((state.typeId === 'keerwand' || state.typeId === 'borderrand') && g.segments > 1) {
    warnings.push(`Wordt geleverd in ${g.segments} koppelbare segmenten.`)
  }

  // zetting langer dan de kantbank bij keerwand-segmenten kan niet
  if (state.typeId === 'keerwand' && l / g.segments > P.zetten.maxZetlengte) {
    errors.push(`De voetzetting per segment overschrijdt de maximale zetlengte van ${P.zetten.maxZetlengte} mm.`)
  }

  // ontwerp-editor: figuur verplicht bij silhouet, kleine letters vallen uit
  if (state.typeId === 'figuur' && decoStats(state.deco).per === 0) {
    errors.push('Kies een figuur uit de bibliotheek of upload een foto voor een eigen silhouet.')
  }
  if (state.typeId === 'naambord' && state.deco) {
    const letterH = Math.min(
      state.deco.text.trim() ? state.deco.ts * h : Infinity,
      state.deco.nr.trim() ? state.deco.ns * h : Infinity,
    )
    if (letterH !== Infinity && letterH < 30 && state.deco.mode === 'uitsnede') {
      warnings.push('Letters kleiner dan 30 mm snijden niet strak uit; maak de tekst groter of kies graveren.')
    }
    if (!state.deco.text.trim() && !state.deco.nr.trim() && !state.deco.fig) {
      warnings.push('Het bord is nu leeg — voeg tekst, een huisnummer of een figuur toe.')
    }
    if (state.deco.mode === 'uitsnede') {
      warnings.push('Losse binnenstukken van letters (zoals in O en A) worden stencil-vast meegesneden.')
    }
  }
  // accent-ontwerp: doorlaseren in grondkerende wanden laat grond/water door
  if (
    configType(state.typeId).deco === 'accent' &&
    state.deco?.mode === 'uitsnede' &&
    (state.deco.fig || state.deco.text.trim()) &&
    (state.typeId === 'plantenbak' || state.typeId === 'keerwand' || state.typeId === 'borderrand')
  ) {
    warnings.push(
      'Een doorgelaserd motief laat grond en water door de wand; kies graveren of plaats het motief bewust.',
    )
  }
  if ((state.typeId === 'staptegel' || state.typeId === 'naambord') && state.deco?.fig) {
    const basis = state.typeId === 'staptegel' ? l : h
    if (state.deco.s * basis < 60) {
      warnings.push('Het motief is erg klein (< 60 mm); fijne details kunnen wegvallen bij het snijden.')
    }
  }

  return { errors, warnings }
}
