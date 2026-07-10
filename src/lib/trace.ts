import type { FigurePath } from '../data/figures'

/**
 * Foto → silhouet: binair masker → buitencontour (Moore-neighbor tracing)
 * → vereenvoudiging (Ramer–Douglas–Peucker) → genormaliseerd 0–100-vlak.
 * Alleen de grootste contour telt; kleine vlekken en gaten vervallen —
 * precies wat je wilt voor een lasersnijbaar silhouet.
 */

export type Mask = { data: Uint8Array; w: number; h: number }

/** Luminantiedrempel op een canvas-afbeelding; donker = vorm (of andersom). */
export function maskFromImage(img: ImageData, threshold: number, invert: boolean): Mask {
  const { data, width: w, height: h } = img
  const out = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    const a = data[i * 4 + 3]
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    const on = a > 40 && (invert ? lum > threshold : lum < threshold)
    out[i] = on ? 1 : 0
  }
  return { data: out, w, h }
}

const at = (m: Mask, x: number, y: number): number =>
  x < 0 || y < 0 || x >= m.w || y >= m.h ? 0 : m.data[y * m.w + x]

/** Moore-neighbor tracing van de contour die bij startpixel hoort. */
function traceFrom(m: Mask, sx: number, sy: number): [number, number][] {
  // 8 buren, met de klok mee vanaf links
  const N: [number, number][] = [
    [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1],
  ]
  const contour: [number, number][] = [[sx, sy]]
  let cx = sx
  let cy = sy
  let dir = 0 // kwam binnen vanaf links
  const maxSteps = m.w * m.h * 4
  for (let step = 0; step < maxSteps; step++) {
    let found = false
    for (let i = 0; i < 8; i++) {
      const k = (dir + i) % 8
      const nx = cx + N[k][0]
      const ny = cy + N[k][1]
      if (at(m, nx, ny)) {
        contour.push([nx, ny])
        // backtrack: volgende zoekstart is de buur vóór de gevonden pixel
        dir = (k + 5) % 8
        cx = nx
        cy = ny
        found = true
        break
      }
    }
    if (!found) break // losse pixel
    if (cx === sx && cy === sy && contour.length > 3) break
  }
  return contour
}

/** Grootste samenhangende contour in het masker (op omsloten bbox-gebied). */
export function largestContour(m: Mask): [number, number][] {
  const seen = new Set<number>()
  let best: [number, number][] = []
  let bestSpan = 0
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      if (!m.data[y * m.w + x] || at(m, x - 1, y)) continue
      const key = y * m.w + x
      if (seen.has(key)) continue
      const contour = traceFrom(m, x, y)
      for (const [px, py] of contour) seen.add(py * m.w + px)
      const xs = contour.map((p) => p[0])
      const ys = contour.map((p) => p[1])
      const span = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys))
      if (span > bestSpan) {
        bestSpan = span
        best = contour
      }
    }
  }
  return best
}

/** Ramer–Douglas–Peucker-vereenvoudiging. */
export function simplify(pts: [number, number][], epsilon: number): [number, number][] {
  if (pts.length < 4) return pts
  const dmax = { d: 0, i: 0 }
  const [x1, y1] = pts[0]
  const [x2, y2] = pts[pts.length - 1]
  const len = Math.hypot(x2 - x1, y2 - y1) || 1
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i]
    const d = Math.abs((x2 - x1) * (y1 - y) - (x1 - x) * (y2 - y1)) / len
    if (d > dmax.d) {
      dmax.d = d
      dmax.i = i
    }
  }
  if (dmax.d <= epsilon) return [pts[0], pts[pts.length - 1]]
  const left = simplify(pts.slice(0, dmax.i + 1), epsilon)
  const right = simplify(pts.slice(dmax.i), epsilon)
  return left.slice(0, -1).concat(right)
}

/**
 * Volledige pipeline: masker → grootste contour → vereenvoudigd →
 * genormaliseerd naar 0–100 (y omlaag), afgerond op hele punten.
 * Retourneert null als er geen bruikbare vorm gevonden is.
 */
export function traceSilhouette(m: Mask): FigurePath | null {
  let contour = largestContour(m)
  if (contour.length < 12) return null
  // gesloten contour: eindpunt = beginpunt maakt RDP zinloos (afstand tot
  // een ontaarde lijn is altijd 0) — splits op het verste punt en
  // vereenvoudig beide helften apart
  if (contour.length > 1) {
    const last = contour[contour.length - 1]
    if (last[0] === contour[0][0] && last[1] === contour[0][1]) contour = contour.slice(0, -1)
  }
  const [x0, y0] = contour[0]
  let far = 1
  let farD = 0
  for (let i = 1; i < contour.length; i++) {
    const d = (contour[i][0] - x0) ** 2 + (contour[i][1] - y0) ** 2
    if (d > farD) {
      farD = d
      far = i
    }
  }
  const closedSimplify = (eps: number, source: [number, number][]) => [
    ...simplify(source.slice(0, far + 1), eps).slice(0, -1),
    ...simplify(source.slice(far).concat([source[0]]), eps).slice(0, -1),
  ]
  let pts = closedSimplify(Math.max(1.2, Math.min(m.w, m.h) / 220), contour)
  if (pts.length > 120) pts = simplify(pts, Math.min(m.w, m.h) / 110)
  if (pts.length < 3) return null
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const span = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY) || 1
  const norm = pts.map(
    ([x, y]) =>
      [Math.round(((x - minX) / span) * 100), Math.round(((y - minY) / span) * 100)] as [
        number,
        number,
      ],
  )
  // opeenvolgende duplicaten na afronding weghalen
  return norm.filter(
    ([x, y], i) => i === 0 || x !== norm[i - 1][0] || y !== norm[i - 1][1],
  )
}
