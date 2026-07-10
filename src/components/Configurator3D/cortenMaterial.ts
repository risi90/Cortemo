import * as THREE from 'three'

/**
 * Waarheidsgetrouw cortenstaal, procedureel gegenereerd zodat er geen externe
 * texturen nodig zijn. Het roeststadium loopt van vers gewalst blauwgrijs
 * staal (0) via oranje beginroest naar de diepe, gevlekte oxidelaag (1).
 *
 * Texturen worden per stadium-bucket gecachet; het materiaal zelf wordt
 * hergebruikt over alle meshes zodat een maatwijziging nooit textures
 * hergenereert.
 */

// Kleurbanen gebaseerd op echt corten: vers staal → lichte roest → doorgeroest
const MILL_SCALE = ['#4d545c', '#565e66', '#414850', '#5d656d'] // walshuid
const EARLY_RUST = ['#b45f2f', '#c26a33', '#a35427', '#8a4a26'] // 2-8 weken
const FULL_RUST = ['#7a4526', '#8a4d28', '#6e3d22', '#96552c', '#5f371f'] // >6 mnd

function lerpHex(a: string, b: string, t: number): string {
  const ca = new THREE.Color(a)
  const cb = new THREE.Color(b)
  return '#' + ca.lerp(cb, t).getHexString()
}

/** Deterministische pseudo-random, zodat de textuur stabiel is tussen renders. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Gescande corten-kleurmap (ambientCG Rust004, CC0). Zodra die geladen is,
 * wordt hij in het roeststadium gemengd over de procedurele basis: de
 * procedurele laag verzorgt de walshuid en beginroest, de scan de volledig
 * verweerde plaat.
 */
let scanImage: HTMLImageElement | null = null

function paintRust(ctx: CanvasRenderingContext2D, size: number, rust: number) {
  const rand = mulberry32(1337)

  // basis: interpolatie walshuid → volle roest
  const baseA = lerpHex(MILL_SCALE[0], FULL_RUST[0], rust)
  const baseB = lerpHex(MILL_SCALE[1], FULL_RUST[1], rust)
  const grad = ctx.createLinearGradient(0, 0, size, size)
  grad.addColorStop(0, baseA)
  grad.addColorStop(1, baseB)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)

  // echte gescande roestlaag, in kracht oplopend met het roeststadium
  let scanAlpha = 0
  if (scanImage) {
    scanAlpha = Math.min(1, Math.max(0, (rust - 0.08) / 0.55))
    if (scanAlpha > 0) {
      ctx.globalAlpha = scanAlpha
      ctx.drawImage(scanImage, 0, 0, size, size)
      ctx.globalAlpha = 1
    }
  }
  // procedurele vlekken vullen aan waar de scan (nog) niet dekt
  const procedural = 1 - 0.75 * scanAlpha

  const palette = rust < 0.5 ? EARLY_RUST : FULL_RUST
  const blob = (x: number, y: number, r: number, color: string, alpha: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, color)
    g.addColorStop(1, 'transparent')
    ctx.globalAlpha = Math.min(0.9, alpha)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // drie octaven vlekken: grote tonale zones, middenvlekken, fijne korrels.
  // Bij laag roeststadium 'bloeit' de roest in schaarse plekken op het staal.
  const coverage = rust < 0.15 ? rust * 2 : 1
  for (let i = 0; i < 18; i++) {
    blob(
      rand() * size,
      rand() * size,
      (0.1 + rand() * 0.18) * size,
      palette[Math.floor(rand() * palette.length)],
      (0.08 + rand() * 0.14) * coverage * procedural,
    )
  }
  for (let i = 0; i < 220; i++) {
    if (rand() > 0.15 + rust) continue
    blob(
      rand() * size,
      rand() * size,
      (0.015 + rand() * 0.05) * size,
      palette[Math.floor(rand() * palette.length)],
      (0.12 + rand() * 0.26) * coverage * procedural,
    )
  }
  for (let i = 0; i < 900; i++) {
    if (rand() > 0.2 + rust) continue
    blob(
      rand() * size,
      rand() * size,
      (0.003 + rand() * 0.014) * size,
      palette[Math.floor(rand() * palette.length)],
      (0.18 + rand() * 0.3) * procedural,
    )
  }
  ctx.globalAlpha = 1

  // fijne spikkel voor korrel op detailniveau (inzoomen)
  const speckles = 22000
  for (let i = 0; i < speckles; i++) {
    const x = rand() * size
    const y = rand() * size
    const light = rand() > 0.5
    const tone = light
      ? lerpHex('#6a7078', '#a8642f', rust)
      : lerpHex('#3a4046', '#4f2d18', rust)
    ctx.fillStyle = tone
    ctx.globalAlpha = (0.05 + rand() * 0.14) * (1 - 0.5 * scanAlpha)
    const s = 0.6 + rand() * 1.8
    ctx.fillRect(x, y, s, s)
  }
  ctx.globalAlpha = 1

  // verticale strijklicht-banen zoals regen-uitloop op corten
  if (rust > 0.3) {
    for (let i = 0; i < 34; i++) {
      const x = rand() * size
      const w = 2 + rand() * 8
      const g = ctx.createLinearGradient(x, 0, x + w, 0)
      g.addColorStop(0, 'transparent')
      g.addColorStop(0.5, lerpHex(FULL_RUST[2], FULL_RUST[3], rand()))
      g.addColorStop(1, 'transparent')
      ctx.globalAlpha = 0.09 * (rust - 0.3)
      ctx.fillStyle = g
      ctx.fillRect(x, 0, w, size)
    }
    ctx.globalAlpha = 1
  }
}

/** Grijswaarden-korrel als bumpmap: de oxidelaag is licht pokdalig. */
let bumpTex: THREE.CanvasTexture | null = null
function bumpTexture(): THREE.CanvasTexture {
  if (bumpTex) return bumpTex
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, size, size)
  const rand = mulberry32(777)
  for (let i = 0; i < 16000; i++) {
    const v = Math.floor(96 + rand() * 64)
    ctx.fillStyle = `rgb(${v},${v},${v})`
    ctx.globalAlpha = 0.3 + rand() * 0.5
    ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1 + rand() * 2)
  }
  ctx.globalAlpha = 1
  bumpTex = new THREE.CanvasTexture(canvas)
  bumpTex.wrapS = bumpTex.wrapT = THREE.RepeatWrapping
  bumpTex.repeat.set(2, 2)
  return bumpTex
}

const textureCache = new Map<number, THREE.CanvasTexture>()

function rustTexture(rust: number): THREE.CanvasTexture {
  // bucketten op 0.05 zodat de slider vloeiend voelt zonder texture-spam
  const bucket = Math.round(rust * 20) / 20
  const cached = textureCache.get(bucket)
  if (cached) return cached
  const size = 1024
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  paintRust(canvas.getContext('2d')!, size, bucket)
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  textureCache.set(bucket, tex)
  return tex
}

/** Gatenpatroon (wit = dicht, zwart = gat) voor het organische laserpaneel. */
let holeTex: THREE.CanvasTexture | null = null
function holeTexture(): THREE.CanvasTexture {
  if (holeTex) return holeTex
  const size = 1024
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, size, size)
  const rand = mulberry32(4242)
  ctx.fillStyle = '#000'
  const margin = size * 0.08
  for (let i = 0; i < 260; i++) {
    const x = margin + rand() * (size - 2 * margin)
    const y = margin + rand() * (size - 2 * margin)
    const rx = 4 + rand() * 22
    const ry = rx * (0.35 + rand() * 0.5)
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rand() * Math.PI)
    ctx.beginPath()
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  holeTex = new THREE.CanvasTexture(canvas)
  holeTex.anisotropy = 8
  return holeTex
}

let sharedMaterial: THREE.MeshStandardMaterial | null = null
let sharedLaser: THREE.MeshStandardMaterial | null = null
let lastRust = 0.85
let scansRequested = false
let scanNormal: THREE.Texture | null = null
let scanRoughness: THREE.Texture | null = null

/**
 * Laadt de gescande PBR-maps (kleur, normal, roughness) asynchroon. Tot ze
 * binnen zijn rendert de puur procedurele versie; daarna worden de kleur-
 * composieten opnieuw opgebouwd en krijgt het oppervlak echt reliëf.
 */
function requestScans() {
  if (scansRequested || typeof document === 'undefined') return
  scansRequested = true
  const img = new Image()
  img.src = '/img/textures/corten-color.jpg'
  img.onload = () => {
    scanImage = img
    textureCache.clear()
    applyScans()
  }
  const loader = new THREE.TextureLoader()
  loader.load('/img/textures/corten-normal.jpg', (t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    scanNormal = t
    applyScans()
  })
  loader.load('/img/textures/corten-roughness.jpg', (t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    scanRoughness = t
    applyScans()
  })
}

function applyScans() {
  for (const mat of [sharedMaterial, sharedLaser]) {
    if (!mat) continue
    if (scanNormal) {
      mat.normalMap = scanNormal
      mat.normalScale.set(0.7, 0.7)
    }
    if (scanRoughness) mat.roughnessMap = scanRoughness
  }
  updateCorten(lastRust)
}

/** Eén gedeeld materiaal; `updateCorten` muteert het bij een slider-wijziging. */
export function cortenMaterial(rust: number): THREE.MeshStandardMaterial {
  requestScans()
  if (!sharedMaterial) {
    sharedMaterial = new THREE.MeshStandardMaterial({
      map: rustTexture(rust),
      bumpMap: bumpTexture(),
      bumpScale: 0.6,
      roughness: 1,
      metalness: 0,
    })
    applyScans()
  }
  updateCorten(rust)
  return sharedMaterial
}

/** Variant met organisch gatenpatroon (schutting-laseroptie). */
export function cortenLaserMaterial(rust: number): THREE.MeshStandardMaterial {
  requestScans()
  if (!sharedLaser) {
    sharedLaser = new THREE.MeshStandardMaterial({
      map: rustTexture(rust),
      bumpMap: bumpTexture(),
      bumpScale: 0.6,
      alphaMap: holeTexture(),
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      roughness: 1,
      metalness: 0,
    })
    applyScans()
  }
  updateCorten(rust)
  return sharedLaser
}

export function updateCorten(rust: number): void {
  lastRust = rust
  // vers staal is licht spiegelend; de oxidelaag is dof en poreus. Met de
  // gescande roughnessmap werkt de scalar als multiplier op de scan.
  const roughness = scanRoughness ? 0.7 + rust * 0.35 : 0.45 + rust * 0.5
  const metalness = 0.55 - rust * 0.42
  for (const mat of [sharedMaterial, sharedLaser]) {
    if (!mat) continue
    mat.map = rustTexture(rust)
    mat.roughness = roughness
    mat.metalness = metalness
    mat.needsUpdate = true
  }
}
