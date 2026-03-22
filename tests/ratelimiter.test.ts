import { describe, it, expect } from 'vitest'
import { RateLimiter } from '../src/engine/ratelimiter.js'

describe('RateLimiter', () => {
  it('should allow requests within limit', async () => {
    const limiter = new RateLimiter(5, 1000)

    for (let i = 0; i < 5; i++) {
      const allowed = await limiter.checkLimit()
      expect(allowed).toBe(true)
    }

    const exceeded = await limiter.checkLimit()
    expect(exceeded).toBe(false)
  })

  it('should track usage correctly', async () => {
    const limiter = new RateLimiter(10, 1000)

    await limiter.checkLimit()
    await limiter.checkLimit()
    await limiter.checkLimit()

    const usage = limiter.getUsage()
    expect(usage).toBe(3)

    const remaining = limiter.getRemainingQuota()
    expect(remaining).toBe(7)
  })

  it('should reset limits', async () => {
    const limiter = new RateLimiter(5, 1000)

    for (let i = 0; i < 5; i++) {
      await limiter.checkLimit()
    }

    limiter.reset()

    const allowed = await limiter.checkLimit()
    expect(allowed).toBe(true)
  })
})
