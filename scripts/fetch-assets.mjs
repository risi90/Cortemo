/**
 * Haalt de productrenders op naar public/img/. Draait automatisch voor de
 * build (prebuild) en is idempotent: bestaande bestanden worden overgeslagen.
 * In een git-checkout staan de beelden er al; dit script bestaat voor builds
 * vanuit een bron-tree zonder binaire assets (zoals een directe Vercel file
 * upload). Probeert de bronnen in volgorde tot er een slaagt.
 */
import { mkdir, writeFile, access } from 'node:fs/promises'
import { constants } from 'node:fs'

const SOURCES = [
  'https://raw.githubusercontent.com/risi90/cortemo/main/public/img',
]
const NAMES = ['plantenbak', 'maatwerk', 'vuurschaal']
const DIR = new URL('../public/img/', import.meta.url)

await mkdir(DIR, { recursive: true })

for (const name of NAMES) {
  const target = new URL(`${name}.webp`, DIR)
  try {
    await access(target, constants.F_OK)
    console.log(`fetch-assets: ${name}.webp aanwezig, overslaan`)
    continue
  } catch {
    /* niet aanwezig: downloaden */
  }
  let done = false
  for (const base of SOURCES) {
    try {
      const res = await fetch(`${base}/${name}.webp`)
      if (!res.ok) continue
      await writeFile(target, Buffer.from(await res.arrayBuffer()))
      console.log(`fetch-assets: ${name}.webp opgehaald van ${new URL(base).host}`)
      done = true
      break
    } catch {
      /* volgende bron proberen */
    }
  }
  if (!done) {
    console.error(`fetch-assets: ${name}.webp niet gevonden bij enige bron`)
    process.exitCode = 1
  }
}
