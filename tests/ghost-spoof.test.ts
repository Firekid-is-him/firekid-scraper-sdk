import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { chromium, type Browser, type BrowserContext } from 'playwright'
import { applyGhost } from '../src/ghost/index.js'
import { getNewSeed, buildUserAgent, alignSeedToBrowser } from '../src/ghost/seed.js'
import { describeUserAgent, secChUa } from '../src/ghost/identity.js'
import { startFixtureServer, type FixtureServer } from './helpers/fixtures.js'

describe('ghost spoofing', () => {
  let browser: Browser
  let fixtures: FixtureServer

  const open = async (options: { userAgent?: string } = {}) => {
    const seed = alignSeedToBrowser(getNewSeed(), browser.version())
    const userAgent = options.userAgent ?? buildUserAgent(seed)
    const context = await browser.newContext({ userAgent })
    await applyGhost(context, { seed, userAgent })
    const page = await context.newPage()
    await page.goto(`${fixtures.url}/blank`)
    return { seed, userAgent, context, page }
  }

  const withPage = async <T>(options: { userAgent?: string }, fn: (ctx: Awaited<ReturnType<typeof open>>) => Promise<T>): Promise<T> => {
    const ctx = await open(options)
    try { return await fn(ctx) } finally { await ctx.context.close() }
  }

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true })
    fixtures = await startFixtureServer()
  })

  afterAll(async () => {
    await browser.close()
    await fixtures.close()
  })

  it('pairs WebGL vendor and renderer from the same GPU family', () => {
    for (let i = 0; i < 60; i++) {
      const seed = getNewSeed()
      const family = seed.webglVendor.match(/\((\w+)\)/)![1]
      expect(seed.webglRenderer).toContain(`(${family},`)
    }
  })

  it('aligns the seed to the real browser version', () => {
    const aligned = alignSeedToBrowser(getNewSeed(), '157.0.8103.78')
    expect(buildUserAgent(aligned)).toContain('Chrome/157.0.0.0')
  })

  it('does not throw when a page reads the WebGL renderer', async () => {
    await withPage({}, async ({ page, seed }) => {
      const result = await page.evaluate(() => {
        const gl = document.createElement('canvas').getContext('webgl') as WebGLRenderingContext | null
        if (!gl) return { skipped: true }
        const ext = gl.getExtension('WEBGL_debug_renderer_info')
        return {
          skipped: false,
          vendor: gl.getParameter(ext!.UNMASKED_VENDOR_WEBGL),
          renderer: gl.getParameter(ext!.UNMASKED_RENDERER_WEBGL)
        }
      })

      if (!result.skipped) {
        expect(result.vendor).toBe(seed.webglVendor)
        expect(result.renderer).toBe(seed.webglRenderer)
      }
    })
  })

  it('reports webdriver false and a chrome object', async () => {
    await withPage({}, async ({ page }) => {
      const state = await page.evaluate(() => ({
        webdriver: navigator.webdriver,
        chrome: typeof (window as any).chrome,
        csi: typeof (window as any).chrome?.csi
      }))

      expect(state).toEqual({ webdriver: false, chrome: 'object', csi: 'function' })
    })
  })

  it('keeps userAgentData consistent with the user agent', async () => {
    await withPage({}, async ({ page, userAgent }) => {
      const state = await page.evaluate(async () => {
        const uad = (navigator as any).userAgentData
        const high = await uad.getHighEntropyValues(['platformVersion', 'architecture', 'fullVersionList'])
        return {
          ua: navigator.userAgent,
          brands: uad.brands.map((b: any) => `${b.brand}/${b.version}`),
          platform: uad.platform,
          navPlatform: navigator.platform,
          mobile: uad.mobile,
          architecture: high.architecture,
          fullVersions: high.fullVersionList.length
        }
      })

      const major = userAgent.match(/Chrome\/(\d+)/)![1]
      expect(state.ua).toBe(userAgent)
      expect(state.brands).toContain(`Chromium/${major}`)
      expect(state.brands).toContain(`Google Chrome/${major}`)
      expect(state.brands.join()).not.toMatch(/Headless/)
      expect(state.platform).toBe('Windows')
      expect(state.navPlatform).toBe('Win32')
      expect(state.mobile).toBe(false)
      expect(state.architecture).toBe('x86')
      expect(state.fullVersions).toBe(3)
    })
  })

  it('sends client hint headers that match the JavaScript values', async () => {
    await withPage({}, async ({ page, userAgent }) => {
      const headers = await page.evaluate(async (url) => (await fetch(`${url}/headers`)).json(), fixtures.url)
      const info = describeUserAgent(userAgent)

      expect(headers['sec-ch-ua']).toBe(secChUa(info))
      expect(headers['sec-ch-ua-platform']).toBe('"Windows"')
      expect(headers['sec-ch-ua-mobile']).toBe('?0')
      expect(headers['user-agent']).toBe(userAgent)
    })
  })

  it('follows a custom macOS user agent everywhere', async () => {
    const mac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'

    await withPage({ userAgent: mac }, async ({ page }) => {
      const state = await page.evaluate(async (url) => ({
        platform: navigator.platform,
        uaPlatform: (navigator as any).userAgentData.platform,
        headers: await (await fetch(`${url}/headers`)).json()
      }), fixtures.url)

      expect(state.platform).toBe('MacIntel')
      expect(state.uaPlatform).toBe('macOS')
      expect(state.headers['sec-ch-ua-platform']).toBe('"macOS"')
      expect(state.headers['sec-ch-ua']).toContain('v="140"')
    })
  })

  it('does not add Chrome-branded client hints for a non-Chromium user agent', async () => {
    const firefox = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0'

    await withPage({ userAgent: firefox }, async ({ page }) => {
      const headers = await page.evaluate(async (url) => (await fetch(`${url}/headers`)).json(), fixtures.url)
      expect(headers['sec-ch-ua'] ?? '').not.toContain('Google Chrome')
    })
  })

  it('returns identical canvas output on repeated reads', async () => {
    await withPage({}, async ({ page }) => {
      const result = await page.evaluate(() => {
        const draw = () => {
          const c = document.createElement('canvas')
          c.width = 120
          c.height = 40
          const x = c.getContext('2d')!
          x.fillStyle = '#336699'
          x.fillRect(0, 0, 120, 40)
          x.fillStyle = '#ffcc00'
          x.font = '16px Arial'
          x.fillText('fingerprint 123', 4, 24)
          return c
        }
        const a = draw()
        const first = a.toDataURL()
        const second = a.toDataURL()
        const other = draw().toDataURL()
        const px = (c: HTMLCanvasElement) => Array.from(c.getContext('2d')!.getImageData(0, 0, 120, 40).data.slice(0, 400)).join(',')
        return { stable: first === second, sameDrawing: first === other, pixelsStable: px(a) === px(a) }
      })

      expect(result).toEqual({ stable: true, sameDrawing: true, pixelsStable: true })
    })
  })

  it('actually perturbs canvas output compared with an unspoofed page', async () => {
    const drawScript = () => {
      const c = document.createElement('canvas')
      c.width = 200
      c.height = 100
      const x = c.getContext('2d')!
      for (let i = 0; i < 200; i += 4) {
        x.fillStyle = `rgb(${i},${(i * 3) % 255},${(i * 7) % 255})`
        x.fillRect(i, 0, 4, 100)
      }
      return c.toDataURL()
    }

    const plain = await browser.newContext()
    const plainPage = await plain.newPage()
    await plainPage.goto(`${fixtures.url}/blank`)
    const native = await plainPage.evaluate(drawScript)
    await plain.close()

    await withPage({}, async ({ page }) => {
      expect(await page.evaluate(drawScript)).not.toBe(native)
    })
  })

  it('does not throw for empty canvases or tainted-style edge cases', async () => {
    await withPage({}, async ({ page }) => {
      const result = await page.evaluate(() => {
        const empty = document.createElement('canvas')
        empty.width = 0
        empty.height = 0
        const blank = document.createElement('canvas')
        return { empty: empty.toDataURL(), blank: blank.toDataURL().startsWith('data:image/png') }
      })

      expect(result.empty).toBe('data:,')
      expect(result.blank).toBe(true)
    })
  })

  it('reports patched functions as native code', async () => {
    await withPage({}, async ({ page }) => {
      const sources = await page.evaluate(() => {
        const toString = Function.prototype.toString
        return [
          toString.call(HTMLCanvasElement.prototype.toDataURL),
          toString.call(CanvasRenderingContext2D.prototype.getImageData),
          toString.call(WebGLRenderingContext.prototype.getParameter),
          toString.call(Function.prototype.toString),
          toString.call(Object.getOwnPropertyDescriptor(Navigator.prototype, 'webdriver')!.get!)
        ]
      })

      for (const source of sources) expect(source).toMatch(/\{ \[native code\] \}$/)
      expect(sources[0]).toBe('function toDataURL() { [native code] }')
    })
  })

  it('keeps patched functions looking native', async () => {
    await withPage({}, async ({ page }) => {
      const shape = await page.evaluate(() => {
        const fn = HTMLCanvasElement.prototype.toDataURL as any
        return { name: fn.name, hasPrototype: 'prototype' in fn, length: fn.length }
      })

      expect(shape).toEqual({ name: 'toDataURL', hasPrototype: false, length: 0 })
    })
  })

  it('exposes real-looking plugins', async () => {
    await withPage({}, async ({ page }) => {
      const result = await page.evaluate(() => ({
        isPluginArray: navigator.plugins instanceof PluginArray,
        length: navigator.plugins.length,
        first: navigator.plugins[0]?.name,
        named: navigator.plugins.namedItem('PDF Viewer')?.name ?? null,
        iterated: Array.from(navigator.plugins as any).length
      }))

      expect(result.isPluginArray).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      expect(typeof result.first).toBe('string')
      expect(result.iterated).toBe(result.length)
    })
  })

  it('lets non-notification permission queries through', async () => {
    await withPage({}, async ({ page }) => {
      const result = await page.evaluate(async () => ({
        notifications: (await navigator.permissions.query({ name: 'notifications' })).state,
        geolocation: (await navigator.permissions.query({ name: 'geolocation' })).state
      }))

      expect(['granted', 'denied', 'prompt']).toContain(result.notifications)
      expect(result.geolocation).toBe('prompt')
    })
  })

  it('keeps languages stable and consistent with language', async () => {
    await withPage({}, async ({ page }) => {
      const result = await page.evaluate(() => ({
        same: navigator.languages === navigator.languages,
        first: navigator.languages[0] === navigator.language,
        frozen: Object.isFrozen(navigator.languages),
        ownWebdriver: Object.prototype.hasOwnProperty.call(navigator, 'webdriver')
      }))

      expect(result).toEqual({ same: true, first: true, frozen: true, ownWebdriver: false })
    })
  })

  it('describeUserAgent understands common agents', () => {
    expect(describeUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36')).toMatchObject({ chromium: true, platform: 'Linux', major: '139' })
    expect(describeUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/139.0.0.0 Mobile Safari/537.36')).toMatchObject({ platform: 'Android', mobile: true })
    expect(describeUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0').brand).toBe('Microsoft Edge')
    expect(describeUserAgent('Mozilla/5.0 (Windows NT 10.0; rv:130.0) Gecko/20100101 Firefox/130.0').chromium).toBe(false)
  })
})
