/**
 * Basisbibliotheek lasersnijbare figuren. Elke figuur bestaat uit één of
 * meer gesloten polygonen in een genormaliseerd 0–100-vlak (y omlaag,
 * zoals SVG). Dezelfde punten voeden de SVG-previews, de 3D-gaten/vormen
 * (via THREE.Shape) en de DXF-contouren voor de laser.
 *
 * `per` en `area` zijn de omtrek en oppervlakte per eenheid figuurhoogte
 * (dus bij hoogte h in mm: omtrek = per × h, oppervlak = area × h²). Ze
 * staan hier hard zodat de Deno-prijsverificatie (place-order) exact
 * dezelfde getallen gebruikt — draai `computeFigureStats` opnieuw als je
 * punten wijzigt en werk beide plekken bij.
 */

export type FigurePath = [number, number][]

export type Figure = {
  id: string
  label: string
  paths: FigurePath[]
  /** Omtrek per eenheid hoogte (genormaliseerd). */
  per: number
  /** Oppervlak per eenheid hoogte² (genormaliseerd). */
  area: number
}

const HART: FigurePath = [
  [50, 92], [15, 54], [7, 40], [9, 25], [19, 14], [32, 12], [43, 18], [50, 28],
  [57, 18], [68, 12], [81, 14], [91, 25], [93, 40], [85, 54],
]

const STER: FigurePath = [
  [50, 8], [60.9, 39], [93.7, 39.8], [67.6, 59.7], [77, 91.2], [50, 72.5],
  [23, 91.2], [32.4, 59.7], [6.3, 39.8], [39.1, 39],
]

const ZON: FigurePath = [
  [50, 4], [57.2, 23], [73, 10.2], [69.8, 30.2], [89.8, 27], [77, 42.8], [96, 50],
  [77, 57.2], [89.8, 73], [69.8, 69.8], [73, 89.8], [57.2, 77], [50, 96], [42.8, 77],
  [27, 89.8], [30.2, 69.8], [10.2, 73], [23, 57.2], [4, 50], [23, 42.8], [10.2, 27],
  [30.2, 30.2], [27, 10.2], [42.8, 23],
]

const VLINDER: FigurePath = [
  [50, 20], [56, 26], [70, 12], [84, 14], [92, 26], [90, 42], [80, 52], [68, 54],
  [78, 60], [82, 72], [76, 84], [64, 86], [54, 76], [50, 66], [46, 76], [36, 86],
  [24, 84], [18, 72], [22, 60], [32, 54], [20, 52], [10, 42], [8, 26], [16, 14],
  [30, 12], [44, 26],
]

const VOGEL: FigurePath = [
  [8, 82], [26, 74], [38, 66], [46, 54], [48, 38], [54, 27], [64, 23], [72, 27],
  [74, 35], [70, 41], [76, 44], [66, 48], [62, 60], [54, 72], [42, 80], [28, 86],
]

const HOND: FigurePath = [
  [24, 88], [22, 70], [20, 56], [24, 42], [34, 34], [32, 24], [38, 14], [46, 17],
  [50, 25], [58, 23], [66, 27], [68, 37], [61, 43], [56, 45], [58, 58], [66, 68],
  [72, 78], [74, 88], [64, 88], [58, 76], [50, 68], [44, 78], [46, 88],
]

const KAT: FigurePath = [
  [34, 88], [30, 72], [29, 56], [33, 44], [29, 36], [29, 22], [36, 30], [44, 27],
  [52, 30], [59, 22], [59, 36], [55, 44], [59, 54], [61, 70], [59, 82], [70, 82],
  [77, 76], [78, 66], [74, 60], [78, 54], [85, 62], [85, 78], [76, 88],
]

const HERT: FigurePath = [
  [20, 88], [23, 68], [18, 54], [24, 44], [40, 42], [56, 42], [63, 34], [65, 24],
  [61, 13], [65, 10], [69, 21], [73, 10], [77, 12], [73, 25], [77, 31], [84, 26],
  [86, 30], [78, 39], [72, 46], [74, 58], [80, 68], [78, 88], [71, 88], [69, 70],
  [61, 62], [36, 62], [30, 71], [28, 88],
]

const BOOM: FigurePath = [
  [50, 6], [64, 30], [58, 30], [72, 50], [64, 50], [80, 72], [56, 72], [56, 90],
  [44, 90], [44, 72], [20, 72], [36, 50], [28, 50], [42, 30], [36, 30],
]

const TULP: FigurePath = [
  [48, 88], [48, 62], [38, 56], [30, 46], [28, 30], [34, 21], [42, 27], [46, 36],
  [50, 25], [54, 36], [58, 27], [66, 21], [72, 30], [70, 46], [62, 56], [52, 62],
  [52, 88],
]

const MOLEN_ROMP: FigurePath = [
  [42, 92], [45, 52], [44, 50], [50, 41], [56, 50], [55, 52], [58, 92],
]

const MOLEN_WIEKEN: FigurePath = [
  [50, 39.1], [33.5, 55.6], [28.4, 50.5], [44.9, 34], [28.4, 17.5], [33.5, 12.4],
  [50, 28.9], [66.5, 12.4], [71.6, 17.5], [55.1, 34], [71.6, 50.5], [66.5, 55.6],
]

const KERK: FigurePath = [
  [14, 90], [14, 52], [36, 52], [36, 20], [42, 12], [50, 4], [58, 12], [64, 20],
  [64, 46], [88, 46], [88, 90],
]

export const FIGURES: Figure[] = [
  { id: 'hart', label: 'Hart', paths: [HART], per: 3.39, area: 0.68 },
  { id: 'ster', label: 'Ster', paths: [STER], per: 3.95, area: 0.36 },
  { id: 'zon', label: 'Zon', paths: [ZON], per: 5.3, area: 0.47 },
  { id: 'vlinder', label: 'Vlinder', paths: [VLINDER], per: 4.71, area: 0.79 },
  { id: 'vogel', label: 'Vogel', paths: [VOGEL], per: 3.29, area: 0.34 },
  { id: 'hond', label: 'Hond', paths: [HOND], per: 3.61, area: 0.44 },
  { id: 'kat', label: 'Kat', paths: [KAT], per: 4.47, area: 0.47 },
  { id: 'hert', label: 'Hert', paths: [HERT], per: 4.37, area: 0.33 },
  { id: 'boom', label: 'Boom', paths: [BOOM], per: 3.37, area: 0.3 },
  { id: 'tulp', label: 'Tulp', paths: [TULP], per: 3.31, area: 0.29 },
  { id: 'molen', label: 'Molen', paths: [MOLEN_ROMP, MOLEN_WIEKEN], per: 4.24, area: 0.21 },
  { id: 'kerk', label: 'Kerk', paths: [KERK], per: 3.52, area: 0.55 },
]

export const figure = (id: string): Figure | undefined => FIGURES.find((f) => f.id === id)

/** Omtrek van een gesloten polygon (genormaliseerde eenheden). */
export function pathPerimeter(pts: FigurePath): number {
  let sum = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[(i + 1) % pts.length]
    sum += Math.hypot(x2 - x1, y2 - y1)
  }
  return sum
}

/** Oppervlak van een gesloten polygon (shoelace, altijd positief). */
export function pathArea(pts: FigurePath): number {
  let sum = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[(i + 1) % pts.length]
    sum += x1 * y2 - x2 * y1
  }
  return Math.abs(sum) / 2
}

/**
 * Omtrek/oppervlak per eenheid figuurhoogte voor eigen (foto-)silhouetten;
 * voor bibliotheekfiguren staan deze hard in FIGURES.
 */
export function figureStats(paths: FigurePath[]): { per: number; area: number } {
  const ys = paths.flat().map((p) => p[1])
  const hgt = Math.max(...ys) - Math.min(...ys) || 1
  const per = paths.reduce((s, p) => s + pathPerimeter(p), 0) / hgt
  const area = paths.reduce((s, p) => s + pathArea(p), 0) / (hgt * hgt)
  return { per: Math.round(per * 100) / 100, area: Math.round(area * 100) / 100 }
}

/** SVG-pad (voor previews en de mini-configurator). */
export function figureSvgPath(paths: FigurePath[]): string {
  return paths
    .map((pts) => 'M' + pts.map(([x, y]) => `${x} ${y}`).join('L') + 'Z')
    .join(' ')
}
