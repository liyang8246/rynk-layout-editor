import { nanoid } from 'nanoid'
import { createSignal, onCleanup } from 'solid-js'
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

// ── Item drag state ────────────────────────────────────────────────────────────

/** Tracks an active item-drag (moving selected keys/encoders with the mouse) */
interface ItemDragState {
  /** Snapshot of selected items' positions at drag start (in key units) */
  origins: Map<string, { x: number, y: number }>
  /** Last applied dx/dy in key units (unsapped, for live preview) */
  lastDx: number
  lastDy: number
}

let itemDragState: ItemDragState | null = null

const [isDragging, setIsDragging] = createSignal(false)
export { isDragging }

/** Start dragging all currently selected items. Call on pointerdown on a selected item. */
export function startItemDrag(): void {
  const origins = new Map<string, { x: number, y: number }>()
  const ids = new Set(state.selectedIds)
  for (const key of state.keys) {
    if (ids.has(key.id)) origins.set(key.id, { x: key.x, y: key.y })
  }

  for (const enc of state.encoders) {
    if (ids.has(enc.id)) origins.set(enc.id, { x: enc.x, y: enc.y })
  }

  itemDragState = { origins, lastDx: 0, lastDy: 0 }
  setIsDragging(true)
}

/** Update positions during drag (no snap, applied relative to origins). Clamps to ≥0. */
export function updateItemDrag(dx: number, dy: number): void {
  const d = itemDragState
  if (!d) return

  const ids = new Set(state.selectedIds)

  setState('keys', produce((keys) => {
    for (const key of keys) {
      if (!ids.has(key.id)) continue
      const o = d.origins.get(key.id)
      if (!o) continue
      key.x = Math.max(key.w / 2, o.x + dx)
      key.y = Math.max(key.h / 2, o.y + dy)
    }
  }))
  setState('encoders', produce((encoders) => {
    for (const enc of encoders) {
      if (!ids.has(enc.id)) continue
      const o = d.origins.get(enc.id)
      if (!o) continue
      enc.x = Math.max(0.5, o.x + dx)
      enc.y = Math.max(0.5, o.y + dy)
    }
  }))

  d.lastDx = dx
  d.lastDy = dy
}

/** End drag: snap all positions to 0.25 grid. */
export function endItemDrag(): void {
  if (!itemDragState) return

  const ids = new Set(state.selectedIds)

  // Snap current positions
  setState('keys', produce((keys) => {
    for (const key of keys) {
      if (!ids.has(key.id)) continue
      key.x = snap(key.x)
      key.y = snap(key.y)
    }
  }))
  setState('encoders', produce((encoders) => {
    for (const enc of encoders) {
      if (!ids.has(enc.id)) continue
      enc.x = snap(enc.x)
      enc.y = snap(enc.y)
    }
  }))

  itemDragState = null
  setIsDragging(false)
}

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
  }
  else {
    setState('selectedIds', [id])
  }
}

/** Clear selection */
export function deselectAll(): void {
  setState('selectedIds', [])
}

/** Select all items whose bounding box overlaps the given rectangle (in key units) */
export function selectItemsInRect(x1: number, y1: number, x2: number, y2: number, additive: boolean): void {
  const left = Math.min(x1, x2)
  const right = Math.max(x1, x2)
  const top = Math.min(y1, y2)
  const bottom = Math.max(y1, y2)

  const ids: string[] = []

  for (const key of state.keys) {
    const kx1 = key.x - key.w / 2
    const ky1 = key.y - key.h / 2
    const kx2 = key.x + key.w / 2
    const ky2 = key.y + key.h / 2
    if (kx2 > left && kx1 < right && ky2 > top && ky1 < bottom)
      ids.push(key.id)
  }

  for (const enc of state.encoders) {
    const ex1 = enc.x - 0.5
    const ey1 = enc.y - 0.5
    const ex2 = enc.x + 0.5
    const ey2 = enc.y + 0.5
    if (ex2 > left && ex1 < right && ey2 > top && ey1 < bottom)
      ids.push(enc.id)
  }

  if (additive) setState('selectedIds', prev => [...new Set([...prev, ...ids])])
  else setState('selectedIds', ids)
}

/** Move selected items by delta (keyboard). Clamps to keep items in view. */
export function moveSelected(dx: number, dy: number): void {
  const ids = new Set(state.selectedIds)
  setState('keys', produce((keys) => {
    for (const key of keys) {
      if (ids.has(key.id)) {
        key.x = Math.max(key.w / 2, snap(key.x + dx))
        key.y = Math.max(key.h / 2, snap(key.y + dy))
      }
    }
  }))
  setState('encoders', produce((encoders) => {
    for (const enc of encoders) {
      if (ids.has(enc.id)) {
        enc.x = Math.max(0.5, snap(enc.x + dx))
        enc.y = Math.max(0.5, snap(enc.y + dy))
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
        if (hasSelection()) {
          e.preventDefault()
          moveSelected(-step, 0)
        }
        break
      case 'ArrowRight':
        if (hasSelection()) {
          e.preventDefault()
          moveSelected(step, 0)
        }
        break
      case 'ArrowUp':
        if (hasSelection()) {
          e.preventDefault()
          moveSelected(0, -step)
        }
        break
      case 'ArrowDown':
        if (hasSelection()) {
          e.preventDefault()
          moveSelected(0, step)
        }
        break
      case 'Delete':
      case 'Backspace':
        if (hasSelection()) {
          e.preventDefault()
          deleteSelected()
        }
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
