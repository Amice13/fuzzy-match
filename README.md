# Quick Fuzzy

A **high‑performance fuzzy string matching library** written in TypeScript.

> **This is NOT a search library.**  
> It performs **approximate string matching**, not indexing, ranking, or full‑text search.

Designed for:
- deduplication
- typo‑tolerant matching
- fuzzy equality checks
- names, regions, addresses
- constrained candidate comparison

---

### Core Benefits

- **Sub‑linear candidate evaluation** via length‑based bucketing
- **Nilsimsa hashing** for fast similarity pruning
- **Jaro‑Winkler** scoring for final precision
- **LRU caching** of query hashes
- **Unicode‑safe** (Cyrillic, Ukrainian, diacritics)
- **Pluggable normalization** pipeline
- **Zero runtime dependencies**
- **Deterministic results** (no randomness at match time)
- **Low memory retention** (GC‑friendly)

This makes the library especially suitable for:

- humanitarian registries
- address / region normalization
- beneficiary deduplication
- data quality pipelines
- offline or embedded environments

---

## How It Works (High Level)

1. **Normalization** (optional)
2. **Length bucketing** to reduce candidate space
3. **Nilsimsa hash comparison** to prune unlikely matches
4. **Adaptive tolerance** based on entropy and string length
5. **Jaro‑Winkler scoring** for final selection

This hybrid approach combines **speed** and **accuracy** without maintaining a global index.

---

## Installation

```bash
npm install @amice13/quick-fuzzy
```

---

## Basic Usage

```ts
import createSearchInstance from 'quick-fuzzy'

const matcher = createSearchInstance({
  mode: 'static',
  ignoreCase: true,
  removeDiacritics: true,
  normalizeWhitespace: true,
  maxQueryCache: 1000,
  data: [
    'Київська область',
    'Львівська область',
    'Харківська область'
  ]
})

matcher.search('Київска область')
// ['Київська область']

matcher.search('Неіснуюча область')
// null

const dynamicMatcher = createSearchInstance()
dynamicMatcher.search('тринадцять', ['Мені', 'тринадцятий', 'минало', 'Я', 'пас', 'ягнята', 'за', 'селом'])
// ['тринадцятий']

```

---

## Static vs Dynamic Mode

- **static** — hashes are computed once, no new strings added
- **dynamic** — hashes are computed lazily and cached

```ts
createSearchInstance({ mode: 'static' })
```

Static mode is recommended for **fixed datasets** and maximum predictability.

---

## Other options

| Option                  | Type                                                | Description                            | Lower Bound | Upper Bound | Recommended  | Notes                             |
| ----------------------- | --------------------------------------------------- | -------------------------------------- | ----------- | ----------- | ------------ | --------------------------------- |
| `mode`                  | `'static' \| 'dynamic'`                             | Hash materialization strategy          | —           | —           | `static`     | `static` = fastest & stable heap  |
| `data`                  | `string[] \| undefined`                             | Initial dataset                        | —           | —           | —            | Ignored if `hashMap` is provided  |
| `hashMap`               | `Map<number, Map<string, Uint8Array>> \| undefined` | Precomputed length-bucketed hash index | —           | —           | —            | Enables zero-cost initialization  |
| `maxQueryCache`         | `number`                                            | LRU size for query hash cache          | `0`         | `50_000`    | `500–10_000` | Each entry stores a 32-byte hash  |
| `ignoreCase`            | `boolean`                                           | Lowercase normalization                | —           | —           | `true`       | Improves recall                   |
| `ignoreSymbols`         | `boolean`                                           | Strip punctuation                      | —           | —           | `true`       | Useful for names & regions        |
| `removeDiacritics`      | `boolean`                                           | Accent removal                         | —           | —           | `true`       | Critical for Ukrainian text       |
| `normalizeWhitespace`   | `boolean`                                           | Collapse whitespace                    | —           | —           | `true`       | Prevents formatting mismatches    |
| `disableNormalization`  | `boolean`                                           | Disable all normalization              | —           | —           | `false`      | Overrides all normalization flags |
| `stringLengthTolerance` | `number`                                            | Length-based pruning ratio             | `0.05`      | `0.6`       | `0.15–0.30`  | Lower = faster                    |
| `hashMinTolerance`      | `number`                                            | Minimum allowed hash delta             | `0`         | `16`        | `3–6`        | Guards weak matches               |
| `hashBaseTolerance`     | `number`                                            | Base hash similarity threshold         | `5`         | `32`        | `12–20`      | Main precision/recall control     |
| `hashLengthPenalty`     | `number`                                            | Length penalty factor                  | `0`         | `3`         | `0.5–1.5`    | Penalizes long strings            |
| `hashEntropyBoost`      | `number`                                            | Low-entropy similarity boost           | `0`         | `12`        | `2–6`        | Helps repetitive/short strings    |


## Hot start

You can use `getCache` function to get the fully materialized internal cache and configuration of the search instance.

This function exposes the effective Options object, including the generated hash index (hashMap), allowing you to:

* reuse a precomputed index
* persist it between runs
* create multiple instances without re-hashing
* perform apples-to-apples benchmarks
* warm-start production services

```ts
import createSearchInstance from 'quick-fuzzy'

const matcher = createSearchInstance({
  mode: 'static',
  ignoreCase: true,
  removeDiacritics: true,
  normalizeWhitespace: true,
  maxQueryCache: 1000,
  data: [
    'Київська область',
    'Львівська область',
    'Харківська область'
  ]
})

const savedOptions = matcher.getCache()
const anotherInstance = createSearchInstance(savedOptions)
```

---

## Benchmark

### Scenario

- **Dataset:** 10,000 randomly generated strings
- **Queries:** 1,000 fuzzy queries
- **Environment:** Node.js (single thread)

Check `./benchmark folder`

### Environment

* Date: 2026-01
* OS Name: Ubuntu-22.04
* Processor: 12th Gen Intel(R) Core(TM) i7-12700H, 2300 Mhz, 14 Core(s), 20 Logical Processor(s)
* Installed RAM: 32.0 GB
* System type 64-bit operating system, x64-based processor
* Node: v24.1.0

### Results

```
┌────────────────┬───────────┐
│ (index)        │ Values    │
├────────────────┼───────────┤
│ initTimeMs     │ '41.77'   │
│ benchTimeMs    │ '7127.10' │
│ peakHeapMB     │ '15.49'   │
│ retainedHeapMB │ '0.12'    │
│ truePositives  │ 941       │
│ gcTimeMs       │ '1.98'    │
│ baselineHeapMB │ '9.69'    │
│ libraryHeapMB  │ '0.43'    │
└────────────────┴───────────┘
```

#### Interpretation

- **High recall** (94.1% true positives)
- **Minimal retained memory**
- **Predictable GC behavior**
- **No index build overhead**

---

## Code style

The code is written with [JavaScript Standard Style](https://standardjs.com/).

## License

MIT
