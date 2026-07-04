import { nanoid } from 'nanoid'
import { createMemo, createSignal, onCleanup } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import { parseKleJson } from '../utils/kle-import'

// ── Types ──────────────────────────────────────────────────────────────────────

/** L-shape secondary rectangle (Rynk convention: x2/y2 are center-offsets from primary center to secondary center) */
export interface LShape {
  x2: number // offset from primary center to secondary center (X)
  y2: number // offset from primary center to secondary center (Y)
  w2: number // secondary rect width
  h2: number // secondary rect height
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

/** Pin direction: row or column */
export type PinDirection = 'row' | 'col'

/** A pin on the layout canvas representing an MCU row/column pin */
export interface PinData {
  id: string
  direction: PinDirection
  index: number // matrix row/col index (0, 1, 2...)
  x: number // center X in key units
  y: number // center Y in key units
}

/** Discriminated union of all canvas item types */
export type CanvasItem
  = { type: 'key', data: KeyData }
    | { type: 'encoder', data: EncoderData }
    | { type: 'pin', data: PinData }

/** A layout variant overlay (e.g., ANSI vs ISO) */
export interface VariantData {
  id: string
  name: string
  hiddenKeys: [number, number][]  // matrix positions [row, col] of hidden keys
  shapeOverrides: Record<string, { w?: number, h?: number, r?: number, lshape?: LShape }>
  // key format for shapeOverrides: "row,col" string
}

/** Complete layout state */
export interface LayoutState {
  keys: KeyData[]
  encoders: EncoderData[]
  pins: PinData[]
  matrixRows: number
  matrixCols: number
  selectedIds: string[]
  variants: VariantData[]
  activeVariantIndex: number // -1 = base layout (no variant active)
}

// ── Constants ──────────────────────────────────────────────────────────────────

/** Size of one key unit in pixels */
export const KEY_UNIT = 60

/** Arrow key step sizes */
export const STEP_FINE = 0.25
export const STEP_COARSE = 1

/** Pin visual size in key units */
export const PIN_W = 0.75
export const PIN_H = 0.5

// ── Store ──────────────────────────────────────────────────────────────────────

const [state, setState] = createStore<LayoutState>({
  keys: [],
  encoders: [],
  pins: [],
  matrixRows: 5,
  matrixCols: 15,
  selectedIds: [],
  variants: [],
  activeVariantIndex: -1,
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
  for (const id of state.selectedIds) {
    const item = getItem(id)
    if (item)
      origins.set(id, { x: item.data.x, y: item.data.y })
  }

  itemDragState = { origins, lastDx: 0, lastDy: 0 }
  setIsDragging(true)
}

/** Update positions during drag (no snap, applied relative to origins). Clamps to ≥0. */
export function updateItemDrag(dx: number, dy: number): void {
  const d = itemDragState
  if (!d) return

  for (const id of state.selectedIds) {
    const bounds = getItemBounds(id)
    const o = d.origins.get(id)
    if (!bounds || !o) continue
    updateItemPosition(id, Math.max(bounds.w / 2, o.x + dx), Math.max(bounds.h / 2, o.y + dy))
  }

  d.lastDx = dx
  d.lastDy = dy
}

/** End drag: snap all positions to 0.25 grid. */
export function endItemDrag(): void {
  if (!itemDragState) return

  for (const id of state.selectedIds) {
    const item = getItem(id)
    if (item)
      updateItemPosition(id, snap(item.data.x), snap(item.data.y))
  }

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

/** The single selected pin */
export function selectedPin(): PinData | undefined {
  if (state.selectedIds.length !== 1) return undefined
  return state.pins.find(p => p.id === state.selectedIds[0])
}

/** Whether any items are selected */
export function hasSelection(): boolean {
  return state.selectedIds.length > 0
}

/** Whether any keys are in the current selection */
export function hasSelectedKeys(): boolean {
  const ids = new Set(state.selectedIds)
  return state.keys.some(k => ids.has(k.id))
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
  setState('pins', prev => prev.filter(p => !ids.has(p.id)))
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

  for (const item of getAllItems()) {
    const b = canvasItemBounds(item)
    const ix1 = b.x - b.w / 2
    const iy1 = b.y - b.h / 2
    const ix2 = b.x + b.w / 2
    const iy2 = b.y + b.h / 2
    if (ix2 > left && ix1 < right && iy2 > top && iy1 < bottom)
      ids.push(item.data.id)
  }

  if (additive) setState('selectedIds', prev => [...new Set([...prev, ...ids])])
  else setState('selectedIds', ids)
}

/** Move selected items by delta (keyboard). Clamps to keep items in view. */
export function moveSelected(dx: number, dy: number): void {
  for (const id of state.selectedIds) {
    const item = getItem(id)
    const bounds = getItemBounds(id)
    if (!item || !bounds) continue
    updateItemPosition(id, Math.max(bounds.w / 2, snap(item.data.x + dx)), Math.max(bounds.h / 2, snap(item.data.y + dy)))
  }
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

/** Add a new pin at the given position */
export function addPin(cx: number, cy: number, direction: PinDirection): string {
  const id = nanoid()
  // Auto-assign next available index for this direction
  const existingIndices = state.pins
    .filter(p => p.direction === direction)
    .map(p => p.index)
  const nextIndex = existingIndices.length === 0 ? 0 : Math.max(...existingIndices) + 1
  setState('pins', prev => [...prev, { id, direction, index: nextIndex, x: cx, y: cy }])
  return id
}

/** Update a pin's property */
export function updatePin(id: string, updates: Partial<Omit<PinData, 'id'>>): void {
  const idx = state.pins.findIndex(p => p.id === id)
  if (idx === -1) return
  // Validate: if changing direction or index, check for duplicate
  if (updates.direction !== undefined || updates.index !== undefined) {
    const pin = state.pins[idx]
    const newDir = updates.direction ?? pin.direction
    const newIdx = updates.index ?? pin.index
    const duplicate = state.pins.some(p => p.id !== id && p.direction === newDir && p.index === newIdx)
    if (duplicate)
      return // silently reject duplicate index per direction
  }
  setState('pins', idx, updates as any)
}

/** Connect all selected keys to the given pin (assign row/col) */
export function connectSelectedToPin(pinId: string): void {
  const pin = state.pins.find(p => p.id === pinId)
  if (!pin) return
  const ids = new Set(state.selectedIds)
  setState('keys', produce((keys) => {
    for (const key of keys) {
      if (!ids.has(key.id)) continue
      if (pin.direction === 'row')
        key.row = pin.index
      else
        key.col = pin.index
    }
  }))
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

/** Import a KLE JSON layout, replacing the current state */
export function importKleJson(json: string): void {
  const result = parseKleJson(json)
  setState({
    keys: result.keys,
    encoders: result.encoders,
    pins: [], // KLE doesn't have pin info
    matrixRows: result.matrixRows,
    matrixCols: result.matrixCols,
    selectedIds: [],
    variants: result.variants,
    activeVariantIndex: -1,
  })
}

/** Toggle L-shape on a key */
export function toggleLShape(id: string): void {
  const key = state.keys.find(k => k.id === id)
  if (!key) return
  if (key.lshape) updateKey(id, { lshape: undefined })
  else updateKey(id, { lshape: { x2: 0, y2: 0, w2: key.w, h2: key.h } })
}

// ── Variant actions ─────────────────────────────────────────────────────────────

/** Get the currently active variant, or null if viewing base layout */
export function activeVariant(): VariantData | null {
  if (state.activeVariantIndex < 0 || state.activeVariantIndex >= state.variants.length) return null
  return state.variants[state.activeVariantIndex]
}

/** Add a new variant */
export function addVariant(name: string): void {
  const id = nanoid()
  setState('variants', prev => [...prev, { id, name, hiddenKeys: [], shapeOverrides: {} }])
}

/** Delete a variant by id */
export function deleteVariant(id: string): void {
  const idx = state.variants.findIndex(v => v.id === id)
  if (idx === -1) return
  setState('variants', prev => prev.filter(v => v.id !== id))
  // Adjust active index if needed
  if (state.activeVariantIndex >= state.variants.length) {
    setState('activeVariantIndex', Math.max(-1, state.variants.length - 1))
  }
}

/** Rename a variant */
export function renameVariant(id: string, name: string): void {
  const idx = state.variants.findIndex(v => v.id === id)
  if (idx === -1) return
  setState('variants', idx, 'name', name)
}

/** Set the active variant index (-1 for base) */
export function setActiveVariant(index: number): void {
  setState('activeVariantIndex', index)
}

/** Toggle whether a key (by matrix position) is hidden in the active variant */
export function toggleKeyHidden(row: number, col: number): void {
  const variant = activeVariant()
  if (!variant) return
  const idx = state.variants.findIndex(v => v.id === variant.id)
  if (idx === -1) return

  const existingIdx = variant.hiddenKeys.findIndex(([r, c]) => r === row && c === col)

  if (existingIdx !== -1) {
    // Un-hide
    setState('variants', idx, 'hiddenKeys', prev => prev.filter(([r, c]) => r !== row || c !== col) as [number, number][])
  } else {
    // Hide
    setState('variants', idx, 'hiddenKeys', prev => [...prev, [row, col] as [number, number]])
  }
}

/** Set a shape override for a key (by matrix position) in the active variant */
export function setShapeOverride(row: number, col: number, overrides: { w?: number, h?: number, r?: number, lshape?: LShape }): void {
  const variant = activeVariant()
  if (!variant) return
  const idx = state.variants.findIndex(v => v.id === variant.id)
  if (idx === -1) return

  const key = `${row},${col}`
  setState('variants', idx, 'shapeOverrides', key, overrides)
}

/** Clear a shape override for a key in the active variant */
export function clearShapeOverride(row: number, col: number): void {
  const variant = activeVariant()
  if (!variant) return
  const idx = state.variants.findIndex(v => v.id === variant.id)
  if (idx === -1) return

  const key = `${row},${col}`
  // Remove the key from shapeOverrides
  setState('variants', idx, 'shapeOverrides', (prev) => {
    const next = { ...prev }
    delete next[key]
    return next
  })
}

/** Remove a single field from a shape override for a key in the active variant */
export function removeShapeOverrideField(row: number, col: number, field: 'w' | 'h' | 'r' | 'lshape'): void {
  const variant = activeVariant()
  if (!variant) return
  const idx = state.variants.findIndex(v => v.id === variant.id)
  if (idx === -1) return

  const key = `${row},${col}`
  const existing = variant.shapeOverrides[key]
  if (!existing) return

  const updated = { ...existing }
  delete (updated as any)[field]
  // If no fields remain, remove the whole override
  if (Object.keys(updated).length === 0) {
    setState('variants', idx, 'shapeOverrides', (prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }
  else {
    setState('variants', idx, 'shapeOverrides', key, updated)
  }
}

/** Check if a key (by matrix position) is hidden in the active variant */
export function isKeyHiddenInVariant(row: number, col: number): boolean {
  const variant = activeVariant()
  if (!variant) return false
  return variant.hiddenKeys.some(([r, c]) => r === row && c === col)
}

/** Get effective key data for a key in the active variant (applying shape overrides) */
export function getEffectiveKey(key: KeyData): KeyData {
  const variant = activeVariant()
  if (!variant || key.row < 0 || key.col < 0) return key

  const overrideKey = `${key.row},${key.col}`
  const override = variant.shapeOverrides[overrideKey]
  if (!override) return key

  return {
    ...key,
    ...(override.w !== undefined ? { w: override.w } : {}),
    ...(override.h !== undefined ? { h: override.h } : {}),
    ...(override.r !== undefined ? { r: override.r } : {}),
    ...(override.lshape !== undefined ? { lshape: override.lshape } : {}),
  }
}

/** Compute display positions for all keys considering active variant reflow.
 *  Hidden keys cause subsequent keys in the same row to shift left. */
export const variantDisplayMap = createMemo(() => {
  const variant = activeVariant()
  if (!variant) return null // null = use raw positions (no variant active)

  const hiddenSet = new Set(variant.hiddenKeys.map(([r, c]) => `${r},${c}`))
  const displayMap = new Map<string, { displayX: number, displayY: number }>()

  // Group keys by approximate y (rows)
  const sorted = [...state.keys].sort((a, b) => a.y - b.y || a.x - b.x)
  const rows: KeyData[][] = []
  for (const key of sorted) {
    const existingRow = rows.find(row => Math.abs(row[0].y - key.y) < 0.5)
    if (existingRow) existingRow.push(key)
    else rows.push([key])
  }

  // For each row, compute reflow
  for (const row of rows) {
    const sortedRow = [...row].sort((a, b) => a.x - b.x)
    let shift = 0
    for (const key of sortedRow) {
      const keyCoord = `${key.row},${key.col}`
      if (hiddenSet.has(keyCoord)) {
        // This key is hidden — add its BASE width to the shift accumulator.
        // Hidden keys shouldn't use overridden width since they're invisible;
        // the shift represents the space the base key occupied.
        shift += key.w
      } else {
        // Visible key — apply accumulated shift
        displayMap.set(key.id, { displayX: key.x - shift, displayY: key.y })
      }
    }
  }

  return displayMap
})

// ── Helpers ────────────────────────────────────────────────────────────────────

function snap(value: number): number {
  return Math.round(value * 4) / 4 // snap to 0.25
}

/** Look up a canvas item by id across all entity arrays */
export function getItem(id: string): CanvasItem | undefined {
  const key = state.keys.find(k => k.id === id)
  if (key) return { type: 'key', data: key }
  const enc = state.encoders.find(e => e.id === id)
  if (enc) return { type: 'encoder', data: enc }
  const pin = state.pins.find(p => p.id === id)
  if (pin) return { type: 'pin', data: pin }
  return undefined
}

/** Get bounding box for a canvas item by id */
export function getItemBounds(id: string): { x: number, y: number, w: number, h: number } | undefined {
  const item = getItem(id)
  if (!item) return undefined
  return canvasItemBounds(item)
}

/** Compute bounding box from a CanvasItem */
function canvasItemBounds(item: CanvasItem): { x: number, y: number, w: number, h: number } {
  if (item.type === 'key')
    return { x: item.data.x, y: item.data.y, w: item.data.w, h: item.data.h }
  if (item.type === 'pin')
    return { x: item.data.x, y: item.data.y, w: PIN_W, h: PIN_H }
  return { x: item.data.x, y: item.data.y, w: 1, h: 1 }
}

/** Get all canvas items (keys + encoders + pins) */
function getAllItems(): CanvasItem[] {
  return [
    ...state.keys.map(k => ({ type: 'key' as const, data: k })),
    ...state.encoders.map(e => ({ type: 'encoder' as const, data: e })),
    ...state.pins.map(p => ({ type: 'pin' as const, data: p })),
  ]
}

/** Update the position of a canvas item by id */
export function updateItemPosition(id: string, x: number, y: number): void {
  const keyIdx = state.keys.findIndex(k => k.id === id)
  if (keyIdx !== -1) {
    setState('keys', keyIdx, { x, y })
    return
  }
  const encIdx = state.encoders.findIndex(e => e.id === id)
  if (encIdx !== -1) {
    setState('encoders', encIdx, { x, y })
    return
  }
  const pinIdx = state.pins.findIndex(p => p.id === id)
  if (pinIdx !== -1)
    setState('pins', pinIdx, { x, y })
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
