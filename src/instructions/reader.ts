import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { logger } from '../logger/logger.js'

export interface Instruction {
  name: string
  description: string
  steps: string[]
  selectors?: Record<string, string>
  options?: Record<string, any>
}

export class InstructionReader {
  load(filePath: string): Instruction {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Instruction file not found: ${filePath}`)
    }

    const ext = path.extname(filePath)
    const content = fs.readFileSync(filePath, 'utf8')

    if (ext === '.json') {
      return JSON.parse(content)
    } else if (ext === '.yaml' || ext === '.yml') {
      return yaml.load(content) as Instruction
    } else {
      throw new Error(`Unsupported instruction format: ${ext}`)
    }
  }

  loadAll(dir: string = './instructions'): Instruction[] {
    if (!fs.existsSync(dir)) return []

    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.json') || f.endsWith('.yaml') || f.endsWith('.yml'))

    return files.map(f => this.load(path.join(dir, f)))
  }

  save(instruction: Instruction, filePath: string): void {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const ext = path.extname(filePath)
    let content: string

    if (ext === '.json') {
      content = JSON.stringify(instruction, null, 2)
    } else if (ext === '.yaml' || ext === '.yml') {
      content = yaml.dump(instruction)
    } else {
      throw new Error(`Unsupported format: ${ext}`)
    }

    fs.writeFileSync(filePath, content)
    logger.info(`[instruction-reader] Saved instruction: ${filePath}`)
  }
}
