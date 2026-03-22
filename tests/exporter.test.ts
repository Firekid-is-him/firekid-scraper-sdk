import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DataExporter } from '../src/output/exporter.js'
import fs from 'fs'

describe('DataExporter', () => {
  const exporter = new DataExporter()
  const testFile = './test-output.json'

  afterEach(() => {
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile)
    }
  })

  it('should export to JSON', async () => {
    const data = { test: 'data', count: 42 }
    
    await exporter.toJSON(data, testFile)

    expect(fs.existsSync(testFile)).toBe(true)
    
    const content = JSON.parse(fs.readFileSync(testFile, 'utf8'))
    expect(content).toEqual(data)
  })

  it('should export array to CSV', async () => {
    const data = [
      { name: 'Item 1', price: 10 },
      { name: 'Item 2', price: 20 }
    ]

    const csvFile = './test-output.csv'
    await exporter.toCSV(data, csvFile)

    expect(fs.existsSync(csvFile)).toBe(true)
    
    const content = fs.readFileSync(csvFile, 'utf8')
    expect(content).toContain('name,price')
    expect(content).toContain('Item 1,10')

    if (fs.existsSync(csvFile)) {
      fs.unlinkSync(csvFile)
    }
  })
})
