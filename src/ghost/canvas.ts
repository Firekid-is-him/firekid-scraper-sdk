import type { BrowserContext } from 'playwright'
import type { Seed } from '../types.js'
import { injectWithMask, type Mask } from './mask.js'

export async function applyCanvasSpoof(context: BrowserContext, seed: Seed): Promise<void> {
  await context.addInitScript(injectWithMask(({ noise, id }: { noise: number, id: string }, mask: Mask) => {
    let base = 2166136261
    for (let i = 0; i < id.length; i++) {
      base ^= id.charCodeAt(i)
      base = Math.imul(base, 16777619)
    }

    const threshold = Math.floor((0.02 + noise * 20) * 4294967296)

    const perturb = (data: Uint8ClampedArray) => {
      for (let i = 0; i < data.length; i++) {
        if ((i & 3) === 3) continue

        let h = (base ^ Math.imul(i + 1, 2654435761)) >>> 0
        h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0
        h = (h ^ (h >>> 13)) >>> 0

        if (h < threshold) data[i] += (h & 1) ? 1 : -1
      }
    }

    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL
    const originalToBlob = HTMLCanvasElement.prototype.toBlob

    const noisyCopy = (source: HTMLCanvasElement): HTMLCanvasElement | null => {
      try {
        const width = source.width
        const height = source.height
        if (!width || !height || width * height > 8000000) return null

        const copy = document.createElement('canvas')
        copy.width = width
        copy.height = height

        const ctx = copy.getContext('2d')
        if (!ctx) return null

        ctx.drawImage(source, 0, 0)
        const image = originalGetImageData.call(ctx, 0, 0, width, height)
        perturb(image.data)
        ctx.putImageData(image, 0, 0)

        return copy
      } catch {
        return null
      }
    }

    const methods = {
      getImageData(this: any, ...args: any[]) {
        const image = originalGetImageData.apply(this, args as any)
        perturb(image.data)
        return image
      },
      toDataURL(this: any, ...args: any[]) {
        return originalToDataURL.apply(noisyCopy(this) ?? this, args as any)
      },
      toBlob(this: any, ...args: any[]) {
        return originalToBlob.apply(noisyCopy(this) ?? this, args as any)
      }
    }

    CanvasRenderingContext2D.prototype.getImageData = mask(methods.getImageData, 'getImageData', 4)
    HTMLCanvasElement.prototype.toDataURL = mask(methods.toDataURL, 'toDataURL', 0)
    HTMLCanvasElement.prototype.toBlob = mask(methods.toBlob, 'toBlob', 1)
  }, { noise: seed.canvasNoise, id: seed.id }))
}
