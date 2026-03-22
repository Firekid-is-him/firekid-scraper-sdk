import { logger } from '../logger/logger.js'

export class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private maxRequests: number
  private windowMs: number

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  async checkLimit(key: string = 'default'): Promise<boolean> {
    const now = Date.now()
    const requests = this.requests.get(key) || []

    const validRequests = requests.filter(timestamp => now - timestamp < this.windowMs)

    if (validRequests.length >= this.maxRequests) {
      logger.warn(`[rate-limiter] Rate limit exceeded for ${key}`)
      return false
    }

    validRequests.push(now)
    this.requests.set(key, validRequests)

    return true
  }

  async waitForSlot(key: string = 'default'): Promise<void> {
    while (!(await this.checkLimit(key))) {
      const requests = this.requests.get(key) || []
      if (requests.length === 0) break

      const oldestRequest = Math.min(...requests)
      const waitTime = this.windowMs - (Date.now() - oldestRequest)

      if (waitTime > 0) {
        logger.info(`[rate-limiter] Waiting ${waitTime}ms for ${key}`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }

  reset(key?: string): void {
    if (key) {
      this.requests.delete(key)
      logger.info(`[rate-limiter] Reset ${key}`)
    } else {
      this.requests.clear()
      logger.info('[rate-limiter] Reset all')
    }
  }

  getUsage(key: string = 'default'): number {
    const requests = this.requests.get(key) || []
    const now = Date.now()
    const validRequests = requests.filter(timestamp => now - timestamp < this.windowMs)
    return validRequests.length
  }

  getRemainingQuota(key: string = 'default'): number {
    return this.maxRequests - this.getUsage(key)
  }
}
