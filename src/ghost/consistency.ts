import type { Seed } from '../types.js'

export function validateConsistency(seed: Seed): void {
  if (!seed.id || !seed.chromeVersion) {
    throw new Error('Invalid seed: missing required fields')
  }

  if (seed.screenWidth < 800 || seed.screenHeight < 600) {
    throw new Error('Invalid seed: screen resolution too small')
  }

  if (seed.canvasNoise < 0 || seed.canvasNoise > 1) {
    throw new Error('Invalid seed: canvas noise out of range')
  }

  if (seed.audioNoise < 0 || seed.audioNoise > 1) {
    throw new Error('Invalid seed: audio noise out of range')
  }

  if (!seed.fonts || seed.fonts.length === 0) {
    throw new Error('Invalid seed: no fonts specified')
  }
}
