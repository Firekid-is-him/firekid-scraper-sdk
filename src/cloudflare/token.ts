import type { BrowserContext, Page } from 'playwright'
import type { CFTokens } from '../types.js'

export async function extractCFTokens(context: BrowserContext): Promise<CFTokens> {
  const cookies = await context.cookies()
  const tokens: CFTokens = {}

  for (const cookie of cookies) {
    if (cookie.name === 'cf_clearance') {
      tokens.cfClearance = cookie.value
    }
    if (cookie.name === '__cf_bm') {
      tokens.cfBm = cookie.value
    }
  }

  return tokens
}

export async function injectCFTokens(context: BrowserContext, tokens: CFTokens, domain: string): Promise<void> {
  const cookies = []

  if (tokens.cfClearance) {
    cookies.push({
      name: 'cf_clearance',
      value: tokens.cfClearance,
      domain,
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'None' as const
    })
  }

  if (tokens.cfBm) {
    cookies.push({
      name: '__cf_bm',
      value: tokens.cfBm,
      domain,
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'None' as const
    })
  }

  if (cookies.length > 0) {
    await context.addCookies(cookies)
  }
}

export async function saveCFSession(page: Page): Promise<any> {
  const context = page.context()
  const cookies = await context.cookies()
  const localStorageData = await page.evaluate(() => JSON.stringify(localStorage))
  const sessionStorageData = await page.evaluate(() => JSON.stringify(sessionStorage))

  return {
    cookies,
    localStorage: localStorageData,
    sessionStorage: sessionStorageData
  }
}

export async function restoreCFSession(page: Page, session: any): Promise<void> {
  if (session.cookies) {
    await page.context().addCookies(session.cookies)
  }

  if (session.localStorage) {
    await page.addInitScript((storage) => {
      const data = JSON.parse(storage)
      for (const [key, value] of Object.entries(data)) {
        localStorage.setItem(key, value as string)
      }
    }, session.localStorage)
  }

  if (session.sessionStorage) {
    await page.addInitScript((storage) => {
      const data = JSON.parse(storage)
      for (const [key, value] of Object.entries(data)) {
        sessionStorage.setItem(key, value as string)
      }
    }, session.sessionStorage)
  }
}
