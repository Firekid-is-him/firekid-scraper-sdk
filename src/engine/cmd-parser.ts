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

  private indentOf(raw: string): number {
    return raw.match(/^(\s*)/)?.[1].length ?? 0
  }

  private isBlank(raw: string): boolean {
    return raw.trim().length === 0
  }

  private isComment(raw: string): boolean {
    return raw.trim().startsWith('//')
  }

  private parseBlock(lines: string[], startIndex: number, blockIndent: number): { steps: CmdStep[]; nextIndex: number } {
    const steps: CmdStep[] = []
    let i = startIndex

    while (i < lines.length) {
      const raw = lines[i]

      if (this.isBlank(raw) || this.isComment(raw)) {
        i++
        continue
      }

      const indent = this.indentOf(raw)

      // stop if this line belongs to the parent block
      if (indent < blockIndent) break

      const lineNum = i + 1
      const step = this.parseLine(raw.trim(), lineNum)
      i++

      if (!step) continue

      if (step.action === 'REPEAT' || step.action === 'IF' || step.action === 'LOOP') {
        // check if the next real line is indented further in
        let peek = i
        while (peek < lines.length && (this.isBlank(lines[peek]) || this.isComment(lines[peek]))) peek++

        if (peek < lines.length && this.indentOf(lines[peek]) > indent) {
          const childIndent = this.indentOf(lines[peek])
          const child = this.parseBlock(lines, peek, childIndent)
          step.children = child.steps
          i = child.nextIndex
        } else {
          step.children = []
        }
      }

      steps.push(step)
    }

    return { steps, nextIndex: i }
  }

  parse(content: string, filePath: string = 'unknown'): CmdFile {
    const lines = content.split('\n')
    const { steps } = this.parseBlock(lines, 0, 0)

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
