import { useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import {
  Check,
  ChevronDown,
  FileUp,
  ImageUp,
  Link2,
  Maximize2,
  MessageCircle,
  RefreshCw,
  Ruler,
  ShoppingCart,
} from 'lucide-react'
import { Scene } from './Scene'
import { PhotoSilhouette } from './PhotoSilhouette'
import { useConfiguratorStore, type CameraViewName } from '../../store/configuratorStore'
import { CONFIG_TYPES, configType, type DimensionKey } from '../../data/configuratorSchema'
import { FIGURES, figure, figureSvgPath } from '../../data/figures'
import { calcPrice, validateConfig, type ConfigState } from '../../lib/pricing'
import { parseCfg, serializeCfg } from '../../lib/cfg'
import { euro } from '../../data/catalog'
import { getActivePartner } from '../../lib/adminStore'
import { whatsappShare } from '../TrustBar'
import type { CartItem } from '../../lib/cart'

/* ---------- UI-bouwstenen ---------- */

/** De vier stappen van het configurator-stappenplan. */
const WIZARD_STEPS = ['Product', 'Maat', 'Ontwerp', 'Bestellen'] as const

function ViewerButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={
        'flex h-10 min-w-10 items-center justify-center gap-1 rounded-lg px-2.5 text-[11px] font-semibold backdrop-blur-md transition-colors ' +
        (active ? 'bg-rust text-white' : 'bg-black/35 text-white/80 hover:bg-black/50')
      }
    >
      {children}
    </button>
  )
}

function DimensionControl({ dimKey }: { dimKey: DimensionKey }) {
  const typeId = useConfiguratorStore((s) => s.typeId)
  const value = useConfiguratorStore((s) => s.dims[dimKey])
  const setDim = useConfiguratorStore((s) => s.setDim)
  const spec = configType(typeId).dimensions.find((d) => d.key === dimKey)!
  // los invoerveld zodat je vrij kunt typen; clamp pas bij blur/enter
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(value)), [value])

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label className="text-[13px] font-semibold text-white">{spec.label}</label>
        <span className="relative">
          <input
            type="number"
            inputMode="numeric"
            value={draft}
            min={spec.min}
            max={spec.max}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => setDim(dimKey, parseInt(draft, 10) || spec.min)}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="w-24 rounded-lg border border-white/15 bg-white/5 py-1.5 pl-2 pr-9 text-right text-[16px] font-semibold tabular-nums text-white outline-none transition focus:border-rust sm:text-[13px]"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-white/40">
            mm
          </span>
        </span>
      </div>
      <input
        type="range"
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={value}
        onChange={(e) => setDim(dimKey, +e.target.value)}
        aria-label={spec.label + ' in millimeters'}
        className="mt-2 h-1.5 w-full cursor-pointer accent-[#D95A2B]"
      />
      <div className="flex justify-between text-[10px] tabular-nums text-white/35">
        <span>{spec.min} mm</span>
        <span>{spec.max} mm</span>
      </div>
    </div>
  )
}

/* ---------- hoofdcomponent ---------- */

export default function Configurator3D({
  onAdd,
}: {
  onAdd: (item: Omit<CartItem, 'qty'>) => void
}) {
  const store = useConfiguratorStore()
  const {
    typeId,
    dims,
    thickness,
    options,
    deco,
    rust,
    showDims,
    autoRotate,
    setType,
    setThickness,
    toggleOption,
    setDeco,
    setRust,
    toggleDims,
    toggleAutoRotate,
    setCameraView,
    hydrate,
  } = store
  const type = configType(typeId)
  const state: ConfigState = { typeId, dims, thickness, options, deco }
  const decoKey = JSON.stringify(deco ?? null)
  const price = useMemo(
    () => calcPrice(state),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [typeId, dims.l, dims.b, dims.h, thickness, JSON.stringify(options), decoKey],
  )
  const [added, setAdded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [showPhoto, setShowPhoto] = useState(false)
  // actieve stap van het stappenplan (het paneel toont één stap tegelijk)
  const [step, setStep] = useState(0)
  // "Zie het in jouw tuin": eigen foto als achtergrond van de 3D-viewer.
  // Blijft lokaal in de browser (dataURL), wordt nergens geüpload.
  const [bgPhoto, setBgPhoto] = useState<string | null>(null)
  const pickBgPhoto = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setBgPhoto(String(reader.result))
    reader.readAsDataURL(file)
  }
  const partner = getActivePartner()
  const validation = useMemo(
    () => validateConfig(state),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [typeId, dims.l, dims.b, dims.h, thickness, JSON.stringify(options), decoKey],
  )

  // configuratie uit de URL hervatten (gedeelde links)
  useEffect(() => {
    const cfg = new URLSearchParams(location.search).get('cfg')
    if (cfg) {
      const parsed = parseCfg(cfg)
      if (parsed) hydrate(parsed)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // configuratie in de URL bijhouden zodat delen/verversen werkt
  useEffect(() => {
    const id = setTimeout(() => {
      history.replaceState(null, '', '/maatwerk?cfg=' + serializeCfg(state))
    }, 350)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeId, dims.l, dims.b, dims.h, thickness, options, decoKey])

  const share = async () => {
    try {
      await navigator.clipboard.writeText(location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard niet beschikbaar */
    }
  }

  const addToCart = () => {
    if (validation.errors.length > 0) return
    const dimLine = type.dimensions
      .map((d) => `${d.label.charAt(0)} ${dims[d.key]}`)
      .join(' × ')
    const decoLines: string[] = []
    const decoMode = deco?.mode === 'graveren' ? 'gegraveerd' : 'doorgelaserd'
    if (deco?.fig) {
      decoLines.push(
        (deco.fig === 'custom' ? 'Eigen silhouet (foto)' : 'Figuur: ' + (figure(deco.fig)?.label ?? deco.fig)) +
          (type.deco === 'vorm' ? '' : ', ' + decoMode),
      )
    }
    if (deco?.text.trim()) decoLines.push('Tekst: “' + deco.text.trim().replace(/\n/g, ' / ') + '” (' + decoMode + ')')
    if (deco?.nr.trim()) decoLines.push('Nummer: ' + deco.nr.trim())
    if (deco && type.deco !== 'vorm' && !deco.logo) decoLines.push('White label (zonder Cortemo-merk)')
    onAdd({
      key: 'cfg:' + serializeCfg(state),
      productId: 'maatwerk-' + typeId,
      name: type.label + ' op maat',
      sub: 'Maatwerk',
      config: [
        dimLine + ' mm',
        thickness + ' mm cortenstaal',
        ...decoLines,
        ...type.options.filter((o) => options[o.id]).map((o) => o.label),
      ],
      unitPrice: price.total,
      weightKg: Math.max(1, Math.round(price.weightKg)),
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const cameraPresets: [CameraViewName, string][] = [
    ['hoek', '¾'],
    ['voor', 'Voor'],
    ['detail', 'Detail'],
  ]

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* viewer */}
      <div className="min-w-0 flex-1">
        <div className="liquid-glass relative overflow-hidden rounded-2xl lg:sticky lg:top-24">
          <div
            className={
              'h-[52vh] min-h-[340px] lg:h-[600px]' + (bgPhoto ? '' : ' viewer-grad')
            }
            style={
              bgPhoto
                ? {
                    backgroundImage: `url(${bgPhoto})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : undefined
            }
          >
            <Canvas
              shadows
              dpr={[1, 2]}
              camera={{ fov: 38, position: [2.4, 1.6, 2.8] }}
              gl={{ antialias: true, alpha: true }}
            >
              <Scene />
            </Canvas>
          </div>

          {/* viewer-instellingen — on-media: witte tekst op de donkere chips,
              ook in het lichte thema */}
          <div className="on-media absolute left-3 right-3 top-3 flex flex-wrap items-center justify-end gap-1.5 sm:left-auto">
            {cameraPresets.map(([name, label]) => (
              <ViewerButton key={name} onClick={() => setCameraView(name)} title={'Camerastandpunt: ' + label}>
                {name === 'detail' ? <Maximize2 size={13} strokeWidth={2} /> : null}
                {label}
              </ViewerButton>
            ))}
            <ViewerButton onClick={toggleDims} active={showDims} title="Maatvoering tonen">
              <Ruler size={14} strokeWidth={2} />
            </ViewerButton>
            <ViewerButton onClick={toggleAutoRotate} active={autoRotate} title="Automatisch draaien">
              <RefreshCw size={14} strokeWidth={2} />
            </ViewerButton>
            {bgPhoto ? (
              <ViewerButton
                onClick={() => setBgPhoto(null)}
                active
                title="Tuinfoto als achtergrond verwijderen"
              >
                <ImageUp size={14} strokeWidth={2} />
              </ViewerButton>
            ) : (
              <label
                title="Zie het in jouw tuin: eigen foto als achtergrond"
                className="flex h-10 min-w-10 cursor-pointer items-center justify-center gap-1 rounded-lg bg-black/35 px-2.5 text-[11px] font-semibold text-white/80 backdrop-blur-md transition-colors hover:bg-black/50"
              >
                <ImageUp size={14} strokeWidth={2} />
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  aria-label="Zie het in jouw tuin: eigen foto als achtergrond"
                  onChange={(e) => {
                    pickBgPhoto(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
              </label>
            )}
          </div>
          {bgPhoto && (
            <div className="on-media pointer-events-none absolute left-4 top-3 rounded-lg bg-black/35 px-2.5 py-1.5 text-[11px] font-semibold text-white/80 backdrop-blur-md">
              Jouw tuin als achtergrond — foto blijft op je eigen apparaat
            </div>
          )}

          <div className="pointer-events-none absolute bottom-3 left-4 hidden text-[11px] text-white/45 sm:block">
            Sleep om te draaien &middot; scroll of knijp om in te zoomen tot op de naad
          </div>

          {/* roeststadium */}
          <div className="on-media absolute bottom-3 right-3 w-40 rounded-xl bg-black/35 px-2.5 py-2 backdrop-blur-md sm:w-44 sm:px-3">
            <div className="flex items-center justify-between text-[10px] font-semibold text-white/70">
              <span>Roeststadium</span>
              <span>{rust < 0.15 ? 'nieuw' : rust < 0.6 ? '± 3 mnd' : '1 jaar+'}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={rust}
              onChange={(e) => setRust(+e.target.value)}
              aria-label="Roeststadium"
              className="mt-1 h-1 w-full cursor-pointer accent-[#D95A2B]"
            />
          </div>
        </div>
      </div>

      {/* paneel: stappenplan — kort per stap, het 3D-ontwerp blijft altijd
          in beeld en de prijs rekent live mee */}
      <div className="w-full shrink-0 lg:w-[420px]">
        <div className="liquid-glass flex flex-col gap-5 rounded-2xl p-5 text-white sm:p-6">
          {/* stappen */}
          <div className="grid grid-cols-4 gap-1">
            {WIZARD_STEPS.map((label, i) => {
              const done = i < step
              const active = i === step
              return (
                <button
                  key={label}
                  onClick={() => setStep(i)}
                  aria-current={active ? 'step' : undefined}
                  aria-label={'Stap ' + (i + 1) + ' van ' + WIZARD_STEPS.length + ': ' + label}
                  className={
                    'flex flex-col items-center gap-1.5 rounded-xl px-1 py-2 transition-colors ' +
                    (active ? 'bg-white/5' : 'hover:bg-white/5')
                  }
                >
                  <span
                    className={
                      'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ' +
                      (active
                        ? 'bg-rust text-white'
                        : done
                          ? 'bg-ok text-white'
                          : 'bg-white/10 text-white/50')
                    }
                  >
                    {done ? <Check size={12} strokeWidth={2.5} /> : i + 1}
                  </span>
                  <span
                    className={
                      'text-[11px] font-semibold ' +
                      (active ? 'text-white' : done ? 'text-white/70' : 'text-white/40')
                    }
                  >
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
          {/* compacte samenvatting van de keuzes tot nu toe */}
          <p className="-mt-2 truncate text-center text-[12px] text-white/45">
            {type.label} &middot; {type.dimensions.map((d) => dims[d.key]).join(' × ')} mm &middot;{' '}
            {thickness} mm staal
          </p>

          {/* stap 1: producttype */}
          {step === 0 && (
            <div>
              <h2 className="text-[15px] font-bold">Kies je producttype</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {CONFIG_TYPES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id)}
                    className={
                      'rounded-xl border px-3 py-2.5 text-left text-[13px] font-semibold transition-all ' +
                      (t.id === typeId
                        ? 'border-rust bg-white/10 text-white shadow-sm'
                        : 'border-transparent bg-white/5 text-white/55 hover:text-white')
                    }
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-white/50">{type.desc}</p>
              <a
                href="/eigen-ontwerp"
                className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-white/20 px-3 py-2.5 text-[12px] font-semibold text-white/60 transition-colors hover:border-rust hover:text-white"
              >
                <FileUp size={14} strokeWidth={2} className="shrink-0 text-rust" />
                Iets anders of eigen ontwerp? Wij tekenen mee &rarr;
              </a>
            </div>
          )}

          {/* stap 2: maat & dikte */}
          {step === 1 && (
            <div>
              <h2 className="text-[15px] font-bold">Bepaal de maat</h2>
              <div className="mt-3 space-y-4">
                {type.dimensions.map((d) => (
                  <DimensionControl key={typeId + d.key} dimKey={d.key} />
                ))}
              </div>
              <div className="mt-4">
                <div className="mb-2 text-[13px] font-semibold">Staaldikte</div>
                <div className="flex gap-2">
                  {type.thicknesses.map((t) => (
                    <button
                      key={t}
                      onClick={() => setThickness(t)}
                      className={
                        'flex-1 rounded-xl border py-2.5 text-[13px] font-semibold tabular-nums transition-all ' +
                        (t === thickness
                          ? 'border-rust bg-white/10 text-white shadow-sm'
                          : 'border-transparent bg-white/5 text-white/55 hover:text-white')
                      }
                    >
                      {t} mm
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* stap 3: ontwerp-editor — figuur, tekst en nummer (versleepbaar) */}
          {step === 2 && type.deco && deco && (
            <div>
              <h2 className="text-[15px] font-bold">Maak het persoonlijk</h2>
              <div className="mt-3">
              {type.deco !== 'vorm' && (
                <div className="mb-3 flex gap-2">
                  {(
                    [
                      ['uitsnede', 'Doorlaseren', 'écht gat door de plaat'],
                      ['graveren', 'Graveren', 'donkere markering, blijft dicht'],
                    ] as const
                  ).map(([id, label, hint]) => (
                    <button
                      key={id}
                      onClick={() => setDeco({ mode: id })}
                      className={
                        'flex-1 rounded-lg border px-2 py-2 text-left transition-all ' +
                        (deco.mode === id
                          ? 'border-rust bg-white/10'
                          : 'border-transparent bg-white/5 hover:bg-white/10')
                      }
                    >
                      <span className={'block text-[12px] font-semibold ' + (deco.mode === id ? 'text-white' : 'text-white/60')}>
                        {label}
                      </span>
                      <span className="block text-[10px] text-white/40">{hint}</span>
                    </button>
                  ))}
                </div>
              )}
              {(type.deco === 'bord' || type.deco === 'accent') && (
                <div className="mb-3 space-y-2">
                  <div className={type.deco === 'bord' ? 'grid grid-cols-[1fr_88px] gap-2' : ''}>
                    <textarea
                      value={deco.text}
                      rows={Math.min(4, Math.max(2, deco.text.split('\n').length))}
                      onChange={(e) => setDeco({ text: e.target.value })}
                      placeholder={'Naam of tekst\nEnter = nieuwe regel'}
                      aria-label="Tekst op het bord (meerdere regels mogelijk)"
                      className="w-full resize-none rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-[16px] font-semibold leading-snug text-white outline-none placeholder:text-white/30 focus:border-rust sm:text-[13px]"
                    />
                    {type.deco === 'bord' && (
                      <input
                        type="text"
                        value={deco.nr}
                        maxLength={6}
                        onChange={(e) => setDeco({ nr: e.target.value })}
                        placeholder="Nr."
                        aria-label="Huisnummer"
                        className="self-start rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-center text-[16px] font-semibold tabular-nums text-white outline-none placeholder:text-white/30 focus:border-rust sm:text-[13px]"
                      />
                    )}
                  </div>
                  <div className="flex gap-2">
                    {(
                      [
                        ['modern', 'Modern', '800 14px Inter, sans-serif'],
                        ['klassiek', 'Klassiek', '400 15px "Instrument Serif", serif'],
                        ['mono', 'Industrieel', '700 13px "Courier New", monospace'],
                      ] as const
                    ).map(([id, label, font]) => (
                      <button
                        key={id}
                        onClick={() => setDeco({ font: id })}
                        style={{ font }}
                        className={
                          'flex-1 rounded-lg border py-2 transition-all ' +
                          (deco.font === id
                            ? 'border-rust bg-white/10 text-white'
                            : 'border-transparent bg-white/5 text-white/55 hover:text-white')
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-7">
                {type.deco !== 'vorm' && (
                  <button
                    onClick={() => setDeco({ fig: '' })}
                    title="Geen figuur"
                    className={
                      'flex aspect-square items-center justify-center rounded-lg border text-[10px] font-semibold transition-all ' +
                      (deco.fig === ''
                        ? 'border-rust bg-white/10 text-white'
                        : 'border-transparent bg-white/5 text-white/45 hover:text-white')
                    }
                  >
                    Geen
                  </button>
                )}
                {FIGURES.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setDeco({ fig: f.id })}
                    title={f.label}
                    aria-label={'Figuur ' + f.label}
                    className={
                      'flex aspect-square items-center justify-center rounded-lg border p-1 transition-all ' +
                      (deco.fig === f.id
                        ? 'border-rust bg-white/10'
                        : 'border-transparent bg-white/5 hover:bg-white/10')
                    }
                  >
                    <svg viewBox="0 0 100 100" className="h-full w-full">
                      <path
                        d={figureSvgPath(f.paths)}
                        fill={deco.fig === f.id ? '#e06a35' : 'rgba(255,255,255,.6)'}
                      />
                    </svg>
                  </button>
                ))}
                <button
                  onClick={() => setShowPhoto(true)}
                  title="Eigen silhouet uit een foto"
                  className={
                    'flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border text-[9px] font-semibold transition-all ' +
                    (deco.fig === 'custom'
                      ? 'border-rust bg-white/10 text-rust'
                      : 'border-dashed border-white/25 text-white/55 hover:border-rust hover:text-white')
                  }
                >
                  <ImageUp size={14} strokeWidth={2} />
                  Foto
                </button>
              </div>

              {(deco.fig || type.deco === 'bord' || type.deco === 'accent') && (
                <div className="mt-3 space-y-2">
                  {deco.fig && (
                    <label className="block text-[12px] font-medium text-white/60">
                      Figuurgrootte
                      <input
                        type="range"
                        min={type.deco === 'vorm' ? 100 : 10}
                        max={type.deco === 'vorm' ? 100 : 90}
                        value={Math.round(deco.s * 100)}
                        disabled={type.deco === 'vorm'}
                        onChange={(e) => setDeco({ s: +e.target.value / 100 })}
                        className="mt-1 h-1.5 w-full cursor-pointer accent-[#D95A2B] disabled:opacity-40"
                      />
                    </label>
                  )}
                  {(type.deco === 'bord' || type.deco === 'accent') && (
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block text-[12px] font-medium text-white/60">
                        Tekstgrootte
                        <input
                          type="range"
                          min={type.deco === 'accent' ? 5 : 10}
                          max={70}
                          value={Math.round(deco.ts * 100)}
                          onChange={(e) => setDeco({ ts: +e.target.value / 100 })}
                          className="mt-1 h-1.5 w-full cursor-pointer accent-[#D95A2B]"
                        />
                      </label>
                      {type.deco === 'bord' && (
                        <label className="block text-[12px] font-medium text-white/60">
                          Nummergrootte
                          <input
                            type="range"
                            min={10}
                            max={80}
                            value={Math.round(deco.ns * 100)}
                            onChange={(e) => setDeco({ ns: +e.target.value / 100 })}
                            className="mt-1 h-1.5 w-full cursor-pointer accent-[#D95A2B]"
                          />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              )}

              {type.deco !== 'vorm' && (
                <>
                  <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2.5">
                    <span className="flex items-center gap-2.5 text-[13px] text-white/80">
                      <input
                        type="checkbox"
                        checked={deco.logo}
                        onChange={() => setDeco({ logo: !deco.logo })}
                        className="h-4 w-4 rounded accent-[#D95A2B]"
                      />
                      Subtiel CORTEMO-merkje (gegraveerd)
                    </span>
                    <span className="text-[11px] text-white/40">uit = white label, gratis</span>
                  </label>
                  <p className="mt-2 text-[11px] leading-relaxed text-white/40">
                    Sleep {type.deco === 'bord' ? 'tekst, nummer en figuur' : 'figuur en tekst'} direct
                    in het 3D-beeld; in de buurt van het midden snapt alles vast (oranje hulplijn).
                  </p>
                </>
              )}
              </div>
            </div>
          )}

          {/* stap 4: opties, prijs en bestellen */}
          {step === 3 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-[15px] font-bold">Opties &amp; bestellen</h2>
                <div className="mt-3 divide-y divide-white/5 rounded-xl bg-white/5 px-1">
                  {type.options.map((o) => (
                    <label
                      key={o.id}
                      className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3"
                    >
                      <span className="flex items-center gap-2.5 text-[13px] text-white/80">
                        <input
                          type="checkbox"
                          checked={!!options[o.id]}
                          onChange={() => toggleOption(o.id)}
                          className="h-4 w-4 rounded accent-[#D95A2B]"
                        />
                        {o.label}
                      </span>
                      <span className="text-[12px] tabular-nums text-white/50">
                        {o.price > 0 ? '+ ' + euro(o.price) : o.hint || 'inbegrepen'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

            {/* prijs */}
          <div className="border-t border-white/10 pt-4">
            <button
              onClick={() => setShowBreakdown((v) => !v)}
              className="flex w-full items-center justify-between text-[12px] font-semibold text-white/55 transition-colors hover:text-white"
            >
              Prijsopbouw
              <ChevronDown
                size={13}
                strokeWidth={2}
                className={'transition-transform ' + (showBreakdown ? 'rotate-180' : '')}
              />
            </button>
            {showBreakdown && (
              <div className="mt-2 space-y-1 text-[12px] text-white/55">
                <div className="flex justify-between">
                  <span>Materiaal ({price.weightKg} kg corten)</span>
                  <span className="tabular-nums">{euro(price.material)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Lasersnijden &amp; zetwerk</span>
                  <span className="tabular-nums">{euro(price.cutting + price.bending)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Lassen &amp; afwerken</span>
                  <span className="tabular-nums">{euro(price.welding)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Opties</span>
                  <span className="tabular-nums">{euro(price.optionsTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Werkvoorbereiding &amp; marge</span>
                  <span className="tabular-nums">{euro(price.orderCosts + price.margin)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Verpakking &amp; verzending NL ({price.shippingClass})</span>
                  <span className="tabular-nums">{euro(price.packaging + price.transport)}</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-1">
                  <span>Excl. btw</span>
                  <span className="tabular-nums">{euro(price.exVat)}</span>
                </div>
              </div>
            )}
            <div className="mt-3 flex items-end justify-between">
              <div>
                <div className="text-[12px] text-white/50">Totaal incl. btw</div>
                <div className="text-[11px] text-white/35">
                  ± {price.weightKg} kg &middot; levertijd 15 werkdagen
                </div>
              </div>
              <div className="text-[26px] font-extrabold leading-none tabular-nums">
                {euro(price.total)}
              </div>
            </div>
            {partner && (
              <div className="mt-2 flex items-center justify-between rounded-lg border border-rust/30 bg-rust/10 px-3 py-2">
                <span className="text-[12px] font-semibold text-white/80">
                  Jouw partnerprijs ({partner.discount}% korting)
                </span>
                <span className="text-[15px] font-extrabold tabular-nums text-rust">
                  {euro(price.total * (1 - partner.discount / 100))}
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {/* op mobiel zit "In winkelwagen" al in de vaste prijsbalk; hier
                zou hij dubbelen, dus daar tonen we alleen delen/overleggen */}
            <button
              onClick={addToCart}
              disabled={validation.errors.length > 0}
              className={
                'hidden flex-1 items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50 lg:flex ' +
                (added ? 'bg-ok' : 'bg-rust hover:bg-rust-deep active:scale-[.99]')
              }
            >
              {added ? (
                <>
                  <Check size={16} strokeWidth={2} /> Toegevoegd
                </>
              ) : (
                <>
                  <ShoppingCart size={16} strokeWidth={2} /> In winkelwagen
                </>
              )}
            </button>
            <button
              onClick={share}
              title="Kopieer een deelbare link naar dit ontwerp"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:w-[52px] lg:flex-none lg:py-0"
            >
              {copied ? <Check size={16} strokeWidth={2} className="text-ok" /> : <Link2 size={16} strokeWidth={2} />}
              <span className="text-[13px] font-semibold lg:hidden">
                {copied ? 'Gekopieerd' : 'Deel ontwerp'}
              </span>
            </button>
            <a
              href={whatsappShare('Hoi Cortemo! Kunnen jullie meedenken met dit ontwerp? ' + (typeof location !== 'undefined' ? location.href : ''))}
              target="_blank"
              rel="noreferrer"
              title="Bespreek dit ontwerp via WhatsApp"
              aria-label="Bespreek dit ontwerp via WhatsApp"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366]/15 py-3 text-[#25D366] transition-colors hover:bg-[#25D366]/25 lg:w-[52px] lg:flex-none lg:py-0"
            >
              <MessageCircle size={16} strokeWidth={2} />
              <span className="text-[13px] font-semibold lg:hidden">Overleg</span>
            </a>
          </div>
          <p className="-mt-3 text-center text-[11px] text-white/35">
            Ontwerp opslaan of overleggen? De deelknop kopieert een link naar exact deze
            configuratie; via WhatsApp denken we gratis met je mee.
          </p>
            </div>
          )}

          {/* fabricage-meldingen: altijd zichtbaar, ongeacht de stap */}
          {(validation.errors.length > 0 || validation.warnings.length > 0) && (
            <div className="space-y-1.5">
              {validation.errors.map((msg) => (
                <p key={msg} className="rounded-lg border border-rust/40 bg-rust/10 px-3 py-2 text-[12px] font-medium leading-relaxed text-rust" role="alert">
                  {msg}
                </p>
              ))}
              {validation.warnings.map((msg) => (
                <p key={msg} className="rounded-lg bg-white/5 px-3 py-2 text-[12px] leading-relaxed text-white/70">
                  ⚠ {msg}
                </p>
              ))}
            </div>
          )}

          {/* stap-navigatie met live prijs */}
          {step < 3 && (
            <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-4">
              {step > 0 ? (
                <button
                  onClick={() => setStep(step - 1)}
                  className="rounded-xl bg-white/5 px-4 py-2.5 text-[13px] font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Terug
                </button>
              ) : (
                <span />
              )}
              <div className="hidden text-right lg:block">
                <div className="text-[11px] text-white/40">Totaal incl. btw</div>
                <div className="text-[16px] font-extrabold leading-tight tabular-nums">
                  {euro(price.total)}
                </div>
              </div>
              <button
                onClick={() => setStep(step + 1)}
                className="flex items-center gap-1.5 rounded-xl bg-rust px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-rust-deep active:scale-[.99]"
              >
                Volgende
                <ChevronDown size={14} strokeWidth={2} className="-rotate-90" />
              </button>
            </div>
          )}
        </div>
      </div>

      {showPhoto && (
        <PhotoSilhouette
          onUse={(path) => {
            setDeco({ fig: 'custom', custom: [path] })
            setShowPhoto(false)
          }}
          onClose={() => setShowPhoto(false)}
        />
      )}

      {/* sticky prijsbalk op mobiel: prijs + CTA altijd binnen duimbereik */}
      <div
        className="liquid-glass fixed inset-x-3 z-30 flex items-center justify-between gap-3 rounded-2xl p-3 pl-5 text-white lg:hidden"
        style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div>
          <div className="text-[11px] text-white/55">{type.label} · incl. btw</div>
          <div className="text-[18px] font-extrabold leading-tight tabular-nums">
            {euro(price.total)}
          </div>
        </div>
        <button
          onClick={addToCart}
          disabled={validation.errors.length > 0}
          className={
            'flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 py-3 text-[14px] font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50 ' +
            (added ? 'bg-ok' : 'bg-rust hover:bg-rust-deep active:scale-[.99]')
          }
        >
          {added ? (
            <>
              <Check size={15} strokeWidth={2} /> Toegevoegd
            </>
          ) : (
            <>
              <ShoppingCart size={15} strokeWidth={2} /> In winkelwagen
            </>
          )}
        </button>
      </div>
    </div>
  )
}
