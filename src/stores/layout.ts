import { nanoid } from 'nanoid'
import { onCleanup } from 'solid-js'
import { createStore, produce } from 'solid-js/store'

// ── Types ──────────────────────────────────────────────────────────────────────

/** L-shape secondary rectangle (KLE convention: offsets from primary top-left) */
export interface LShape {
  x2: number
  y2: number
  w2: number
  h2: number
}

/** A single key cap on the layout canvas */
export interface KeyData {
  id: string
  x: number // center X in key units (Rynk convention)
  y: number // center Y in key units (Rynk convention)
  w: number // width in key units (default 1)
  h: number // height in key units (default 1)
  r: number // rotation degrees about center
  lshape?: LShape // omit for non-L keys
  row: number // matrix row (-1 = unassigned)
  col: number // matrix col (-1 = unassigned)
}

/** An encoder knob on the layout canvas */
export interface EncoderData {
  id: string
  encoderIndex: number // user-visible encoder index (0, 1, 2...)
  x: number // center X in key units
  y: number // center Y in key units
}

/** Complete layout state */
export interface LayoutState {
  keys: KeyData[]
  encoders: EncoderData[]
  matrixRows: number
  matrixCols: number
  selectedIds: string[]
}

// ── Constants ──────────────────────────────────────────────────────────────────

/** Size of one key unit in pixels */
export const KEY_UNIT = 60

/** Arrow key step sizes */
export const STEP_FINE = 0.25
export const STEP_COARSE = 1

// ── Store ──────────────────────────────────────────────────────────────────────

const [state, setState] = createStore<LayoutState>({
  keys: [],
  encoders: [],
  matrixRows: 5,
  matrixCols: 15,
  selectedIds: [],
})

export { setState, state }

// ── Derived signals ────────────────────────────────────────────────────────────

/** The single selected key (if exactly one key is selected and it's a key, not encoder) */
export function selectedKey(): KeyData | undefined {
  if (state.selectedIds.length !== 1) return undefined
  return state.keys.find(k => k.id === state.selectedIds[0])
}

/** The single selected encoder */
export function selectedEncoder(): EncoderData | undefined {
  if (state.selectedIds.length !== 1) return undefined
  return state.encoders.find(e => e.id === state.selectedIds[0])
}

/** Whether any items are selected */
export function hasSelection(): boolean {
  return state.selectedIds.length > 0
}

// ── Actions ────────────────────────────────────────────────────────────────────

/** Add a new key at the given grid position */
export function addKey(cx: number, cy: number): string {
  const id = nanoid()
  setState('keys', prev => [...prev, {
    id,
    x: cx,
    y: cy,
    w: 1,
    h: 1,
    r: 0,
    row: -1,
    col: -1,
  }])
  return id
}

/** Add a new encoder at the given position */
export function addEncoder(cx: number, cy: number): string {
  const id = nanoid()
  const nextIndex = state.encoders.length === 0
    ? 0
    : Math.max(...state.encoders.map(e => e.encoderIndex)) + 1
  setState('encoders', prev => [...prev, {
    id,
    encoderIndex: nextIndex,
    x: cx,
    y: cy,
  }])
  return id
}

/** Delete all selected items */
export function deleteSelected(): void {
  const ids = new Set(state.selectedIds)
  setState('keys', prev => prev.filter(k => !ids.has(k.id)))
  setState('encoders', prev => prev.filter(e => !ids.has(e.id)))
  setState('selectedIds', [])
}

/** Select an item (replacing current selection unless additive) */
export function selectItem(id: string, additive: boolean): void {
  if (additive) {
    setState('selectedIds', prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  } else {
    setState('selectedIds', [id])
  }
}

/** Clear selection */
export function deselectAll(): void {
  setState('selectedIds', [])
}

/** Move selected items by delta */
export function moveSelected(dx: number, dy: number): void {
  const ids = new Set(state.selectedIds)
  setState('keys', produce((keys) => {
    for (const key of keys) {
      if (ids.has(key.id)) {
        key.x = snap(key.x + dx)
        key.y = snap(key.y + dy)
      }
    }
  }))
  setState('encoders', produce((encoders) => {
    for (const enc of encoders) {
      if (ids.has(enc.id)) {
        enc.x = snap(enc.x + dx)
        enc.y = snap(enc.y + dy)
      }
    }
  }))
}

/** Update a key's property */
export function updateKey(id: string, updates: Partial<Omit<KeyData, 'id'>>): void {
  const idx = state.keys.findIndex(k => k.id === id)
  if (idx === -1) return
  setState('keys', idx, updates as any)
}

/** Update an L-shape sub-field on a key */
export function updateKeyLshape(id: string, field: keyof LShape, value: number): void {
  const idx = state.keys.findIndex(k => k.id === id)
  if (idx === -1) return
  setState('keys', idx, 'lshape', field, value as any)
}

/** Update an encoder's property */
export function updateEncoder(id: string, updates: Partial<Omit<EncoderData, 'id'>>): void {
  const idx = state.encoders.findIndex(e => e.id === id)
  if (idx === -1) return
  setState('encoders', idx, updates as any)
}

/** Set matrix dimensions */
export function setMatrixSize(rows: number, cols: number): void {
  setState('matrixRows', rows)
  setState('matrixCols', cols)
}

/** Auto-assign matrix positions based on spatial layout */
export function autoNumberMatrix(): void {
  // Sort keys by y then x (reading order)
  const sorted = [...state.keys]
    .sort((a, b) => a.y - b.y || a.x - b.x)

  // Group into rows by y proximity (within 0.5u)
  const rows: KeyData[][] = []
  for (const key of sorted) {
    const existingRow = rows.find(row =>
      Math.abs(row[0].y - key.y) < 0.5,
    )
    if (existingRow)
      existingRow.push(key)

    else
      rows.push([key])
  }

  // Sort each row by x, then assign row/col in a single produce block
  const sortedRows = rows.map(row => [...row].sort((a, b) => a.x - b.x))

  setState('keys', produce((keys) => {
    for (let r = 0; r < sortedRows.length; r++) {
      for (let c = 0; c < sortedRows[r].length; c++) {
        const keyId = sortedRows[r][c].id
        const key = keys.find(k => k.id === keyId)
        if (key) {
          key.row = r
          key.col = c
        }
      }
    }
  }))

  // Update matrix size
  const maxCol = Math.max(...sortedRows.map(r => r.length))
  setMatrixSize(sortedRows.length, maxCol)
}

/** Toggle L-shape on a key */
export function toggleLShape(id: string): void {
  const key = state.keys.find(k => k.id === id)
  if (!key) return
  if (key.lshape) updateKey(id, { lshape: undefined })
  else updateKey(id, { lshape: { x2: 0, y2: 0, w2: key.w, h2: key.h } })
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function snap(value: number): number {
  return Math.round(value * 4) / 4 // snap to 0.25
}

// ── Keyboard shortcut hook ─────────────────────────────────────────────────────

export function useKeyboardShortcuts(): void {
  // Called once in App.tsx onMount — onCleanup removes the listener
  if (typeof window === 'undefined') return

  const handler = (e: KeyboardEvent) => {
    // Don't intercept when typing in an input
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return

    const step = e.shiftKey ? STEP_COARSE : STEP_FINE

    switch (e.key) {
      case 'ArrowLeft':
        if (hasSelection()) { e.preventDefault(); moveSelected(-step, 0) }
        break
      case 'ArrowRight':
        if (hasSelection()) { e.preventDefault(); moveSelected(step, 0) }
        break
      case 'ArrowUp':
        if (hasSelection()) { e.preventDefault(); moveSelected(0, -step) }
        break
      case 'ArrowDown':
        if (hasSelection()) { e.preventDefault(); moveSelected(0, step) }
        break
      case 'Delete':
      case 'Backspace':
        if (hasSelection()) { e.preventDefault(); deleteSelected() }
        break
      case 'Escape':
        deselectAll()
        break
    }
  }

  window.addEventListener('keydown', handler)
  onCleanup(() => window.removeEventListener('keydown', handler))
}

// ── Pixel ↔ key unit conversion ────────────────────────────────────────────────

export function pxToUnit(px: number): number {
  return px / KEY_UNIT
}

export function unitToPx(units: number): number {
  return units * KEY_UNIT
}
