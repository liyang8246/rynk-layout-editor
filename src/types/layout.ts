// ── Core layout domain types ──────────────────────────────────────────────────

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
  option?: { groupId: number, choiceId: number } // layout variant group/choice
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
  choices: { id: number, name: string }[]
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

/** Tracks an active item-drag (moving selected keys/encoders with the mouse) */
export interface ItemDragState {
  /** Snapshot of selected items' positions at drag start (in key units) */
  origins: Map<string, { x: number, y: number, rx?: number, ry?: number }>
  /** Last applied dx/dy in key units (unsnapped, for live preview) */
  lastDx: number
  lastDy: number
}
