import type { Page } from 'playwright'
import type { Seed, BehaviorProfile } from '../types.js'

export class HumanBehavior {
  private seed: Seed
  private profile: BehaviorProfile

  constructor(seed: Seed) {
    this.seed = seed
    this.profile = this.generateProfile()
  }

  private generateProfile(): BehaviorProfile {
    return {
      typingSpeed: { min: 50, max: 150 },
      mouseMovements: [],
      scrollPatterns: [],
      pauseDistribution: [],
      clickTiming: []
    }
  }

  async randomDelay(min: number = 500, max: number = 2000): Promise<void> {
    const delay = Math.random() * (max - min) + min
    await new Promise(r => setTimeout(r, delay))
  }

  async humanClick(page: Page, selector: string): Promise<void> {
    const element = await page.locator(selector)
    const box = await element.boundingBox()
    
    if (box) {
      const x = box.x + Math.random() * box.width
      const y = box.y + Math.random() * box.height
      
      await page.mouse.move(x, y, { steps: 10 })
      await this.randomDelay(100, 300)
      await page.mouse.click(x, y)
    }
  }

  async humanType(page: Page, selector: string, text: string): Promise<void> {
    await page.focus(selector)
    
    for (const char of text) {
      await page.keyboard.type(char)
      await this.randomDelay(
        this.profile.typingSpeed.min, 
        this.profile.typingSpeed.max
      )
    }
  }

  async randomScroll(page: Page): Promise<void> {
    const scrolls = Math.floor(Math.random() * 3) + 1
    
    for (let i = 0; i < scrolls; i++) {
      const scrollY = Math.random() * 500
      await page.evaluate((y) => window.scrollBy(0, y), scrollY)
      await this.randomDelay(500, 1000)
    }
  }

  async randomMouseMovement(page: Page): Promise<void> {
    const x = Math.random() * 1920
    const y = Math.random() * 1080
    
    await page.mouse.move(x, y, { steps: 20 })
    await this.randomDelay(200, 500)
  }

  getProfile(): BehaviorProfile {
    return this.profile
  }
}
