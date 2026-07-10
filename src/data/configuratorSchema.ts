/**
 * Schema-gedreven configurator: alle producttypes, maatgrenzen, opties en
 * prijsregels staan hier — de 3D-scene, de UI en de prijsberekening zijn
 * puur een weergave van dit bestand. Nieuwe producttypes of andere tarieven
 * toevoegen = alleen dit bestand aanpassen.
 */

export type ConfigTypeId = 'plantenbak' | 'keerwand' | 'borderrand' | 'schutting'

export type DimensionKey = 'l' | 'b' | 'h'

export type DimensionSpec = {
  key: DimensionKey
  label: string
  min: number
  max: number
  default: number
  step: number
}

export type ConfigOption = {
  id: string
  label: string
  /** Vaste meerprijs in euro's. */
  price: number
  /** Extra gewicht in kg (bijv. bodemplaat weegt mee). */
  weightKg?: number
  hint?: string
}

export type ConfigType = {
  id: ConfigTypeId
  label: string
  desc: string
  dimensions: DimensionSpec[]
  /** Toegestane staaldiktes in mm; de tweede is de aanbevolen default. */
  thicknesses: number[]
  defaultThickness: number
  options: ConfigOption[]
}

/** Tarieven — centraal instelbaar. Alle prijzen incl. btw. */
export const PRICING = {
  /** Kg-prijs cortenstaal incl. snijverlies en marge. */
  steelPerKg: 4.1,
  /** Dichtheid staal, kg/m³. */
  density: 7850,
  /** Laswerk en afwerking per strekkende meter naad. */
  weldPerM: 14,
  /** Vaste start-/handelingskosten per configuratie. */
  base: 39,
  /** B2B-partnerkorting (fractie), toegepast wanneer de klant is ingelogd. */
  b2bDiscount: 0.15,
}

export const CONFIG_TYPES: ConfigType[] = [
  {
    id: 'plantenbak',
    label: 'Plantenbak',
    desc: 'Naadloos gelaste bak, standaard bodemloos zodat beplanting kan doorwortelen.',
    dimensions: [
      { key: 'l', label: 'Lengte', min: 300, max: 3000, default: 1200, step: 10 },
      { key: 'b', label: 'Breedte', min: 300, max: 1500, default: 500, step: 10 },
      { key: 'h', label: 'Hoogte', min: 200, max: 1200, default: 600, step: 10 },
    ],
    thicknesses: [2, 3, 4],
    defaultThickness: 3,
    options: [
      { id: 'bodem', label: 'Bodemplaat', price: 0, hint: 'prijs rekent mee in het staal' },
      { id: 'wielen', label: 'Verrijdbaar (wieltjes)', price: 39, weightKg: 4 },
      { id: 'roest', label: 'Versneld roestproces', price: 45 },
    ],
  },
  {
    id: 'keerwand',
    label: 'Keerwand',
    desc: 'Zelfdragende grondkering met gevouwen voet, koppelbaar tot elke lengte.',
    dimensions: [
      { key: 'l', label: 'Lengte', min: 500, max: 4000, default: 2000, step: 10 },
      { key: 'h', label: 'Hoogte', min: 300, max: 1500, default: 600, step: 10 },
    ],
    thicknesses: [3, 4, 5],
    defaultThickness: 3,
    options: [
      { id: 'coating', label: 'Anti-uitspoeling coating', price: 29 },
      { id: 'roest', label: 'Versneld roestproces', price: 45 },
    ],
  },
  {
    id: 'borderrand',
    label: 'Borderrand',
    desc: 'Strakke kantopsluiting voor gazon, grind en borders. Inclusief koppelstrips.',
    dimensions: [
      { key: 'l', label: 'Lengte', min: 1000, max: 4000, default: 2200, step: 10 },
      { key: 'h', label: 'Hoogte', min: 100, max: 400, default: 150, step: 5 },
    ],
    thicknesses: [2, 3],
    defaultThickness: 2,
    options: [
      { id: 'pennen', label: 'Grondpennen (per meter)', price: 7, weightKg: 1 },
      { id: 'roest', label: 'Versneld roestproces', price: 25 },
    ],
  },
  {
    id: 'schutting',
    label: 'Schutting',
    desc: 'Privacypaneel met verborgen staanders, optioneel met organisch laserpatroon.',
    dimensions: [
      { key: 'l', label: 'Breedte', min: 900, max: 2400, default: 1800, step: 10 },
      { key: 'h', label: 'Hoogte', min: 1200, max: 2000, default: 1800, step: 10 },
    ],
    thicknesses: [2, 3],
    defaultThickness: 2,
    options: [
      { id: 'laser', label: 'Organisch laserpatroon', price: 140 },
      { id: 'poeren', label: 'Betonpoeren (2 stuks)', price: 49, weightKg: 38 },
      { id: 'roest', label: 'Versneld roestproces', price: 45 },
    ],
  },
]

export const configType = (id: ConfigTypeId): ConfigType =>
  CONFIG_TYPES.find((t) => t.id === id)!
