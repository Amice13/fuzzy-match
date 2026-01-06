export interface Options {
  mode: 'static' | 'dynamic'
  data?: string[]
  hashMap?: Map<number, Map<string, Uint8Array>>
  maxQueryCache: number
  ignoreCase: boolean
  ignoreSymbols: boolean
  removeDiacritics: boolean
  normalizeWhitespace: boolean
  disableNormalization: boolean
  stringLengthTolerance: number
  hashMinTolerance: number
  hashBaseTolerance: number
  hashLengthPenalty: number
  hashEntropyBoost: number
}
