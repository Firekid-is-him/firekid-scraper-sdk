import type { BrowserContext } from 'playwright'
import { getSeedForSite, getNewSeed, buildUserAgent } from './seed.js'
import { applyCanvasSpoof } from './canvas.js'
import { applyWebGLSpoof } from './webgl.js'
import { applyAudioSpoof } from './audio.js'
import { applyFontSpoof } from './fonts.js'
import { applyNavigatorSpoof } from './navigator.js'
import { validateConsistency } from './consistency.js'
import { describeUserAgent, secChUa } from './identity.js'
import { HumanBehavior } from './behavior.js'
import { logger } from '../logger/logger.js'
import type { GhostOptions } from '../types.js'

export async function applyGhost(
  context: BrowserContext,
  options: GhostOptions = {}
): Promise<HumanBehavior> {
  const seed = options.seed
    ?? (options.fresh || !options.siteHost
      ? getNewSeed()
      : getSeedForSite(options.siteHost))

  validateConsistency(seed)

  const userAgent = options.userAgent ?? buildUserAgent(seed)
  const info = describeUserAgent(userAgent, seed.chromeVersion)

  logger.info(`[ghost] Applying identity seed: ${seed.id.slice(0, 8)}... | ${info.platform} Chrome ${info.major || 'n/a'} | ${seed.screenWidth}x${seed.screenHeight}`)

  await applyCanvasSpoof(context, seed)
  if (info.platform === 'Windows') await applyWebGLSpoof(context, seed)
  await applyAudioSpoof(context, seed)
  await applyFontSpoof(context, seed)
  await applyNavigatorSpoof(context, seed, info)

  const headers: Record<string, string> = {
    'Accept-Language': seed.language === 'en' ? 'en' : `${seed.language},en;q=0.9`
  }

  if (info.chromium) {
    headers['sec-ch-ua'] = secChUa(info)
    headers['sec-ch-ua-mobile'] = info.mobile ? '?1' : '?0'
    headers['sec-ch-ua-platform'] = `"${info.platform}"`
  }

  await context.setExtraHTTPHeaders(headers)

  logger.info('[ghost] All fingerprint spoofs applied')

  return new HumanBehavior(seed)
}

export { getSeedForSite, getNewSeed, buildUserAgent, buildViewport } from './seed.js'
export { HumanBehavior } from './behavior.js'
