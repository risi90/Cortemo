import { Html, Line } from '@react-three/drei'
import type { DimensionKey } from '../../data/configuratorSchema'

const MM = 1 / 1000

type Vec3 = [number, number, number]

function DimLine({ from, to, label }: { from: Vec3; to: Vec3; label: string }) {
  const mid: Vec3 = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2]
  // korte eindstreepjes haaks op de meetlijn
  const vertical = from[0] === to[0] && from[2] === to[2]
  const tick = 0.03
  const tickDir: Vec3 = vertical ? [tick, 0, 0] : [0, tick, 0]
  const ticks = [from, to].map((p) => [
    [p[0] - tickDir[0], p[1] - tickDir[1], p[2] - tickDir[2]] as Vec3,
    [p[0] + tickDir[0], p[1] + tickDir[1], p[2] + tickDir[2]] as Vec3,
  ])
  return (
    <group>
      <Line points={[from, to]} color="#D95A2B" lineWidth={1.5} />
      {ticks.map((t, i) => (
        <Line key={i} points={t} color="#D95A2B" lineWidth={1.5} />
      ))}
      {/* on-media houdt de tekst wit in het lichte thema (donkere chip) */}
      <Html position={mid} center zIndexRange={[20, 0]} wrapperClass="on-media">
        <span className="pointer-events-none select-none whitespace-nowrap rounded-md bg-[#101418]/85 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white shadow-sm">
          {label}
        </span>
      </Html>
    </group>
  )
}

/**
 * Meetlijnen met mm-labels rond het product. De labels zijn DOM-overlays
 * (drei <Html>), zodat ze scherp blijven en de sitetypografie volgen.
 */
export function Dimensions({
  dims,
  keys,
}: {
  dims: Record<DimensionKey, number>
  keys: DimensionKey[]
}) {
  const L = (dims.l ?? 0) * MM
  const B = (dims.b ?? 0) * MM
  const H = (dims.h ?? 0) * MM
  const off = 0.1
  const depth = keys.includes('b') ? B / 2 : 0.02

  return (
    <group>
      {keys.includes('l') && (
        <DimLine
          from={[-L / 2, 0.002, depth + off]}
          to={[L / 2, 0.002, depth + off]}
          label={`${dims.l} mm`}
        />
      )}
      {keys.includes('b') && (
        <DimLine
          from={[L / 2 + off, 0.002, -B / 2]}
          to={[L / 2 + off, 0.002, B / 2]}
          label={`${dims.b} mm`}
        />
      )}
      {keys.includes('h') && (
        <DimLine
          from={[-(L / 2 + off), 0, depth]}
          to={[-(L / 2 + off), H, depth]}
          label={`${dims.h} mm`}
        />
      )}
    </group>
  )
}
