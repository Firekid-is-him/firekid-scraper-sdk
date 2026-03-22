import type { Page } from 'playwright'

export async function socialMediaTemplate(page: Page): Promise<any> {
  return await page.evaluate(() => {
    const posts = document.querySelectorAll('[role="article"], [class*="post"], [class*="tweet"]')
    const results: any[] = []

    for (const post of Array.from(posts).slice(0, 20)) {
      const text = post.querySelector('[class*="text"], [class*="content"]')?.textContent?.trim()
      const author = post.querySelector('[class*="author"], [class*="username"]')?.textContent?.trim()
      const timestamp = post.querySelector('time')?.getAttribute('datetime')
      const likes = post.querySelector('[class*="like"], [class*="favorite"]')?.textContent?.trim()
      const image = post.querySelector('img')?.getAttribute('src')

      if (text || author) {
        results.push({
          text,
          author,
          timestamp,
          likes,
          image
        })
      }
    }

    return results
  })
}
