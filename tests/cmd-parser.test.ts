import { describe, it, expect } from 'vitest'
import { CommandParser } from '../src/engine/cmd-parser.js'

describe('CommandParser', () => {
  it('should parse simple commands', () => {
    const parser = new CommandParser()
    const content = `
GOTO https://example.com
WAIT .content
CLICK button
    `.trim()

    const result = parser.parse(content)

    expect(result.steps).toHaveLength(3)
    expect(result.steps[0].action).toBe('GOTO')
    expect(result.steps[0].args[0]).toBe('https://example.com')
  })

  it('should parse nested commands', () => {
    const parser = new CommandParser()
    const content = `
REPEAT .item
  CLICK .button
  EXTRACT .title text
    `.trim()

    const result = parser.parse(content)

    expect(result.steps).toHaveLength(1)
    expect(result.steps[0].action).toBe('REPEAT')
    expect(result.steps[0].children).toHaveLength(2)
  })

  it('should ignore comments', () => {
    const parser = new CommandParser()
    const content = `
// This is a comment
GOTO https://example.com
// Another comment
CLICK button
    `.trim()

    const result = parser.parse(content)

    expect(result.steps).toHaveLength(2)
  })

  it('should keep quoted arguments together', () => {
    const parser = new CommandParser()
    const result = parser.parse('CLICK ".product-list .item"\nTYPE input[name=q] "hello world"')

    expect(result.steps[0].args).toEqual(['.product-list .item'])
    expect(result.steps[1].args).toEqual(['input[name=q]', 'hello world'])
  })

  it('should keep quotes that appear inside a token', () => {
    const parser = new CommandParser()
    const result = parser.parse('CLICK a[href="/next"]')

    expect(result.steps[0].args).toEqual(['a[href="/next"]'])
  })

  it('should parse files with CRLF line endings', () => {
    const parser = new CommandParser()
    const result = parser.parse('GOTO https://example.com\r\nWAIT 500\r\n')

    expect(result.steps).toHaveLength(2)
    expect(result.steps[1].args).toEqual(['500'])
  })

  it('should leave runtime variables for the executor', () => {
    const parser = new CommandParser()
    const result = parser.parse('GOTO {{next}}')

    expect(result.steps[0].args).toEqual(['{{next}}'])
  })
})
