import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import http from 'http'
import type { AddressInfo } from 'net'

describe('API server error handling', () => {
  const KEY = 'test-key-'.padEnd(40, 'x')
  let server: http.Server
  let base: string

  beforeAll(async () => {
    process.env.API_KEY = KEY
    process.env.RATE_LIMIT_ENABLED = 'false'

    const { createApp } = await import('../src/server/app.js')
    server = await new Promise<http.Server>(resolve => {
      const instance = createApp().listen(0, '127.0.0.1', () => resolve(instance))
    })
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterAll(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()))
  })

  const post = (route: string, body: string, key: string | null = KEY) =>
    fetch(`${base}${route}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(key ? { 'x-api-key': key } : {}) },
      body
    })

  it('answers invalid JSON with a JSON 400 and no stack trace', async () => {
    const res = await post('/scrape', '{bad json')
    const text = await res.text()

    expect(res.status).toBe(400)
    expect(res.headers.get('content-type')).toContain('application/json')
    expect(JSON.parse(text)).toEqual({ error: 'Request body must be valid JSON' })
    expect(text).not.toMatch(/node_modules|\.js:\d+|at /)
  })

  it('answers an oversized body with a JSON 413', async () => {
    const res = await post('/scrape', JSON.stringify({ url: 'http://x/', pad: 'a'.repeat(200_000) }))
    const text = await res.text()

    expect(res.status).toBe(413)
    expect(JSON.parse(text)).toEqual({ error: 'Request body too large' })
  })

  it('answers unknown routes with a JSON 404', async () => {
    const res = await fetch(`${base}/nope`, { headers: { 'x-api-key': KEY } })

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Not found' })
  })

  it('still rejects a missing key before parsing the body', async () => {
    const res = await post('/scrape', '{bad json', null)
    expect(res.status).toBe(401)
  })

  it('keeps the health endpoint open', async () => {
    const res = await fetch(`${base}/health`)
    expect(res.status).toBe(200)
  })
})
