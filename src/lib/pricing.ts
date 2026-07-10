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
}

/**
 * Uitslag per producttype: plaatoppervlak, snijlengte, zettingen en naden.
 * Bewust eenvoudige, uitlegbare benaderingen van de werkelijke uitslagen;
 * de tarieven komen 1-op-1 uit het parametersblad.
 */
function geometryFor(state: ConfigState, P: ReturnType<typeof getPricing>): Geometry {
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

  /* B. lasersnijden */
  const cutting = g.cutM * rateFor(P.snijden.tariefPerM, state.thickness) + g.piercings * P.snijden.insteek

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

  return { errors, warnings }
}
