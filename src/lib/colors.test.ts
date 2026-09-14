import { describe, expect, test } from 'bun:test'
import { colorIdentityName } from './colors'

describe('colorIdentityName', () => {
  test('mono colors fall back to the plain color name', () => {
    expect(colorIdentityName('W')).toBe('White')
    expect(colorIdentityName('G')).toBe('Green')
  })

  test('colorless and unknown', () => {
    expect(colorIdentityName('')).toBe('Colorless')
    expect(colorIdentityName(null)).toBe('Unknown')
  })

  test('two-color guilds', () => {
    expect(colorIdentityName('W,U')).toBe('Azorius')
    expect(colorIdentityName('B,G')).toBe('Golgari')
  })

  test('three-color shards and wedges', () => {
    expect(colorIdentityName('W,U,G')).toBe('Bant')
    expect(colorIdentityName('W,B,G')).toBe('Abzan')
  })

  test('four-color "Nephilim" names', () => {
    expect(colorIdentityName('W,U,B,G')).toBe('Witch-Maw')
    expect(colorIdentityName('U,B,R,G')).toBe('Glint-Eye')
  })

  test('five-color', () => {
    expect(colorIdentityName('W,U,B,R,G')).toBe('Five-Color')
  })
})
