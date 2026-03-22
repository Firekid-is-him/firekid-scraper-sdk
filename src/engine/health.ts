import type { Page } from 'playwright'
import { logger } from '../logger/logger.js'

export interface HealthStatus {
  healthy: boolean
  checks: Record<string, boolean>
  timestamp: number
}

export class HealthMonitor {
  async check(page: Page): Promise<HealthStatus> {
    const checks: Record<string, boolean> = {}

    checks.pageLoaded = await this.checkPageLoaded(page)
    checks.noErrors = await this.checkNoErrors(page)
    checks.responsive = await this.checkResponsive(page)

    const healthy = Object.values(checks).every(Boolean)

    const status: HealthStatus = {
      healthy,
      checks,
      timestamp: Date.now()
    }

    if (!healthy) {
      logger.warn('[health] Health check failed:', checks)
    }

    return status
  }

  private async checkPageLoaded(page: Page): Promise<boolean> {
    try {
      await page.waitForLoadState('domcontentloaded', { timeout: 5000 })
      return true
    } catch {
      return false
    }
  }

  private async checkNoErrors(page: Page): Promise<boolean> {
    const errors: string[] = []

    page.on('pageerror', (error) => {
      errors.push(error.message)
    })

    await page.waitForTimeout(1000)

    return errors.length === 0
  }

  private async checkResponsive(page: Page): Promise<boolean> {
    try {
      await page.evaluate(() => document.readyState === 'complete')
      return true
    } catch {
      return false
    }
  }

  async checkSelector(page: Page, selector: string): Promise<boolean> {
    try {
      const count = await page.locator(selector).count()
      return count > 0
    } catch {
      return false
    }
  }

  async diagnose(page: Page): Promise<Record<string, any>> {
    const diagnosis: Record<string, any> = {}

    diagnosis.url = page.url()
    diagnosis.title = await page.title().catch(() => 'Unknown')
    
    diagnosis.viewport = page.viewportSize()
    
    diagnosis.metrics = await page.evaluate(() => ({
      documentHeight: document.body.scrollHeight,
      viewportHeight: window.innerHeight,
      elementsCount: document.querySelectorAll('*').length
    }))

    diagnosis.loadState = await page.evaluate(() => document.readyState)

    return diagnosis
  }
}
