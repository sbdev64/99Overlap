import { describe, expect, test } from 'bun:test'
import { scryfallQueryName } from './scryfall-enrich'

describe('scryfallQueryName', () => {
  test('strips a double-faced card down to its front face', () => {
    expect(scryfallQueryName('Lunarch Veteran // Luminous Phantom')).toBe(
      'Lunarch Veteran',
    )
    expect(scryfallQueryName('Delver of Secrets // Insectile Aberration')).toBe(
      'Delver of Secrets',
    )
  })

  test('leaves a single-faced card name untouched', () => {
    expect(scryfallQueryName('Sol Ring')).toBe('Sol Ring')
  })
})
