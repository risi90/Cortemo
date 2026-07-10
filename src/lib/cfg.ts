import { CONFIG_TYPES } from '../data/configuratorSchema'
import type { ConfigState } from './pricing'

/** Configuratie ↔ compacte string (URL-param, cart-keys, naprijzen). */

export function serializeCfg(s: ConfigState): string {
  const opts = Object.keys(s.options).filter((k) => s.options[k])
  return [
    s.typeId,
    `${s.dims.l || 0}x${s.dims.b || 0}x${s.dims.h || 0}`,
    String(s.thickness),
    opts.join('-'),
  ].join('.')
}

export function parseCfg(raw: string): ConfigState | null {
  const [typeId, dims, thickness, opts] = raw.split('.')
  if (!typeId || !CONFIG_TYPES.some((t) => t.id === typeId)) return null
  const [l, b, h] = (dims || '').split('x').map((n) => parseInt(n, 10) || 0)
  const options: Record<string, boolean> = {}
  for (const o of (opts || '').split('-')) if (o) options[o] = true
  return {
    typeId: typeId as ConfigState['typeId'],
    dims: { l, b, h },
    thickness: parseInt(thickness, 10) || 3,
    options,
  }
}
