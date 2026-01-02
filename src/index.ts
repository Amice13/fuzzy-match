import { type Options } from './types/options.ts'
import { createNilsimsa, compareRaw } from './utils/nilsimsa.ts'
import { jaroWinkler } from './utils/jaro-winkler.ts'

// Default options
const options: Options = {
  ignoreCase: false,
  ignoreSymbols: false,
  removeDiacritics: true,
  normalizeWhitespace: true,
  sort: false,
  stringLengthTolerance: 0.2,
  hashMinTolerance: 4,
  hashBaseTolerance: 16,
  hashLengthPenalty: 2,
  hashEntropyBoost: 4
}

export const setOptions = (customOptions: Partial<Options>): void => {
  const {
    hashBaseTolerance,
    hashLengthPenalty,
    hashEntropyBoost,
    hashMinTolerance,
    stringLengthTolerance
  } = customOptions
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
  Object.assign(options, customOptions)
  normalize = createNormalizer(options)
}

function createNormalizer(currentOptions: Options = options): (s: string) => string {
  const diacriticsRE = currentOptions.removeDiacritics ? /\p{Diacritic}/gu : null
  const symbolsRE = currentOptions.ignoreSymbols ? /[^\p{L}\p{N}\s]+/gu : null
  const whitespaceRE = currentOptions.normalizeWhitespace ? /\s+/g : null
  return (s: string): string => {
    let out = s.normalize('NFKD')
    if (currentOptions.ignoreCase) out = out.toLowerCase()
    if (diacriticsRE) out = out.replace(diacriticsRE, '')
    if (symbolsRE) out = out.replace(symbolsRE, '')
    if (whitespaceRE) out = out.replace(whitespaceRE, ' ')
    return out.trim()
  }
}

let normalize = createNormalizer(options)

const queryHashCache = new Map<string, Uint8Array>()
export const setData = (arr: string[]): void => {
  for (const string of arr) getQueryHash(string)
}

const getQueryHash = (str: string): Uint8Array => {
  let hash = queryHashCache.get(str)
  if (!hash) {
    hash = createNilsimsa(normalize(str)).digestRaw()
    queryHashCache.set(str, hash)
  }
  return hash
}

// Search functions
const getSimilarByHash = (str: string, candidates: string[]): string[] => {
  let bestScore = -Infinity
  const best: string[] = []
  const sourceHash = getQueryHash(str)
  const uniqueRatio = new Set(str).size / str.length
  const candidateTolerance = Math.max(3, Math.floor(str.length * options.stringLengthTolerance))
  
  const candidateHashes = candidates
    .filter(key => Math.abs(str.length - key.length) <= candidateTolerance)
    .map(key => [key, getQueryHash(key)] as const)

  const scoreTolerance = Math.max(options.hashMinTolerance, Math.round(options.hashBaseTolerance - Math.log2(str.length + 1) * options.hashLengthPenalty + (1 - uniqueRatio) * options.hashEntropyBoost))

  for (const [key, targetHash] of candidateHashes) {
    const score = compareRaw(sourceHash, targetHash)
    if (score > bestScore + scoreTolerance) {
      bestScore = score
      best.length = 0
      best.push(key)
      continue
    }
    if (Math.abs(score - bestScore) <= scoreTolerance) best.push(key)
  }
  return best
}

const getSimilarString = (str: string, candidates: string[]): { match: string[], score: number } => {
  let bestScore = -Infinity
  const bestCandidates: string[] = []
  for (const candidate of candidates) {
    const score = jaroWinkler(candidate, str)
    if (score >= 0.98) return { match: [candidate], score }
    if (score > bestScore) {
      bestScore = score
      bestCandidates.length = 0
      bestCandidates.push(candidate)
    } else if (score === bestScore) {
      bestCandidates.push(candidate)
    }
  }
  return { match: bestCandidates, score: bestScore }
}

export const getSimilar = (str: string, arr?: string[]): string[] | null => {
  if (arr?.includes(str)) return [str]
  if (!arr) arr = [...queryHashCache.keys()]

  let candidates = arr
  if (str.length > 3) {
    candidates = getSimilarByHash(str, arr)
    if (candidates.length === 1) return candidates
  }
  const { match, score } = getSimilarString(str, candidates)
  const minScore = str.length <= 4 ? 0.9 : str.length <= 8 ? 0.85 : 0.8
  if (score < minScore) return null
  return match
}

export default getSimilar
