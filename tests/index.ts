import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import createSearchInstance from '../src/index.ts'

// Sample Ukrainian region names
const regions = [
  'Київська',
  'Львівська',
  'Одеська',
  'Харківська',
  'Дніпропетровська',
  'Запорізька',
  'Вінницька',
  'Івано-Франківська'
]

describe('Fuzzy match - Ukrainian regions', () => {
  const searchInstance = createSearchInstance({
    mode: 'static',
    data: regions,
    maxQueryCache: 50,
    ignoreCase: false,
    ignoreSymbols: false,
    removeDiacritics: true,
    normalizeWhitespace: true,
    disableNormalization: false,
    stringLengthTolerance: 0.2,
    hashMinTolerance: 20,
    hashBaseTolerance: 50,
    hashLengthPenalty: 1,
    hashEntropyBoost: 5
  })
  const { search } = searchInstance

  it('should find exact matches', () => {
    for (const region of regions) {
      const result = search(region)
      assert(result !== null, `Expected match for "${region}"`)
      assert(result.includes(region), `Result should include "${region}"`)
    }
  })

  it('should find approximate matches', () => {
    const typoTests: [string, string][] = [
      ['Київсъка', 'Київська'],
      ['Львівскa', 'Львівська'],
      ['Одеьска', 'Одеська'],
      ['Харківcька', 'Харківська'],
      ['Днiпропетровська', 'Дніпропетровська']
    ]

    for (const [input, expected] of typoTests) {
      const result = search(input)
      assert(result !== null, `Expected match for "${input}"`)
      assert(result.includes(expected), `Expected "${expected}" for input "${input}"`)
    }
  })

  it('should return null for non-existent regions', () => {
    const result = search('Неіснуюча область')
    assert(result === null, 'Expected null for non-existent region')
  })

  it('should handle small arrays passed to search', () => {
    const result = search('Київська', ['Київська', 'Львівська'])
    assert(result !== null, 'Expected result')
    assert(result.includes('Київська'), 'Expected to find Київська')
  })
})
