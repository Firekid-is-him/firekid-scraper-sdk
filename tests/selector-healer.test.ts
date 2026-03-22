import { describe, it, expect } from 'vitest'
import { chromium } from 'playwright'
import { SelectorHealer } from '../src/healing/selector-healer.js'

describe('SelectorHealer', () => {
  it('should heal broken selectors', async () => {
    const browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()

    await page.setContent(`
      <html>
        <body>
          <button id="submit-btn">Submit</button>
        </body>
      </html>
    `)

    const healer = new SelectorHealer()
    
    const healed = await healer.heal(page, '.wrong-selector', 'submit')

    expect(healed).toBeTruthy()
    expect(healed).toContain('submit')

    await browser.close()
  })

  it('should test selector validity', async () => {
    const browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()

    await page.setContent(`
      <html>
        <body>
          <div class="content">Hello</div>
        </body>
      </html>
    `)

    const healer = new SelectorHealer()
    
    const valid = await healer.testSelector(page, '.content')
    const invalid = await healer.testSelector(page, '.nonexistent')

    expect(valid).toBe(true)
    expect(invalid).toBe(false)

    await browser.close()
  })
})
