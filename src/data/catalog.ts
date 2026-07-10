export type GroupId = 'planten' | 'hoogte' | 'vuurwater' | 'deco'

export type Group = {
  id: GroupId
  label: string
  sub: string
}

export type Product = {
  id: string
  group: GroupId
  sub: string
  name: string
  dims: string
  /** Productfoto (dummy CC-beeld tot er echte renders zijn). */
  img: string
  price: number
  desc: string
  /** [label, meerprijs] */
  variants: [string, number][]
  /** [label, meerprijs] */
  options: [string, number][]
}

/**
 * Vervangt de statische catalogus door rijen uit de database (Supabase).
 * Muteert de arrays in place zodat alle views dezelfde referentie houden;
 * de App bumpt daarna één keer zijn state om opnieuw te renderen.
 */
export function hydrateCatalog(
  rows: {
    id: string
    group_id: string
    sub: string
    name: string
    dims: string
    img: string
    price: number
    descr: string
    variants: [string, number][]
    options: [string, number][]
  }[],
): void {
  const next: Product[] = rows
    .filter((r) => GROUPS.some((g) => g.id === r.group_id))
    .map((r) => ({
      id: r.id,
      group: r.group_id as GroupId,
      sub: r.sub,
      name: r.name,
      dims: r.dims,
      img: r.img,
      price: Number(r.price),
      desc: r.descr,
      variants: r.variants,
      options: r.options,
    }))
  if (next.length) PRODUCTS.splice(0, PRODUCTS.length, ...next)
}

export const euro = (v: number): string =>
  '€ ' +
  v.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const GROUPS: Group[] = [
  { id: 'planten', label: 'Planten & Bomen', sub: 'Bakken, ringen en sokkels' },
  { id: 'hoogte', label: 'Maatwerk Componenten', sub: 'Keerwanden, randen en schuttingen' },
  { id: 'vuurwater', label: 'Vuur & Water', sub: 'Vuurschalen, houtopslag en watertafels' },
  { id: 'deco', label: 'Decoratie & Praktisch', sub: 'Naamborden, brievenbussen en wandkunst' },
]

export const SUBCATS: Record<GroupId, string[]> = {
  planten: ['Plantenbakken', 'Moestuinbakken', 'Boomringen', 'Sokkels'],
  hoogte: ['Keerwanden', 'Borderranden', 'Vijverranden', 'Schuttingen'],
  vuurwater: ['Vuurschalen', 'Houtopslag', 'Waterelementen'],
  deco: ['Naamborden', 'Brievenbussen', 'Figuren', 'Wandkunst'],
}

/** Dummy sfeerbeelden per groep (renders + CC-foto's als placeholder). */
export const GROUP_IMG: Partial<Record<GroupId, string>> = {
  planten: '/img/plantenbak.webp',
  hoogte: '/img/maatwerk.webp',
  vuurwater: '/img/vuurschaal.webp',
  deco: '/img/deco.jpg',
}

export const PRODUCTS: Product[] = [
  {
    id: 'cubo',
    group: 'planten',
    sub: 'Plantenbakken',
    name: 'Plantenbak Cubo',
    dims: '60 × 60 × 60 cm',
    img: '/img/cubo.jpg',
    price: 189,
    desc: 'Compacte kubusbak voor terras of entree. Naadloos gelast uit 3 mm cortenstaal, standaard bodemloos zodat beplanting in de volle grond kan wortelen.',
    variants: [
      ['60 × 60 × 60 cm', 0],
      ['80 × 80 × 80 cm', 90],
      ['100 × 100 × 100 cm', 190],
    ],
    options: [
      ['Bodemplaat', 45],
      ['Verrijdbaar (wieltjes)', 30],
      ['Versneld roestproces', 45],
    ],
  },
  {
    id: 'linea',
    group: 'planten',
    sub: 'Plantenbakken',
    name: 'Plantenbak Linea',
    dims: '120 × 40 × 50 cm',
    img: '/img/linea.jpg',
    price: 249,
    desc: 'Langwerpige bak als groene afscheiding op balkon of dakterras. Strakke, dunne rand en verdekte hoeknaden.',
    variants: [
      ['120 × 40 × 50 cm', 0],
      ['160 × 40 × 50 cm', 70],
      ['200 × 40 × 60 cm', 150],
    ],
    options: [
      ['Bodemplaat', 45],
      ['Versneld roestproces', 45],
    ],
  },
  {
    id: 'grande',
    group: 'planten',
    sub: 'Plantenbakken',
    name: 'Plantenbak Grande',
    dims: '200 × 60 × 60 cm',
    img: '/img/grande.jpg',
    price: 389,
    desc: 'Royale bak voor meerstammige heesters en kleine bomen. Inwendig verstevigd, blijft strak bij volle grondvulling.',
    variants: [
      ['200 × 60 × 60 cm', 0],
      ['250 × 80 × 60 cm', 140],
      ['300 × 100 × 80 cm', 320],
    ],
    options: [
      ['Bodemplaat', 65],
      ['Versneld roestproces', 45],
    ],
  },
  {
    id: 'verde',
    group: 'planten',
    sub: 'Moestuinbakken',
    name: 'Moestuinbak Verde',
    dims: '150 × 80 × 50 cm',
    img: '/img/verde.jpg',
    price: 329,
    desc: 'Verhoogde kweekbak op werkhoogte. Het staal houdt in het voorjaar warmte vast, wat de wortels ten goede komt.',
    variants: [
      ['150 × 80 × 50 cm', 0],
      ['200 × 100 × 60 cm', 120],
      ['250 × 120 × 60 cm', 240],
    ],
    options: [
      ['Slakkenrand', 35],
      ['Versneld roestproces', 45],
    ],
  },
  {
    id: 'anello',
    group: 'planten',
    sub: 'Boomringen',
    name: 'Boomring Anello',
    dims: 'Ø 80 cm',
    img: '/img/anello.jpg',
    price: 95,
    desc: 'Tweedelige ring die om een bestaande stam sluit. Beschermt de wortels en geeft het gazon een strakke beëindiging.',
    variants: [
      ['Ø 80 cm', 0],
      ['Ø 100 cm', 30],
      ['Ø 120 cm', 55],
    ],
    options: [['Versneld roestproces', 25]],
  },
  {
    id: 'piede',
    group: 'planten',
    sub: 'Sokkels',
    name: 'Sokkel Piede',
    dims: '40 × 40 × 80 cm',
    img: '/img/piede.jpg',
    price: 159,
    desc: 'Zet een waterschaal, plant of kunstwerk op een voetstuk. Verzwaarde voet, ook geschikt voor winderige plekken.',
    variants: [
      ['40 × 40 × 80 cm', 0],
      ['40 × 40 × 100 cm', 40],
    ],
    options: [['Versneld roestproces', 25]],
  },
  {
    id: 'terra',
    group: 'hoogte',
    sub: 'Keerwanden',
    name: 'Keerwand Terra',
    dims: '200 × 60 cm',
    img: '/img/terra.jpg',
    price: 189,
    desc: 'Zelfdragende keerwand met gevouwen grondkeringsvoet. Creëert veilige hoogteverschillen zonder metselwerk.',
    variants: [
      ['200 × 60 cm', 0],
      ['200 × 80 cm', 45],
      ['200 × 100 cm', 90],
    ],
    options: [
      ['Anti-uitspoeling coating', 25],
      ['Versneld roestproces', 45],
    ],
  },
  {
    id: 'lijn',
    group: 'hoogte',
    sub: 'Borderranden',
    name: 'Borderrand Lijn',
    dims: '220 × 15 cm, set van 2',
    img: '/img/lijn.jpg',
    price: 79,
    desc: 'Kantopsluiting die gazon, grind en borders strak scheidt. Koppelbaar met verdekte verbindingsstrip.',
    variants: [
      ['220 × 15 cm, set van 2', 0],
      ['220 × 25 cm, set van 2', 20],
    ],
    options: [
      ['Grondpennen (8 stuks)', 15],
      ['Versneld roestproces', 25],
    ],
  },
  {
    id: 'aqua',
    group: 'hoogte',
    sub: 'Vijverranden',
    name: 'Vijverrand Aqua',
    dims: '200 × 30 cm',
    img: '/img/aqua.jpg',
    price: 119,
    desc: 'Strakke, roestige omlijsting direct aan de waterkant. Gezette bovenrand, veilig voor vijverfolie.',
    variants: [
      ['200 × 30 cm', 0],
      ['200 × 45 cm', 30],
    ],
    options: [['Anti-uitspoeling coating', 25]],
  },
  {
    id: 'vista',
    group: 'hoogte',
    sub: 'Schuttingen',
    name: 'Schutting Vista',
    dims: '180 × 180 cm',
    img: '/img/vista.jpg',
    price: 549,
    desc: 'Privacypaneel met verborgen staanders. Optioneel met organisch laserpatroon voor een licht, ruimtelijk effect.',
    variants: [
      ['180 × 180 cm, dicht', 0],
      ['180 × 180 cm, laserpatroon', 140],
    ],
    options: [
      ['Betonpoeren (2 stuks)', 49],
      ['Versneld roestproces', 45],
    ],
  },
  {
    id: 'fuoco',
    group: 'vuurwater',
    sub: 'Vuurschalen',
    name: 'Vuurschaal Fuoco',
    dims: 'Ø 80 cm',
    img: '/img/fuoco.jpg',
    price: 279,
    desc: 'Hittebestendig 5 mm staal dat niet kromtrekt. Sokkel houdt de gloed op zithoogte, ook als kookplateau te gebruiken.',
    variants: [
      ['Ø 80 cm', 0],
      ['Ø 100 cm', 80],
      ['Ø 120 cm', 170],
    ],
    options: [
      ['Deksel', 79],
      ['Grillrooster', 59],
    ],
  },
  {
    id: 'legna',
    group: 'vuurwater',
    sub: 'Houtopslag',
    name: 'Houtopslag Legna',
    dims: '180 × 40 × 160 cm',
    img: '/img/legna.jpg',
    price: 649,
    desc: 'Geometrische vakkenkast voor haardhout die tegelijk dient als windscherm of afscheiding van de loungehoek.',
    variants: [
      ['180 × 40 × 160 cm', 0],
      ['240 × 40 × 180 cm', 180],
    ],
    options: [['Versneld roestproces', 45]],
  },
  {
    id: 'fonte',
    group: 'vuurwater',
    sub: 'Waterelementen',
    name: 'Watertafel Fonte',
    dims: '100 × 100 × 40 cm',
    img: '/img/fonte.jpg',
    price: 899,
    desc: 'Spiegelend wateroppervlak in een roestig kader. Inclusief circulatiepomp en verdekte overloop.',
    variants: [
      ['100 × 100 × 40 cm', 0],
      ['150 × 100 × 40 cm', 220],
    ],
    options: [['LED-verlichting', 129]],
  },
  {
    id: 'numero',
    group: 'deco',
    sub: 'Naamborden',
    name: 'Naambord Numero',
    dims: '40 × 20 cm',
    img: '/img/numero.jpg',
    price: 69,
    desc: 'Huisnummer of naam, lasergesneden uit één plaat. Zwevend gemonteerd met RVS afstandhouders.',
    variants: [
      ['40 × 20 cm', 0],
      ['60 × 25 cm', 25],
    ],
    options: [
      ['RVS afstandhouders', 12],
      ['Versneld roestproces', 19],
    ],
  },
  {
    id: 'posta',
    group: 'deco',
    sub: 'Brievenbussen',
    name: 'Brievenbus Posta',
    dims: '38 × 30 × 120 cm',
    img: '/img/posta.jpg',
    price: 429,
    desc: 'Vrijstaande zuil voor aan de straatkant. RVS binnenbak, slot met twee sleutels en pakketvriendelijke klep.',
    variants: [
      ['38 × 30 × 120 cm', 0],
      ['38 × 30 × 120 cm, met krantenrol', 45],
    ],
    options: [
      ['Huisnummer gegraveerd', 29],
      ['Versneld roestproces', 45],
    ],
  },
  {
    id: 'silva',
    group: 'deco',
    sub: 'Wandkunst',
    name: 'Wandpaneel Silva',
    dims: '80 × 80 cm',
    img: '/img/silva.jpg',
    price: 189,
    desc: 'Lasergesneden boomsilhouet voor tuinmuur of interieur. Werpt bij strijklicht een tekening op de wand.',
    variants: [
      ['80 × 80 cm', 0],
      ['120 × 120 cm', 110],
    ],
    options: [['RVS afstandhouders', 12]],
  },
  {
    id: 'den',
    group: 'deco',
    sub: 'Figuren',
    name: 'Figuur Den',
    dims: '120 cm hoog',
    img: '/img/den.jpg',
    price: 89,
    desc: 'Silhouet voor in de border. Met grondpennen stevig verankerd, wintervast en onderhoudsvrij.',
    variants: [
      ['120 cm hoog', 0],
      ['160 cm hoog', 35],
      ['200 cm hoog', 70],
    ],
    options: [
      ['Grondpennen', 15],
      ['Versneld roestproces', 25],
    ],
  },
]
