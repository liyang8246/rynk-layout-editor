import { Serial } from '@ijprest/kle-serial'
import { nanoid } from 'nanoid'
import type { KeyData, EncoderData, LShape } from '../stores/layout'

export interface KleImportResult {
  keys: KeyData[]
  encoders: EncoderData[]
  matrixRows: number
  matrixCols: number
}

const EPS = 0.01

/**
 * Determine if a KLE key has a genuine L-shape (secondary rect differs from primary).
 * The KLE serial library defaults width2=width and height2=height for every key,
 * so simply checking width2>0 || height2>0 gives false positives.
 * Replicates the Rust `has_rect2()` logic from to_layout.rs.
 */
function hasRect2(x2: number, y2: number, width2: number, height2: number, width: number, height: number): boolean {
  return (
    Math.abs(x2) > EPS
    || Math.abs(y2) > EPS
    || (Math.abs(width2) > EPS && Math.abs(width2 - width) > EPS)
    || (Math.abs(height2) > EPS && Math.abs(height2 - height) > EPS)
  )
}

/**
 * Parse a KLE JSON string and store raw key data without coordinate conversion
 * or annotation extraction.
 *
 * - x/y stored as KLE top-left coordinates (no center conversion)
 * - rotation stored as-is from KLE (rotation_angle, rotation_x, rotation_y)
 * - L-shape stored as-is from KLE (no conversion of x2/y2/w2/h2)
 * - No encoder detection — all items are regular keys
 * - No annotation extraction — row=-1, col=-1 for all keys
 * - Matrix dimensions computed from spatial layout only
 */
export function parseKleJson(json: string): KleImportResult {
  const keyboard = Serial.parse(json)

  const keys: KeyData[] = []

  for (const kleKey of keyboard.keys) {
    // Skip decals and ghost keys
    if (kleKey.decal || kleKey.ghost) continue

    const { x, y, width, height, rotation_angle, rotation_x, rotation_y, x2, y2, width2, height2 } = kleKey

    // Handle L-shape — only if secondary rect genuinely differs from primary
    let lshape: LShape | undefined
    if (hasRect2(x2, y2, width2, height2, width, height)) {
      lshape = { x2, y2, w2: width2, h2: height2 }
      // KLE convention: x2/y2 are offsets from primary top-left to secondary top-left
      // No conversion needed — store as-is
    }

    keys.push({
      id: nanoid(),
      x,                              // top-left X (KLE convention, no conversion)
      y,                              // top-left Y (KLE convention, no conversion)
      w: width,
      h: height,
      r: rotation_angle,              // rotation angle (degrees)
      rx: rotation_x,                 // rotation origin X (KLE convention)
      ry: rotation_y,                 // rotation origin Y (KLE convention)
      lshape,
      row: -1,                        // no annotation extraction
      col: -1,                        // no annotation extraction
    })
  }

  // Compute matrix dimensions from spatial layout
  // Sort keys by y then x (reading order, using top-left coords)
  const sorted = [...keys].sort((a, b) => a.y - b.y || a.x - b.x)

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

  // Count columns per row for matrix dimensions
  const sortedRows = rows.map(row => [...row].sort((a, b) => a.x - b.x))
  const matrixRows = sortedRows.length
  const matrixCols = Math.max(...sortedRows.map(r => r.length), 0)

  return { keys, encoders: [], matrixRows, matrixCols }
}
