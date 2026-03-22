import { describe, it, expect, afterAll } from 'vitest'
import { PatternCache } from '../src/intelligence/pattern-cache.js'
import fs from 'fs'

describe('PatternCache', () => {
  const cache = new PatternCache()

  afterAll(() => {
    cache.close()
    if (fs.existsSync('./data/patterns.db')) {
      fs.unlinkSync('./data/patterns.db')
    }
  })

  it('should save and load patterns', () => {
    const pattern = {
      type: 'product',
      selectors: { title: 'h1', price: '.price' },
      flow: ['goto', 'extract'],
      successRate: 0.9
    }

    cache.save('example.com', pattern)

    const loaded = cache.load('example.com')

    expect(loaded).toBeTruthy()
    expect(loaded?.type).toBe('product')
    expect(loaded?.successRate).toBe(0.9)
  })

  it('should update success rate', () => {
    const pattern = {
      type: 'test',
      selectors: {},
      flow: [],
      successRate: 0.5
    }

    cache.save('test.com', pattern)
    cache.updateSuccessRate('test.com', true)

    const updated = cache.load('test.com')
    expect(updated?.successRate).toBeGreaterThan(0.5)
  })
})
