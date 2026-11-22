import fs from 'fs'
import path from 'path'
import { logger } from '../logger/logger.js'

const PLAIN_NUMBER = /^[-+]?\d+(\.\d+)?$/

function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function columnsOf(rows: any[]): string[] {
  const columns: string[] = []
  const seen = new Set<string>()

  for (const row of rows) {
    for (const key of Object.keys(row ?? {})) {
      if (!seen.has(key)) {
        seen.add(key)
        columns.push(key)
      }
    }
  }

  return columns
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function csvCell(value: unknown): string {
  let text = stringify(value)

  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text) && !PLAIN_NUMBER.test(text)) {
    text = `'${text}`
  }

  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function markdownCell(value: unknown): string {
  return stringify(value)
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br>')
}

export class DataExporter {
  async toJSON(data: any, filePath: string): Promise<void> {
    ensureDir(filePath)

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    logger.info(`[exporter] Exported to JSON: ${filePath}`)
  }

  async toCSV(data: any[], filePath: string): Promise<void> {
    if (data.length === 0) {
      logger.warn('[exporter] No data to export to CSV')
      return
    }

    ensureDir(filePath)

    const headers = columnsOf(data)
    const rows = data.map(item => headers.map(header => csvCell(item?.[header])).join(','))
    const csv = [headers.map(csvCell).join(','), ...rows].join('\n')

    fs.writeFileSync(filePath, csv)
    logger.info(`[exporter] Exported to CSV: ${filePath}`)
  }

  async toTXT(data: any, filePath: string): Promise<void> {
    ensureDir(filePath)

    const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2)

    fs.writeFileSync(filePath, text)
    logger.info(`[exporter] Exported to TXT: ${filePath}`)
  }

  /*
   * The scraped data is escaped before it is written. A custom template may
   * contain {{data}}, which is replaced with the escaped JSON.
   */
  async toHTML(data: any, filePath: string, template?: string): Promise<void> {
    ensureDir(filePath)

    const body = escapeHtml(JSON.stringify(data, null, 2))

    const html = template
      ? template.split('{{data}}').join(body)
      : `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Scraped Data</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    pre { background: #f4f4f4; padding: 10px; border-radius: 5px; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>Scraped Data</h1>
  <pre>${body}</pre>
</body>
</html>
`

    fs.writeFileSync(filePath, html)
    logger.info(`[exporter] Exported to HTML: ${filePath}`)
  }

  async toMarkdown(data: any[], filePath: string): Promise<void> {
    if (data.length === 0) {
      logger.warn('[exporter] No data to export to Markdown')
      return
    }

    ensureDir(filePath)

    const headers = columnsOf(data)
    const headerRow = `| ${headers.map(markdownCell).join(' | ')} |`
    const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`
    const dataRows = data.map(item => `| ${headers.map(h => markdownCell(item?.[h])).join(' | ')} |`)

    const markdown = [headerRow, separatorRow, ...dataRows].join('\n')

    fs.writeFileSync(filePath, markdown)
    logger.info(`[exporter] Exported to Markdown: ${filePath}`)
  }

  async appendToFile(data: any, filePath: string): Promise<void> {
    ensureDir(filePath)

    const line = typeof data === 'string' ? data : JSON.stringify(data)
    fs.appendFileSync(filePath, line + '\n')
  }
}
