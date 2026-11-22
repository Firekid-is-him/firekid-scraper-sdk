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

    const parts = this.tokenize(line.trim())
    if (parts.length === 0) return null

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

  /*
   * Splits a command line into tokens on whitespace. A token that starts
   * with a single or double quote runs until the matching quote, so
   * selectors and text containing spaces can be passed as one argument.
   * Quotes inside a token (a[href="x"]) are kept as written.
   */
  private tokenize(line: string): string[] {
    const tokens: string[] = []
    let current = ''
    let inToken = false
    let quote: string | null = null

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]

      if (quote) {
        if (ch === '\\' && (line[i + 1] === quote || line[i + 1] === '\\')) {
          current += line[i + 1]
          i++
        } else if (ch === quote) {
          quote = null
        } else {
          current += ch
        }
        continue
      }

      if (/\s/.test(ch)) {
        if (inToken) {
          tokens.push(current)
          current = ''
          inToken = false
        }
        continue
      }

      if (!inToken && (ch === '"' || ch === "'")) {
        quote = ch
        inToken = true
        continue
      }

      current += ch
      inToken = true
    }

    if (inToken) tokens.push(current)

    return tokens
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
    const lines = content.split(/\r?\n/)
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
