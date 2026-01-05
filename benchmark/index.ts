import { performance } from 'perf_hooks'
import { generateStrings, getLookupData } from './generator.ts'

const data = generateStrings(10000, 8, 20)
const queries = getLookupData(data, 1000)

if (!global.gc) throw new Error('Run node with --expose-gc')

global.gc()
const heapBaseline = process.memoryUsage().heapUsed

const tInit0 = performance.now()
const { default: createSearchInstance } = await import('../lib/bundle.js')
const { search } = createSearchInstance({ mode: 'static', data })
const tInit1 = performance.now()

global.gc()
const heapAfterInit = process.memoryUsage().heapUsed
const initTimeMs = tInit1 - tInit0

const heapBeforeBench = heapAfterInit
let peakHeap = heapBeforeBench
let truePositives = 0

const tBench0 = performance.now()
for (let i = 0; i < queries.length; i++) {
  const result = search(queries[i].target)
  const foundTarget = result?.[0]
  if (queries[i].source === foundTarget) truePositives++

  if ((i & 255) === 0) {
    const currentHeap = process.memoryUsage().heapUsed
    if (currentHeap > peakHeap) peakHeap = currentHeap
  }
}
const tBench1 = performance.now()
const benchTimeMs = tBench1 - tBench0

const tGC0 = performance.now()
global.gc()
const tGC1 = performance.now()
const heapAfterGC = process.memoryUsage().heapUsed
const gcTimeMs = tGC1 - tGC0

console.table({
  initTimeMs: initTimeMs.toFixed(2),
  benchTimeMs: benchTimeMs.toFixed(2),
  peakHeapMB: ((peakHeap - heapBeforeBench) / 1024 / 1024).toFixed(2),
  retainedHeapMB: ((heapAfterGC - heapBeforeBench) / 1024 / 1024).toFixed(2),
  truePositives,
  gcTimeMs: gcTimeMs.toFixed(2),
  baselineHeapMB: (heapBaseline / 1024 / 1024).toFixed(2),
  libraryHeapMB: ((heapAfterInit - heapBaseline) / 1024 / 1024).toFixed(2)
})
