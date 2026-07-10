import { useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import {
  Box,
  Check,
  ChevronDown,
  ImageUp,
  Link2,
  Maximize2,
  RefreshCw,
  Ruler,
  Shapes,
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
import type { CartItem } from '../../lib/cart'

/* ---------- UI-bouwstenen ---------- */

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
    if (deco?.fig) {
      decoLines.push(
        deco.fig === 'custom' ? 'Eigen silhouet (foto)' : 'Figuur: ' + (figure(deco.fig)?.label ?? deco.fig),
      )
    }
    if (deco?.text.trim()) decoLines.push('Tekst: “' + deco.text.trim() + '”')
    if (deco?.nr.trim()) decoLines.push('Nummer: ' + deco.nr.trim())
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
          <div className="h-[46vh] min-h-[320px] lg:h-[600px]">
            <Canvas
              shadows
              dpr={[1, 2]}
              camera={{ fov: 38, position: [2.4, 1.6, 2.8] }}
              gl={{ antialias: true, alpha: true }}
            >
              <Scene />
            </Canvas>
          </div>

          {/* viewer-instellingen */}
          <div className="absolute right-3 top-3 flex items-center gap-1.5">
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
          </div>

          <div className="pointer-events-none absolute bottom-3 left-4 hidden text-[11px] text-white/45 sm:block">
            Sleep om te draaien &middot; scroll of knijp om in te zoomen tot op de naad
          </div>

          {/* roeststadium */}
          <div className="absolute bottom-3 right-3 w-44 rounded-xl bg-black/35 px-3 py-2 backdrop-blur-md">
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

      {/* paneel */}
      <div className="w-full shrink-0 lg:w-[420px]">
        <div className="liquid-glass flex flex-col gap-6 rounded-2xl p-6 text-white sm:p-7">
          {/* producttype */}
          <div>
            <div className="mb-2 text-[13px] font-semibold">Producttype</div>
            <div className="grid grid-cols-2 gap-2">
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
          </div>

          {/* afmetingen */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[13px] font-semibold">
              <Ruler size={14} strokeWidth={2} className="text-rust" /> Afmetingen
            </div>
            {type.dimensions.map((d) => (
              <DimensionControl key={typeId + d.key} dimKey={d.key} />
            ))}
          </div>

          {/* staaldikte */}
          <div>
            <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold">
              <Box size={14} strokeWidth={2} className="text-rust" /> Staaldikte
            </div>
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

          {/* ontwerp-editor: figuur, tekst en nummer (versleepbaar in 3D) */}
          {type.deco && deco && (
            <div>
              <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold">
                <Shapes size={14} strokeWidth={2} className="text-rust" /> Ontwerp
              </div>

              {type.deco === 'bord' && (
                <div className="mb-3 grid grid-cols-[1fr_88px] gap-2">
                  <input
                    type="text"
                    value={deco.text}
                    maxLength={24}
                    onChange={(e) => setDeco({ text: e.target.value })}
                    placeholder="Naam of tekst"
                    aria-label="Tekst op het bord"
                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-[16px] font-semibold text-white outline-none placeholder:text-white/30 focus:border-rust sm:text-[13px]"
                  />
                  <input
                    type="text"
                    value={deco.nr}
                    maxLength={6}
                    onChange={(e) => setDeco({ nr: e.target.value })}
                    placeholder="Nr."
                    aria-label="Huisnummer"
                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-center text-[16px] font-semibold tabular-nums text-white outline-none placeholder:text-white/30 focus:border-rust sm:text-[13px]"
                  />
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

              {(deco.fig || type.deco === 'bord') && (
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
                  {type.deco === 'bord' && (
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block text-[12px] font-medium text-white/60">
                        Tekstgrootte
                        <input
                          type="range"
                          min={10}
                          max={70}
                          value={Math.round(deco.ts * 100)}
                          onChange={(e) => setDeco({ ts: +e.target.value / 100 })}
                          className="mt-1 h-1.5 w-full cursor-pointer accent-[#D95A2B]"
                        />
                      </label>
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
                    </div>
                  )}
                </div>
              )}

              {type.deco !== 'vorm' && (
                <p className="mt-2 text-[11px] leading-relaxed text-white/40">
                  Sleep {type.deco === 'bord' ? 'tekst, nummer en figuur' : 'het figuur'} direct in
                  het 3D-beeld naar de juiste plek.
                </p>
              )}
            </div>
          )}

          {/* opties */}
          <div>
            <div className="mb-2 text-[13px] font-semibold">Opties</div>
            <div className="divide-y divide-white/5 rounded-xl bg-white/5 px-1">
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

          {/* fabricage-meldingen */}
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
            <button
              onClick={addToCart}
              disabled={validation.errors.length > 0}
              className={
                'flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50 ' +
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
              className="flex w-[52px] items-center justify-center rounded-xl bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              {copied ? <Check size={16} strokeWidth={2} className="text-ok" /> : <Link2 size={16} strokeWidth={2} />}
            </button>
          </div>
          <p className="-mt-3 text-center text-[11px] text-white/35">
            Ontwerp opslaan of overleggen? De deelknop kopieert een link naar exact deze
            configuratie.
          </p>
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
      <div className="liquid-glass fixed inset-x-3 bottom-3 z-30 flex items-center justify-between gap-3 rounded-2xl p-3 pl-5 text-white lg:hidden">
        <div>
          <div className="text-[11px] text-white/55">{type.label} · incl. btw</div>
          <div className="text-[18px] font-extrabold leading-tight tabular-nums">
            {euro(price.total)}
          </div>
        </div>
        <button
          onClick={addToCart}
          className={
            'flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 py-3 text-[14px] font-semibold text-white transition-all ' +
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
