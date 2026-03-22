import type { Page } from 'playwright'
import { logger } from '../logger/logger.js'

export class FlowDetector {
  async detect(page: Page): Promise<string[]> {
    logger.info('[flow-detector] Detecting page flows...')

    const flows: string[] = []

    if (await this.hasLoginFlow(page)) flows.push('login')
    if (await this.hasRegistrationFlow(page)) flows.push('registration')
    if (await this.hasSearchFlow(page)) flows.push('search')
    if (await this.hasCheckoutFlow(page)) flows.push('checkout')
    if (await this.hasPaginationFlow(page)) flows.push('pagination')
    if (await this.hasInfiniteScrollFlow(page)) flows.push('infinite-scroll')
    if (await this.hasFilterFlow(page)) flows.push('filter')
    if (await this.hasUploadFlow(page)) flows.push('upload')

    return flows
  }

  private async hasLoginFlow(page: Page): Promise<boolean> {
    return await page.evaluate(() => {
      const passwordField = document.querySelector('input[type="password"]')
      const usernameField = document.querySelector('input[type="email"], input[type="text"][name*="user"], input[name*="login"]')
      const submitButton = document.querySelector('button[type="submit"], input[type="submit"]')

      return !!(passwordField && usernameField && submitButton)
    })
  }

  private async hasRegistrationFlow(page: Page): Promise<boolean> {
    return await page.evaluate(() => {
      const inputs = document.querySelectorAll('input')
      const hasEmail = Array.from(inputs).some(i => i.type === 'email' || i.name.includes('email'))
      const hasPassword = Array.from(inputs).some(i => i.type === 'password')
      const hasConfirmPassword = Array.from(inputs).some(i => i.name.includes('confirm') || i.name.includes('repeat'))

      return hasEmail && hasPassword && hasConfirmPassword
    })
  }

  private async hasSearchFlow(page: Page): Promise<boolean> {
    return await page.evaluate(() => {
      const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i], input[name*="search"]')
      return !!searchInput
    })
  }

  private async hasCheckoutFlow(page: Page): Promise<boolean> {
    return await page.evaluate(() => {
      const text = document.body.textContent?.toLowerCase() || ''
      return text.includes('checkout') || text.includes('cart') || text.includes('payment')
    })
  }

  private async hasPaginationFlow(page: Page): Promise<boolean> {
    return await page.evaluate(() => {
      const pagination = document.querySelector('.pagination, [class*="pager"], [class*="page-"]')
      const nextButton = document.querySelector('[class*="next"], [rel="next"]')
      return !!(pagination || nextButton)
    })
  }

  private async hasInfiniteScrollFlow(page: Page): Promise<boolean> {
    return await page.evaluate(() => {
      return document.body.scrollHeight > window.innerHeight * 3
    })
  }

  private async hasFilterFlow(page: Page): Promise<boolean> {
    return await page.evaluate(() => {
      const filters = document.querySelectorAll('select[name*="filter"], input[name*="filter"], [class*="filter"]')
      return filters.length >= 2
    })
  }

  private async hasUploadFlow(page: Page): Promise<boolean> {
    return await page.evaluate(() => {
      return !!document.querySelector('input[type="file"]')
    })
  }
}
