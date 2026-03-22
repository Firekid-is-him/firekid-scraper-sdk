import { describe, it, expect } from 'vitest'
import { chromium } from 'playwright'
import { applyGhost, getNewSeed } from '../src/ghost/index.js'

describe('Ghost Module', () => {
  it('should generate unique seeds', () => {
    const seed1 = getNewSeed()
    const seed2 = getNewSeed()

    expect(seed1.id).not.toBe(seed2.id)
    expect(seed1).toHaveProperty('chromeVersion')
    expect(seed1).toHaveProperty('screenWidth')
    expect(seed1).toHaveProperty('screenHeight')
  })

  it('should apply ghost spoofing to browser context', async () => {
    const browser = await chromium.launch({ headless: true })
    const context = await browser.newContext()

    await applyGhost(context)

    const page = await context.newPage()
    
    const webdriver = await page.evaluate(() => navigator.webdriver)
    expect(webdriver).toBeUndefined()

    await browser.close()
  })
})
