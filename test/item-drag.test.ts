import type { KeyData } from '../src/types'
import { nanoid } from 'nanoid'
import { beforeEach, describe, expect, it } from 'vitest'
import { deselectAll, endItemDrag, hasRotationCenter, moveSelected, pushHistory, selectItem, setState, startItemDrag, state, undo, updateItemDrag } from '../src/stores/layout'
import { snap } from '../src/utils/math'

// ── Test helpers ───────────────────────────────────────────────────────────────

function makeKey(overrides: Partial<KeyData> = {}): KeyData {
  return {
    id: nanoid(),
    x: 0,
    y: 0,
    w: 1,
    h: 1,
    r: 0,
    rx: 0,
    ry: 0,
    row: -1,
    col: -1,
    option: undefined,
    ...overrides,
  }
}

/** Reset the store to a clean state with the given keys. */
function resetStore(keys: KeyData[]): void {
  setState({
    keys,
    encoders: [],
    pins: [],
    matrixRows: 5,
    matrixCols: 15,
    selectedIds: [],
    optionGroups: [],
    activeChoices: {},
  })
}

function getKey(id: string): KeyData | undefined {
  return state.keys.find(k => k.id === id)
}

// ── Tests ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  resetStore([])
})

describe('hasRotationCenter', () => {
  it('returns false when r=rx=ry=0', () => {
    expect(hasRotationCenter(makeKey({ r: 0, rx: 0, ry: 0 }))).toBe(false)
  })

  it('returns true when r≠0', () => {
    expect(hasRotationCenter(makeKey({ r: 5, rx: 0, ry: 0 }))).toBe(true)
  })

  it('returns true when rx≠0 (even if r=0)', () => {
    expect(hasRotationCenter(makeKey({ r: 0, rx: 3, ry: 0 }))).toBe(true)
  })

  it('returns true when ry≠0 (even if r=0)', () => {
    expect(hasRotationCenter(makeKey({ r: 0, rx: 0, ry: 3 }))).toBe(true)
  })
})

describe('updateItemDrag — rotation center', () => {
  it('moves rx/ry by the drag delta for a key with a custom rotation center', () => {
    const key = makeKey({ x: 2, y: 3, r: 10, rx: 5, ry: 4 })
    resetStore([key])
    selectItem(key.id, false)

    startItemDrag()
    updateItemDrag(1, 2)

    const k = getKey(key.id)!
    expect(k.x).toBe(3)
    expect(k.y).toBe(5)
    expect(k.rx).toBe(6) // 5 + 1
    expect(k.ry).toBe(6) // 4 + 2
    expect(k.r).toBe(10) // unchanged
  })

  it('does NOT move rx/ry for a default-origin key (r=rx=ry=0)', () => {
    const key = makeKey({ x: 2, y: 3, r: 0, rx: 0, ry: 0 })
    resetStore([key])
    selectItem(key.id, false)

    startItemDrag()
    updateItemDrag(1, 2)

    const k = getKey(key.id)!
    expect(k.x).toBe(3)
    expect(k.y).toBe(5)
    expect(k.rx).toBe(0) // unchanged
    expect(k.ry).toBe(0) // unchanged
  })

  it('moves rx/ry when r=0 but rx/ry are nonzero', () => {
    const key = makeKey({ x: 2, y: 3, r: 0, rx: 5, ry: 4 })
    resetStore([key])
    selectItem(key.id, false)

    startItemDrag()
    updateItemDrag(1, 2)

    const k = getKey(key.id)!
    expect(k.rx).toBe(6)
    expect(k.ry).toBe(6)
  })

  it('drives rx/ry by the clamped (actual) delta, not the raw delta, at the left edge', () => {
    // Key starts at x=1, rx=5. Drag left by 10 → x clamps to 0, actualDx = -1
    const key = makeKey({ x: 1, y: 0, r: 10, rx: 5, ry: 0 })
    resetStore([key])
    selectItem(key.id, false)

    startItemDrag()
    updateItemDrag(-10, 0)

    const k = getKey(key.id)!
    expect(k.x).toBe(0)
    expect(k.rx).toBe(4) // 5 + (-1) = 4, NOT 5 + (-10) = -5
    expect(k.ry).toBe(0)
  })

  it('preserves the relative pivot (rx-x, ry-y) when no clamping occurs', () => {
    const key = makeKey({ x: 2, y: 3, r: 10, rx: 5, ry: 7 })
    resetStore([key])
    selectItem(key.id, false)
    const relBeforeX = key.rx - key.x
    const relBeforeY = key.ry - key.y

    startItemDrag()
    updateItemDrag(3, -1)
    endItemDrag()

    const k = getKey(key.id)!
    expect(k.rx - k.x).toBe(relBeforeX)
    expect(k.ry - k.y).toBe(relBeforeY)
  })

  it('continues carrying rx after it transiently passes through 0 mid-drag', () => {
    // r=0, rx=5: first frame dx=-5 brings rx to 0, second frame dx=-10
    // must keep moving rx (to -5), not freeze at 0.
    const key = makeKey({ x: 10, y: 0, r: 0, rx: 5, ry: 0 })
    resetStore([key])
    selectItem(key.id, false)

    startItemDrag()
    updateItemDrag(-5, 0) // rx → 0
    updateItemDrag(-10, 0) // must carry further: rx → -5

    const k = getKey(key.id)!
    expect(k.rx).toBe(-5)
    expect(k.ry).toBe(0)
  })
})

describe('endItemDrag — snap rotation center', () => {
  it('snaps rx/ry to 0.25 grid for keys with a custom rotation center', () => {
    const key = makeKey({ x: 2, y: 3, r: 10, rx: 5, ry: 4 })
    resetStore([key])
    selectItem(key.id, false)

    startItemDrag()
    // Drag by a non-snapped amount
    updateItemDrag(0.1, 0.15)
    endItemDrag()

    const k = getKey(key.id)!
    expect(k.x).toBe(snap(2.1))
    expect(k.y).toBe(snap(3.15))
    expect(k.rx).toBe(snap(5.1))
    expect(k.ry).toBe(snap(4.15))
  })

  it('does not touch rx/ry on snap for default-origin keys', () => {
    const key = makeKey({ x: 2, y: 3, r: 0, rx: 0, ry: 0 })
    resetStore([key])
    selectItem(key.id, false)

    startItemDrag()
    updateItemDrag(0.1, 0.15)
    endItemDrag()

    const k = getKey(key.id)!
    expect(k.rx).toBe(0)
    expect(k.ry).toBe(0)
  })
})

describe('moveSelected (keyboard) — rotation center', () => {
  it('moves rx/ry for a key with a custom rotation center', () => {
    const key = makeKey({ x: 2, y: 3, r: 10, rx: 5, ry: 4 })
    resetStore([key])
    selectItem(key.id, false)

    moveSelected(1, 2)

    const k = getKey(key.id)!
    expect(k.x).toBe(3)
    expect(k.y).toBe(5)
    expect(k.rx).toBe(6)
    expect(k.ry).toBe(6)
  })

  it('does NOT move rx/ry for a default-origin key', () => {
    const key = makeKey({ x: 2, y: 3, r: 0, rx: 0, ry: 0 })
    resetStore([key])
    selectItem(key.id, false)

    moveSelected(1, 2)

    const k = getKey(key.id)!
    expect(k.x).toBe(3)
    expect(k.y).toBe(5)
    expect(k.rx).toBe(0)
    expect(k.ry).toBe(0)
  })

  it('snaps rx/ry after keyboard move', () => {
    const key = makeKey({ x: 2, y: 3, r: 10, rx: 5, ry: 4 })
    resetStore([key])
    selectItem(key.id, false)

    moveSelected(0.1, 0.15)

    const k = getKey(key.id)!
    expect(k.rx).toBe(snap(5.1))
    expect(k.ry).toBe(snap(4.15))
  })
})

describe('undo restores rotation center after drag', () => {
  it('one undo() restores pre-drag x/y/r/rx/ry', () => {
    const key = makeKey({ x: 2, y: 3, r: 10, rx: 5, ry: 4 })
    resetStore([key])
    selectItem(key.id, false)
    // Establish a clean baseline history point (resetStore doesn't push history)
    pushHistory()

    // startItemDrag pushes history; drag; end snaps
    startItemDrag()
    updateItemDrag(1.5, 2.5)
    endItemDrag()

    // One undo should roll back to the pre-drag snapshot
    undo()

    const k = getKey(key.id)!
    expect(k.x).toBe(2)
    expect(k.y).toBe(3)
    expect(k.r).toBe(10)
    expect(k.rx).toBe(5)
    expect(k.ry).toBe(4)
  })
})

describe('deselectAll clears selection', () => {
  it('clears selection without mutating keys', () => {
    const key = makeKey({ x: 1, y: 1, r: 5, rx: 2, ry: 2 })
    resetStore([key])
    selectItem(key.id, false)
    expect(state.selectedIds).toEqual([key.id])

    deselectAll()
    expect(state.selectedIds).toEqual([])
    // Key data unchanged
    expect(getKey(key.id)).toEqual(key)
  })
})
