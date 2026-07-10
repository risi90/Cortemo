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
const FILES = [
  'plantenbak.webp',
  'maatwerk.webp',
  'vuurschaal.webp',
  // dummy productfoto's (CC) tot er echte renders zijn
  'cubo.jpg',
  'linea.jpg',
  'grande.jpg',
  'verde.jpg',
  'anello.jpg',
  'piede.jpg',
  'terra.jpg',
  'lijn.jpg',
  'aqua.jpg',
  'vista.jpg',
  'fuoco.jpg',
  'legna.jpg',
  'fonte.jpg',
  'numero.jpg',
  'posta.jpg',
  'silva.jpg',
  'den.jpg',
  'deco.jpg',
  'insp-brasserie.jpg',
  'insp-daktuin.jpg',
  'insp-voortuin.jpg',
  'insp-patio.jpg',
  // gescande corten PBR-maps voor de 3D-configurator (ambientCG, CC0)
  'textures/corten-color.jpg',
  'textures/corten-normal.jpg',
  'textures/corten-roughness.jpg',
  // homepage-herovideo (origineel: cortemo.mp4) + poster
  'hero-poster.jpg',
  '../video/hero.mp4',
  '../video/hero.webm',
]
const DIR = new URL('../public/img/', import.meta.url)

await mkdir(DIR, { recursive: true })
await mkdir(new URL('textures/', DIR), { recursive: true })
await mkdir(new URL('../video/', DIR), { recursive: true })

for (const file of FILES) {
  const target = new URL(file, DIR)
  try {
    await access(target, constants.F_OK)
    console.log(`fetch-assets: ${file} aanwezig, overslaan`)
    continue
  } catch {
    /* niet aanwezig: downloaden */
  }
  let done = false
  for (const base of SOURCES) {
    try {
      const res = await fetch(`${base}/${file}`)
      if (!res.ok) continue
      await writeFile(target, Buffer.from(await res.arrayBuffer()))
      console.log(`fetch-assets: ${file} opgehaald van ${new URL(base).host}`)
      done = true
      break
    } catch {
      /* volgende bron proberen */
    }
  }
  if (!done) {
    console.error(`fetch-assets: ${file} niet gevonden bij enige bron`)
    process.exitCode = 1
  }
}
