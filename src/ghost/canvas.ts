import type { BrowserContext } from 'playwright'
import type { Seed } from '../types.js'

export async function applyCanvasSpoof(context: BrowserContext, seed: Seed): Promise<void> {
  await context.addInitScript((noise: number) => {
    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL
    const originalToBlob = HTMLCanvasElement.prototype.toBlob

    CanvasRenderingContext2D.prototype.getImageData = function(...args) {
      const imageData = originalGetImageData.apply(this, args as any)
      
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] += Math.floor(noise * 255 * (Math.random() - 0.5))
        imageData.data[i + 1] += Math.floor(noise * 255 * (Math.random() - 0.5))
        imageData.data[i + 2] += Math.floor(noise * 255 * (Math.random() - 0.5))
      }
      
      return imageData
    }

    HTMLCanvasElement.prototype.toDataURL = function(...args) {
      const context = this.getContext('2d')
      if (context) {
        const imageData = context.getImageData(0, 0, this.width, this.height)
        context.putImageData(imageData, 0, 0)
      }
      return originalToDataURL.apply(this, args as any)
    }

    HTMLCanvasElement.prototype.toBlob = function(...args) {
      const context = this.getContext('2d')
      if (context) {
        const imageData = context.getImageData(0, 0, this.width, this.height)
        context.putImageData(imageData, 0, 0)
      }
      return originalToBlob.apply(this, args as any)
    }
  }, seed.canvasNoise)
}
