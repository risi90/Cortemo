import { useState } from 'react'
import {
  ArrowRight,
  Box,
  FileUp,
  Home,
  Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { euro } from '../data/catalog'
import type { ConfigTypeId } from '../data/configuratorSchema'

/**
 * Mini-configurator voor in de homepage-hero (uit het Cortemo-ontwerp):
 * categorie → product → live SVG-voorbeeld met vanafprijs, en een CTA die
 * doorschakelt naar de volledige 3D-configurator of de offerte-route.
 */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

type MiniModel = 'bak' | 'strip' | 'panel' | 'bord' | 'figuur' | 'ring' | 'tegel' | 'aanvraag' | 'dxf'

type MiniProduct = {
  id: string
  label: string
  cat: string
  model: MiniModel
  d?: Record<string, number>
  vanaf?: number
  /** Producttype in de 3D-configurator waarmee dit product opent. */
  cfgType?: ConfigTypeId
}

const MINI_CATS = [
  { id: 'hoogte', label: 'Hoogte' },
  { id: 'planten', label: 'Planten' },
  { id: 'vuurwater', label: 'Vuur & water' },
  { id: 'deco', label: 'Decoratie' },
]

/**
 * In sync met de 3D-configurator: alles mét cfgType opent daar direct het
 * juiste producttype; zonder cfgType is het bewust een offerte-route
 * (ronde, diepe vormen zoals vuurschalen walsen we niet zelf — plat rond
 * zoals de staptegel kan wél direct).
 */
const MINI_CATALOG: MiniProduct[] = [
  { id: 'keerwand', label: 'Keerwand', cat: 'hoogte', model: 'strip', d: { L: 2500, H: 800 }, vanaf: 87, cfgType: 'keerwand' },
  { id: 'borderrand', label: 'Borderrand', cat: 'hoogte', model: 'strip', d: { L: 2500, H: 150 }, vanaf: 35, cfgType: 'borderrand' },
  { id: 'vijverrand', label: 'Vijverrand', cat: 'hoogte', model: 'strip', d: { L: 2000, H: 300 }, vanaf: 58, cfgType: 'borderrand' },
  { id: 'schutting', label: 'Schutting', cat: 'hoogte', model: 'panel', d: { BW: 1800, BH: 1800 }, vanaf: 257, cfgType: 'schutting' },
  { id: 'staptegel', label: 'Staptegel', cat: 'hoogte', model: 'tegel', d: { D: 450 }, vanaf: 77, cfgType: 'staptegel' },
  { id: 'trap', label: 'Traptreden', cat: 'hoogte', model: 'aanvraag' },
  { id: 'plantenbak', label: 'Plantenbak', cat: 'planten', model: 'bak', d: { L: 2000, W: 600, H: 600 }, vanaf: 120, cfgType: 'plantenbak' },
  { id: 'moestuinbak', label: 'Moestuinbak', cat: 'planten', model: 'bak', d: { L: 1500, W: 800, H: 500 }, vanaf: 202, cfgType: 'plantenbak' },
  { id: 'boomring', label: 'Boomring', cat: 'planten', model: 'ring', d: { D: 1000, RB: 200 } },
  { id: 'sokkel', label: 'Sokkel', cat: 'planten', model: 'bak', d: { L: 400, W: 400, H: 800 }, vanaf: 112, cfgType: 'plantenbak' },
  { id: 'pergola', label: 'Pergola', cat: 'planten', model: 'aanvraag' },
  { id: 'houtopslag', label: 'Houtopslag', cat: 'vuurwater', model: 'bak', d: { L: 1800, W: 400, H: 1600 }, vanaf: 491, cfgType: 'plantenbak' },
  { id: 'vuurschaal', label: 'Vuurschaal', cat: 'vuurwater', model: 'aanvraag' },
  { id: 'waterelement', label: 'Waterelement', cat: 'vuurwater', model: 'aanvraag' },
  { id: 'buitenkeuken', label: 'Buitenkeuken', cat: 'vuurwater', model: 'aanvraag' },
  { id: 'naambord', label: 'Naambord', cat: 'deco', model: 'bord', d: { BW: 450, BH: 220 }, vanaf: 86, cfgType: 'naambord' },
  { id: 'figuur', label: 'Figuur', cat: 'deco', model: 'figuur', d: { FH: 800 }, vanaf: 73, cfgType: 'figuur' },
  { id: 'muurdecoratie', label: 'Muurdecoratie', cat: 'deco', model: 'figuur', d: { FH: 800 }, vanaf: 73, cfgType: 'figuur' },
  { id: 'brievenbus', label: 'Brievenbus', cat: 'deco', model: 'bak', d: { L: 380, W: 300, H: 1200 }, vanaf: 338, cfgType: 'plantenbak' },
  { id: 'verlichting', label: 'Verlichting', cat: 'deco', model: 'aanvraag' },
  { id: 'zitbank', label: 'Zitbank', cat: 'deco', model: 'aanvraag' },
  { id: 'voederhuisje', label: 'Voederhuisje', cat: 'deco', model: 'aanvraag' },
  { id: 'dxf', label: 'Eigen DXF', cat: 'deco', model: 'dxf' },
]

const CORTEN_STOPS: [string, string][] = [
  ['0%', '#B45309'],
  ['50%', '#93441E'],
  ['100%', '#7C2D12'],
]

const FIGURE = {
  path: 'M50 4 L74 40 L63 40 L84 70 L70 70 L92 102 L57 102 L57 121 L43 121 L43 102 L8 102 L30 70 L16 70 L37 40 L26 40 Z',
  ratio: 1.25,
}

function CortenGrad({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      {CORTEN_STOPS.map(([o, c]) => (
        <stop key={o} offset={o} stopColor={c} />
      ))}
    </linearGradient>
  )
}

/* isometrisch doosje voor bakken en stroken */
function BakPreview({ vals }: { vals: Record<string, number> }) {
  const { L = 1000, W = 500, H = 500 } = vals
  const pts: [number, number][] = [
    [0, 0],
    [L, 0],
    [L, W],
    [0, W],
  ]
  const theta = -0.5
  const VW = 300
  const VH = 130
  const M = 12
  const cx = L / 2
  const cy = W / 2
  const rot = ([x, y]: [number, number]): [number, number] => {
    const dx = x - cx
    const dy = y - cy
    return [dx * Math.cos(theta) - dy * Math.sin(theta), dx * Math.sin(theta) + dy * Math.cos(theta)]
  }
  const rpts = pts.map(rot)
  const proj = ([rx, ry]: [number, number], z: number): [number, number] => [rx, ry * 0.5 - z * 0.85]
  const bottom = rpts.map((p) => proj(p, 0))
  const top = rpts.map((p) => proj(p, H))
  const all = bottom.concat(top)
  const minX = Math.min(...all.map((p) => p[0]))
  const maxX = Math.max(...all.map((p) => p[0]))
  const minY = Math.min(...all.map((p) => p[1]))
  const maxY = Math.max(...all.map((p) => p[1]))
  const s = Math.min((VW - 2 * M) / (maxX - minX), (VH - 2 * M) / (maxY - minY))
  const m = ([x, y]: [number, number]): [number, number] => [
    (x - minX) * s + (VW - (maxX - minX) * s) / 2,
    (y - minY) * s + (VH - (maxY - minY) * s) / 2,
  ]
  const walls = pts
    .map((_, i) => {
      const j = (i + 1) % pts.length
      const [x1, y1] = rpts[i]
      const [x2, y2] = rpts[j]
      const ex = x2 - x1
      const ey = y2 - y1
      const len = Math.hypot(ex, ey) || 1
      const nx = ey / len
      const ny = -ex / len
      return {
        depth: (y1 + y2) / 2,
        lum: clamp(30 + ny * 11 - nx * 5, 22, 45),
        quad: [m(bottom[i]), m(bottom[j]), m(top[j]), m(top[i])],
      }
    })
    .sort((a, b) => a.depth - b.depth)
  const P = (poly: [number, number][]) => poly.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')
  return (
    <svg viewBox="0 0 300 130" className="h-full w-full">
      <defs>
        <CortenGrad id="miniBakGrad" />
      </defs>
      {walls.map((w, i) => (
        <polygon key={i} points={P(w.quad as [number, number][])} fill={'hsl(19 62% ' + w.lum + '%)'} />
      ))}
      <polygon points={P(top.map(m))} fill="url(#miniBakGrad)" />
    </svg>
  )
}

function BordPreview({ BW, BH }: { BW: number; BH: number }) {
  const s = Math.min(240 / BW, 100 / BH)
  const w = BW * s
  const h = BH * s
  const fs = Math.min(h * 0.62, w * 0.75)
  return (
    <svg viewBox="0 0 300 130" className="h-full w-full">
      <defs>
        <CortenGrad id="miniPlateGrad" />
        <mask id="miniPlateCut">
          <rect x={150 - w / 2} y={65 - h / 2} width={w} height={h} rx="7" fill="white" />
          <text
            x="150"
            y={65 + fs * 0.36}
            textAnchor="middle"
            fontFamily="Inter, sans-serif"
            fontWeight="800"
            fontSize={fs}
            fill="black"
            letterSpacing="1.5"
          >
            12
          </text>
        </mask>
      </defs>
      <rect x={150 - w / 2} y={65 - h / 2} width={w} height={h} rx="7" fill="url(#miniPlateGrad)" mask="url(#miniPlateCut)" />
    </svg>
  )
}

function FigPreview({ FH }: { FH: number }) {
  const hPx = clamp(FH * 0.055, 30, 102)
  const wPx = hPx / FIGURE.ratio
  return (
    <svg viewBox="0 0 300 130" className="h-full w-full">
      <defs>
        <CortenGrad id="miniFigGrad" />
      </defs>
      <line x1="70" y1="118" x2="230" y2="118" stroke="#E5E7EB" strokeWidth="2" />
      <g transform={'translate(' + (150 - wPx / 2) + ' ' + (118 - hPx) + ') scale(' + wPx / 100 + ' ' + hPx / 125 + ')'}>
        <path d={FIGURE.path} fill="url(#miniFigGrad)" />
      </g>
    </svg>
  )
}

function RingPreview({ D, RB }: { D: number; RB: number }) {
  const ro = 52
  const ri = ro * Math.max(0.1, (D - 2 * RB) / D)
  return (
    <svg viewBox="0 0 300 130" className="h-full w-full">
      <defs>
        <CortenGrad id="miniRingGrad" />
      </defs>
      <path
        fillRule="evenodd"
        fill="url(#miniRingGrad)"
        d={
          'M ' + (150 - ro) + ' 65 a ' + ro + ' ' + ro + ' 0 1 0 ' + 2 * ro + ' 0 a ' + ro + ' ' + ro + ' 0 1 0 ' + -2 * ro + ' 0 Z ' +
          'M ' + (150 - ri) + ' 65 a ' + ri + ' ' + ri + ' 0 1 0 ' + 2 * ri + ' 0 a ' + ri + ' ' + ri + ' 0 1 0 ' + -2 * ri + ' 0 Z'
        }
      />
      <circle cx="150" cy="65" r={ri * 0.55} fill="#E8E2D9" />
    </svg>
  )
}

/** Platte ronde staptegel met motief-uitsnede, licht isometrisch. */
function TegelPreview() {
  return (
    <svg viewBox="0 0 300 130" className="h-full w-full">
      <defs>
        <CortenGrad id="miniTegelGrad" />
        <mask id="miniTegelCut">
          <ellipse cx="150" cy="70" rx="78" ry="34" fill="white" />
          <path
            d="M150 82 L138 68 L135 62 L136 56 L140 52 L145 52 L149 56 L150 59 L151 56 L155 52 L160 52 L164 56 L165 62 L162 68 Z"
            fill="black"
          />
        </mask>
      </defs>
      <ellipse cx="150" cy="75" rx="78" ry="34" fill="hsl(19 62% 22%)" />
      <ellipse cx="150" cy="70" rx="78" ry="34" fill="url(#miniTegelGrad)" mask="url(#miniTegelCut)" />
    </svg>
  )
}

function PanelPreview({ BW, BH }: { BW: number; BH: number }) {
  const s = Math.min(150 / BW, 96 / BH)
  const w = BW * s
  const h = BH * s
  const x = 150 - w / 2
  const y = 114 - h
  const holes: [number, number, number][] = []
  for (let px = x + 10; px < x + w - 8; px += 15)
    for (let py = y + 10; py < y + h - 8; py += 15)
      holes.push([px + Math.sin(py * 0.3 + px * 0.2) * 3, py, 1.8 + 1.4 * Math.abs(Math.sin(px * 0.15 + py * 0.25))])
  return (
    <svg viewBox="0 0 300 130" className="h-full w-full">
      <defs>
        <CortenGrad id="miniPanelGrad" />
        <mask id="miniPanelCut">
          <rect x={x} y={y} width={w} height={h} rx="2" fill="white" />
          {holes.map(([hx, hy, r], i) => (
            <circle key={i} cx={hx} cy={hy} r={r} fill="black" />
          ))}
        </mask>
      </defs>
      <line x1="70" y1="114" x2="230" y2="114" stroke="#E5E7EB" strokeWidth="2" />
      <rect x={x} y={y} width={w} height={h} rx="2" fill="url(#miniPanelGrad)" mask="url(#miniPanelCut)" />
    </svg>
  )
}

function MiniPreview({ p }: { p: MiniProduct }) {
  if (p.model === 'aanvraag' || p.model === 'dxf') {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-lg border-2 border-dashed border-rust/50 px-6 py-3 text-[12px] font-semibold text-rust">
          {p.model === 'dxf' ? 'Jouw eigen contour' : 'Maatwerk, op aanvraag'}
        </div>
      </div>
    )
  }
  const d = p.d!
  if (p.model === 'bak') return <BakPreview vals={d} />
  if (p.model === 'strip') return <BakPreview vals={{ L: d.L, W: Math.max(40, d.L * 0.015), H: d.H }} />
  if (p.model === 'bord') return <BordPreview BW={d.BW} BH={d.BH} />
  if (p.model === 'figuur') return <FigPreview FH={d.FH} />
  if (p.model === 'ring') return <RingPreview D={d.D} RB={d.RB} />
  if (p.model === 'tegel') return <TegelPreview />
  if (p.model === 'panel') return <PanelPreview BW={d.BW} BH={d.BH} />
  return null
}

const CAT_ICONS: Record<string, LucideIcon> = {
  hoogte: Home,
  planten: Box,
  vuurwater: Sparkles,
  deco: FileUp,
}
void CAT_ICONS

export function MiniConfigurator({
  onStart,
}: {
  /** Opent de configurator (met producttype indien mappbaar) of de offerte-route. */
  onStart: (cfgType?: ConfigTypeId) => void
}) {
  const [cat, setCat] = useState('planten')
  const [productId, setProductId] = useState('plantenbak')
  const products = MINI_CATALOG.filter((p) => p.cat === cat)
  const product = MINI_CATALOG.find((p) => p.id === productId) || products[0]
  const pickCat = (id: string) => {
    setCat(id)
    setProductId(MINI_CATALOG.find((p) => p.cat === id)!.id)
  }
  // alles zonder koppeling naar de 3D-configurator loopt via de offerte-route
  const isAanvraag = !product.cfgType

  return (
    <div className="w-full shrink-0 lg:w-[min(480px,45%)]">
      <div className="on-light flex flex-col gap-3 overflow-hidden rounded-2xl bg-gradient-to-b from-white via-white to-rust-ghost p-4 shadow-2xl ring-1 ring-white/60 backdrop-blur-xl sm:rounded-3xl sm:p-5">
        <h2 className="text-lg font-semibold tracking-tight text-ink sm:text-xl">
          Stel je product samen
        </h2>

        <div className="flex gap-1 rounded-xl bg-ink/5 p-1">
          {MINI_CATS.map((c) => (
            <button
              key={c.id}
              onClick={() => pickCat(c.id)}
              className={
                'flex-1 whitespace-nowrap rounded-lg py-2 text-[12px] font-semibold transition-all ' +
                (cat === c.id ? 'bg-white text-rust shadow-sm' : 'text-ink-soft hover:text-ink')
              }
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => setProductId(p.id)}
              className={
                'rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all ' +
                (product.id === p.id
                  ? 'border-rust bg-rust-tint text-rust'
                  : 'border-line bg-white text-ink-soft hover:border-ink-faint hover:text-ink')
              }
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* live voorbeeld van het gekozen product */}
        <div className="relative h-[116px] shrink-0 overflow-hidden rounded-xl border border-line-soft bg-gradient-to-br from-rust-ghost via-white to-line-soft">
          <span className="absolute left-3 top-2 text-[10px] font-semibold uppercase tracking-[.08em] text-ink-faint">
            Voorbeeld
          </span>
          <MiniPreview p={product} />
        </div>

        <div className="flex items-end justify-between border-t border-line-soft pt-2.5">
          <div>
            <div className="text-[13px] font-semibold text-ink">{product.label}</div>
            <div className="text-[11px] text-ink-faint">
              {isAanvraag
                ? product.model === 'dxf'
                  ? 'Prijs na maakbaarheidscontrole'
                  : 'Vaste prijs binnen 1 werkdag'
                : 'Op maat, levertijd 10 tot 15 werkdagen'}
            </div>
          </div>
          {!isAanvraag && product.vanaf && (
            <div className="text-[22px] font-extrabold leading-none tabular-nums text-ink">
              <span className="text-[12px] font-semibold text-ink-soft">vanaf </span>
              {euro(product.vanaf)}
            </div>
          )}
        </div>

        <button
          onClick={() => onStart(product.cfgType)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-rust py-3 text-sm font-semibold text-white shadow-lg shadow-rust/30 transition-all hover:bg-rust-deep"
        >
          {isAanvraag
            ? product.model === 'dxf'
              ? 'Upload je ontwerp'
              : 'Vraag offerte aan'
            : 'Configureer ' + product.label.toLowerCase()}{' '}
          <ArrowRight size={15} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
