export function jaroWinkler (a: string, b: string): number {
  const s1 = [...a]
  const s2 = [...b]
  const len1 = s1.length
  const len2 = s2.length

  if (len1 === 0 || len2 === 0) return 0

  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1
  const s1Matches = new Array(len1).fill(false)
  const s2Matches = new Array(len2).fill(false)

  let matches = 0
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance)
    const end = Math.min(i + matchDistance + 1, len2)
    for (let j = start; j < end; j++) {
      if (!s2Matches[j] && s1[i] === s2[j]) { // eslint-disable-line
        s1Matches[i] = s2Matches[j] = true
        matches++
        break
      }
    }
  }

  if (matches === 0) return 0

  let t = 0
  for (let i = 0, k = 0; i < len1; i++) {
    if (!s1Matches[i]) continue // eslint-disable-line
    while (!s2Matches[k]) k++ // eslint-disable-line
    if (s1[i] !== s2[k]) t++ // eslint-disable-line
    k++
  }

  const jaro = (
    matches / len1 +
    matches / len2 +
    (matches - t / 2) / matches
  ) / 3

  let prefix = 0
  const prefixLimit = 4
  for (let i = 0; i < Math.min(prefixLimit, len1, len2); i++) {
    if (s1[i] !== s2[i]) break
    prefix++
  }

  return jaro + prefix * 0.1 * (1 - jaro)
}
