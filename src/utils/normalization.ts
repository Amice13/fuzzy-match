import { type Options } from '../types/options.ts'

export const createNormalizer = (currentOptions: Options): (s: string) => string => {
  const diacriticsRE = currentOptions.removeDiacritics ? /\p{Diacritic}/gu : null
  const symbolsRE = currentOptions.ignoreSymbols ? /[^\p{L}\p{N}\s]+/gu : null
  const whitespaceRE = currentOptions.normalizeWhitespace ? /\s+/g : null
  return (s: string): string => {
    let out = s.normalize('NFKD')
    if (currentOptions.ignoreCase) out = out.toLowerCase()
    if (diacriticsRE !== null) out = out.replace(diacriticsRE, '')
    if (symbolsRE !== null) out = out.replace(symbolsRE, '')
    if (whitespaceRE !== null) out = out.replace(whitespaceRE, ' ')
    return out.trim()
  }
}
