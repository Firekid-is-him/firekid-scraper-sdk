export type UAPlatform = 'Windows' | 'macOS' | 'Linux' | 'Android' | 'iOS'

export interface UAInfo {
  chromium: boolean
  brand: string
  major: string
  fullVersion: string
  platform: UAPlatform
  navigatorPlatform: string
  platformVersion: string
  mobile: boolean
}

export function describeUserAgent(userAgent: string, fullVersionHint?: string): UAInfo {
  const chrome = userAgent.match(/Chrome\/(\d+)\.(\d+)\.(\d+)\.(\d+)/)
  const edge = /Edg(?:e|A|iOS)?\//.test(userAgent)
  const opera = /OPR\//.test(userAgent)
  const chromium = Boolean(chrome) && !opera

  let platform: UAPlatform = 'Windows'
  let navigatorPlatform = 'Win32'
  let platformVersion = '15.0.0'

  if (/Android/.test(userAgent)) {
    platform = 'Android'
    navigatorPlatform = 'Linux armv81'
    platformVersion = '14.0.0'
  } else if (/iPhone|iPad|iPod/.test(userAgent)) {
    platform = 'iOS'
    navigatorPlatform = 'iPhone'
    platformVersion = '17.0.0'
  } else if (/Macintosh|Mac OS X/.test(userAgent)) {
    platform = 'macOS'
    navigatorPlatform = 'MacIntel'
    platformVersion = '14.5.0'
  } else if (/X11|Linux/.test(userAgent) && !/Windows/.test(userAgent)) {
    platform = 'Linux'
    navigatorPlatform = 'Linux x86_64'
    platformVersion = '6.5.0'
  }

  const major = chrome ? chrome[1] : ''
  const hinted = fullVersionHint && fullVersionHint.split('.')[0] === major ? fullVersionHint : ''
  const fullVersion = chrome ? (hinted || chrome.slice(1, 5).join('.')) : ''

  return {
    chromium,
    brand: edge ? 'Microsoft Edge' : 'Google Chrome',
    major,
    fullVersion,
    platform,
    navigatorPlatform,
    platformVersion,
    mobile: /Mobile|Android|iPhone/.test(userAgent)
  }
}

export function clientHintBrands(info: UAInfo): Array<{ brand: string; version: string }> {
  return [
    { brand: 'Chromium', version: info.major },
    { brand: info.brand, version: info.major },
    { brand: 'Not-A.Brand', version: '99' }
  ]
}

export function secChUa(info: UAInfo): string {
  return clientHintBrands(info).map(b => `"${b.brand}";v="${b.version}"`).join(', ')
}
