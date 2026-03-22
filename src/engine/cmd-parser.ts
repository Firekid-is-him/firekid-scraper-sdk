import fs from 'fs'
import path from 'path'
import { logger } from '../logger/logger.js'
import type { CmdAction, CmdStep, CmdFile } from '../types.js'

export class CommandParser {
  private variables: Record<string, string> = {}

  setVariable(key: string, value: string) {
    this.variables[key] = value
  }

  private resolve(text: string): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return this.variables[key] ?? `{{${key}}}`
    })
  }

  private parseLine(line: string, lineNum: number): CmdStep | null {
    // Only remove full-line comments (lines that start with //)
    if (line.trim().startsWith('//')) return null
    
    const parts = line.trim().split(/\s+/)
    const action = parts[0].toUpperCase() as CmdAction
    const args = parts.slice(1).map(a => this.resolve(a))

    const validActions: CmdAction[] = [
      'GOTO', 'BACK', 'FORWARD', 'REFRESH',
      'CLICK', 'TYPE', 'PRESS', 'SELECT', 'CHECK', 'UPLOAD',
      'WAIT', 'WAITLOAD', 'SCROLL', 'SCROLLDOWN',
      'SCAN', 'EXTRACT', 'SCREENSHOT',
      'PAGINATE', 'INFINITESCROLL',
      'FETCH', 'DOWNLOAD', 'REFERER',
      'BYPASS_CLOUDFLARE',
      'REPEAT', 'IF', 'LOOP'
    ]

    if (!validActions.includes(action)) {
      logger.warn(`Unknown action "${action}" at line ${lineNum} - skipping`)
      return null
    }

    return { action, args, line: lineNum }
  }

  parse(content: string, filePath: string = 'unknown'): CmdFile {
    const lines = content.split('\n')
    const steps: CmdStep[] = []
    let i = 0

    while (i < lines.length) {
      const raw = lines[i]
      const lineNum = i + 1
      const trimmed = raw.replace(/\/\/.*$/, '').trimEnd()

      if (!trimmed.trim()) { 
        i++
        continue 
      }

      const indent = raw.match(/^(\s*)/)?.[1].length ?? 0

      if (indent === 0) {
        const step = this.parseLine(trimmed, lineNum)
        if (step) {
          if (step.action === 'REPEAT' || step.action === 'IF' || step.action === 'LOOP') {
            step.children = []
            i++
            while (i < lines.length) {
              const childRaw = lines[i]
              const childIndent = childRaw.match(/^(\s*)/)?.[1].length ?? 0
              if (childIndent === 0) break
              const childStep = this.parseLine(childRaw.trim(), i + 1)
              if (childStep) step.children.push(childStep)
              i++
            }
          } else {
            i++
          }
          steps.push(step)
        } else {
          i++
        }
      } else {
        i++
      }
    }

    const site = path.basename(filePath, '.cmd')
    logger.info(`Parsed ${steps.length} steps from ${filePath}`)

    return { site, steps, raw: content }
  }

  load(filePath: string): CmdFile {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`)
    }
    const content = fs.readFileSync(filePath, 'utf8')
    return this.parse(content, filePath)
  }

  findAll(dir: string = './commands'): string[] {
    if (!fs.existsSync(dir)) return []
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.cmd'))
      .map(f => path.join(dir, f))
  }
}

export type { CmdFile, CmdStep, CmdAction } from '../types.js'
