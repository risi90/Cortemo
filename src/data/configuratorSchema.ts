/**
 * Schema-gedreven configurator: alle producttypes, maatgrenzen, opties en
 * prijsregels staan hier — de 3D-scene, de UI en de prijsberekening zijn
 * puur een weergave van dit bestand. Nieuwe producttypes of andere tarieven
 * toevoegen = alleen dit bestand aanpassen.
 */

export type ConfigTypeId =
  | 'plantenbak'
  | 'keerwand'
  | 'borderrand'
  | 'schutting'
  | 'staptegel'
  | 'naambord'
  | 'figuur'

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
  /**
   * Ontwerp-editor: 'uitsnede' = figuur als gat in de plaat (staptegel),
   * 'bord' = tekst + huisnummer + figuur uitgesneden (naambord),
   * 'vorm' = het figuur ís het product (silhouet). Alles versleepbaar.
   */
  deco?: 'uitsnede' | 'bord' | 'vorm'
  /** 'rond' rendert/rekent als schijf (dim l = diameter). */
  shape?: 'rond'
}

/**
 * Prijsmodel — 1-op-1 met het blad "Parameters prijsmodel" uit het
 * calculatiedocument (Google Sheets). Alle bedragen zijn inkoop/kostprijs
 * excl. btw; de marge en btw uit blok "commercieel" maken er verkoopprijzen
 * van. De admin (Configurator & prijzen) overschrijft dit model live.
 */
export const PRICING = {
  /** A. Staal (Corten A / S355J0WP) */
  staal: {
    /** Inkoopprijs plaatmateriaal per dikte, €/kg. */
    prijsPerKg: { 2: 1.85, 3: 1.75, 4: 1.7, 5: 1.65 } as Record<number, number>,
    /** Uitval/nesting-toeslag (restmateriaal dat wél betaald wordt). */
    uitvalPct: 0.12,
    /** Dichtheid staal, kg/m³ — natuurkundige constante. */
    dichtheid: 7850,
    /** Maximale plaatmaat leverancier, mm. */
    maxPlaatL: 3000,
    maxPlaatB: 1500,
  },
  /** B. Lasersnijden */
  snijden: {
    /** Tarief per meter snijlengte, per dikte. */
    tariefPerM: { 2: 1.4, 3: 1.8, 4: 2.2, 5: 2.7 } as Record<number, number>,
    /** Insteekprijs (piercing) per start van een snede. */
    insteek: 0.35,
  },
  /** C. Zetwerk (kantbank) */
  zetten: {
    perZetting: 6.5,
    toeslagLang: 4,
    /** Zetting langer dan deze drempel (mm) krijgt de toeslag. */
    drempelLang: 3000,
    /** Harde bovengrens kantbank, mm. */
    maxZetlengte: 4000,
    /** Standaard flensbreedte gezette rand, mm. */
    flensBreedte: 40,
  },
  /** D. Lassen, walsen & koppelen */
  lassen: {
    /** Lassen + strak slijpen zichtnaad, €/m. */
    zichtnaadPerM: 28,
    walsenPerM: 12,
    randRondPerM: 9,
    /** Koppelset segmentverbinding, €/stuk. */
    koppelset: 17.5,
  },
  /** E. Opties & up-sells */
  optieTarieven: {
    afwateringsgat: 0.9,
    /** Versneld roestproces, €/m² plaatoppervlak (beide zijden). */
    roestPerM2: 14,
    /** Anti-vlek/anti-uitspoeling coating, €/m². */
    coatingPerM2: 19,
    wielenset: 65,
    grondpen: 2.4,
    pennenPerStuk: 2,
    /** Max. stuklengte borderrand, mm. */
    maxStukBorder: 2300,
    /** Overlap per borderrand-koppeling, mm. */
    overlapBorder: 60,
    /** Snijlengte per uitgesneden letter/cijfer = factor × letterhoogte. */
    letterFactor: 3.2,
  },
  /** F. Order, verpakking & transport */
  order: {
    startkosten: 15,
    programmeren: 12.5,
    dxfToeslag: 7.5,
    nestingfactorDxf: 1.15,
  },
  logistiek: {
    verpakking: { S: 6, M: 14, L: 32, XL: 55 },
    /** Bovengrens per gewichtsklasse, kg (daarboven = XL). */
    gewichtsgrens: { S: 30, M: 100, L: 250 },
    transportNL: { S: 8.5, M: 14.5, L: 39, XL: 89 },
    transportBE: { S: 10.5, M: 17.5, L: 49, XL: 109 },
  },
  /** G. Commercieel */
  commercieel: {
    /** Brutomarge bovenop de volledige productiekost (B2C). */
    margePct: 0.45,
    b2bBasis: 0.1,
    b2bZilver: 0.15,
    b2bGoud: 0.2,
    btwPct: 0.21,
  },
  /**
   * H. Fabricage — parameters voor de uitslagberekening (DXF's en
   * buigtabellen). Kalibreer deze op de eigen kantbank: de buigaftrek
   * per 90°-zetting = 2·(r+t) − (π/2)·(r + k·t), met r = radiusFactor·t.
   */
  fabricage: {
    /** K-factor: positie van de neutrale lijn (0,40–0,45 bij luchtbuigen). */
    kFactor: 0.44,
    /** Binnenradius als factor × plaatdikte (≈ 1 bij V-opening 8×t). */
    radiusFactor: 1,
  },
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
  {
    id: 'staptegel',
    label: 'Staptegel',
    desc: 'Platte, ronde tegel voor paden door gras of grind — beloopbaar dik plaatstaal, optioneel met een uitgesneden motief.',
    dimensions: [{ key: 'l', label: 'Diameter', min: 300, max: 800, default: 450, step: 10 }],
    thicknesses: [4, 5],
    defaultThickness: 5,
    options: [{ id: 'roest', label: 'Versneld roestproces', price: 25 }],
    deco: 'uitsnede',
    shape: 'rond',
  },
  {
    id: 'naambord',
    label: 'Naambord',
    desc: 'Naam- of huisnummerbord met uitgesneden tekst. Versleep tekst en nummer op de plaat tot het klopt.',
    dimensions: [
      { key: 'l', label: 'Breedte', min: 250, max: 1000, default: 450, step: 10 },
      { key: 'h', label: 'Hoogte', min: 120, max: 500, default: 220, step: 10 },
    ],
    thicknesses: [2, 3],
    defaultThickness: 2,
    options: [{ id: 'roest', label: 'Versneld roestproces', price: 25 }],
    deco: 'bord',
  },
  {
    id: 'figuur',
    label: 'Figuur',
    desc: 'Vrijstaand silhouet uit één plaat — kies uit de bibliotheek of upload een foto voor een eigen silhouet.',
    dimensions: [{ key: 'h', label: 'Hoogte', min: 300, max: 1500, default: 800, step: 10 }],
    thicknesses: [2, 3, 4],
    defaultThickness: 3,
    options: [
      { id: 'pennen', label: 'Grondpennen (2 stekers)', price: 9, weightKg: 1 },
      { id: 'roest', label: 'Versneld roestproces', price: 35 },
    ],
    deco: 'vorm',
  },
]

export const configType = (id: ConfigTypeId): ConfigType =>
  CONFIG_TYPES.find((t) => t.id === id)!
