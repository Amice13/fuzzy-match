export function createLRUCache<K, V> (maxSize: number): {
  get: (key: K) => V | undefined
  set: (key: K, value: V) => void
  has: (key: K) => boolean
  clear: () => void
} {
  const map = new Map<K, V>()

  const get = (key: K): V | undefined => {
    const value = map.get(key)
    if (value !== undefined) {
      // refresh key by re-inserting
      map.delete(key)
      map.set(key, value)
    }
    return value
  }

  const set = (key: K, value: V): void => {
    if (map.has(key)) map.delete(key)
    else if (map.size >= maxSize) {
      // remove oldest
      const oldest = map.keys().next().value
      map.delete(oldest as K)
    }
    map.set(key, value)
  }

  const has = (key: K): boolean => map.has(key)
  const clear = (): void => map.clear()

  return { get, set, has, clear }
}
