import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import type http from 'http'
import type { AddressInfo } from 'net'

process.env.API_KEY = 'test-key'
process.env.RATE_LIMIT_ENABLED = 'false'

const commandDir = fs.mkdtempSync(path.join(os.tmpdir(), 'firekid-cmds-'))
process.env.API_COMMAND_DIR = commandDir

const { createApp } = await import('../src/server/app.js')
const { assertPublicUrl, isPrivateAddress } = await import('../src/server/url-guard.js')

describe('url guard', () => {
  it('flags private and loopback addresses', () => {
    for (const ip of ['127.0.0.1', '10.0.0.5', '172.16.4.1', '192.168.1.1', '169.254.169.254', '::1', 'fd00::1', '::ffff:127.0.0.1', '::ffff:7f00:1']) {
      expect(isPrivateAddress(ip)).toBe(true)
    }
  })

  it('allows public addresses', () => {
    expect(isPrivateAddress('93.184.216.34')).toBe(false)
    expect(isPrivateAddress('2606:2800:220:1:248:1893:25c8:1946')).toBe(false)
  })

  it('rejects non-http protocols, localhost and metadata targets', async () => {
    await expect(assertPublicUrl('file:///etc/passwd')).rejects.toThrow('Protocol not allowed')
    await expect(assertPublicUrl('http://localhost:3000')).rejects.toThrow('private')
    await expect(assertPublicUrl('http://169.254.169.254/latest/meta-data')).rejects.toThrow('private')
    await expect(assertPublicUrl('http://[::1]/')).rejects.toThrow('private')
    await expect(assertPublicUrl('not a url')).rejects.toThrow('Invalid URL')
  })
})

describe('api server', () => {
  let server: http.Server
  let base: string

  beforeAll(async () => {
    server = createApp().listen(0, '127.0.0.1')
    await new Promise(resolve => server.once('listening', resolve))
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterAll(() => {
    server.close()
    fs.rmSync(commandDir, { recursive: true, force: true })
  })

  const post = (route: string, body: unknown, key: string | null = 'test-key') =>
    fetch(`${base}${route}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(key ? { 'x-api-key': key } : {}) },
      body: JSON.stringify(body)
    })

  it('serves health without a key', async () => {
    expect((await fetch(`${base}/health`)).status).toBe(200)
  })

  it('rejects missing and wrong keys', async () => {
    expect((await post('/scrape', { url: 'https://example.com' }, null)).status).toBe(401)
    expect((await post('/scrape', { url: 'https://example.com' }, 'nope')).status).toBe(401)
  })

  it('rejects private targets before launching a browser', async () => {
    const res = await post('/scrape', { url: 'http://169.254.169.254/latest' })

    expect(res.status).toBe(400)
  })

  it('validates mode and selectors', async () => {
    expect((await post('/scrape', { url: 'https://example.com', mode: 'bad' })).status).toBe(400)
    expect((await post('/scrape', { url: 'https://example.com', mode: 'extract', selectors: [] })).status).toBe(400)
  })

  it('refuses command files outside the commands directory', async () => {
    const outside = path.join(os.tmpdir(), 'outside.cmd')
    fs.writeFileSync(outside, 'WAIT 1')

    const traversal = await post('/command', { filePath: '../outside.cmd' })
    const absolute = await post('/command', { filePath: outside })

    expect([400, 404]).toContain(traversal.status)
    expect([400, 404]).toContain(absolute.status)

    fs.rmSync(outside, { force: true })
  })

  it('refuses non-cmd files', async () => {
    fs.writeFileSync(path.join(commandDir, 'notes.txt'), 'x')

    expect((await post('/command', { filePath: 'notes.txt' })).status).toBe(400)
  })

  it('refuses symlinks that escape the commands directory', async () => {
    const target = path.join(os.tmpdir(), 'escape-target.cmd')
    fs.writeFileSync(target, 'WAIT 1')
    fs.symlinkSync(target, path.join(commandDir, 'link.cmd'))

    const res = await post('/command', { filePath: 'link.cmd' })

    expect(res.status).toBe(400)
    fs.rmSync(target, { force: true })
  })
})
