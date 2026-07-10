import { create } from 'zustand'
import {
  CONFIG_TYPES,
  configType,
  type ConfigTypeId,
  type DimensionKey,
} from '../data/configuratorSchema'
import type { ConfigState } from '../lib/pricing'

export type CameraViewName = 'hoek' | 'voor' | 'detail'

/** Weergave-instellingen die losstaan van het product zelf. */
type ViewState = {
  /** Roeststadium 0 (vers gewalst) … 1 (volledig doorgeroest). */
  rust: number
  showDims: boolean
  autoRotate: boolean
  /** Camerastandpunt; `n` telt op zodat hetzelfde preset opnieuw kan vuren. */
  cameraView: { name: CameraViewName; n: number }
}

type ConfiguratorStore = ConfigState &
  ViewState & {
    setType: (id: ConfigTypeId) => void
    setDim: (key: DimensionKey, value: number) => void
    setThickness: (t: number) => void
    toggleOption: (id: string) => void
    setRust: (v: number) => void
    toggleDims: () => void
    toggleAutoRotate: () => void
    setCameraView: (name: CameraViewName) => void
    /** Zet de volledige staat, bijv. vanuit een gedeelde URL. */
    hydrate: (partial: Partial<ConfigState>) => void
  }

function defaultsFor(id: ConfigTypeId): Pick<ConfigState, 'dims' | 'thickness' | 'options'> {
  const type = configType(id)
  const dims = { l: 0, b: 0, h: 0 } as Record<DimensionKey, number>
  for (const d of type.dimensions) dims[d.key] = d.default
  return { dims, thickness: type.defaultThickness, options: {} }
}

export const clampDim = (id: ConfigTypeId, key: DimensionKey, value: number): number => {
  const spec = configType(id).dimensions.find((d) => d.key === key)
  if (!spec) return value
  return Math.min(spec.max, Math.max(spec.min, Math.round(value)))
}

export const useConfiguratorStore = create<ConfiguratorStore>((set) => ({
  typeId: CONFIG_TYPES[0].id,
  ...defaultsFor(CONFIG_TYPES[0].id),
  rust: 0.85,
  showDims: true,
  autoRotate: false,
  cameraView: { name: 'hoek', n: 0 },

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
      return { typeId, dims, thickness, options }
    }),
}))
