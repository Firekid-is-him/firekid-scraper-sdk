export default {
  name: 'smart-wait',
  type: 'action',
  version: '1.0.0',
  
  async execute(context) {
    const { page, selector, timeout = 10000 } = context

    try {
      await page.waitForSelector(selector, { timeout })
      return { success: true, found: true }
    } catch {
      const alternatives = [
        selector.replace(/\./g, ''),
        selector.replace(/#/g, ''),
        selector.split(' ')[0]
      ]

      for (const alt of alternatives) {
        try {
          await page.waitForSelector(alt, { timeout: 2000 })
          return { success: true, found: true, usedAlternative: alt }
        } catch {
          continue
        }
      }

      return { success: false, found: false }
    }
  }
}
