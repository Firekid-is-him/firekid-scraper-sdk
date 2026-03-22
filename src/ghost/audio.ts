import type { BrowserContext } from 'playwright'
import type { Seed } from '../types.js'

export async function applyAudioSpoof(context: BrowserContext, seed: Seed): Promise<void> {
  await context.addInitScript((noise: number) => {
    const context = (window as any).AudioContext || (window as any).webkitAudioContext
    
    if (context) {
      const originalCreateDynamicsCompressor = context.prototype.createDynamicsCompressor
      const originalCreateOscillator = context.prototype.createOscillator

      context.prototype.createDynamicsCompressor = function() {
        const compressor = originalCreateDynamicsCompressor.apply(this, arguments)
        
        if (compressor.reduction) {
          Object.defineProperty(compressor.reduction, 'value', {
            get() {
              return this._value + noise * (Math.random() - 0.5)
            },
            set(v) {
              this._value = v
            }
          })
        }

        return compressor
      }

      context.prototype.createOscillator = function() {
        const oscillator = originalCreateOscillator.apply(this, arguments)
        const originalStart = oscillator.start

        oscillator.start = function() {
          if (oscillator.frequency) {
            oscillator.frequency.value += noise * (Math.random() - 0.5)
          }
          return originalStart.apply(this, arguments)
        }

        return oscillator
      }
    }
  }, seed.audioNoise)
}
