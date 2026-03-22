import { chromium, type Browser, type Page } from 'playwright'
import type { RecordedAction, SelectorSet, DetectedPatterns } from '../types.js'
import { SelectorGenerator } from './selector-generator.js'
import { PatternDetector } from './pattern-detector.js'
import { CmdGenerator } from './cmd-generator.js'
import { logger } from '../logger/logger.js'
import fs from 'fs'
import path from 'path'

export class ActionRecorder {
  private browser: Browser | null = null
  private page: Page | null = null
  private actions: RecordedAction[] = []
  private isRecording: boolean = false
  private selectorGen: SelectorGenerator
  private patternDetector: PatternDetector
  private cmdGenerator: CmdGenerator
  private startUrl: string = ''

  constructor() {
    this.selectorGen = new SelectorGenerator()
    this.patternDetector = new PatternDetector()
    this.cmdGenerator = new CmdGenerator()
  }

  async startRecording(url: string): Promise<void> {
    this.startUrl = url
    this.actions = []
    this.isRecording = true

    logger.info('[recorder] Starting recording session...')
    console.log('\n===========================================')
    console.log('  RECORDING MODE ACTIVATED')
    console.log(`  URL: ${url}`)
    console.log('  Perform your actions in the browser...')
    console.log('  Close the browser when done')
    console.log('===========================================\n')

    this.browser = await chromium.launch({ headless: false })
    const context = await this.browser.newContext()
    this.page = await context.newPage()

    await this.attachListeners(this.page)
    await this.page.goto(url)

    await this.page.waitForEvent('close')
    await this.stopRecording()
  }

  private async attachListeners(page: Page): Promise<void> {
    await page.exposeFunction('__recordClick', async (x: number, y: number) => {
      if (!this.isRecording) return
      
      const element = await page.evaluate((coords) => {
        const el = document.elementFromPoint(coords.x, coords.y)
        if (!el) return null
        
        return {
          tagName: el.tagName.toLowerCase(),
          id: el.id,
          className: el.className,
          textContent: el.textContent?.slice(0, 50),
          href: (el as any).href,
          type: (el as any).type
        }
      }, { x, y })

      if (element) {
        const selectors = await this.selectorGen.generate(page, element)
        
        this.actions.push({
          type: 'click',
          selectors,
          timestamp: Date.now(),
          element
        })

        logger.info(`[recorder] Recorded CLICK on ${selectors.primary}`)
      }
    })

    await page.exposeFunction('__recordType', async (selector: string, value: string) => {
      if (!this.isRecording) return

      const element = await page.evaluate((sel) => {
        const el = document.querySelector(sel)
        if (!el) return null
        
        return {
          tagName: el.tagName.toLowerCase(),
          id: el.id,
          type: (el as any).type,
          placeholder: (el as any).placeholder
        }
      }, selector)

      if (element) {
        const selectors = await this.selectorGen.generate(page, element)
        
        this.actions.push({
          type: 'type',
          selectors,
          value,
          timestamp: Date.now(),
          element,
          fieldType: element.type
        })

        logger.info(`[recorder] Recorded TYPE in ${selectors.primary}: "${value.slice(0, 20)}..."`)
      }
    })

    await page.addInitScript(() => {
      document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        if (target) {
          (window as any).__recordClick(e.clientX, e.clientY)
        }
      })

      document.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement
        if (target && target.tagName === 'INPUT') {
          setTimeout(() => {
            (window as any).__recordType(target.id || target.name, target.value)
          }, 500)
        }
      })
    })
  }

  async stopRecording(): Promise<void> {
    this.isRecording = false

    logger.info(`[recorder] Recording stopped - ${this.actions.length} actions captured`)

    const patterns = this.patternDetector.analyze(this.actions)
    const cmdFile = this.cmdGenerator.generate(this.startUrl, this.actions, patterns)

    const outputDir = './commands'
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const filename = `recorded-${Date.now()}.cmd`
    const filepath = path.join(outputDir, filename)
    
    fs.writeFileSync(filepath, cmdFile)

    console.log('\n===========================================')
    console.log('  RECORDING COMPLETE')
    console.log(`  Saved to: ${filepath}`)
    console.log(`  Actions: ${this.actions.length}`)
    console.log('===========================================\n')

    if (this.browser) {
      await this.browser.close()
    }
  }

  getActions(): RecordedAction[] {
    return this.actions
  }
}
