import { type Options } from './types/options.ts'
import { setOptions } from './utils/options.ts'
import { createNormalizer } from './utils/normalization.ts'
import { createNilsimsa, compareRaw } from './utils/nilsimsa.ts'
import { jaroWinkler } from './utils/jaro-winkler.ts'
import { createLRUCache } from './utils/lru-cache.ts'

// Length based buckets
const BUCKET_SIZE = 4

function bucketOf (len: number): number {
  return Math.floor(len / BUCKET_SIZE)
}

interface Instance {
  search: (string: string, arr?: string[]) => string[] | null
  getCache: () => Options
  setData: (arr: string[]) => void
}

const createSearchInstance = (initialOptions: Partial<Options>): Instance => {
  const options: Options = setOptions(initialOptions ?? {})
  const normalize = options.disableNormalization ? null : createNormalizer(options)
  const queryHashCache = createLRUCache<string, Uint8Array>(options.maxQueryCache)
  const dataHashCache = options.hashMap ?? new Map<number, Map<string, Uint8Array>>()

  const setData = (arr: string[]): void => {
    for (const string of arr) {
      const bucket = bucketOf(string.length)
      const value = normalize !== null ? normalize(string) : string
      const hash = createNilsimsa(value).digestRaw()
      let map = dataHashCache.get(bucket)
      if (map === undefined) {
        map = new Map()
        dataHashCache.set(bucket, map)
      }
      map.set(string, hash)
    }
  }
  if (options.data !== undefined) setData(options.data)

  const getData = (string: string): Uint8Array | null => {
    const bucket = bucketOf(string.length)
    let map = dataHashCache.get(bucket)
    if (map === undefined) {
      map = new Map()
      dataHashCache.set(bucket, map)
    }
    let hash = map.get(string)
    if (hash === undefined) {
      if (options.mode === 'static') return null
      const value = normalize !== null ? normalize(string) : string
      hash = createNilsimsa(value).digestRaw()
      map.set(string, hash)
    }
    return hash
  }

  function * collectCandidatesByLength (
    queryLength: number,
    toleranceRatio: number
  ): IterableIterator<[string, Uint8Array]> {
    const tolerance = Math.max(3, Math.floor(queryLength * toleranceRatio))
    const minBucket = bucketOf(Math.max(0, queryLength - tolerance))
    const maxBucket = bucketOf(queryLength + tolerance)
    for (let b = minBucket; b <= maxBucket; b++) {
      const map = dataHashCache.get(b)
      if (map === undefined) continue
      for (const entry of map) yield entry
    }
  }

  const getQueryHash = (string: string): Uint8Array => {
    let hash = queryHashCache.get(string)
    if (hash === undefined) {
      const value = normalize !== null ? normalize(string) : string
      hash = createNilsimsa(value).digestRaw()
      queryHashCache.set(string, hash)
    }
    return hash
  }

  const getCache = (): Options => {
    options.hashMap = dataHashCache
    return options
  }

  const getSimilarByHash = (string: string, candidates?: string[]): string[] => {
    let bestScore = -Infinity
    const best: string[] = []
    const normalized = normalize !== null ? normalize(string) : string
    const sourceHash = getQueryHash(normalized)
    const uniqueRatio = new Set(normalized).size / normalized.length
    const entropyBase = normalize !== null ? normalize(string) : string
    const candidateTolerance = Math.max(3, Math.floor(string.length * options.stringLengthTolerance))

    let candidateHashes: Iterable<[string, Uint8Array | null]>

    if (candidates === undefined) {
      candidateHashes = collectCandidatesByLength(
        string.length,
        options.stringLengthTolerance
      )
    } else {
      candidateHashes = candidates
        .filter(key => Math.abs(string.length - key.length) <= candidateTolerance)
        .map(key => [key, getData(key)] as const)
    }

    const scoreTolerance = Math.max(options.hashMinTolerance, Math.round(options.hashBaseTolerance - Math.log2(entropyBase.length + 1) * options.hashLengthPenalty + (1 - uniqueRatio) * options.hashEntropyBoost))

    for (const [key, targetHash] of candidateHashes) {
      if (targetHash === null) continue
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

  const search = (string: string, arr?: string[]): string[] | null => {
    if (typeof string !== 'string') throw Error('Source is not a string')
    if (arr?.includes(string) === true) return [string]
    const bucket = bucketOf(string.length)
    if (arr === undefined && dataHashCache.get(bucket)?.has(string) === true) return [string]
    let candidates = arr ?? []
    if (string.length > 3) {
      candidates = getSimilarByHash(string, arr)
      if (candidates.length === 1) return candidates
    }

    const { match, score } = getSimilarString(string, candidates)
    const minScore = string.length <= 4 ? 0.9 : string.length <= 8 ? 0.85 : 0.8
    if (score < minScore) return null

    return match
  }

  return {
    search,
    getCache,
    setData
  }
}

export default createSearchInstance
