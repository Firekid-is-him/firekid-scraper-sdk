import type { Page } from 'playwright'
import { logger } from '../logger/logger.js'

export class SiteDetector {
  async detectFramework(page: Page): Promise<string> {
    return await page.evaluate(() => {
      if ((window as any).React) return 'React'
      if ((window as any).Vue || (window as any).__VUE__) return 'Vue'
      if ((window as any).angular || (window as any).ng) return 'Angular'
      if ((window as any).Svelte) return 'Svelte'
      if ((window as any).jQuery || (window as any).$) return 'jQuery'
      
      const scripts = Array.from(document.querySelectorAll('script[src]'))
      const src = scripts.map(s => (s as HTMLScriptElement).src.toLowerCase()).join(' ')
      
      if (src.includes('react')) return 'React'
      if (src.includes('vue')) return 'Vue'
      if (src.includes('angular')) return 'Angular'
      if (src.includes('svelte')) return 'Svelte'
      
      return 'Unknown'
    })
  }

  async detectCMS(page: Page): Promise<string> {
    return await page.evaluate(() => {
      const meta = Array.from(document.querySelectorAll('meta'))
        .map(m => m.getAttribute('content') || '')
        .join(' ')
        .toLowerCase()

      if (meta.includes('wordpress') || document.body.className.includes('wp-')) return 'WordPress'
      if (meta.includes('shopify')) return 'Shopify'
      if (meta.includes('wix')) return 'Wix'
      if (meta.includes('squarespace')) return 'Squarespace'
      if (meta.includes('drupal')) return 'Drupal'
      if (meta.includes('joomla')) return 'Joomla'

      const html = document.documentElement.innerHTML.toLowerCase()
      if (html.includes('wp-content')) return 'WordPress'
      if (html.includes('shopify')) return 'Shopify'

      return 'Unknown'
    })
  }

  async detectEcommerce(page: Page): Promise<boolean> {
    return await page.evaluate(() => {
      const indicators = [
        !!document.querySelector('[class*="cart"]'),
        !!document.querySelector('[class*="product"]'),
        !!document.querySelector('[class*="price"]'),
        !!document.querySelector('[class*="checkout"]'),
        !!document.querySelector('button:has-text("Add to Cart")'),
        !!document.querySelector('button:has-text("Buy Now")')
      ]

      return indicators.filter(Boolean).length >= 3
    })
  }

  async detectSocialMedia(page: Page): Promise<string[]> {
    return await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'))
        .map(a => (a as HTMLAnchorElement).href.toLowerCase())

      const platforms: string[] = []

      if (links.some(l => l.includes('facebook.com'))) platforms.push('Facebook')
      if (links.some(l => l.includes('twitter.com') || l.includes('x.com'))) platforms.push('Twitter')
      if (links.some(l => l.includes('instagram.com'))) platforms.push('Instagram')
      if (links.some(l => l.includes('linkedin.com'))) platforms.push('LinkedIn')
      if (links.some(l => l.includes('youtube.com'))) platforms.push('YouTube')
      if (links.some(l => l.includes('tiktok.com'))) platforms.push('TikTok')

      return platforms
    })
  }

  async detectAnalytics(page: Page): Promise<string[]> {
    return await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'))
        .map(s => (s as HTMLScriptElement).src || s.textContent || '')
        .join(' ')
        .toLowerCase()

      const analytics: string[] = []

      if (scripts.includes('google-analytics') || scripts.includes('gtag')) analytics.push('Google Analytics')
      if (scripts.includes('facebook')) analytics.push('Facebook Pixel')
      if (scripts.includes('hotjar')) analytics.push('Hotjar')
      if (scripts.includes('mixpanel')) analytics.push('Mixpanel')
      if (scripts.includes('segment')) analytics.push('Segment')

      return analytics
    })
  }

  async detectAll(page: Page): Promise<Record<string, any>> {
    logger.info('[detector] Detecting site technologies...')

    const [framework, cms, isEcommerce, social, analytics] = await Promise.all([
      this.detectFramework(page),
      this.detectCMS(page),
      this.detectEcommerce(page),
      this.detectSocialMedia(page),
      this.detectAnalytics(page)
    ])

    const detection = {
      framework,
      cms,
      isEcommerce,
      social,
      analytics
    }

    logger.info('[detector] Detection complete:', detection)

    return detection
  }
}
