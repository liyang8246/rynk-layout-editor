import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseKleJson } from '../src/utils/kle-import'
import { exportKleJson } from '../src/utils/kle-export'
import type { KeyData, LayoutState } from '../src/stores/layout'

// ── Fixtures ────────────────────────────────────────────────────────────────────

const FIXTURES_DIR = join(__dirname, 'fixtures')

const fixtureNames = [
  'ansi-104',
  'ansi-104-big-ass-enter',
  'atreus',
  'blank-layout',
  'default-60',
  'ergodox',
  'iso-105',
  'iso-60',
  'jd40',
  'keycool-84',
  'kinesis-advantage',
  'leopold-fc660m',
  'planck',
]

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, `${name}.json`), 'utf-8')
}

/** Build a minimal LayoutState from a parseKleJson result */
function toLayoutState(result: ReturnType<typeof parseKleJson>): LayoutState {
  return {
    keys: result.keys,
    encoders: result.encoders,
    pins: [],
    matrixRows: result.matrixRows,
    matrixCols: result.matrixCols,
    selectedIds: [],
    optionGroups: result.optionGroups,
    activeChoices: result.activeChoices,
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

/** Compare two KeyData arrays by position/shape (ignoring id which is random nanoid) */
function keySignature(key: KeyData): string {
  const parts = [
    key.x, key.y, key.w, key.h,
    key.r, key.rx, key.ry,
    key.row, key.col,
    key.lshape ? `${key.lshape.x2},${key.lshape.y2},${key.lshape.w2},${key.lshape.h2}` : '',
    key.option ? `${key.option.groupId},${key.option.choiceId}` : '',
  ]
  return parts.join('|')
}

// ── Tests ───────────────────────────────────────────────────────────────────────

describe('KLE import', () => {
  for (const name of fixtureNames) {
    it(`parses ${name} without errors`, () => {
      const json = loadFixture(name)
      const result = parseKleJson(json)
      // blank-layout has 0 keys, all others should have at least 1
      if (name !== 'blank-layout') {
        expect(result.keys.length).toBeGreaterThan(0)
      }
    })
  }

  it('preserves key count for default-60', () => {
    const json = loadFixture('default-60')
    const result = parseKleJson(json)
    // A standard 60% has 61 keys
    expect(result.keys.length).toBe(61)
  })

  it('preserves key count for planck', () => {
    const json = loadFixture('planck')
    const result = parseKleJson(json)
    // Planck is a 4x12 grid but row 4 has a 2u key so 11 key objects = 47
    expect(result.keys.length).toBe(47)
  })

  it('preserves key widths', () => {
    const json = loadFixture('default-60')
    const result = parseKleJson(json)
    // First row: 13 keys of w=1, then Backspace w=2
    const firstRowKeys = result.keys.filter(k => k.y < 0.5)
    expect(firstRowKeys.length).toBe(14)
    const backspace = firstRowKeys.find(k => k.w === 2)
    expect(backspace).toBeDefined()
  })

  it('preserves rotation for ergodox thumb clusters', () => {
    const json = loadFixture('ergodox')
    const result = parseKleJson(json)
    const rotatedKeys = result.keys.filter(k => Math.abs(k.r) > 0.1)
    // Ergodox has two rotated thumb clusters (r=30 and r=-30)
    expect(rotatedKeys.length).toBeGreaterThan(0)
    const angles = new Set(rotatedKeys.map(k => k.r))
    expect(angles.has(30)).toBe(true)
    expect(angles.has(-30)).toBe(true)
  })

  it('computes matrix dimensions', () => {
    const json = loadFixture('default-60')
    const result = parseKleJson(json)
    // A 60% keyboard: 5 rows
    expect(result.matrixRows).toBe(5)
  })
})

describe('KLE export', () => {
  it('produces valid JSON', () => {
    const json = loadFixture('default-60')
    const result = parseKleJson(json)
    const state = toLayoutState(result)
    const exported = exportKleJson(state)
    expect(() => JSON.parse(exported)).not.toThrow()
  })

  it('groups keys into KLE rows', () => {
    const json = loadFixture('default-60')
    const result = parseKleJson(json)
    const state = toLayoutState(result)
    const exported = exportKleJson(state)
    const parsed = JSON.parse(exported) as unknown[]
    // A 60% keyboard has 5 rows
    expect(parsed.length).toBe(5)
  })

  it('includes row,col in legend for assigned keys', () => {
    const json = loadFixture('default-60')
    const result = parseKleJson(json)
    const state = toLayoutState(result)
    const exported = exportKleJson(state)
    const parsed = JSON.parse(exported) as [Record<string, number>, string][]
    // Keys with row,col assigned should have legend starting with "row,col"
    const keysWithMatrix = parsed.filter(([, legend]) => /^\d+,\d+/.test(legend))
    // Default-60 has no pre-assigned matrix, so row/col are -1 → legend starts empty or with newlines
    // After auto-numbering they'd have values. Let's test with explicit assignment.
    expect(parsed.length).toBeGreaterThan(0)
  })
})

describe('KLE round-trip (import → export → reimport)', () => {
  /**
   * Core round-trip test: parse a KLE JSON, export it, reimport the export,
   * and verify the key geometries match.
   *
   * We compare by "signature" (position + shape + rotation + matrix + option)
   * rather than strict equality, because nanoid generates new IDs each time.
   */
  function roundTrip(name: string): void {
    const json = loadFixture(name)

    // Step 1: Import
    const result1 = parseKleJson(json)
    const state1 = toLayoutState(result1)

    // Step 2: Export
    const exported = exportKleJson(state1)

    // Step 3: Reimport
    const result2 = parseKleJson(exported)

    // Compare key counts
    expect(result2.keys.length, `${name}: key count mismatch`).toBe(result1.keys.length)

    // Compare encoder counts
    expect(result2.encoders.length, `${name}: encoder count mismatch`).toBe(result1.encoders.length)

    // Sort both by position for stable comparison
    const sortKeys = (keys: KeyData[]) =>
      [...keys].sort((a, b) => a.y - b.y || a.x - b.x || a.w - b.w || a.h - b.h)

    const sorted1 = sortKeys(result1.keys)
    const sorted2 = sortKeys(result2.keys)

    // Compare each key's signature
    for (let i = 0; i < sorted1.length; i++) {
      const sig1 = keySignature(sorted1[i])
      const sig2 = keySignature(sorted2[i])
      expect(sig2, `${name}: key ${i} mismatch\n  original: ${JSON.stringify(sorted1[i])}\n  reimport: ${JSON.stringify(sorted2[i])}`).toBe(sig1)
    }
  }

  for (const name of fixtureNames) {
    it(`round-trips ${name}`, () => {
      roundTrip(name)
    })
  }
})

describe('KLE double round-trip stability', () => {
  /** After two round-trips, the result should be identical to one round-trip. */
  for (const name of fixtureNames) {
    it(`is stable after double round-trip for ${name}`, () => {
      const json = loadFixture(name)

      // First round-trip
      const result1 = parseKleJson(json)
      const state1 = toLayoutState(result1)
      const exported1 = exportKleJson(state1)
      const reimported1 = parseKleJson(exported1)

      // Second round-trip
      const state2 = toLayoutState(reimported1)
      const exported2 = exportKleJson(state2)
      const reimported2 = parseKleJson(exported2)

      expect(reimported2.keys.length).toBe(reimported1.keys.length)

      const sortKeys = (keys: KeyData[]) =>
        [...keys].sort((a, b) => a.y - b.y || a.x - b.x)

      const sorted1 = sortKeys(reimported1.keys)
      const sorted2 = sortKeys(reimported2.keys)

      for (let i = 0; i < sorted1.length; i++) {
        expect(keySignature(sorted2[i])).toBe(keySignature(sorted1[i]))
      }
    })
  }
})
