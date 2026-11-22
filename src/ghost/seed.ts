import crypto from 'crypto'
import type { Seed } from '../types.js'

const seedCache = new Map<string, Seed>()

const chromeVersions = [
  '131.0.6778.85',
  '131.0.6778.86',
  '130.0.6723.116',
  '129.0.6668.100'
]

const resolutions = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1536, height: 864 },
  { width: 1440, height: 900 },
  { width: 2560, height: 1440 }
]

const languages = ['en-US', 'en-GB', 'en', 'es-ES', 'fr-FR', 'de-DE']
const timezones = ['America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris']

const webglProfiles = [
  {
    vendor: 'Google Inc. (NVIDIA)',
    renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0, D3D11)'
  },
  {
    vendor: 'Google Inc. (Intel)',
    renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)'
  },
  {
    vendor: 'Google Inc. (AMD)',
    renderer: 'ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0, D3D11)'
  }
]

const fontSets = [
  ['Arial', 'Calibri', 'Cambria', 'Consolas', 'Georgia', 'Times New Roman', 'Verdana'],
  ['Arial', 'Helvetica', 'Georgia', 'Courier New', 'Times', 'Comic Sans MS'],
  ['Arial', 'Tahoma', 'Trebuchet MS', 'Verdana', 'Georgia', 'Palatino Linotype']
]

function random<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

export function getNewSeed(): Seed {
  const resolution = random(resolutions)
  const webgl = random(webglProfiles)

  return {
    id: crypto.randomUUID(),
    chromeVersion: random(chromeVersions),
    screenWidth: resolution.width,
    screenHeight: resolution.height,
    language: random(languages),
    timezone: random(timezones),
    canvasNoise: randomRange(0.0001, 0.001),
    webglVendor: webgl.vendor,
    webglRenderer: webgl.renderer,
    audioNoise: randomRange(0.00001, 0.0001),
    fonts: random(fontSets)
  }
}

export function buildUserAgent(seed: Seed): string {
  const major = seed.chromeVersion.split('.')[0]
  return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36`
}

export function alignSeedToBrowser(seed: Seed, browserVersion: string): Seed {
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(browserVersion)) return seed
  return { ...seed, chromeVersion: browserVersion }
}

export function buildViewport(seed: Seed): { width: number; height: number } {
  return {
    width: seed.screenWidth,
    height: Math.max(600, seed.screenHeight - 120)
  }
}

export function getSeedForSite(siteHost: string): Seed {
  if (seedCache.has(siteHost)) {
    return seedCache.get(siteHost)!
  }

  const seed = getNewSeed()
  seedCache.set(siteHost, seed)
  return seed
}

export function clearSeedCache() {
  seedCache.clear()
}
