import type { EncoderData, KeyData, KleImportResult, LShape, OptionGroup } from '../types'
import { parse as kleParse } from '@liyang8246/kle-serial'
import { nanoid } from 'nanoid'
import { round4 } from './math'

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
 * Parse layout option annotation from KLE key labels.
 * The Vial convention stores groupId,choiceId in the 10th label field (index 9).
 * The kle-serial library provides labels as a string array.
 */
function parseOptionFromLabels(labels: string[]): { groupId: number, choiceId: number } | undefined {
  if (!labels || labels.length < 10) return undefined
  // The 10th label field (index 9) contains the group,choice annotation
  const field = labels[9]
  if (!field) return undefined
  const match = field.trim().match(/^(\d+),(\d+)$/)
  if (match) {
    return { groupId: Number.parseInt(match[1]), choiceId: Number.parseInt(match[2]) }
  }
  return undefined
}

/**
 * Parse a KLE JSON string and convert to layout data.
 *
 * - x/y stored as KLE top-left coordinates (no center conversion)
 * - rotation stored as-is from KLE (rotation_angle, rotation_x, rotation_y)
 * - L-shape stored as-is from KLE (no conversion of x2/y2/w2/h2)
 * - Encoder detection: keys with "e" marker in labels are grouped into EncoderData
 * - Row/col parsed from labels[0] (format: "row,col")
 * - Layout option annotations parsed from labels[9] (format: "groupId,choiceId")
 * - Matrix dimensions computed from spatial layout only
 */
export function parseKleJson(json: string): KleImportResult {
  const keyboard = kleParse(json)

  const keys: KeyData[] = []
  const encoders: EncoderData[] = []
  const optionGroupsSeen = new Map<number, Set<number>>() // groupId → set of choiceIds

  // Collect encoder keys for grouping after the main loop
  const encoderKeys: { encoderIndex: number, direction: number, x: number, y: number }[] = []

  for (const kleKey of keyboard.keys) {
    // Skip decals and ghost keys
    if (kleKey.decal || kleKey.ghost) continue

    const { x, y, width, height, rotation_angle, rotation_x, rotation_y, x2, y2, width2, height2 } = kleKey

    // Parse labels
    const labels = kleKey.labels as string[] | undefined

    // Check if this is an encoder key (any label field contains just "e")
    const isEncoder = labels && labels.some(l => l && l.trim() === 'e')

    // Parse row,col from first label (labels[0])
    let row = -1
    let col = -1
    if (labels && labels[0]) {
      const match = labels[0].trim().match(/^(\d+),(\d+)$/)
      if (match) {
        row = Number.parseInt(match[1])
        col = Number.parseInt(match[2])
      }
    }

    // Handle encoder keys — collect and skip adding to keys array
    if (isEncoder) {
      if (labels && labels[0]) {
        const match = labels[0].trim().match(/^(\d+),(\d+)$/)
        if (match) {
          encoderKeys.push({
            encoderIndex: Number.parseInt(match[1]),
            direction: Number.parseInt(match[2]),
            x: round4(x),
            y: round4(y),
          })
        }
      }
      continue
    }

    // Handle L-shape — only if secondary rect genuinely differs from primary
    let lshape: LShape | undefined
    if (hasRect2(x2, y2, width2, height2, width, height)) {
      lshape = { x2: round4(x2), y2: round4(y2), w2: round4(width2), h2: round4(height2) }
      // KLE convention: x2/y2 are offsets from primary top-left to secondary top-left
      // No conversion needed — store as-is
    }

    // Check for layout option annotation in labels
    const option = parseOptionFromLabels(labels!)
    if (option) {
      if (!optionGroupsSeen.has(option.groupId)) {
        optionGroupsSeen.set(option.groupId, new Set())
      }
      optionGroupsSeen.get(option.groupId)!.add(option.choiceId)
    }

    keys.push({
      id: nanoid(),
      x: round4(x), // top-left X (KLE convention, rounded to 4dp)
      y: round4(y), // top-left Y (KLE convention, rounded to 4dp)
      w: round4(width),
      h: round4(height),
      r: round4(rotation_angle), // rotation angle (degrees)
      rx: round4(rotation_x), // rotation origin X (KLE convention)
      ry: round4(rotation_y), // rotation origin Y (KLE convention)
      lshape,
      row, // parsed from labels[0] or -1
      col, // parsed from labels[0] or -1
      option,
    })
  }

  // Group encoder keys by encoderIndex and create EncoderData entries
  const encoderGroups = new Map<number, { x: number, y: number }[]>()
  for (const ek of encoderKeys) {
    let group = encoderGroups.get(ek.encoderIndex)
    if (!group) {
      group = []
      encoderGroups.set(ek.encoderIndex, group)
    }
    group.push({ x: ek.x, y: ek.y })
  }

  for (const [encoderIndex, positions] of encoderGroups) {
    // Compute center from the pair (or single key if unpaired)
    // The export places CCW at (encoder.x, encoder.y) and CW at (encoder.x+1, encoder.y)
    // so the center is the average minus 0.5 offset
    const avgX = positions.reduce((s, p) => s + p.x, 0) / positions.length
    const avgY = positions.reduce((s, p) => s + p.y, 0) / positions.length
    encoders.push({
      id: nanoid(),
      encoderIndex,
      x: avgX,
      y: avgY,
    })
  }

  // Build OptionGroup entries from the seen groups/choices
  const optionGroups: OptionGroup[] = []
  const activeChoices: Record<number, number> = {}
  for (const [groupId, choiceIds] of optionGroupsSeen) {
    const sortedChoices = [...choiceIds].sort((a, b) => a - b)
    const choices = sortedChoices.map(cid => ({
      id: cid,
      name: cid === 0 ? 'Default' : cid === 1 ? 'Alternate' : `Choice ${cid}`,
    }))
    optionGroups.push({ id: groupId, name: `Group ${groupId}`, choices })
    activeChoices[groupId] = 0 // default to first choice
  }
  // Sort groups by id for consistent ordering
  optionGroups.sort((a, b) => a.id - b.id)

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

  return { keys, encoders, matrixRows, matrixCols, optionGroups, activeChoices }
}
