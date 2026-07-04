import { Serial, Key } from '@ijprest/kle-serial'
import { nanoid } from 'nanoid'
import { kleToRynkRotation, topLeftToCenter, kleLshapeToRynk } from './geometry'
import type { KeyData, EncoderData, VariantData, LShape } from '../stores/layout'

export interface KleImportResult {
  keys: KeyData[]
  encoders: EncoderData[]
  matrixRows: number
  matrixCols: number
  variants: VariantData[]
}

/**
 * Parse a matrix position from a KLE legend string.
 * VIA-style legends use "row,col" format (e.g. "0,0", "1,3").
 * Returns [row, col] or [-1, -1] if not parseable.
 */
function parseMatrixLegend(legend: string | undefined): [number, number] {
  if (!legend) return [-1, -1]
  const trimmed = legend.trim()
  const match = trimmed.match(/^(\d+)\s*,\s*(\d+)$/)
  if (!match) return [-1, -1]
  return [Number.parseInt(match[1], 10), Number.parseInt(match[2], 10)]
}

/**
 * Parse a layout option (group,choice) from a KLE legend string.
 * VIA/Vial-style layout variants use "group,choice" format in non-top-left legends.
 * Returns [group, choice] or [-1, -1] if not parseable or negative.
 */
function parseOptionLegend(legend: string | undefined): [number, number] {
  if (!legend) return [-1, -1]
  const trimmed = legend.trim()
  const match = trimmed.match(/^(\d+)\s*,\s*(\d+)$/)
  if (!match) return [-1, -1]
  const group = Number.parseInt(match[1], 10)
  const choice = Number.parseInt(match[2], 10)
  if (group < 0 || choice < 0) return [-1, -1]
  return [group, choice]
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
 * Check if a key's center legend indicates it's an encoder.
 * KLE legends are in a 12-position array mapped from the label map.
 * Index 4 in the normalized array = center position.
 */
function isEncoderKey(key: Key): boolean {
  const center = key.labels[4]
  if (!center) return false
  return /e/i.test(center)
}

/**
 * Extract encoder index from legend text.
 * Expects format like "0,0\n\n\n\ne0" where the center contains 'e' or 'E'.
 * Falls back to sequential numbering.
 */
function parseEncoderIndex(key: Key, fallbackIndex: number): number {
  // Try to find a number before the 'e' in the center legend
  const center = key.labels[4]
  if (center) {
    const match = center.match(/(\d+)/)
    if (match) return Number.parseInt(match[1], 10)
  }
  // Try top-left legend for an index
  const tl = key.labels[0]
  if (tl) {
    const match = tl.match(/(\d+)/)
    if (match) return Number.parseInt(match[1], 10)
  }
  return fallbackIndex
}

/**
 * Auto-number matrix positions for keys that have no valid VIA labels.
 * Groups keys by y proximity into rows, sorts by x within each row.
 */
function autoNumberKeys(keys: KeyData[]): { keys: KeyData[], matrixRows: number, matrixCols: number } {
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

  // Sort each row by x and assign row/col
  const result = keys.map(k => ({ ...k }))
  const sortedRows = rows.map(row => [...row].sort((a, b) => a.x - b.x))

  for (let r = 0; r < sortedRows.length; r++) {
    for (let c = 0; c < sortedRows[r].length; c++) {
      const keyId = sortedRows[r][c].id
      const key = result.find(k => k.id === keyId)
      if (key) {
        key.row = r
        key.col = c
      }
    }
  }

  const maxCol = Math.max(...sortedRows.map(r => r.length))
  return { keys: result, matrixRows: sortedRows.length, matrixCols: maxCol }
}

/**
 * Parse a KLE JSON string and convert to the editor's internal representation.
 *
 * - Regular keys get their position converted from KLE top-left to Rynk center coords
 * - L-shaped keys get the secondary rectangle converted
 * - Encoder keys (center legend contains 'e'/'E') are collapsed into EncoderData
 * - Matrix positions are extracted from VIA-style "row,col" legends (top-left, index 0)
 * - If no keys have valid matrix positions, spatial auto-numbering is applied
 */
export function parseKleJson(json: string): KleImportResult {
  const keyboard = Serial.parse(json)

  const keys: KeyData[] = []
  const encoderMap = new Map<string, EncoderData>() // keyed by "x,y" to collapse CW/CCW pairs
  let encoderFallback = 0

  // Track option annotations: key id -> [group, choice]
  const keyOptions = new Map<string, [number, number]>()

  for (const kleKey of keyboard.keys) {
    // Skip decals and ghost keys
    if (kleKey.decal || kleKey.ghost) continue

    const { x, y, width, height, rotation_angle, rotation_x, rotation_y, x2, y2, width2, height2 } = kleKey

    // Apply rotation conversion
    const { displayX, displayY, rotation } = kleToRynkRotation(
      x, y, width, height, rotation_angle, rotation_x, rotation_y,
    )

    // Convert to center coordinates
    const [cx, cy] = topLeftToCenter(displayX, displayY, width, height)

    if (isEncoderKey(kleKey)) {
      // Encoder: collapse by position (same x,y = same encoder)
      const posKey = `${cx.toFixed(4)},${cy.toFixed(4)}`
      if (!encoderMap.has(posKey)) {
        const encoderIndex = parseEncoderIndex(kleKey, encoderFallback)
        encoderFallback = encoderIndex + 1
        encoderMap.set(posKey, {
          id: nanoid(),
          encoderIndex,
          x: cx,
          y: cy,
        })
      }
    }
    else {
      // Regular key
      const [row, col] = parseMatrixLegend(kleKey.labels[0])

      // Handle L-shape — only if secondary rect genuinely differs from primary
      let lshape: LShape | undefined
      if (hasRect2(x2, y2, width2, height2, width, height)) {
        const converted = kleLshapeToRynk(x2, y2, width2, height2, width, height)
        lshape = converted
      }

      const keyId = nanoid()
      keys.push({
        id: keyId,
        x: cx,
        y: cy,
        w: width,
        h: height,
        r: rotation,
        lshape,
        row,
        col,
      })

      // Scan non-top-left, non-center legends for layout option (group,choice)
      for (let i = 1; i < kleKey.labels.length; i++) {
        // Skip center legend (index 4) — that's the encoder marker
        if (i === 4) continue
        const [group, choice] = parseOptionLegend(kleKey.labels[i])
        if (group >= 0 && choice >= 0) {
          keyOptions.set(keyId, [group, choice])
          break // first match wins
        }
      }
    }
  }

  const encoders = Array.from(encoderMap.values())

  // Compute matrix dimensions
  let matrixRows: number
  let matrixCols: number

  const hasValidPositions = keys.some(k => k.row >= 0 && k.col >= 0)

  if (hasValidPositions) {
    const maxRow = Math.max(...keys.map(k => k.row))
    const maxCol = Math.max(...keys.map(k => k.col))
    matrixRows = maxRow + 1
    matrixCols = maxCol + 1
  }
  else {
    // No valid VIA labels — spatial auto-numbering
    const autoResult = autoNumberKeys(keys)
    keys.splice(0, keys.length, ...autoResult.keys)
    matrixRows = autoResult.matrixRows
    matrixCols = autoResult.matrixCols
  }

  // Build variants from option annotations
  const variants: VariantData[] = []

  // Collect keys by (group, choice)
  const groupChoiceKeys = new Map<string, { keyId: string, row: number, col: number, w: number, h: number, r: number, lshape?: LShape }[]>()
  for (const key of keys) {
    const opt = keyOptions.get(key.id)
    if (!opt) continue
    const [group, choice] = opt
    const mapKey = `${group},${choice}`
    if (!groupChoiceKeys.has(mapKey)) {
      groupChoiceKeys.set(mapKey, [])
    }
    groupChoiceKeys.get(mapKey)!.push({
      keyId: key.id,
      row: key.row,
      col: key.col,
      w: key.w,
      h: key.h,
      r: key.r,
      lshape: key.lshape,
    })
  }

  // Find all groups that have multiple choices
  const groups = new Map<number, number[]>() // group -> list of choices
  for (const mapKey of groupChoiceKeys.keys()) {
    const [g, c] = mapKey.split(',').map(Number)
    if (!groups.has(g)) groups.set(g, [])
    groups.get(g)!.push(c)
  }

  // For each group with alternative choices (choice > 0), create a variant per alternative
  for (const [group, choices] of groups) {
    // Get the base keys (choice=0) for this group
    const baseKey = `${group},0`
    const baseKeys = groupChoiceKeys.get(baseKey) ?? []

    for (const choice of choices) {
      if (choice === 0) continue // skip base choice

      const altKey = `${group},${choice}`
      const altKeys = groupChoiceKeys.get(altKey) ?? []

      // hiddenKeys = matrix positions of base (choice=0) keys in this group
      const hiddenKeys: [number, number][] = []
      for (const bk of baseKeys) {
        if (bk.row >= 0 && bk.col >= 0) {
          hiddenKeys.push([bk.row, bk.col])
        }
      }

      // shapeOverrides: if alternative key has different w/h/r/lshape than base key at same position
      const shapeOverrides: Record<string, { w?: number, h?: number, r?: number, lshape?: LShape }> = {}
      for (const ak of altKeys) {
        if (ak.row < 0 || ak.col < 0) continue
        // Find base key at same matrix position
        const baseAtPos = baseKeys.find(bk => bk.row === ak.row && bk.col === ak.col)
        if (baseAtPos) {
          const overrides: { w?: number, h?: number, r?: number, lshape?: LShape } = {}
          if (ak.w !== baseAtPos.w) overrides.w = ak.w
          if (ak.h !== baseAtPos.h) overrides.h = ak.h
          if (ak.r !== baseAtPos.r) overrides.r = ak.r
          if (ak.lshape !== undefined || baseAtPos.lshape !== undefined) {
            if (JSON.stringify(ak.lshape) !== JSON.stringify(baseAtPos.lshape)) {
              overrides.lshape = ak.lshape
            }
          }
          if (Object.keys(overrides).length > 0) {
            shapeOverrides[`${ak.row},${ak.col}`] = overrides
          }
        }
      }

      variants.push({
        id: nanoid(),
        name: `Option ${group + 1}.${choice}`,
        hiddenKeys,
        shapeOverrides,
      })
    }
  }

  return { keys, encoders, matrixRows, matrixCols, variants }
}
