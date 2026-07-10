import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { cortenLaserMaterial, cortenMaterial } from './cortenMaterial'
import { figure, type FigurePath } from '../../data/figures'
import { useConfiguratorStore, type DragTarget } from '../../store/configuratorStore'
import type { ConfigState } from '../../lib/pricing'

const MM = 1 / 1000

type Part = {
  /** [breedte, hoogte, diepte] in meters */
  size: [number, number, number]
  pos: [number, number, number]
  kind: 'steel' | 'laser'
}

/** Actieve figuurpaden (bibliotheek of eigen silhouet), 0–100, y omlaag. */
function decoPaths(state: ConfigState): FigurePath[] {
  const d = state.deco
  if (!d || !d.fig) return []
  if (d.fig === 'custom') return d.custom ?? []
  return figure(d.fig)?.paths ?? []
}

/**
 * THREE.Shape's van figuurpaden, geschaald naar hoogte `hM` (meters) en
 * gecentreerd rond (0,0); SVG-y-omlaag wordt hier y-omhoog.
 */
function figureShapes(paths: FigurePath[], hM: number): THREE.Shape[] {
  const ys = paths.flat().map((p) => p[1])
  const xs = paths.flat().map((p) => p[0])
  const minY = Math.min(...ys)
  const hgt = Math.max(...ys) - minY || 1
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const cy = minY + hgt / 2
  const s = hM / hgt
  return paths.map((pts) => {
    const shape = new THREE.Shape()
    pts.forEach(([x, y], i) => {
      const px = (x - cx) * s
      const py = (cy - y) * s
      if (i === 0) shape.moveTo(px, py)
      else shape.lineTo(px, py)
    })
    shape.closePath()
    return shape
  })
}

/** Zelfde schaal/centrering als figureShapes, maar dan THREE.Path (gat). */
function figureHoles(paths: FigurePath[], hM: number, offX: number, offY: number): THREE.Path[] {
  return figureShapes(paths, hM).map((shape) => {
    const path = new THREE.Path()
    const pts = shape.getPoints()
    pts.forEach((p, i) => {
      if (i === 0) path.moveTo(p.x + offX, p.y + offY)
      else path.lineTo(p.x + offX, p.y + offY)
    })
    path.closePath()
    return path
  })
}

/** Parametrische opbouw uit platen voor de rechthoekige producttypes. */
function buildParts(state: ConfigState): { parts: Part[]; lift: number } {
  const t = state.thickness * MM
  const { l = 0, b = 0, h = 0 } = state.dims
  const [L, B, H] = [l * MM, b * MM, h * MM]

  switch (state.typeId) {
    case 'plantenbak': {
      const lift = state.options.wielen ? 0.07 : 0
      const parts: Part[] = [
        { size: [L, H, t], pos: [0, H / 2, B / 2 - t / 2], kind: 'steel' },
        { size: [L, H, t], pos: [0, H / 2, -(B / 2 - t / 2)], kind: 'steel' },
        { size: [t, H, B - 2 * t], pos: [L / 2 - t / 2, H / 2, 0], kind: 'steel' },
        { size: [t, H, B - 2 * t], pos: [-(L / 2 - t / 2), H / 2, 0], kind: 'steel' },
      ]
      if (state.options.bodem || state.options.wielen) {
        parts.push({ size: [L - 2 * t, t, B - 2 * t], pos: [0, t / 2, 0], kind: 'steel' })
      }
      return { parts, lift }
    }
    case 'keerwand': {
      const foot = 0.3
      return {
        lift: 0,
        parts: [
          { size: [L, H, t], pos: [0, H / 2, 0], kind: 'steel' },
          { size: [L, t, foot], pos: [0, t / 2, -(foot / 2 + t / 2)], kind: 'steel' },
        ],
      }
    }
    case 'borderrand':
      return { parts: [{ size: [L, H, t], pos: [0, H / 2, 0], kind: 'steel' }], lift: 0 }
    case 'schutting': {
      const post = 0.06
      return {
        lift: 0,
        parts: [
          { size: [L, H, t], pos: [0, H / 2, 0], kind: state.options.laser ? 'laser' : 'steel' },
          { size: [post, H, post], pos: [-(L / 2 - post), H / 2, -(t / 2 + post / 2)], kind: 'steel' },
          { size: [post, H, post], pos: [L / 2 - post, H / 2, -(t / 2 + post / 2)], kind: 'steel' },
        ],
      }
    }
    default:
      return { parts: [], lift: 0 }
  }
}

/* ---------- tekst als uitsnede-look (canvas-decal, geen font-assets) ---------- */

const FONT_FACES: Record<string, string> = {
  modern: '800 96px Inter, system-ui, sans-serif',
  klassiek: '400 96px "Instrument Serif", Georgia, serif',
  mono: '700 96px "Courier New", monospace',
}

const LINE_PX = 128 // canvas-hoogte per tekstregel (fontgrootte 96)

const textTextureCache = new Map<string, THREE.CanvasTexture>()

function textTexture(
  text: string,
  fontId: string,
): { tex: THREE.CanvasTexture; lines: number; ratio: number } {
  const key = fontId + '|' + text
  const font = FONT_FACES[fontId] ?? FONT_FACES.modern
  const lines = text.split('\n').filter((l) => l.trim() !== '')
  if (lines.length === 0) lines.push(' ')
  let tex = textTextureCache.get(key)
  if (!tex) {
    const probe = document.createElement('canvas').getContext('2d')!
    probe.font = font
    const w = Math.max(8, Math.ceil(Math.max(...lines.map((l) => probe.measureText(l).width), 8)) + 16)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = LINE_PX * lines.length
    const ctx = canvas.getContext('2d')!
    ctx.font = font
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#0c0906'
    lines.forEach((line, i) => ctx.fillText(line, w / 2, LINE_PX * i + LINE_PX * 0.55))
    tex = new THREE.CanvasTexture(canvas)
    tex.anisotropy = 4
    if (textTextureCache.size > 40) textTextureCache.clear()
    textTextureCache.set(key, tex)
  }
  return {
    tex,
    lines: lines.length,
    ratio: (tex.image as HTMLCanvasElement).width / LINE_PX,
  }
}

/** Decal-afmetingen in meters bij letterhoogte heightM (voor klemmen). */
function textDecalSize(text: string, heightM: number, fontId: string): { w: number; h: number } {
  if (!text.trim()) return { w: 0, h: 0 }
  const { lines, ratio } = textTexture(text, fontId)
  return { w: heightM * ratio * 0.78, h: heightM * lines }
}

function TextDecal({
  text,
  heightM,
  fontId,
  position,
  onPointerDown,
}: {
  text: string
  heightM: number
  fontId: string
  position: [number, number, number]
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void
}) {
  const { tex, lines, ratio } = useMemo(() => textTexture(text, fontId), [text, fontId])
  if (!text.trim()) return null
  return (
    <mesh position={position} onPointerDown={onPointerDown}>
      <planeGeometry args={[heightM * ratio * 0.78, heightM * lines]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} />
    </mesh>
  )
}

/* ---------- slepen: delta-gebaseerd, met snappen op het midden ---------- */

type DragInfo = { target: Exclude<DragTarget, null>; px: number; py: number; x0: number; y0: number }

/** Snap naar het midden zodra je er dichtbij komt (±3,5% van de plaat). */
const snapCenter = (v: number) => (Math.abs(v - 0.5) < 0.035 ? 0.5 : v)

const clamp01 = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Oranje hulplijnen door het midden zodra een element gesnapt staat. */
function CenterGuides({
  snapX,
  snapY,
  w,
  h,
  position,
  rotation,
}: {
  snapX: boolean
  snapY: boolean
  w: number
  h: number
  position: [number, number, number]
  rotation?: [number, number, number]
}) {
  if (!snapX && !snapY) return null
  return (
    <group position={position} rotation={rotation}>
      {snapX && (
        <mesh>
          <planeGeometry args={[0.0016, h]} />
          <meshBasicMaterial color="#e06a35" transparent opacity={0.9} depthWrite={false} />
        </mesh>
      )}
      {snapY && (
        <mesh>
          <planeGeometry args={[w, 0.0016]} />
          <meshBasicMaterial color="#e06a35" transparent opacity={0.9} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

/** Ronde staptegel met optioneel uitgesneden motief (echt gat). */
function Staptegel({ state, rust }: { state: ConfigState; rust: number }) {
  const D = (state.dims.l || 450) * MM
  const t = state.thickness * MM
  const d = state.deco
  const paths = decoPaths(state)
  const setDeco = useConfiguratorStore((s) => s.setDeco)
  const setDragging = useConfiguratorStore((s) => s.setDragging)
  const dragging = useConfiguratorStore((s) => s.dragging)
  const drag = useRef<DragInfo | null>(null)

  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.absarc(0, 0, D / 2, 0, Math.PI * 2, false)
    if (paths.length && d) {
      const figH = d.s * D
      const offX = (d.x - 0.5) * (D - figH)
      const offY = (0.5 - d.y) * (D - figH)
      shape.holes.push(...figureHoles(paths, figH, offX, offY))
    }
    const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false })
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [D, t, d?.s, d?.x, d?.y, d?.fig, paths, d])

  const down = (e: ThreeEvent<PointerEvent>) => {
    if (!paths.length || !d) return
    e.stopPropagation()
    setDragging('fig')
    drag.current = { target: 'fig', px: e.point.x, py: -e.point.z, x0: d.x, y0: d.y }
  }

  // delta-gebaseerd: de vorm beweegt precies mee met je vinger, en snapt
  // op het midden van de tegel zodra je er dichtbij komt
  const move = (e: ThreeEvent<PointerEvent>) => {
    const info = drag.current
    if (dragging !== 'fig' || !d || !info) return
    const span = D - d.s * D || 1
    setDeco({
      x: snapCenter(info.x0 + (e.point.x - info.px) / span),
      y: snapCenter(info.y0 - (-e.point.z - info.py) / span),
    })
  }

  return (
    <group position={[0, 0.004, 0]}>
      <mesh
        geometry={geometry}
        material={cortenMaterial(rust)}
        castShadow
        receiveShadow
        onPointerDown={down}
        onPointerMove={move}
      />
      {dragging === 'fig' && d && (
        <CenterGuides
          snapX={d.x === 0.5}
          snapY={d.y === 0.5}
          w={D}
          h={D}
          position={[0, t + 0.0015, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      )}
    </group>
  )
}

/** Naambord: plaat met montagegaten, figuur-gat en versleepbare tekst. */
function Naambord({ state, rust }: { state: ConfigState; rust: number }) {
  const L = (state.dims.l || 450) * MM
  const H = (state.dims.h || 220) * MM
  const t = state.thickness * MM
  const d = state.deco
  const paths = decoPaths(state)
  const setDeco = useConfiguratorStore((s) => s.setDeco)
  const setDragging = useConfiguratorStore((s) => s.setDragging)
  const dragging = useConfiguratorStore((s) => s.dragging)
  const drag = useRef<DragInfo | null>(null)

  const geometry = useMemo(() => {
    const r = Math.min(0.012, H * 0.08)
    const shape = new THREE.Shape()
    // afgeronde rechthoek rond (0,0)
    shape.moveTo(-L / 2 + r, -H / 2)
    shape.lineTo(L / 2 - r, -H / 2)
    shape.quadraticCurveTo(L / 2, -H / 2, L / 2, -H / 2 + r)
    shape.lineTo(L / 2, H / 2 - r)
    shape.quadraticCurveTo(L / 2, H / 2, L / 2 - r, H / 2)
    shape.lineTo(-L / 2 + r, H / 2)
    shape.quadraticCurveTo(-L / 2, H / 2, -L / 2, H / 2 - r)
    shape.lineTo(-L / 2, -H / 2 + r)
    shape.quadraticCurveTo(-L / 2, -H / 2, -L / 2 + r, -H / 2)
    // 4 montagegaten
    const inset = 0.016
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      const hole = new THREE.Path()
      hole.absarc(sx * (L / 2 - inset), sy * (H / 2 - inset), 0.003, 0, Math.PI * 2, true)
      shape.holes.push(hole)
    }
    if (paths.length && d) {
      const figH = d.s * H
      shape.holes.push(
        ...figureHoles(paths, figH, (d.x - 0.5) * (L - figH), (0.5 - d.y) * (H - figH)),
      )
    }
    const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false })
    geo.translate(0, 0, -t / 2)
    return geo
  }, [L, H, t, d?.s, d?.x, d?.y, d?.fig, paths, d])

  const yc = H / 2 + 0.02 // bord hangt net boven de grond

  // tekst en nummer blijven altijd binnen de plaat (halve decalmaat marge)
  const bounds = (value: string, heightM: number) => {
    const size = textDecalSize(value, heightM, d?.font ?? 'modern')
    return {
      minX: Math.min(0.5, size.w / 2 / L),
      maxX: Math.max(0.5, 1 - size.w / 2 / L),
      minY: Math.min(0.5, size.h / 2 / H),
      maxY: Math.max(0.5, 1 - size.h / 2 / H),
    }
  }

  const startDrag = (target: Exclude<DragTarget, null>) => (e: ThreeEvent<PointerEvent>) => {
    if (!d) return
    e.stopPropagation()
    setDragging(target)
    const [x0, y0] =
      target === 'fig' ? [d.x, d.y] : target === 'text' ? [d.tx, d.ty] : [d.nx, d.ny]
    drag.current = { target, px: e.point.x, py: e.point.y - yc, x0, y0 }
  }

  const move = (e: ThreeEvent<PointerEvent>) => {
    const info = drag.current
    if (!dragging || !d || !info || info.target !== dragging) return
    const dx = e.point.x - info.px
    const dy = e.point.y - yc - info.py
    if (dragging === 'fig') {
      const span = { x: L - d.s * H || 1, y: H - d.s * H || 1 }
      setDeco({
        x: snapCenter(info.x0 + dx / span.x),
        y: snapCenter(info.y0 - dy / span.y),
      })
    } else if (dragging === 'text') {
      const b = bounds(d.text, d.ts * H)
      setDeco({
        tx: clamp01(snapCenter(info.x0 + dx / L), b.minX, b.maxX),
        ty: clamp01(snapCenter(info.y0 - dy / H), b.minY, b.maxY),
      })
    } else if (dragging === 'nr') {
      const b = bounds(d.nr, d.ns * H)
      setDeco({
        nx: clamp01(snapCenter(info.x0 + dx / L), b.minX, b.maxX),
        ny: clamp01(snapCenter(info.y0 - dy / H), b.minY, b.maxY),
      })
    }
  }

  // ook zonder slepen netjes binnen de plaat renderen (bijv. na groter font)
  const textB = d ? bounds(d.text, d.ts * H) : null
  const nrB = d ? bounds(d.nr, d.ns * H) : null
  const tx = d && textB ? clamp01(d.tx, textB.minX, textB.maxX) : 0.5
  const ty = d && textB ? clamp01(d.ty, textB.minY, textB.maxY) : 0.5
  const nx = d && nrB ? clamp01(d.nx, nrB.minX, nrB.maxX) : 0.5
  const ny = d && nrB ? clamp01(d.ny, nrB.minY, nrB.maxY) : 0.5

  const activeSnap =
    dragging === 'fig' ? { x: d?.x === 0.5, y: d?.y === 0.5 }
    : dragging === 'text' ? { x: tx === 0.5, y: ty === 0.5 }
    : dragging === 'nr' ? { x: nx === 0.5, y: ny === 0.5 }
    : { x: false, y: false }

  return (
    <group position={[0, yc, 0]}>
      <mesh
        geometry={geometry}
        material={cortenMaterial(rust)}
        castShadow
        receiveShadow
        onPointerDown={paths.length ? startDrag('fig') : undefined}
        onPointerMove={move}
      />
      {d && (
        <>
          <TextDecal
            text={d.text}
            heightM={d.ts * H}
            fontId={d.font}
            position={[(tx - 0.5) * L, (0.5 - ty) * H, t / 2 + 0.0004]}
            onPointerDown={startDrag('text')}
          />
          <TextDecal
            text={d.nr}
            heightM={d.ns * H}
            fontId={d.font}
            position={[(nx - 0.5) * L, (0.5 - ny) * H, t / 2 + 0.0004]}
            onPointerDown={startDrag('nr')}
          />
          {dragging && (
            <CenterGuides
              snapX={activeSnap.x ?? false}
              snapY={activeSnap.y ?? false}
              w={L}
              h={H}
              position={[0, 0, t / 2 + 0.0012]}
            />
          )}
        </>
      )}
    </group>
  )
}

/** Vrijstaand silhouet: het figuur ís het product. */
function Figuur({ state, rust }: { state: ConfigState; rust: number }) {
  const H = (state.dims.h || 800) * MM
  const t = state.thickness * MM
  const paths = decoPaths(state)

  const geometry = useMemo(() => {
    if (!paths.length) return null
    const shapes = figureShapes(paths, H)
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: t, bevelEnabled: false })
    geo.translate(0, H / 2, -t / 2)
    return geo
  }, [paths, H, t])

  if (!geometry) return null
  return (
    <group>
      <mesh geometry={geometry} material={cortenMaterial(rust)} castShadow receiveShadow />
      {state.options.pennen && (
        <>
          <mesh position={[-H * 0.15, 0.05, 0]} material={cortenMaterial(rust)}>
            <boxGeometry args={[0.012, 0.28, t]} />
          </mesh>
          <mesh position={[H * 0.15, 0.05, 0]} material={cortenMaterial(rust)}>
            <boxGeometry args={[0.012, 0.28, t]} />
          </mesh>
        </>
      )}
    </group>
  )
}

/** Grondpennen van de borderrand: stekers met punt, duidelijk zichtbaar. */
function Grondpennen({ l, h, t, rust }: { l: number; h: number; t: number; rust: number }) {
  const n = Math.max(2, Math.ceil(l / 1) + 1)
  const penB = 0.05
  const boven = 0.06 // steekt boven de rand uit
  const positions: number[] = []
  for (let i = 0; i < n; i++) {
    const x = -l / 2 + (i * l) / (n - 1)
    positions.push(x === -l / 2 ? x + 0.04 : x === l / 2 ? x - 0.04 : x)
  }
  return (
    <>
      {positions.map((x, i) => (
        <group key={i} position={[x, 0, t * 1.6]}>
          {/* steker langs de voorzijde, met punt de grond in */}
          <mesh position={[0, (h + boven) / 2 - 0.02, 0]} castShadow material={cortenMaterial(rust)}>
            <boxGeometry args={[penB, h + boven, t * 1.4]} />
          </mesh>
          <mesh position={[0, h + boven - 0.02 + 0.012, 0]} castShadow material={cortenMaterial(rust)}>
            <cylinderGeometry args={[0, penB / 2, 0.025, 4]} />
          </mesh>
        </group>
      ))}
    </>
  )
}

export function ProductModel({ state, rust }: { state: ConfigState; rust: number }) {
  const optionsKey = JSON.stringify(state.options)

  if (state.typeId === 'staptegel') return <Staptegel state={state} rust={rust} />
  if (state.typeId === 'naambord') return <Naambord state={state} rust={rust} />
  if (state.typeId === 'figuur') return <Figuur state={state} rust={rust} />
  return <PlateModel state={state} rust={rust} optionsKey={optionsKey} />
}

function PlateModel({
  state,
  rust,
  optionsKey,
}: {
  state: ConfigState
  rust: number
  optionsKey: string
}) {
  const { parts, lift } = useMemo(
    () => buildParts(state),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.typeId, state.dims.l, state.dims.b, state.dims.h, state.thickness, optionsKey],
  )
  const steel = cortenMaterial(rust)
  const laser = parts.some((p) => p.kind === 'laser') ? cortenLaserMaterial(rust) : null

  return (
    <group position={[0, lift, 0]}>
      {parts.map((p, i) => (
        <mesh
          key={i}
          position={p.pos}
          material={p.kind === 'laser' && laser ? laser : steel}
          castShadow
          receiveShadow
        >
          <boxGeometry args={p.size} />
        </mesh>
      ))}
      {state.typeId === 'plantenbak' && state.options.wielen && (
        <Wheels l={state.dims.l * MM} b={state.dims.b * MM} />
      )}
      {state.typeId === 'borderrand' && state.options.pennen && (
        <Grondpennen
          l={state.dims.l * MM}
          h={state.dims.h * MM}
          t={state.thickness * MM}
          rust={rust}
        />
      )}
    </group>
  )
}

function Wheels({ l, b }: { l: number; b: number }) {
  const r = 0.035
  const inset = 0.09
  const spots: [number, number][] = [
    [l / 2 - inset, b / 2 - inset],
    [-(l / 2 - inset), b / 2 - inset],
    [l / 2 - inset, -(b / 2 - inset)],
    [-(l / 2 - inset), -(b / 2 - inset)],
  ]
  return (
    <>
      {spots.map(([x, z], i) => (
        <mesh key={i} position={[x, -r, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[r, r, 0.03, 24]} />
          <meshStandardMaterial color="#1a1d20" roughness={0.7} metalness={0.1} />
        </mesh>
      ))}
    </>
  )
}
