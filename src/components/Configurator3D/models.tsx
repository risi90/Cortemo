import { useMemo } from 'react'
import { cortenLaserMaterial, cortenMaterial } from './cortenMaterial'
import type { ConfigState } from '../../lib/pricing'

const MM = 1 / 1000

type Part = {
  /** [breedte, hoogte, diepte] in meters */
  size: [number, number, number]
  pos: [number, number, number]
  kind: 'steel' | 'laser'
}

/**
 * Parametrische opbouw per producttype uit eenvoudige platen. Elke plaat is
 * een box met de echte staaldikte, zodat inzoomen op randen en naden klopt.
 * Alle producten staan op y=0, gecentreerd rond de oorsprong.
 */
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
    case 'borderrand': {
      const parts: Part[] = [{ size: [L, H, t], pos: [0, H / 2, 0], kind: 'steel' }]
      if (state.options.pennen) {
        const n = Math.max(2, Math.ceil(l / 1000) + 1)
        for (let i = 0; i < n; i++) {
          const x = -L / 2 + (i * L) / (n - 1)
          parts.push({
            size: [0.04, H * 0.85, t],
            pos: [x === -L / 2 ? x + 0.03 : x === L / 2 ? x - 0.03 : x, (H * 0.85) / 2, t],
            kind: 'steel',
          })
        }
      }
      return { parts, lift: 0 }
    }
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
  }
}

export function ProductModel({ state, rust }: { state: ConfigState; rust: number }) {
  const optionsKey = JSON.stringify(state.options)
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
