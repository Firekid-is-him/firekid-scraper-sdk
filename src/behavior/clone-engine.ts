import type { Page } from 'playwright'
import type { BehaviorProfile } from '../types.js'
import { logger } from '../logger/logger.js'

export const defaultProfiles: Record<string, BehaviorProfile> = {
  fast: {
    typingSpeed: { min: 30, max: 60 },
    mouseMovements: [],
    scrollPatterns: [],
    pauseDistribution: [100, 200, 300],
    clickTiming: []
  },

  normal: {
    typingSpeed: { min: 80, max: 120 },
    mouseMovements: [],
    scrollPatterns: [],
    pauseDistribution: [500, 1000, 1500, 2000],
    clickTiming: []
  },

  careful: {
    typingSpeed: { min: 120, max: 180 },
    mouseMovements: [],
    scrollPatterns: [],
    pauseDistribution: [1000, 2000, 3000, 4000],
    clickTiming: []
  },

  human: {
    typingSpeed: { min: 50, max: 150 },
    mouseMovements: [],
    scrollPatterns: [],
    pauseDistribution: [300, 800, 1500, 2500, 4000],
    clickTiming: []
  }
}

export class CloneEngine {
  private profile: BehaviorProfile
  private profileName: string

  constructor(profileName: string = 'normal') {
    this.profileName = profileName
    this.profile = defaultProfiles[profileName] || defaultProfiles.normal
    logger.info(`[clone-engine] Using "${profileName}" behavior profile`)
  }

  async humanClick(page: Page, selector: string): Promise<void> {
    await this.randomPause()
    
    const element = page.locator(selector).first()
    const box = await element.boundingBox()
    
    if (box) {
      const x = box.x + box.width * (0.3 + Math.random() * 0.4)
      const y = box.y + box.height * (0.3 + Math.random() * 0.4)
      
      await page.mouse.move(x, y, { steps: 10 + Math.floor(Math.random() * 10) })
      await this.randomPause(100, 300)
      
      await page.mouse.click(x, y)
      
      logger.debug(`[clone-engine] Human click at (${x.toFixed(0)}, ${y.toFixed(0)})`)
    }
  }

  async humanType(page: Page, selector: string, text: string): Promise<void> {
    await page.focus(selector)
    await this.randomPause(100, 300)

    for (const char of text) {
      await page.keyboard.type(char)
      
      const delay = this.profile.typingSpeed.min + 
        Math.random() * (this.profile.typingSpeed.max - this.profile.typingSpeed.min)
      
      await page.waitForTimeout(delay)
    }

    logger.debug(`[clone-engine] Human typed: ${text.slice(0, 20)}...`)
  }

  async humanScroll(page: Page, direction: 'up' | 'down' = 'down', distance?: number): Promise<void> {
    const scrollDistance = distance || (200 + Math.random() * 300)
    const actualDistance = direction === 'down' ? scrollDistance : -scrollDistance
    
    const steps = 5 + Math.floor(Math.random() * 5)
    const stepDistance = actualDistance / steps

    for (let i = 0; i < steps; i++) {
      await page.evaluate((dist) => window.scrollBy(0, dist), stepDistance)
      await this.randomPause(50, 150)
    }

    await this.randomPause(500, 1000)
    
    logger.debug(`[clone-engine] Human scroll ${direction} by ${scrollDistance}px`)
  }

  async randomMouseMovement(page: Page): Promise<void> {
    const viewport = page.viewportSize()
    if (!viewport) return

    const x = Math.random() * viewport.width
    const y = Math.random() * viewport.height
    
    await page.mouse.move(x, y, { steps: 20 })
    await this.randomPause(200, 500)
  }

  async randomPause(min?: number, max?: number): Promise<void> {
    const pauseMin = min ?? this.profile.pauseDistribution[0]
    const pauseMax = max ?? this.profile.pauseDistribution[this.profile.pauseDistribution.length - 1]
    
    const delay = pauseMin + Math.random() * (pauseMax - pauseMin)
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  async simulateReading(page: Page): Promise<void> {
    logger.debug('[clone-engine] Simulating reading behavior...')
    
    const scrolls = 2 + Math.floor(Math.random() * 3)
    
    for (let i = 0; i < scrolls; i++) {
      await this.humanScroll(page, 'down', 100 + Math.random() * 200)
      await this.randomPause(2000, 4000)
    }
  }

  async simulateBrowsing(page: Page): Promise<void> {
    logger.debug('[clone-engine] Simulating browsing behavior...')
    
    await this.randomMouseMovement(page)
    await this.randomPause(1000, 2000)
    await this.humanScroll(page, 'down')
    await this.randomPause(1500, 2500)
    await this.randomMouseMovement(page)
  }

  getProfile(): BehaviorProfile {
    return this.profile
  }

  setProfile(profile: BehaviorProfile): void {
    this.profile = profile
    logger.info('[clone-engine] Custom behavior profile applied')
  }

  useProfile(name: string): void {
    if (defaultProfiles[name]) {
      this.profileName = name
      this.profile = defaultProfiles[name]
      logger.info(`[clone-engine] Switched to "${name}" profile`)
    } else {
      logger.warn(`[clone-engine] Profile "${name}" not found, using current profile`)
    }
  }
}
