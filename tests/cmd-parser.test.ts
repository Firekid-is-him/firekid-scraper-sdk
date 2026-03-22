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
    expect(result.steps[0].args.join(' ')).toContain('example.com')
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
})
