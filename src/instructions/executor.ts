import type { Page } from 'playwright'
import type { Instruction } from './reader.js'
import { logger } from '../logger/logger.js'

export class InstructionExecutor {
  private page: Page

  constructor(page: Page) {
    this.page = page
  }

  async execute(instruction: Instruction): Promise<any> {
    logger.info(`[instruction-executor] Executing: ${instruction.name}`)

    const results: any = {
      name: instruction.name,
      steps: [],
      data: {}
    }

    for (const step of instruction.steps) {
      try {
        const result = await this.executeStep(step, instruction.selectors)
        results.steps.push({ step, success: true, result })
      } catch (err: any) {
        logger.error(`[instruction-executor] Step failed: ${step}`)
        results.steps.push({ step, success: false, error: err.message })
      }
    }

    return results
  }

  private async executeStep(step: string, selectors?: Record<string, string>): Promise<any> {
    const parts = step.split(' ')
    const action = parts[0].toUpperCase()

    switch (action) {
      case 'GOTO':
        await this.page.goto(parts[1])
        break

      case 'WAIT':
        const selector = this.resolveSelector(parts[1], selectors)
        await this.page.waitForSelector(selector)
        break

      case 'CLICK':
        const clickSelector = this.resolveSelector(parts[1], selectors)
        await this.page.click(clickSelector)
        break

      case 'TYPE':
        const typeSelector = this.resolveSelector(parts[1], selectors)
        const text = parts.slice(2).join(' ')
        await this.page.fill(typeSelector, text)
        break

      case 'EXTRACT':
        const extractSelector = this.resolveSelector(parts[1], selectors)
        return await this.page.locator(extractSelector).textContent()

      default:
        logger.warn(`[instruction-executor] Unknown action: ${action}`)
    }

    return null
  }

  private resolveSelector(key: string, selectors?: Record<string, string>): string {
    if (selectors && selectors[key]) {
      return selectors[key]
    }
    return key
  }
}
