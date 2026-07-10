import { getPricing } from './adminStore'
import type { ConfigState } from './pricing'

/**
 * Fabricage-aanlevering: vertaalt een configuratie naar productieklare
 * uitslagen (flat patterns) met verrekende buigaftrek.
 *
 * - DXF per onderdeel (R12 ASCII) voor nesting in Profirst. Laagconventie:
 *   SNIJDEN = lasercontour, GATEN = boringen, ZETLIJN_BOVEN/ZETLIJN_ONDER =
 *   zetlijnen (niet snijden!), INFO = onderdeel-id als tekst.
 * - Buigtabel per onderdeel voor de Delem-besturing van de kantbank:
 *   volgorde, aanslagmaat (afstand zetlijn tot aanslagzijde), zetlengte,
 *   hoek en richting, plus de gebruikte K-factor/radius zodat de
 *   werkvoorbereiding de uitslag kan controleren.
 *
 * De buigaftrek per 90°-zetting: BD = 2·(r+t) − (π/2)·(r + k·t) met
 * r = radiusFactor·t. K-factor en radiusfactor staan in het prijsmodel
 * (blok H, admin → Configurator & prijzen).
 */

export type Zetlijn = {
  /** 'x' = verticale lijn op afstand pos van links; 'y' = horizontaal van onder. */
  as: 'x' | 'y'
  /** Positie van de zetlijn in de uitslag, mm. */
  pos: number
  richting: 'boven' | 'onder'
  hoek: number
  label: string
}

export type Gat = { x: number; y: number; d: number }

export type FlatPart = {
  id: string
  naam: string
  aantal: number
  dikte: number
  /** Uitslagmaten in mm (rechthoekige contour). */
  breedte: number
  hoogte: number
  gaten: Gat[]
  zetlijnen: Zetlijn[]
  notities: string[]
}

export type WorkOrder = {
  parts: FlatPart[]
  /** Gebruikte uitslagparameters, voor controle door de werkvoorbereiding. */
  params: { dikte: number; kFactor: number; radius: number; buigaftrek90: number }
  notities: string[]
}

const r1 = (v: number) => Math.round(v * 10) / 10

/** Buigaftrek voor een 90°-zetting bij dikte t (mm). */
export function buigaftrek(t: number): number {
  const P = getPricing()
  const k = P.fabricage?.kFactor ?? 0.44
  const r = (P.fabricage?.radiusFactor ?? 1) * t
  return 2 * (r + t) - (Math.PI / 2) * (r + k * t)
}

/**
 * Flensreeks → uitslag: platte lengte per flens (buigaftrek 50/50 verdeeld
 * over de aangrenzende flenzen) en de zetlijnposities in de uitslag.
 */
function uitslag(flenzen: number[], bd: number): { lengtes: number[]; posities: number[] } {
  const n = flenzen.length
  const lengtes = flenzen.map((f, i) => {
    const randen = (i > 0 ? 0.5 : 0) + (i < n - 1 ? 0.5 : 0)
    return f - randen * bd
  })
  const posities: number[] = []
  let cursor = 0
  for (let i = 0; i < n - 1; i++) {
    cursor += lengtes[i]
    posities.push(cursor)
  }
  return { lengtes, posities }
}

/** Onderdelen + uitslagen voor een configuratie. */
export function workOrderFor(state: ConfigState): WorkOrder {
  const P = getPricing()
  const t = state.thickness
  const bd = buigaftrek(t)
  const flens = P.zetten.flensBreedte
  const { l = 0, b = 0, h = 0 } = state.dims
  const parts: FlatPart[] = []
  const notities: string[] = []

  switch (state.typeId) {
    case 'plantenbak': {
      const stripOmtrek = 2 * (l + b)
      const segments = Math.max(1, Math.ceil(stripOmtrek / P.zetten.maxZetlengte))
      // verticale hoekzettingen (4 − segments; de resterende hoeken worden
      // gelaste zichtnaden) en één horizontale flenszetting bovenlangs
      const zijden = [l, b, l, b]
      const hoekBends = Math.max(0, 4 - segments)
      const { lengtes, posities } = uitslag(zijden, bd)
      const stripFlat = lengtes.reduce((s, v) => s + v, 0) - (4 - hoekBends) * 0 // totale platte lengte
      const hoogteFlat = h + flens - bd
      const flensPos = h - bd / 2

      if (segments === 1) {
        parts.push({
          id: 'wandstrip',
          naam: 'Wandstrip (rondom, 1 lasnaad in hoek)',
          aantal: 1,
          dikte: t,
          breedte: r1(stripFlat),
          hoogte: r1(hoogteFlat),
          gaten: [],
          zetlijnen: [
            ...posities.slice(0, 3).map((pos, i) => ({
              as: 'x' as const,
              pos: r1(pos),
              richting: 'boven' as const,
              hoek: 90,
              label: `Hoekzetting ${i + 1}`,
            })),
            { as: 'y', pos: r1(flensPos), richting: 'boven', hoek: 90, label: 'Flensrand bovenzijde' },
          ],
          notities: ['Sluitnaad in de 4e hoek lassen en strak slijpen (zichtnaad).'],
        })
      } else {
        // strip past niet op de kantbank: in gelijke delen, hoeken die in een
        // deel vallen worden gezet, deelovergangen worden gelaste zichtnaden
        const deelLengte = stripFlat / segments
        for (let s = 0; s < segments; s++) {
          const van = s * deelLengte
          const tot = van + deelLengte
          const binnen = posities.filter((p) => p > van + 25 && p < tot - 25)
          parts.push({
            id: `wandstrip-${s + 1}`,
            naam: `Wandstrip deel ${s + 1}/${segments}`,
            aantal: 1,
            dikte: t,
            breedte: r1(deelLengte),
            hoogte: r1(hoogteFlat),
            gaten: [],
            zetlijnen: [
              ...binnen.map((p, i) => ({
                as: 'x' as const,
                pos: r1(p - van),
                richting: 'boven' as const,
                hoek: 90,
                label: `Hoekzetting ${i + 1}`,
              })),
              { as: 'y', pos: r1(flensPos), richting: 'boven', hoek: 90, label: 'Flensrand bovenzijde' },
            ],
            notities: ['Deelovergangen lassen en strak slijpen (zichtnaad).'],
          })
        }
        notities.push(
          `Wand groter dan de kantbank (${P.zetten.maxZetlengte} mm): ${segments} delen, hoeklassen volgens zichtnaadplan.`,
        )
      }

      if (state.options.bodem || state.options.wielen) {
        const inzet = 60
        parts.push({
          id: 'bodemplaat',
          naam: 'Bodemplaat (ingelast)',
          aantal: 1,
          dikte: t,
          breedte: r1(l - 2 * t),
          hoogte: r1(b - 2 * t),
          gaten: [
            { x: inzet, y: inzet, d: 12 },
            { x: l - 2 * t - inzet, y: inzet, d: 12 },
            { x: inzet, y: b - 2 * t - inzet, d: 12 },
            { x: l - 2 * t - inzet, y: b - 2 * t - inzet, d: 12 },
          ],
          zetlijnen: [],
          notities: ['4× afwateringsgat ø12.', 'Rondom inlassen (randafwerking).'],
        })
      }
      if (state.options.wielen) notities.push('Wielenset (4×) monteren onder de bodemplaat.')
      break
    }

    case 'keerwand': {
      const voet = 300
      const segments = Math.max(1, Math.ceil(l / P.staal.maxPlaatL))
      const segL = l / segments
      const flenzen = [voet, h, flens]
      const { posities } = uitslag(flenzen, bd)
      const hoogteFlat = voet + h + flens - 2 * bd
      parts.push({
        id: 'keerwand-segment',
        naam: segments > 1 ? `Keerwandsegment (${segments}×)` : 'Keerwand',
        aantal: segments,
        dikte: t,
        breedte: r1(segL),
        hoogte: r1(hoogteFlat),
        gaten: [],
        zetlijnen: [
          { as: 'y', pos: r1(posities[0]), richting: 'boven', hoek: 90, label: 'Voetzetting' },
          { as: 'y', pos: r1(posities[1]), richting: 'onder', hoek: 90, label: 'Bovenrand (flens)' },
        ],
        notities: segments > 1 ? [`Koppelsets (${segments - 1}×) meeleveren.`] : [],
      })
      break
    }

    case 'borderrand': {
      const maxStuk = P.optieTarieven.maxStukBorder - P.optieTarieven.overlapBorder
      const segments = Math.max(1, Math.ceil(l / maxStuk))
      const totL = l + (segments - 1) * P.optieTarieven.overlapBorder
      const stukL = totL / segments
      const gaten: Gat[] = state.options.pennen
        ? [
            { x: 100, y: 40, d: 9 },
            { x: stukL - 100, y: 40, d: 9 },
          ]
        : []
      parts.push({
        id: 'borderrand-stuk',
        naam: `Borderrand-stuk (${segments}×, overlap ${P.optieTarieven.overlapBorder} mm)`,
        aantal: segments,
        dikte: t,
        breedte: r1(stukL),
        hoogte: r1(h),
        gaten,
        zetlijnen: [],
        notities: state.options.pennen
          ? [`Grondpennen (${segments * P.optieTarieven.pennenPerStuk}×) meeleveren; gaten ø9.`]
          : [],
      })
      break
    }

    case 'schutting': {
      const panelSplit = Math.min(l, h) > P.staal.maxPlaatB && Math.max(l, h) > P.staal.maxPlaatB
      parts.push({
        id: 'paneel',
        naam: panelSplit ? 'Paneel (2 delen, zichtnaad)' : 'Paneel',
        aantal: panelSplit ? 2 : 1,
        dikte: t,
        breedte: r1(panelSplit ? l / 2 : l),
        hoogte: r1(h),
        gaten: [],
        zetlijnen: [],
        notities: state.options.laser
          ? ['Organisch laserpatroon: patroon-DXF apart aanleveren vanuit ontwerp; niet in deze uitslag.']
          : [],
      })
      const staanderFlens = 60
      const { posities } = uitslag([staanderFlens, staanderFlens, staanderFlens, staanderFlens], bd)
      parts.push({
        id: 'staander',
        naam: 'Verborgen staander (U-profiel)',
        aantal: 2,
        dikte: t,
        breedte: r1(4 * staanderFlens - 3 * bd),
        hoogte: r1(h),
        gaten: [],
        zetlijnen: posities.map((pos, i) => ({
          as: 'x' as const,
          pos: r1(pos),
          richting: 'boven' as const,
          hoek: 90,
          label: `Profielzetting ${i + 1}`,
        })),
        notities: ['In het paneel lassen (verborgen montage).'],
      })
      if (state.options.poeren) notities.push('Betonpoeren (2×) meeleveren.')
      break
    }
  }

  if (state.options.roest) notities.push('Nabehandeling: versneld roestproces (beide zijden).')
  if (state.options.coating) notities.push('Nabehandeling: anti-uitspoeling coating.')

  return {
    parts,
    params: {
      dikte: t,
      kFactor: getPricing().fabricage?.kFactor ?? 0.44,
      radius: (getPricing().fabricage?.radiusFactor ?? 1) * t,
      buigaftrek90: Math.round(bd * 100) / 100,
    },
    notities,
  }
}

/* ------------------------------------------------------------------ */
/* DXF R12 — lagen: SNIJDEN, GATEN, ZETLIJN_BOVEN, ZETLIJN_ONDER, INFO */
/* ------------------------------------------------------------------ */

const dxfPair = (code: number, value: string | number) => `${code}\n${value}`

function dxfLayerTable(): string {
  const layers = [
    ['SNIJDEN', 7],
    ['GATEN', 7],
    ['ZETLIJN_BOVEN', 5],
    ['ZETLIJN_ONDER', 1],
    ['INFO', 8],
  ] as const
  const entries = layers
    .map(([name, color]) =>
      [dxfPair(0, 'LAYER'), dxfPair(2, name), dxfPair(70, 0), dxfPair(62, color), dxfPair(6, 'CONTINUOUS')].join('\n'),
    )
    .join('\n')
  return [
    dxfPair(0, 'SECTION'),
    dxfPair(2, 'TABLES'),
    dxfPair(0, 'TABLE'),
    dxfPair(2, 'LAYER'),
    dxfPair(70, String(layers.length)),
    entries,
    dxfPair(0, 'ENDTAB'),
    dxfPair(0, 'ENDSEC'),
  ].join('\n')
}

function dxfPolyline(points: [number, number][], layer: string): string {
  const verts = points
    .map(([x, y]) =>
      [dxfPair(0, 'VERTEX'), dxfPair(8, layer), dxfPair(10, x), dxfPair(20, y), dxfPair(30, 0)].join('\n'),
    )
    .join('\n')
  return [
    dxfPair(0, 'POLYLINE'),
    dxfPair(8, layer),
    dxfPair(66, 1),
    dxfPair(70, 1), // gesloten
    verts,
    dxfPair(0, 'SEQEND'),
  ].join('\n')
}

function dxfLine(x1: number, y1: number, x2: number, y2: number, layer: string): string {
  return [
    dxfPair(0, 'LINE'),
    dxfPair(8, layer),
    dxfPair(10, x1),
    dxfPair(20, y1),
    dxfPair(30, 0),
    dxfPair(11, x2),
    dxfPair(21, y2),
    dxfPair(31, 0),
  ].join('\n')
}

function dxfCircle(x: number, y: number, d: number, layer: string): string {
  return [
    dxfPair(0, 'CIRCLE'),
    dxfPair(8, layer),
    dxfPair(10, x),
    dxfPair(20, y),
    dxfPair(30, 0),
    dxfPair(40, d / 2),
  ].join('\n')
}

function dxfText(x: number, y: number, height: number, value: string, layer: string): string {
  return [
    dxfPair(0, 'TEXT'),
    dxfPair(8, layer),
    dxfPair(10, x),
    dxfPair(20, y),
    dxfPair(30, 0),
    dxfPair(40, height),
    dxfPair(1, value),
  ].join('\n')
}

/** Volledig DXF R12-bestand (mm) voor één onderdeel. */
export function dxfFor(part: FlatPart, orderRef: string): string {
  const entities: string[] = [
    dxfPolyline(
      [
        [0, 0],
        [part.breedte, 0],
        [part.breedte, part.hoogte],
        [0, part.hoogte],
      ],
      'SNIJDEN',
    ),
    ...part.gaten.map((g) => dxfCircle(g.x, g.y, g.d, 'GATEN')),
    ...part.zetlijnen.map((z) =>
      z.as === 'x'
        ? dxfLine(z.pos, 0, z.pos, part.hoogte, z.richting === 'boven' ? 'ZETLIJN_BOVEN' : 'ZETLIJN_ONDER')
        : dxfLine(0, z.pos, part.breedte, z.pos, z.richting === 'boven' ? 'ZETLIJN_BOVEN' : 'ZETLIJN_ONDER'),
    ),
    dxfText(10, part.hoogte + 15, 12, `${orderRef} ${part.id} ${part.dikte}mm ${part.aantal}x`, 'INFO'),
  ]
  return [
    dxfPair(0, 'SECTION'),
    dxfPair(2, 'HEADER'),
    dxfPair(9, '$INSUNITS'),
    dxfPair(70, 4), // millimeter
    dxfPair(0, 'ENDSEC'),
    dxfLayerTable(),
    dxfPair(0, 'SECTION'),
    dxfPair(2, 'ENTITIES'),
    entities.join('\n'),
    dxfPair(0, 'ENDSEC'),
    dxfPair(0, 'EOF'),
  ].join('\n')
}

/* ------------------------------------------------------ */
/* Buigtabel voor de kantbank (Delem): rijen per zetting.  */
/* ------------------------------------------------------ */

export type BuigRegel = {
  volgorde: number
  label: string
  /** Aanslagmaat: afstand zetlijn tot de aanslagzijde van de uitslag, mm. */
  aanslag: number
  /** Lengte van de zetlijn, mm. */
  zetlengte: number
  hoek: number
  richting: 'boven' | 'onder'
}

/**
 * Zetvolgorde: horizontale zettingen (flens/voet) eerst, daarna de
 * verticale hoek-/profielzettingen van buiten naar binnen. De aanslagmaat
 * is de afstand van de zetlijn tot de dichtstbijzijnde uitslagrand — die
 * maat gaat direct de Delem-besturing in.
 */
export function buigtabel(part: FlatPart): BuigRegel[] {
  const horizontaal = part.zetlijnen.filter((z) => z.as === 'y')
  const verticaal = [...part.zetlijnen.filter((z) => z.as === 'x')].sort(
    (a, b) => Math.min(a.pos, part.breedte - a.pos) - Math.min(b.pos, part.breedte - b.pos),
  )
  return [...horizontaal, ...verticaal].map((z, i) => ({
    volgorde: i + 1,
    label: z.label,
    aanslag: r1(z.as === 'y' ? Math.min(z.pos, part.hoogte - z.pos) : Math.min(z.pos, part.breedte - z.pos)),
    zetlengte: r1(z.as === 'y' ? part.breedte : part.hoogte),
    hoek: z.hoek,
    richting: z.richting,
  }))
}

/** Buigtabel als CSV (puntkomma's, NL-decimalen) voor werkvoorbereiding. */
export function buigtabelCsv(part: FlatPart, orderRef: string): string {
  const kop = 'order;onderdeel;volgorde;zetting;aanslagmaat_mm;zetlengte_mm;hoek;richting'
  const rows = buigtabel(part).map((r) =>
    [orderRef, part.id, r.volgorde, r.label, String(r.aanslag).replace('.', ','), String(r.zetlengte).replace('.', ','), r.hoek, r.richting].join(';'),
  )
  return [kop, ...rows].join('\n')
}

/** Browser-download van een gegenereerd bestand. */
export function downloadFile(filename: string, content: string, mime = 'application/dxf'): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
