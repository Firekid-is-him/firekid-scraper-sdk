import type { BrowserContext } from 'playwright'
import type { Seed } from '../types.js'
import { injectWithMask, type Mask } from './mask.js'
import { clientHintBrands, type UAInfo } from './identity.js'

interface NavigatorArgs {
  language: string
  screenWidth: number
  screenHeight: number
  chromium: boolean
  brands: Array<{ brand: string; version: string }>
  fullVersion: string
  platform: string
  uaPlatform: string
  platformVersion: string
  mobile: boolean
}

export async function applyNavigatorSpoof(context: BrowserContext, seed: Seed, info: UAInfo): Promise<void> {
  const args: NavigatorArgs = {
    language: seed.language,
    screenWidth: seed.screenWidth,
    screenHeight: seed.screenHeight,
    chromium: info.chromium,
    brands: info.chromium ? clientHintBrands(info) : [],
    fullVersion: info.fullVersion,
    platform: info.navigatorPlatform,
    uaPlatform: info.platform,
    platformVersion: info.platformVersion,
    mobile: info.mobile
  }

  await context.addInitScript(injectWithMask(({ language, screenWidth, screenHeight, chromium, brands, fullVersion, platform, uaPlatform, platformVersion, mobile }: NavigatorArgs, mask: Mask) => {
    const win = window as any

    const getter = (proto: any, prop: string, value: () => unknown) => {
      if (!proto) return
      const fn = mask(value, `get ${prop}`, 0)
      Object.defineProperty(proto, prop, { get: fn, set: undefined, enumerable: true, configurable: true })
    }

    const languages = Object.freeze(language === 'en' ? ['en'] : [language, 'en'])

    getter(Navigator.prototype, 'webdriver', () => false)
    getter(Navigator.prototype, 'languages', () => languages)
    getter(Navigator.prototype, 'language', () => languages[0])
    getter(Navigator.prototype, 'platform', () => platform)
    getter(Navigator.prototype, 'hardwareConcurrency', () => 8)
    if ('deviceMemory' in Navigator.prototype) getter(Navigator.prototype, 'deviceMemory', () => 8)

    getter(Screen.prototype, 'width', () => screenWidth)
    getter(Screen.prototype, 'height', () => screenHeight)
    getter(Screen.prototype, 'availWidth', () => screenWidth)
    getter(Screen.prototype, 'availHeight', () => screenHeight - 40)

    if (chromium && navigator.plugins.length === 0 && typeof win.PluginArray !== 'undefined' && typeof win.Plugin !== 'undefined' && typeof win.MimeType !== 'undefined') {
      const mimes = [
        { type: 'application/pdf', suffixes: 'pdf' },
        { type: 'text/pdf', suffixes: 'pdf' }
      ].map(m => Object.create(win.MimeType.prototype, {
        type: { value: m.type, enumerable: true },
        suffixes: { value: m.suffixes, enumerable: true },
        description: { value: 'Portable Document Format', enumerable: true }
      }))

      const plugins = ['PDF Viewer', 'Chrome PDF Viewer', 'Chromium PDF Viewer', 'Microsoft Edge PDF Viewer', 'WebKit built-in PDF'].map(name => {
        const plugin = Object.create(win.Plugin.prototype, {
          name: { value: name, enumerable: true },
          filename: { value: 'internal-pdf-viewer', enumerable: true },
          description: { value: 'Portable Document Format', enumerable: true },
          length: { value: mimes.length }
        })
        mimes.forEach((mime, i) => Object.defineProperty(plugin, i, { value: mime, enumerable: true }))
        return plugin
      })

      const collection = (proto: any, items: any[], key: string) => {
        const list = Object.create(proto, { length: { value: items.length } })
        items.forEach((item, i) => Object.defineProperty(list, i, { value: item, enumerable: true }))

        const methods = {
          item(index: number) { return items[index] ?? null },
          namedItem(name: string) { return items.find(item => item[key] === name) ?? null },
          refresh() {}
        }

        Object.defineProperty(list, 'item', { value: mask(methods.item, 'item', 1) })
        Object.defineProperty(list, 'namedItem', { value: mask(methods.namedItem, 'namedItem', 1) })
        if (key === 'name') Object.defineProperty(list, 'refresh', { value: mask(methods.refresh, 'refresh', 0) })
        Object.defineProperty(list, Symbol.iterator, { value: Array.prototype[Symbol.iterator].bind(items) })

        return list
      }

      const pluginList = collection(win.PluginArray.prototype, plugins, 'name')
      getter(Navigator.prototype, 'plugins', () => pluginList)

      if (typeof win.MimeTypeArray !== 'undefined') {
        const mimeList = collection(win.MimeTypeArray.prototype, mimes, 'type')
        getter(Navigator.prototype, 'mimeTypes', () => mimeList)
      }
    }

    if (chromium && typeof win.NavigatorUAData !== 'undefined') {
      const frozenBrands = Object.freeze(brands.map(b => Object.freeze({ ...b })))
      const low = { brands: frozenBrands, mobile, platform: uaPlatform }

      const methods = {
        getHighEntropyValues(hints: string[]) {
          const all: Record<string, unknown> = {
            architecture: uaPlatform === 'macOS' ? 'arm' : 'x86',
            bitness: '64',
            model: '',
            platformVersion,
            uaFullVersion: fullVersion,
            fullVersionList: frozenBrands.map(b => ({ brand: b.brand, version: b.brand === 'Not-A.Brand' ? '99.0.0.0' : fullVersion })),
            wow64: false
          }
          const result: Record<string, unknown> = { ...low }
          for (const hint of Array.isArray(hints) ? hints : []) {
            if (hint in all) result[hint] = all[hint]
          }
          return Promise.resolve(result)
        },
        toJSON() {
          return { ...low }
        }
      }

      const uad = Object.create(win.NavigatorUAData.prototype)
      Object.defineProperty(uad, 'brands', { get: mask(() => frozenBrands, 'get brands', 0) })
      Object.defineProperty(uad, 'mobile', { get: mask(() => mobile, 'get mobile', 0) })
      Object.defineProperty(uad, 'platform', { get: mask(() => uaPlatform, 'get platform', 0) })
      Object.defineProperty(uad, 'getHighEntropyValues', { value: mask(methods.getHighEntropyValues, 'getHighEntropyValues', 1) })
      Object.defineProperty(uad, 'toJSON', { value: mask(methods.toJSON, 'toJSON', 0) })

      getter(Navigator.prototype, 'userAgentData', () => uad)
    }

    if (chromium && !('chrome' in win)) {
      const methods = {
        getDetails() { return null },
        getIsInstalled() { return false },
        runningState() { return 'cannot_run' },
        csi() {
          const now = Date.now()
          return { onloadT: now, startE: now, pageT: performance.now(), tran: 15 }
        },
        loadTimes() {
          const now = Date.now() / 1000
          return {
            requestTime: now, startLoadTime: now, commitLoadTime: now, finishDocumentLoadTime: now,
            finishLoadTime: now, firstPaintTime: now, firstPaintAfterLoadTime: 0, navigationType: 'Other',
            wasFetchedViaSpdy: true, wasNpnNegotiated: true, npnNegotiatedProtocol: 'h2',
            wasAlternateProtocolAvailable: false, connectionInfo: 'h2'
          }
        }
      }

      const chrome = {
        app: {
          isInstalled: false,
          InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
          RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
          getDetails: mask(methods.getDetails, 'getDetails', 0),
          getIsInstalled: mask(methods.getIsInstalled, 'getIsInstalled', 0),
          runningState: mask(methods.runningState, 'runningState', 0)
        },
        csi: mask(methods.csi, 'csi', 0),
        loadTimes: mask(methods.loadTimes, 'loadTimes', 0)
      }

      Object.defineProperty(win, 'chrome', { value: chrome, writable: true, enumerable: true, configurable: false })
    }

    if (typeof win.Permissions !== 'undefined' && win.Permissions.prototype.query) {
      const original = win.Permissions.prototype.query

      const methods = {
        async query(this: any, parameters: any) {
          const status = await original.call(this, parameters)

          if (parameters && parameters.name === 'notifications' && typeof Notification !== 'undefined'
            && status.state === 'prompt' && Notification.permission !== 'default') {
            Object.defineProperty(status, 'state', { value: Notification.permission, enumerable: true })
          }

          return status
        }
      }

      win.Permissions.prototype.query = mask(methods.query, 'query', 1)
    }
  }, args))
}
