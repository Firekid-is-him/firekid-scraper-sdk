import type { Page, BrowserContext } from 'playwright'
import { logger } from '../logger/logger.js'
import type { CFTokens } from '../types.js'

export class CloudflareManager {
  async detect(page: Page): Promise<boolean> {
    const url = page.url()

    try {
      const title = await page.title()
      const content = await page.content()

      const cfIndicators = [
        title.includes('Just a moment'),
        title.includes('Attention Required'),
        content.includes('cf-browser-verification'),
        content.includes('cloudflare'),
        content.includes('cf_chl_opt'),
        content.includes('__cf_bm'),
        content.includes('Ray ID'),
      ]

      const detected = cfIndicators.some(Boolean)
      if (detected) {
        logger.warn(`[cloudflare] CF protection detected on ${url}`)
      }

      return detected
    } catch {
      return false
    }
  }

  async waitForClearance(page: Page, timeoutMs: number = 30000): Promise<boolean> {
    logger.info('[cloudflare] Waiting for CF challenge to resolve...')

    const start = Date.now()

    while (Date.now() - start < timeoutMs) {
      const title = await page.title().catch(() => '')
      const isCFPage = title.includes('Just a moment') || title.includes('Attention Required')

      if (!isCFPage) {
        logger.info('[cloudflare] CF challenge cleared')
        return true
      }

      await page.waitForTimeout(1000)
    }

    logger.error('[cloudflare] CF challenge timeout - could not clear in time')
    return false
  }

  async extractTokens(context: BrowserContext): Promise<CFTokens> {
    const cookies = await context.cookies()
    const tokens: CFTokens = {}

    for (const cookie of cookies) {
      if (cookie.name === 'cf_clearance') tokens.cfClearance = cookie.value
      if (cookie.name === '__cf_bm') tokens.cfBm = cookie.value
    }

    if (tokens.cfClearance) {
      logger.info(`[cloudflare] Captured cf_clearance: ${tokens.cfClearance.slice(0, 20)}...`)
    }

    return tokens
  }

  async detectWAF(page: Page): Promise<string | null> {
    const content = await page.content().catch(() => '')

    if (content.includes('cloudflare') || content.includes('cf-ray')) return 'Cloudflare'
    if (content.includes('akamai') || content.includes('ak_bmsc')) return 'Akamai'
    if (content.includes('sucuri')) return 'Sucuri'
    if (content.includes('incapsula')) return 'Imperva/Incapsula'
    if (content.includes('distil')) return 'Distil Networks'

    return null
  }

  async handleCloudflare(page: Page, url: string): Promise<boolean> {
    const isProtected = await this.detect(page)
    if (!isProtected) return true

    logger.info('[cloudflare] Cloudflare detected')

    const cleared = await this.waitForClearance(page)
    if (cleared) {
      logger.info('[cloudflare] JS challenge auto-cleared')
      return true
    }

    const hasTurnstile = await this.detectTurnstile(page)
    if (hasTurnstile) {
      logger.info('[cloudflare] Turnstile CAPTCHA detected - opening browser for manual solve')
      return await this.handleTurnstile(page, url)
    }

    logger.warn('[cloudflare] Unknown Cloudflare challenge')
    return false
  }

  async detectTurnstile(page: Page): Promise<boolean> {
    const turnstileFrame = await page.locator('iframe[src*="challenges.cloudflare.com"]').count()
    const turnstileDiv = await page.locator('[id*="turnstile"]').count()
    
    return turnstileFrame > 0 || turnstileDiv > 0
  }

  async handleTurnstile(page: Page, url: string): Promise<boolean> {
    logger.info('[cloudflare] Waiting for manual Turnstile solve...')
    
    console.log('\n===========================================')
    console.log('  PLEASE SOLVE THE CAPTCHA')
    console.log('  Waiting for you to complete it...')
    console.log('===========================================\n')

    await this.waitForTurnstileSolved(page)

    logger.info('[cloudflare] CAPTCHA solved! Continuing...')
    return true
  }

  async isTurnstileSolved(page: Page): Promise<boolean> {
    try {
      const turnstileExists = await page.locator('iframe[src*="challenges.cloudflare.com"]').count()
      if (turnstileExists === 0) return true
      
      const hasToken = await page.evaluate(() => {
        const input = document.querySelector('input[name="cf-turnstile-response"]')
        return input && (input as HTMLInputElement).value !== ''
      })
      if (hasToken) return true
      
      const contentVisible = await page.evaluate(() => {
        const body = document.body
        return body && !body.classList.contains('no-scroll')
      })
      
      return contentVisible
    } catch {
      return false
    }
  }

  async waitForTurnstileSolved(page: Page): Promise<void> {
    while (true) {
      const solved = await this.isTurnstileSolved(page)
      
      if (solved) {
        await page.waitForTimeout(2000)
        return
      }
      
      await page.waitForTimeout(1000)
    }
  }
}
