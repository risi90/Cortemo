import { create } from 'zustand'
import {
  CONFIG_TYPES,
  configType,
  type ConfigTypeId,
  type DimensionKey,
} from '../data/configuratorSchema'
import { defaultDeco, type ConfigState, type DecoState } from '../lib/pricing'

export type CameraViewName = 'hoek' | 'voor' | 'detail'

/** Versleepbaar ontwerp-element in de 3D-viewer. */
export type DragTarget = 'fig' | 'text' | 'nr' | null

/** Weergave-instellingen die losstaan van het product zelf. */
type ViewState = {
  /** Roeststadium 0 (vers gewalst) … 1 (volledig doorgeroest). */
  rust: number
  showDims: boolean
  autoRotate: boolean
  /** Camerastandpunt; `n` telt op zodat hetzelfde preset opnieuw kan vuren. */
  cameraView: { name: CameraViewName; n: number }
  /** Element dat nu versleept wordt (camera staat dan stil). */
  dragging: DragTarget
}

type ConfiguratorStore = ConfigState &
  ViewState & {
    setType: (id: ConfigTypeId) => void
    setDim: (key: DimensionKey, value: number) => void
    setThickness: (t: number) => void
    toggleOption: (id: string) => void
    setDeco: (partial: Partial<DecoState>) => void
    setDragging: (target: DragTarget) => void
    setRust: (v: number) => void
    toggleDims: () => void
    toggleAutoRotate: () => void
    setCameraView: (name: CameraViewName) => void
    /** Zet de volledige staat, bijv. vanuit een gedeelde URL. */
    hydrate: (partial: Partial<ConfigState>) => void
  }

function defaultsFor(id: ConfigTypeId): Pick<ConfigState, 'dims' | 'thickness' | 'options' | 'deco'> {
  const type = configType(id)
  const dims = { l: 0, b: 0, h: 0 } as Record<DimensionKey, number>
  for (const d of type.dimensions) dims[d.key] = d.default
  return {
    dims,
    thickness: type.defaultThickness,
    options: {},
    deco: type.deco ? defaultDeco(id) : undefined,
  }
}

export const clampDim = (id: ConfigTypeId, key: DimensionKey, value: number): number => {
  const spec = configType(id).dimensions.find((d) => d.key === key)
  if (!spec) return value
  return Math.min(spec.max, Math.max(spec.min, Math.round(value)))
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export const useConfiguratorStore = create<ConfiguratorStore>((set) => ({
  typeId: CONFIG_TYPES[0].id,
  ...defaultsFor(CONFIG_TYPES[0].id),
  rust: 0.85,
  showDims: true,
  autoRotate: false,
  cameraView: { name: 'hoek', n: 0 },
  dragging: null,

  setType: (id) =>
    set((s) => ({
      typeId: id,
      ...defaultsFor(id),
      // camera terug naar het overzichtsstandpunt bij een ander product
      cameraView: { name: 'hoek', n: s.cameraView.n + 1 },
    })),
  setDim: (key, value) =>
    set((s) => ({ dims: { ...s.dims, [key]: clampDim(s.typeId, key, value) } })),
  setThickness: (thickness) => set({ thickness }),
  toggleOption: (id) =>
    set((s) => ({ options: { ...s.options, [id]: !s.options[id] } })),
  setDeco: (partial) =>
    set((s) => {
      if (!s.deco) return {}
      const next = { ...s.deco, ...partial }
      // posities binnen de plaat houden, schalen binnen zinnige grenzen
      next.x = clamp01(next.x)
      next.y = clamp01(next.y)
      next.tx = clamp01(next.tx)
      next.ty = clamp01(next.ty)
      next.nx = clamp01(next.nx)
      next.ny = clamp01(next.ny)
      next.s = Math.min(1.2, Math.max(0.08, next.s))
      next.ts = Math.min(0.9, Math.max(0.08, next.ts))
      next.ns = Math.min(0.9, Math.max(0.08, next.ns))
      // max 4 regels van elk max 24 tekens (past op het bord én in de cfg)
      next.text = next.text
        .split('\n')
        .slice(0, 4)
        .map((line) => line.slice(0, 24))
        .join('\n')
        .slice(0, 60)
      next.nr = next.nr.slice(0, 6)
      return { deco: next }
    }),
  setDragging: (dragging) => set({ dragging }),
  setRust: (rust) => set({ rust }),
  toggleDims: () => set((s) => ({ showDims: !s.showDims })),
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
  setCameraView: (name) => set((s) => ({ cameraView: { name, n: s.cameraView.n + 1 } })),
  hydrate: (partial) =>
    set((s) => {
      const typeId = partial.typeId && configType(partial.typeId) ? partial.typeId : s.typeId
      const base = defaultsFor(typeId)
      const dims = { ...base.dims }
      if (partial.dims)
        for (const key of Object.keys(dims) as DimensionKey[])
          if (partial.dims[key]) dims[key] = clampDim(typeId, key, partial.dims[key])
      const type = configType(typeId)
      const thickness = type.thicknesses.includes(partial.thickness ?? -1)
        ? partial.thickness!
        : base.thickness
      const options: Record<string, boolean> = {}
      if (partial.options)
        for (const o of type.options) if (partial.options[o.id]) options[o.id] = true
      const deco = type.deco ? { ...(base.deco ?? defaultDeco(typeId)), ...(partial.deco ?? {}) } : undefined
      return { typeId, dims, thickness, options, deco }
    }),
}))
