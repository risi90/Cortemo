import { CONFIG_TYPES, configType } from '../data/configuratorSchema'
import { defaultDeco, type ConfigState, type DecoState } from './pricing'
import type { FigurePath } from '../data/figures'

/**
 * Configuratie ↔ compacte string (URL-param, cart-keys, naprijzen).
 * Formaat: typeId.LxBxH.dikte.opties[.deco] — het deco-blok gebruikt
 * '~'-paren (geen punten, zodat de puntsplitsing blijft werken); posities
 * en schalen staan als promille-integers, tekst is URL-veilig gecodeerd
 * en eigen silhouetpunten staan als x-y-paren met '_' ertussen.
 */

const encText = (v: string) => encodeURIComponent(v).replace(/\./g, '%2E')
const pm = (v: number) => String(Math.round(v * 1000))

function encodeDeco(d: DecoState): string {
  const parts: string[] = [
    'f', encText(d.fig),
    'x', pm(d.x), 'y', pm(d.y), 's', pm(d.s),
    't', encText(d.text), 'a', pm(d.tx), 'b', pm(d.ty), 'c', pm(d.ts),
    'n', encText(d.nr), 'd', pm(d.nx), 'e', pm(d.ny), 'g', pm(d.ns),
  ]
  if (d.fig === 'custom' && d.custom?.length) {
    parts.push(
      'p',
      d.custom
        .map((path) => path.map(([x, y]) => Math.round(x) + '-' + Math.round(y)).join('_'))
        .join('!'),
    )
  }
  return parts.join('~')
}

function decodeDeco(raw: string, typeId: ConfigState['typeId']): DecoState {
  const deco = defaultDeco(typeId)
  const kv = raw.split('~')
  const num = (v: string) => (parseInt(v, 10) || 0) / 1000
  for (let i = 0; i + 1 < kv.length; i += 2) {
    const value = kv[i + 1]
    switch (kv[i]) {
      case 'f': deco.fig = decodeURIComponent(value); break
      case 'x': deco.x = num(value); break
      case 'y': deco.y = num(value); break
      case 's': deco.s = num(value); break
      case 't': deco.text = decodeURIComponent(value).slice(0, 24); break
      case 'a': deco.tx = num(value); break
      case 'b': deco.ty = num(value); break
      case 'c': deco.ts = num(value); break
      case 'n': deco.nr = decodeURIComponent(value).slice(0, 6); break
      case 'd': deco.nx = num(value); break
      case 'e': deco.ny = num(value); break
      case 'g': deco.ns = num(value); break
      case 'p':
        deco.custom = value
          .split('!')
          .map((path) =>
            path
              .split('_')
              .map((pair) => pair.split('-').map((n) => parseInt(n, 10) || 0) as [number, number])
              .filter((p) => p.length === 2),
          )
          .filter((path): path is FigurePath => path.length >= 3)
        break
    }
  }
  return deco
}

export function serializeCfg(s: ConfigState): string {
  const opts = Object.keys(s.options).filter((k) => s.options[k])
  const base = [
    s.typeId,
    `${s.dims.l || 0}x${s.dims.b || 0}x${s.dims.h || 0}`,
    String(s.thickness),
    opts.join('-'),
  ]
  if (s.deco && configType(s.typeId).deco) base.push(encodeDeco(s.deco))
  return base.join('.')
}

export function parseCfg(raw: string): ConfigState | null {
  const [typeId, dims, thickness, opts, ...decoRest] = raw.split('.')
  if (!typeId || !CONFIG_TYPES.some((t) => t.id === typeId)) return null
  const [l, b, h] = (dims || '').split('x').map((n) => parseInt(n, 10) || 0)
  const options: Record<string, boolean> = {}
  for (const o of (opts || '').split('-')) if (o) options[o] = true
  const tid = typeId as ConfigState['typeId']
  const state: ConfigState = {
    typeId: tid,
    dims: { l, b, h },
    thickness: parseInt(thickness, 10) || 3,
    options,
  }
  if (configType(tid).deco) {
    state.deco = decoRest.length > 0 ? decodeDeco(decoRest.join('.'), tid) : defaultDeco(tid)
  }
  return state
}
