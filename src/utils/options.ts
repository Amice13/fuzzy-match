import { type Options } from '../types/options.ts'

// Default options
const defaultOptions: Options = {
  mode: 'dynamic',
  maxQueryCache: 10_000,
  ignoreCase: false,
  ignoreSymbols: false,
  removeDiacritics: true,
  normalizeWhitespace: true,
  disableNormalization: false,
  stringLengthTolerance: 0.2,
  hashMinTolerance: 4,
  hashBaseTolerance: 16,
  hashLengthPenalty: 2,
  hashEntropyBoost: 4
}

export const setOptions = (customOptions: Partial<Options>): Options => {
  const {
    mode,
    data,
    hashMap,
    maxQueryCache,
    hashBaseTolerance,
    hashLengthPenalty,
    hashEntropyBoost,
    hashMinTolerance,
    stringLengthTolerance
  } = customOptions
  if (mode === 'static') {
    if (data === undefined && hashMap === undefined) {
      throw new Error('For static search you must define the initial data or hashMap')
    }
  }
  if (maxQueryCache !== undefined && (!Number.isFinite(maxQueryCache) || maxQueryCache < 0)) {
    throw new Error('Max query cache must be a non-negative number')
  }
  if (hashBaseTolerance !== undefined && (!Number.isFinite(hashBaseTolerance) || hashBaseTolerance < 0)) {
    throw new Error('Base tolerance must be a non-negative number')
  }
  if (hashLengthPenalty !== undefined && (!Number.isFinite(hashLengthPenalty) || hashLengthPenalty < 0)) {
    throw new Error('Length penalty must be a number and  can\'t be less than 0')
  }
  if (hashEntropyBoost !== undefined && (!Number.isFinite(hashEntropyBoost) || hashEntropyBoost < 0)) {
    throw new Error('Entropy boost can\'t be less than 0')
  }
  if (hashMinTolerance !== undefined && (!Number.isFinite(hashMinTolerance) || hashMinTolerance < 0)) {
    throw new Error('Hash tolerance can\'t be less than 0')
  }
  if (stringLengthTolerance !== undefined && (!Number.isFinite(stringLengthTolerance) || stringLengthTolerance < 0)) {
    throw new Error('String length can\'t be less than 0')
  }
  if (stringLengthTolerance !== undefined && (!Number.isFinite(stringLengthTolerance) || stringLengthTolerance > 1)) {
    throw new Error('String length can\'t be greater than 1')
  }
  return Object.assign({}, defaultOptions, customOptions)
}
