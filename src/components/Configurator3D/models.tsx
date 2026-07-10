import { useMemo } from 'react'
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

const textTextureCache = new Map<string, THREE.CanvasTexture>()

function textTexture(text: string): { tex: THREE.CanvasTexture; ratio: number } {
  const key = text
  let tex = textTextureCache.get(key)
  const font = '700 96px Archivo, Inter, system-ui, sans-serif'
  if (!tex) {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    ctx.font = font
    const w = Math.max(8, Math.ceil(ctx.measureText(text).width) + 16)
    canvas.width = w
    canvas.height = 128
    const ctx2 = canvas.getContext('2d')!
    ctx2.clearRect(0, 0, w, 128)
    ctx2.font = font
    ctx2.textBaseline = 'middle'
    ctx2.fillStyle = '#0c0906'
    ctx2.fillText(text, 8, 68)
    tex = new THREE.CanvasTexture(canvas)
    tex.anisotropy = 4
    if (textTextureCache.size > 40) textTextureCache.clear()
    textTextureCache.set(key, tex)
  }
  return { tex, ratio: (tex.image as HTMLCanvasElement).width / 128 }
}

function TextDecal({
  text,
  heightM,
  position,
  rotation,
  onPointerDown,
}: {
  text: string
  heightM: number
  position: [number, number, number]
  rotation?: [number, number, number]
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void
}) {
  const { tex, ratio } = useMemo(() => textTexture(text), [text])
  if (!text.trim()) return null
  return (
    <mesh position={position} rotation={rotation} onPointerDown={onPointerDown}>
      <planeGeometry args={[heightM * ratio * 0.78, heightM]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} />
    </mesh>
  )
}

/* ---------- producttypes met ontwerp-editor ---------- */

function useDrag(target: DragTarget) {
  const setDragging = useConfiguratorStore((s) => s.setDragging)
  return (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setDragging(target)
  }
}

/** Ronde staptegel met optioneel uitgesneden motief (echt gat). */
function Staptegel({ state, rust }: { state: ConfigState; rust: number }) {
  const D = (state.dims.l || 450) * MM
  const t = state.thickness * MM
  const d = state.deco
  const paths = decoPaths(state)
  const setDeco = useConfiguratorStore((s) => s.setDeco)
  const dragging = useConfiguratorStore((s) => s.dragging)
  const startDrag = useDrag('fig')

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

  const move = (e: ThreeEvent<PointerEvent>) => {
    if (dragging !== 'fig' || !d) return
    const figH = d.s * D
    const span = D - figH || 1
    setDeco({ x: e.point.x / span + 0.5, y: 0.5 - -e.point.z / span })
  }

  return (
    <group position={[0, 0.004, 0]}>
      <mesh
        geometry={geometry}
        material={cortenMaterial(rust)}
        castShadow
        receiveShadow
        onPointerDown={paths.length ? startDrag : undefined}
        onPointerMove={move}
      />
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
  const dragging = useConfiguratorStore((s) => s.dragging)
  const dragFig = useDrag('fig')
  const dragText = useDrag('text')
  const dragNr = useDrag('nr')

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

  const move = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging || !d) return
    const local = { x: e.point.x, y: e.point.y - (H / 2 + 0.02) }
    if (dragging === 'fig') {
      const span = { x: L - d.s * H || 1, y: H - d.s * H || 1 }
      setDeco({ x: local.x / span.x + 0.5, y: 0.5 - local.y / span.y })
    } else if (dragging === 'text') {
      setDeco({ tx: local.x / L + 0.5, ty: 0.5 - local.y / H })
    } else if (dragging === 'nr') {
      setDeco({ nx: local.x / L + 0.5, ny: 0.5 - local.y / H })
    }
  }

  const yc = H / 2 + 0.02 // bord hangt net boven de grond
  return (
    <group position={[0, yc, 0]}>
      <mesh
        geometry={geometry}
        material={cortenMaterial(rust)}
        castShadow
        receiveShadow
        onPointerDown={paths.length ? dragFig : undefined}
        onPointerMove={move}
      />
      {d && (
        <>
          <TextDecal
            text={d.text}
            heightM={d.ts * H}
            position={[(d.tx - 0.5) * L, (0.5 - d.ty) * H, t / 2 + 0.0004]}
            onPointerDown={dragText}
          />
          <TextDecal
            text={d.nr}
            heightM={d.ns * H}
            position={[(d.nx - 0.5) * L, (0.5 - d.ny) * H, t / 2 + 0.0004]}
            onPointerDown={dragNr}
          />
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
