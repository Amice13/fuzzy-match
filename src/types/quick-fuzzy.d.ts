import type { Options } from "./options.ts"

interface Instance {
  search: (string: string, arr?: string[]) => string[] | null
  getCache: () => Options
  setData: (arr: string[]) => void
}

declare module 'quick-fuzzy' {
  export default function createSearchInstance<T>(
    options?: Options
  ): Instance
}
