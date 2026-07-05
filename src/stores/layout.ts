import { nanoid } from 'nanoid'
import { createSignal, onCleanup } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import { parseKleJson } from '../utils/kle-import'

// ── Types ──────────────────────────────────────────────────────────────────────

/** L-shape secondary rectangle (KLE convention: x2/y2 are top-left offsets from primary top-left to secondary top-left) */
export interface LShape {
  x2: number // offset from primary top-left to secondary top-left (X)
  y2: number // offset from primary top-left to secondary top-left (Y)
  w2: number // secondary rect width
  h2: number // secondary rect height
}

/** A single key cap on the layout canvas */
export interface KeyData {
  id: string
  x: number // top-left X in key units (KLE convention)
  y: number // top-left Y in key units (KLE convention)
  w: number // width in key units (default 1)
  h: number // height in key units (default 1)
  r: number // rotation angle in degrees
  rx: number // rotation origin X in key units (KLE convention)
  ry: number // rotation origin Y in key units (KLE convention)
  lshape?: LShape // omit for non-L keys
  row: number // matrix row (-1 = unassigned)
  col: number // matrix col (-1 = unassigned)
  option?: { groupId: number; choiceId: number } // layout variant group/choice
}

/** An encoder knob on the layout canvas */
export interface EncoderData {
  id: string
  encoderIndex: number // user-visible encoder index (0, 1, 2...)
  x: number // top-left X in key units
  y: number // top-left Y in key units
}

/** A layout option group (Vial-compatible variant) */
export interface OptionGroup {
  id: number
  name: string
  choices: { id: number; name: string }[]
}

/** Pin direction: row or column */
export type PinDirection = 'row' | 'col'

/** A pin on the layout canvas representing an MCU row/column pin */
export interface PinData {
  id: string
  direction: PinDirection
  index: number // matrix row/col index (0, 1, 2...)
  x: number // top-left X in key units
  y: number // top-left Y in key units
}

/** Discriminated union of all canvas item types */
export type CanvasItem
  = { type: 'key', data: KeyData }
    | { type: 'encoder', data: EncoderData }
    | { type: 'pin', data: PinData }

/** Complete layout state */
export interface LayoutState {
  keys: KeyData[]
  encoders: EncoderData[]
  pins: PinData[]
  matrixRows: number
  matrixCols: number
  selectedIds: string[]
  optionGroups: OptionGroup[]
  activeChoices: Record<number, number> // groupId → active choiceId
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
  optionGroups: [],
  activeChoices: {},
})

export { setState, state }

// ── Undo/Redo history ──────────────────────────────────────────────────────────

const MAX_HISTORY = 50
let historySnapshots: string[] = []
let historyIndex = -1

const [canUndo, setCanUndo] = createSignal(false)
const [canRedo, setCanRedo] = createSignal(false)

function updateUndoRedoSignals(): void {
  setCanUndo(historyIndex > 0)
  setCanRedo(historyIndex < historySnapshots.length - 1)
}

/** Snapshot current state (excluding selectedIds) and push to history */
export function pushHistory(): void {
  const snapshot = JSON.stringify({
    keys: state.keys,
    encoders: state.encoders,
    pins: state.pins,
    matrixRows: state.matrixRows,
    matrixCols: state.matrixCols,
    optionGroups: state.optionGroups,
    activeChoices: state.activeChoices,
  })
  // Skip if identical to current snapshot (no-op)
  if (historyIndex >= 0 && historySnapshots[historyIndex] === snapshot) return

  // Truncate any redo states beyond current index
  historySnapshots = historySnapshots.slice(0, historyIndex + 1)
  historySnapshots.push(snapshot)
  if (historySnapshots.length > MAX_HISTORY)
    historySnapshots = historySnapshots.slice(-MAX_HISTORY)
  historyIndex = historySnapshots.length - 1
  updateUndoRedoSignals()
}

/** Restore previous state from history */
export function undo(): void {
  if (historyIndex <= 0) return
  historyIndex--
  const snapshot = JSON.parse(historySnapshots[historyIndex])
  setState({
    keys: snapshot.keys,
    encoders: snapshot.encoders,
    pins: snapshot.pins,
    matrixRows: snapshot.matrixRows,
    matrixCols: snapshot.matrixCols,
    optionGroups: snapshot.optionGroups ?? [],
    activeChoices: snapshot.activeChoices ?? {},
    selectedIds: [],
  })
  updateUndoRedoSignals()
}

/** Restore next state from history */
export function redo(): void {
  if (historyIndex >= historySnapshots.length - 1) return
  historyIndex++
  const snapshot = JSON.parse(historySnapshots[historyIndex])
  setState({
    keys: snapshot.keys,
    encoders: snapshot.encoders,
    pins: snapshot.pins,
    matrixRows: snapshot.matrixRows,
    matrixCols: snapshot.matrixCols,
    optionGroups: snapshot.optionGroups ?? [],
    activeChoices: snapshot.activeChoices ?? {},
    selectedIds: [],
  })
  updateUndoRedoSignals()
}

export { canUndo, canRedo }

// ── Copy/Paste ─────────────────────────────────────────────────────────────────

let clipboard: { keys: KeyData[], encoders: EncoderData[] } = { keys: [], encoders: [] }

/** Copy selected keys and encoders to clipboard */
export function copySelected(): void {
  const ids = new Set(state.selectedIds)
  clipboard = {
    keys: state.keys.filter(k => ids.has(k.id)).map(k => ({ ...k, option: k.option ? { ...k.option } : undefined })),
    encoders: state.encoders.filter(e => ids.has(e.id)).map(e => ({ ...e })),
  }
}

/** Paste clipboard items at offset, selecting the pasted item */
export function pasteClipboard(): void {
  if (clipboard.keys.length === 0 && clipboard.encoders.length === 0) return
  pushHistory()
  const pastedIds: string[] = []
  const newKeys = clipboard.keys.map(k => {
    const id = nanoid()
    pastedIds.push(id)
    return { ...k, id, x: k.x + 1, y: k.y + 1, option: k.option ? { ...k.option } : undefined }
  })
  const nextEncoderIndex = state.encoders.length === 0
    ? 0
    : Math.max(...state.encoders.map(e => e.encoderIndex)) + 1
  const newEncoders = clipboard.encoders.map((e, i) => {
    const id = nanoid()
    pastedIds.push(id)
    return { ...e, id, encoderIndex: nextEncoderIndex + i, x: e.x + 1, y: e.y + 1 }
  })
  setState('keys', prev => [...prev, ...newKeys])
  setState('encoders', prev => [...prev, ...newEncoders])
  setState('selectedIds', pastedIds)
}

// ── Item drag state ────────────────────────────────────────────────────────────

/** Tracks an active item-drag (moving selected keys/encoders with the mouse) */
interface ItemDragState {
  /** Snapshot of selected items' positions at drag start (in key units) */
  origins: Map<string, { x: number, y: number, rx?: number, ry?: number }>
  /** Last applied dx/dy in key units (unsnapped, for live preview) */
  lastDx: number
  lastDy: number
}

let itemDragState: ItemDragState | null = null

const [isDragging, setIsDragging] = createSignal(false)
export { isDragging }

/** Start dragging all currently selected items. Call on pointerdown on a selected item. */
export function startItemDrag(): void {
  pushHistory()
  const origins = new Map<string, { x: number, y: number, rx?: number, ry?: number }>()
  for (const id of state.selectedIds) {
    const item = getItem(id)
    if (item) {
      const entry: { x: number, y: number, rx?: number, ry?: number } = { x: item.data.x, y: item.data.y }
      if (item.type === 'key') {
        entry.rx = (item.data as KeyData).rx
        entry.ry = (item.data as KeyData).ry
      }
      origins.set(id, entry)
    }
  }

  itemDragState = { origins, lastDx: 0, lastDy: 0 }
  setIsDragging(true)
}

/** Update positions during drag (no snap, applied relative to origins). Clamps to ≥0. */
export function updateItemDrag(dx: number, dy: number): void {
  const d = itemDragState
  if (!d) return

  for (const id of state.selectedIds) {
    const o = d.origins.get(id)
    if (!o) continue
    const newX = Math.max(0, o.x + dx)
    const newY = Math.max(0, o.y + dy)
    // Compute actual delta (may differ from dx/dy due to clamping)
    const actualDx = newX - o.x
    const actualDy = newY - o.y
    updateItemPosition(id, newX, newY)
    // Move rx/ry by the same actual delta to keep rotation origin in sync
    if (o.rx !== undefined && o.ry !== undefined) {
      const keyIdx = state.keys.findIndex(k => k.id === id)
      if (keyIdx !== -1) {
        setState('keys', keyIdx, 'rx', o.rx + actualDx)
        setState('keys', keyIdx, 'ry', o.ry + actualDy)
      }
    }
  }

  d.lastDx = dx
  d.lastDy = dy
}

/** End drag: snap all positions to 0.25 grid. */
export function endItemDrag(): void {
  if (!itemDragState) return

  for (const id of state.selectedIds) {
    const item = getItem(id)
    if (item) {
      updateItemPosition(id, snap(item.data.x), snap(item.data.y))
      if (item.type === 'key') {
        const keyIdx = state.keys.findIndex(k => k.id === id)
        if (keyIdx !== -1) {
          setState('keys', keyIdx, 'rx', snap(state.keys[keyIdx].rx))
          setState('keys', keyIdx, 'ry', snap(state.keys[keyIdx].ry))
        }
      }
    }
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

/** Add a new key at the given grid position (top-left) */
export function addKey(x: number, y: number): string {
  pushHistory()
  const id = nanoid()
  setState('keys', prev => [...prev, {
    id,
    x,
    y,
    w: 1,
    h: 1,
    r: 0,
    rx: 0,
    ry: 0,
    row: -1,
    col: -1,
    option: undefined,
  }])
  return id
}

/** Add a new encoder at the given position (top-left) */
export function addEncoder(x: number, y: number): string {
  pushHistory()
  const id = nanoid()
  const nextIndex = state.encoders.length === 0
    ? 0
    : Math.max(...state.encoders.map(e => e.encoderIndex)) + 1
  setState('encoders', prev => [...prev, {
    id,
    encoderIndex: nextIndex,
    x,
    y,
  }])
  return id
}

/** Delete all selected items */
export function deleteSelected(): void {
  pushHistory()
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
    // b.x/y are top-left, so the rect spans [b.x, b.x+b.w] x [b.y, b.y+b.h]
    if (b.x + b.w > left && b.x < right && b.y + b.h > top && b.y < bottom)
      ids.push(item.data.id)
  }

  if (additive) setState('selectedIds', prev => [...new Set([...prev, ...ids])])
  else setState('selectedIds', ids)
}

/** Move selected items by delta (keyboard). Clamps to keep items in view. */
export function moveSelected(dx: number, dy: number): void {
  pushHistory()
  for (const id of state.selectedIds) {
    const item = getItem(id)
    if (!item) continue
    const newX = Math.max(0, snap(item.data.x + dx))
    const newY = Math.max(0, snap(item.data.y + dy))
    // Compute actual delta (may differ from dx/dy due to clamping)
    const actualDx = newX - item.data.x
    const actualDy = newY - item.data.y
    updateItemPosition(id, newX, newY)
    if (item.type === 'key') {
      const keyIdx = state.keys.findIndex(k => k.id === id)
      if (keyIdx !== -1) {
        setState('keys', keyIdx, 'rx', snap(state.keys[keyIdx].rx + actualDx))
        setState('keys', keyIdx, 'ry', snap(state.keys[keyIdx].ry + actualDy))
      }
    }
  }
}

/** Update a key's property */
export function updateKey(id: string, updates: Partial<Omit<KeyData, 'id'>>): void {
  pushHistory()
  const idx = state.keys.findIndex(k => k.id === id)
  if (idx === -1) return
  setState('keys', idx, updates as any)
}

/** Update an L-shape sub-field on a key */
export function updateKeyLshape(id: string, field: keyof LShape, value: number): void {
  pushHistory()
  const idx = state.keys.findIndex(k => k.id === id)
  if (idx === -1) return
  setState('keys', idx, 'lshape', field, value as any)
}

/** Update an encoder's property */
export function updateEncoder(id: string, updates: Partial<Omit<EncoderData, 'id'>>): void {
  pushHistory()
  const idx = state.encoders.findIndex(e => e.id === id)
  if (idx === -1) return
  setState('encoders', idx, updates as any)
}

/** Add a new pin at the given position (top-left) */
export function addPin(x: number, y: number, direction: PinDirection): string {
  pushHistory()
  const id = nanoid()
  // Auto-assign next available index for this direction
  const existingIndices = state.pins
    .filter(p => p.direction === direction)
    .map(p => p.index)
  const nextIndex = existingIndices.length === 0 ? 0 : Math.max(...existingIndices) + 1
  setState('pins', prev => [...prev, { id, direction, index: nextIndex, x, y }])
  return id
}

/** Update a pin's property */
export function updatePin(id: string, updates: Partial<Omit<PinData, 'id'>>): void {
  pushHistory()
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
  pushHistory()
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
  pushHistory()
  setState('matrixRows', rows)
  setState('matrixCols', cols)
}

/** Auto-assign matrix positions based on spatial layout */
export function autoNumberMatrix(): void {
  pushHistory()
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

  // Update matrix size (directly, not via setMatrixSize which pushes history again)
  const maxCol = Math.max(...sortedRows.map(r => r.length))
  setState('matrixRows', sortedRows.length)
  setState('matrixCols', maxCol)
}

/** Import a KLE JSON layout, replacing the current state */
export function importKleJson(json: string): void {
  pushHistory()
  const result = parseKleJson(json)
  setState({
    keys: result.keys,
    encoders: result.encoders,
    pins: [], // KLE doesn't have pin info
    matrixRows: result.matrixRows,
    matrixCols: result.matrixCols,
    optionGroups: result.optionGroups,
    activeChoices: result.activeChoices,
    selectedIds: [],
  })
}

/** Toggle L-shape on a key */
export function toggleLShape(id: string): void {
  pushHistory()
  const idx = state.keys.findIndex(k => k.id === id)
  if (idx === -1) return
  const key = state.keys[idx]
  if (key.lshape)
    setState('keys', idx, 'lshape', undefined as any)
  else
    setState('keys', idx, 'lshape', { x2: 0, y2: 0, w2: key.w, h2: key.h } as any)
}

// ── Layout Variant Actions ─────────────────────────────────────────────────────

/** Add a new layout option group */
export function addOptionGroup(name: string): number {
  pushHistory()
  const id = state.optionGroups.length === 0 ? 0 : Math.max(...state.optionGroups.map(g => g.id)) + 1
  const defaultChoice = { id: 0, name: 'Default' }
  const altChoice = { id: 1, name: 'Alternate' }
  setState('optionGroups', prev => [...prev, { id, name, choices: [defaultChoice, altChoice] }])
  setState('activeChoices', id, 0)
  return id
}

/** Remove an option group */
export function removeOptionGroup(groupId: number): void {
  pushHistory()
  // Clear option from all keys in this group
  setState('keys', produce(keys => {
    for (const key of keys) {
      if (key.option?.groupId === groupId) key.option = undefined
    }
  }))
  setState('optionGroups', prev => prev.filter(g => g.id !== groupId))
  // Remove from activeChoices
  const newActive = { ...state.activeChoices }
  delete newActive[groupId]
  setState('activeChoices', newActive)
}

/** Set active choice for a group */
export function setActiveChoice(groupId: number, choiceId: number): void {
  setState('activeChoices', groupId, choiceId)
  // Note: this doesn't pushHistory since it's a view toggle, not a data mutation
}

/** Assign a key to a layout option */
export function assignKeyOption(keyId: string, groupId: number, choiceId: number): void {
  pushHistory()
  const idx = state.keys.findIndex(k => k.id === keyId)
  if (idx === -1) return
  setState('keys', idx, 'option', { groupId, choiceId })
}

/** Remove a key from its layout option */
export function removeKeyOption(keyId: string): void {
  pushHistory()
  const idx = state.keys.findIndex(k => k.id === keyId)
  if (idx === -1) return
  setState('keys', idx, 'option', undefined as any)
}

/** Check if a key is visible given current active choices */
export function isKeyVisible(key: KeyData): boolean {
  if (!key.option) return true
  return state.activeChoices[key.option.groupId] === key.option.choiceId
}

/** Add a choice to an existing option group */
export function addOptionChoice(groupId: number, name: string): void {
  pushHistory()
  const group = state.optionGroups.find(g => g.id === groupId)
  if (!group) return
  const choiceId = group.choices.length === 0 ? 0 : Math.max(...group.choices.map(c => c.id)) + 1
  const groupIdx = state.optionGroups.findIndex(g => g.id === groupId)
  setState('optionGroups', groupIdx, 'choices', prev => [...prev, { id: choiceId, name }])
}

/** Rename an option group */
export function renameOptionGroup(groupId: number, name: string): void {
  pushHistory()
  const idx = state.optionGroups.findIndex(g => g.id === groupId)
  if (idx === -1) return
  setState('optionGroups', idx, 'name', name)
}

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

/** Compute bounding box from a CanvasItem (x/y are top-left).
 *  Note: for rotated keys, this returns the unrotated axis-aligned bounding box.
 *  Rubber-band selection may be slightly inaccurate for heavily rotated keys. */
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

    const mod = e.ctrlKey || e.metaKey

    // Undo/Redo/Copy/Paste shortcuts
    if (mod && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      undo()
      return
    }
    if (mod && e.key === 'z' && e.shiftKey) {
      e.preventDefault()
      redo()
      return
    }
    if (mod && e.key === 'y') {
      e.preventDefault()
      redo()
      return
    }
    if (mod && e.key === 'c') {
      e.preventDefault()
      copySelected()
      return
    }
    if (mod && e.key === 'v') {
      e.preventDefault()
      pasteClipboard()
      return
    }
    if (mod && e.key === 'a') {
      e.preventDefault()
      const allIds = [...state.keys.map(k => k.id), ...state.encoders.map(e => e.id), ...state.pins.map(p => p.id)]
      setState('selectedIds', allIds)
      return
    }

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
