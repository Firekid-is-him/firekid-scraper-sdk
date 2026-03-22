import { describe, it, expect } from 'vitest'
import { FirekidScraper } from '../src/core/scraper.js'

describe('FirekidScraper', () => {
  it('should initialize successfully', async () => {
    const scraper = new FirekidScraper({ headless: true })
    await scraper.init()
    
    expect(scraper.getBrowser()).toBeTruthy()
    
    await scraper.close()
  })

  it('should navigate to a URL', async () => {
    const scraper = new FirekidScraper({ headless: true })
    
    await scraper.goto('https://example.com')
    const page = scraper.getPage()
    
    expect(page).toBeTruthy()
    expect(page?.url()).toBe('https://example.com/')
    
    await scraper.close()
  })
})
