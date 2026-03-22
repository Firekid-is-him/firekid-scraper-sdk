import type { BrowserContext } from 'playwright'
import type { Seed } from '../types.js'

export async function applyWebGLSpoof(context: BrowserContext, seed: Seed): Promise<void> {
  await context.addInitScript((vendor: string, renderer: string) => {
    const getParameterProxyHandler = {
      apply(target: any, thisArg: any, args: any[]) {
        const param = args[0]
        
        if (param === 37445) {
          return vendor
        }
        if (param === 37446) {
          return renderer
        }
        
        return Reflect.apply(target, thisArg, args)
      }
    }

    const getExtensionProxyHandler = {
      apply(target: any, thisArg: any, args: any[]) {
        const result = Reflect.apply(target, thisArg, args)
        
        if (!result) {
          return result
        }

        if (args[0] === 'WEBGL_debug_renderer_info') {
          const getParameterProxy = new Proxy(result.getParameter, getParameterProxyHandler)
          result.getParameter = getParameterProxy
        }

        return result
      }
    }

    WebGLRenderingContext.prototype.getParameter = new Proxy(
      WebGLRenderingContext.prototype.getParameter,
      getParameterProxyHandler
    )

    WebGL2RenderingContext.prototype.getParameter = new Proxy(
      WebGL2RenderingContext.prototype.getParameter,
      getParameterProxyHandler
    )

    WebGLRenderingContext.prototype.getExtension = new Proxy(
      WebGLRenderingContext.prototype.getExtension,
      getExtensionProxyHandler
    )

    WebGL2RenderingContext.prototype.getExtension = new Proxy(
      WebGL2RenderingContext.prototype.getExtension,
      getExtensionProxyHandler
    )
  }, seed.webglVendor, seed.webglRenderer)
}
