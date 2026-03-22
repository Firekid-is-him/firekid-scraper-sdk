import type { BrowserContext } from 'playwright'
import type { Seed } from '../types.js'

export async function applyNavigatorSpoof(context: BrowserContext, seed: Seed): Promise<void> {
  await context.addInitScript((seedData: any) => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined
    })

    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5]
    })

    Object.defineProperty(navigator, 'languages', {
      get: () => [seedData.language, 'en']
    })

    Object.defineProperty(navigator, 'platform', {
      get: () => 'Win32'
    })

    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => 8
    })

    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => 8
    })

    const originalQuery = window.navigator.permissions.query
    window.navigator.permissions.query = (parameters: any) => (
      parameters.name === 'notifications'
        ? Promise.resolve({ state: (Notification as any).permission } as PermissionStatus)
        : originalQuery(parameters)
    )

    if ((window as any).chrome) {
      delete (window as any).chrome.runtime
    }

    Object.defineProperty(screen, 'width', {
      get: () => seedData.screenWidth
    })

    Object.defineProperty(screen, 'height', {
      get: () => seedData.screenHeight
    })

    Object.defineProperty(screen, 'availWidth', {
      get: () => seedData.screenWidth
    })

    Object.defineProperty(screen, 'availHeight', {
      get: () => seedData.screenHeight - 40
    })
  }, seed)
}
