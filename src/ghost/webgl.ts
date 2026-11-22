import type { BrowserContext } from 'playwright'
import type { Seed } from '../types.js'
import { injectWithMask, type Mask } from './mask.js'

export async function applyWebGLSpoof(context: BrowserContext, seed: Seed): Promise<void> {
  await context.addInitScript(injectWithMask(({ vendor, renderer }: { vendor: string, renderer: string }, mask: Mask) => {
    const patch = (proto: any) => {
      if (!proto || typeof proto.getParameter !== 'function') return

      const original = proto.getParameter

      const methods = {
        getParameter(this: any, ...args: any[]) {
          const param = args[0]
          if (param === 37445) return vendor
          if (param === 37446) return renderer
          return original.apply(this, args)
        }
      }

      proto.getParameter = mask(methods.getParameter, 'getParameter', 1)
    }

    patch((window as any).WebGLRenderingContext?.prototype)
    patch((window as any).WebGL2RenderingContext?.prototype)
  }, { vendor: seed.webglVendor, renderer: seed.webglRenderer }))
}
