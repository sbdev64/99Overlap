import { describe, expect, test } from 'bun:test'
import { powerBracketLabel } from './power-bracket'

describe('powerBracketLabel', () => {
  test('formats a known bracket with its name', () => {
    expect(powerBracketLabel(3)).toBe('Bracket 3 · Upgraded')
    expect(powerBracketLabel(5)).toBe('Bracket 5 · cEDH')
  })

  test('null bracket returns null', () => {
    expect(powerBracketLabel(null)).toBe(null)
  })
})
