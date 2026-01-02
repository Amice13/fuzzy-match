// nilsimsa.ts
import { toHex, fromHex } from './bytes.ts'

interface Nilsimsa {
  digest: (encoding?: 'hex' | 'bytes') => string | Uint8Array
  digestRaw: () => Uint8Array
}

// Deterministic translation table
const TRAN: Uint8Array = (() => {
  const table = new Uint8Array(256)
  for (let i = 0; i < 256; i++) table[i] = i
  let seed = 0x12345678
  const rand = (): number => {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    return (seed >>> 0) & 0xff
  }
  for (let i = 255; i > 0; i--) {
    const j = rand() % (i + 1)
    ;[table[i], table[j]] = [table[j], table[i]]
  }
  return table
})()

// Precomputed population count table
export const POPC: Uint8Array = (() => {
  const popc = new Uint8Array(256)
  for (let i = 0; i < 256; i++) {
    let n = i
    let count = 0
    while (n !== 0) {
      count++
      n &= n - 1
    }
    popc[i] = count
  }
  return popc
})()

// Buffers reused per call
const CODE_BUFFER = new Uint8Array(32)
const ACC_BUFFER = new Uint32Array(256)

export function createNilsimsa(data: string): Nilsimsa {
  const buffer = new TextEncoder().encode(data)
  ACC_BUFFER.fill(0)

  let lastch0 = -1, lastch1 = -1, lastch2 = -1, lastch3 = -1
  const count = buffer.length

  const tran3 = (a: number, b: number, c: number, n: number): number =>
    (TRAN[(a + n) & 255] ^ TRAN[b] * (n + n + 1) ^ TRAN[c ^ TRAN[n]]) & 255

  for (let i = 0; i < count; i++) {
    const ch = buffer[i]
    if (lastch1 > -1) ACC_BUFFER[tran3(ch, lastch0, lastch1, 0)]++
    if (lastch2 > -1) {
      ACC_BUFFER[tran3(ch, lastch0, lastch2, 1)]++
      ACC_BUFFER[tran3(ch, lastch1, lastch2, 2)]++
    }
    if (lastch3 > -1) {
      ACC_BUFFER[tran3(ch, lastch0, lastch3, 3)]++
      ACC_BUFFER[tran3(ch, lastch1, lastch3, 4)]++
      ACC_BUFFER[tran3(ch, lastch2, lastch3, 5)]++
      ACC_BUFFER[tran3(lastch3, lastch0, ch, 6)]++
      ACC_BUFFER[tran3(lastch3, lastch2, ch, 7)]++
    }
    lastch3 = lastch2
    lastch2 = lastch1
    lastch1 = lastch0
    lastch0 = ch
  }

  const computeDigest = (): Uint8Array => {
    CODE_BUFFER.fill(0)
    if (count < 3) return CODE_BUFFER
    const total = count === 3 ? 1 : count === 4 ? 4 : 8 * count - 28
    const threshold = total / 256
    for (let i = 0; i < 256; i++) {
      if (ACC_BUFFER[i] > threshold) CODE_BUFFER[i >> 3] |= 1 << (i & 7)
    }
    return CODE_BUFFER
  }

  const digestRaw = (): Uint8Array => computeDigest()
  const digest = (encoding: 'hex' | 'bytes' = 'hex'): string | Uint8Array => {
    const bytes = computeDigest()
    return encoding === 'hex' ? toHex(bytes) : bytes
  }

  return { digest, digestRaw }
}

export function compareRaw(buf1: Uint8Array, buf2: Uint8Array): number {
  if (buf1.length !== 32 || buf2.length !== 32) throw new RangeError('Invalid Nilsimsa buffers')
  let diff = 0
  for (let i = 0; i < 32; i++) diff += POPC[buf1[i] ^ buf2[i]]
  return 128 - diff
}

export function compare(hash1: string, hash2: string): number {
  return compareRaw(fromHex(hash1), fromHex(hash2))
}
