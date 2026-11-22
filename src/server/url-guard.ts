import dns from 'dns/promises'
import net from 'net'
import { config } from '../config.js'

function isPrivateIPv4(address: string): boolean {
  const parts = address.split('.').map(Number)
  if (parts.length !== 4 || parts.some(p => Number.isNaN(p))) return true

  const [a, b, c] = parts

  if (a === 0 || a === 10 || a === 127) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 0 && c === 0) return true
  if (a === 192 && b === 168) return true
  if (a === 198 && (b === 18 || b === 19)) return true
  if (a >= 224) return true

  return false
}

function isPrivateIPv6(address: string): boolean {
  const normalized = address.toLowerCase()

  if (normalized === '::' || normalized === '::1') return true

  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isPrivateIPv4(mapped[1])

  const mappedHex = normalized.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
  if (mappedHex) {
    const high = parseInt(mappedHex[1], 16)
    const low = parseInt(mappedHex[2], 16)
    return isPrivateIPv4(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`)
  }

  const first = parseInt(normalized.split(':')[0] || '0', 16)

  if ((first & 0xfe00) === 0xfc00) return true
  if ((first & 0xffc0) === 0xfe80) return true
  if ((first & 0xff00) === 0xff00) return true

  return false
}

export function isPrivateAddress(address: string): boolean {
  const version = net.isIP(address)
  if (version === 4) return isPrivateIPv4(address)
  if (version === 6) return isPrivateIPv6(address)
  return true
}

export async function assertPublicUrl(rawUrl: string): Promise<void> {
  let url: URL

  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error('Invalid URL')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Protocol not allowed: ${url.protocol}`)
  }

  if (config.server.allowPrivateTargets) return

  const host = url.hostname.replace(/^\[|\]$/g, '')

  if (host === 'localhost' || host.endsWith('.localhost')) {
    throw new Error('Target resolves to a private address')
  }

  const addresses = net.isIP(host)
    ? [host]
    : (await dns.lookup(host, { all: true })).map(entry => entry.address)

  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new Error('Target resolves to a private address')
  }
}
