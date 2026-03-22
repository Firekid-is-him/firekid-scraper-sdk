import type { Page } from 'playwright'

export async function videoDownloaderTemplate(page: Page, url: string): Promise<any> {
  await page.goto(url)

  const videoUrl = await page.evaluate(() => {
    const video = document.querySelector('video')
    if (video) {
      return video.src || video.querySelector('source')?.src
    }

    const iframe = document.querySelector('iframe[src*="youtube"], iframe[src*="vimeo"]')
    if (iframe) {
      return iframe.getAttribute('src')
    }

    return null
  })

  const downloadButton = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('a, button'))
    
    for (const btn of buttons) {
      const text = btn.textContent?.toLowerCase() || ''
      if (text.includes('download') || text.includes('save')) {
        return {
          selector: btn.id ? `#${btn.id}` : btn.className ? `.${btn.className.split(' ')[0]}` : null,
          href: (btn as HTMLAnchorElement).href
        }
      }
    }
    
    return null
  })

  return {
    videoUrl,
    downloadButton
  }
}
