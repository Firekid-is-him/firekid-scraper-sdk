import type { BrowserContext } from 'playwright'
import { getSeedForSite, getNewSeed } from './seed.js'
import { applyCanvasSpoof } from './canvas.js'
import { applyWebGLSpoof } from './webgl.js'
import { applyAudioSpoof } from './audio.js'
import { applyFontSpoof } from './fonts.js'
import { applyNavigatorSpoof } from './navigator.js'
import { validateConsistency } from './consistency.js'
import { HumanBehavior } from './behavior.js'
import { logger } from '../logger/logger.js'
import type { GhostOptions } from '../types.js'

export async function applyGhost(
  context: BrowserContext,
  options: GhostOptions = {}
): Promise<HumanBehavior> {
  const seed = options.fresh || !options.siteHost
    ? getNewSeed()
    : getSeedForSite(options.siteHost)

  validateConsistency(seed)

  logger.info(`[ghost] Applying identity seed: ${seed.id.slice(0, 8)}... | Chrome ${seed.chromeVersion} | ${seed.screenWidth}x${seed.screenHeight}`)

  await applyCanvasSpoof(context, seed)
  await applyWebGLSpoof(context, seed)
  await applyAudioSpoof(context, seed)
  await applyFontSpoof(context, seed)
  await applyNavigatorSpoof(context, seed)

  await context.setExtraHTTPHeaders({
    'Accept-Language': `${seed.language},en;q=0.9`,
    'sec-ch-ua': `"Chromium";v="${seed.chromeVersion.split('.')[0]}", "Google Chrome";v="${seed.chromeVersion.split('.')[0]}", "Not-A.Brand";v="99"`,
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
  })

  logger.info('[ghost] All fingerprint spoofs applied')

  return new HumanBehavior(seed)
}

export { getSeedForSite, getNewSeed } from './seed.js'
export { HumanBehavior } from './behavior.js'
