/**
 * Rynk TOML export — generates the `[layout]` section for an RMK keyboard.toml.
 *
 * Ported from the Rust reference at `rmk/rynk-kle/src/to_layout.rs`.
 * The core algorithm is a cursor-walk map generation that mirrors KLE's
 * positional convention: rows are bucketed by y proximity, keys within a row
 * are walked left-to-right, and gaps/nudges become `[gap]` / `x` shape fields.
 */

import type { LayoutState, KeyData, EncoderData } from '../stores/layout'

// ── Constants & helpers ─────────────────────────────────────────────────────────

const EPS = 1e-4

function approx(a: number, b: number): boolean {
  return Math.abs(a - b) < EPS
}

/** Format a number for TOML: always has a decimal point, trimmed noise digits. */
function fmt(v: number): string {
  const r = Math.round(v * 1e4) / 1e4
  if (approx(r, Math.round(r))) return r.toFixed(1)
  let s = r.toFixed(4)
  while (s.endsWith('0')) s = s.slice(0, -1)
  return s
}

// ── Shape descriptor ────────────────────────────────────────────────────────────

interface ShapeDesc {
  w: number
  h: number
  x: number   // nudge from cursor (non-zero for backward jumps)
  y: number   // vertical offset from row baseline
  r: number   // rotation degrees
  rect2?: { w2: number, h2: number, x2: number, y2: number }
}

function isPlainShape(d: ShapeDesc): boolean {
  return approx(d.w, 1)
    && approx(d.h, 1)
    && approx(d.x, 0)
    && approx(d.y, 0)
    && approx(d.r, 0)
    && d.rect2 === undefined
}

/** Quantized key for deduplication. */
function shapeKey(d: ShapeDesc): string {
  const q = (v: number) => Math.round(v * 1e4)
  const parts = [q(d.w), q(d.h), q(d.x), q(d.y), q(d.r)]
  if (d.rect2) {
    parts.push(1, q(d.rect2.w2), q(d.rect2.h2), q(d.rect2.x2), q(d.rect2.y2))
  } else {
    parts.push(0)
  }
  return parts.join(',')
}

/** Render a ShapeDesc as a TOML inline table. */
function shapeToml(d: ShapeDesc): string {
  const parts: string[] = []
  if (!approx(d.w, 1)) parts.push(`w = ${fmt(d.w)}`)
  if (!approx(d.h, 1)) parts.push(`h = ${fmt(d.h)}`)
  if (!approx(d.x, 0)) parts.push(`x = ${fmt(d.x)}`)
  if (!approx(d.y, 0)) parts.push(`y = ${fmt(d.y)}`)
  if (!approx(d.r, 0)) parts.push(`r = ${fmt(d.r)}`)
  if (d.rect2) {
    parts.push(`w2 = ${fmt(d.rect2.w2)}`)
    parts.push(`h2 = ${fmt(d.rect2.h2)}`)
    parts.push(`x2 = ${fmt(d.rect2.x2)}`)
    parts.push(`y2 = ${fmt(d.rect2.y2)}`)
  }
  if (parts.length === 0) {
    // A deliberate 1u reset shape (used to shrink a wide key in a variant).
    return '{ w = 1.0 }'
  }
  return `{ ${parts.join(', ')} }`
}

// ── Shape registry ──────────────────────────────────────────────────────────────

/** Stock widths that don't need a `[layout.shapes]` entry. */
const STOCK_WIDTHS: [number, string][] = [
  [1.25, '1.25u'],
  [1.5, '1.5u'],
  [1.75, '1.75u'],
  [2.0, '2u'],
  [2.25, '2.25u'],
  [2.75, '2.75u'],
  [3.0, '3u'],
  [6.25, '6.25u'],
  [7.0, '7u'],
]

class ShapeRegistry {
  private order: string[] = []
  private byKey = new Map<string, string>()
  private defs = new Map<string, ShapeDesc>()
  private counter = 0

  /** Get or create a shape name for the given descriptor. */
  nameFor(d: ShapeDesc): string {
    // Stock shapes: pure width/height changes, no nudge/rotation/L-shape.
    if (approx(d.x, 0) && approx(d.y, 0) && approx(d.r, 0) && d.rect2 === undefined) {
      if (approx(d.h, 1)) {
        for (const [w, name] of STOCK_WIDTHS) {
          if (approx(d.w, w)) return name
        }
      }
      if (approx(d.w, 1) && approx(d.h, 2)) return '2u_tall'
    }

    const key = shapeKey(d)
    const existing = this.byKey.get(key)
    if (existing !== undefined) return existing

    this.counter++
    const name = `s${this.counter}`
    this.byKey.set(key, name)
    this.defs.set(name, { ...d, rect2: d.rect2 ? { ...d.rect2 } : undefined })
    this.order.push(name)
    return name
  }

  /** Iterate generated (non-stock) shapes in registration order. */
  *generated(): IterableIterator<[string, ShapeDesc]> {
    for (const n of this.order) {
      yield [n, this.defs.get(n)!]
    }
  }
}

// ── Row bucketing ───────────────────────────────────────────────────────────────

/** A map unit: either a key or an encoder, positioned for the cursor walk. */
type MapUnit =
  | { type: 'key', key: KeyData, displayX: number, displayY: number }
  | { type: 'encoder', encoder: EncoderData, displayX: number, displayY: number }

/**
 * Group keys and encoders into visual rows by y proximity (within 0.5u).
 * Within each row, sort by x position.
 */
function bucketByRow(units: MapUnit[]): MapUnit[][] {
  if (units.length === 0) return []

  // Sort by y first, then x
  const sorted = [...units].sort((a, b) => a.displayY - b.displayY || a.displayX - b.displayX)

  const rows: MapUnit[][] = []
  for (const unit of sorted) {
    const existingRow = rows.find(row =>
      Math.abs(row[0].displayY - unit.displayY) < 0.5,
    )
    if (existingRow) {
      existingRow.push(unit)
    } else {
      rows.push([unit])
    }
  }

  // Sort each row by x
  for (const row of rows) {
    row.sort((a, b) => a.displayX - b.displayX)
  }

  return rows
}

// ── L-shape handling ────────────────────────────────────────────────────────────

/**
 * Build the rect2 portion of a ShapeDesc from a key's LShape.
 *
 * Our store uses Rynk center-offset convention for x2/y2 (offset from primary
 * center to secondary center). The TOML shape also uses center-offset convention,
 * so we can pass them through directly.
 */
function buildRect2(key: KeyData): { w2: number, h2: number, x2: number, y2: number } | undefined {
  if (!key.lshape) return undefined
  return {
    w2: key.lshape.w2,
    h2: key.lshape.h2,
    x2: key.lshape.x2,
    y2: key.lshape.y2,
  }
}

// ── Main export function ────────────────────────────────────────────────────────

export function exportRynkToml(state: LayoutState): string {
  const warnings: string[] = []

  // 1. Filter keys: skip unassigned matrix positions
  const validKeys = state.keys.filter(k => {
    if (k.row < 0 || k.col < 0) {
      warnings.push(`Key at (${fmt(k.x)}, ${fmt(k.y)}) has no matrix assignment — skipped`)
      return false
    }
    return true
  })

  // 2. Build map units (keys + encoders interleaved by position)
  const units: MapUnit[] = []

  for (const key of validKeys) {
    units.push({
      type: 'key',
      key,
      displayX: key.x - key.w / 2,
      displayY: key.y - key.h / 2,
    })
  }

  for (const enc of state.encoders) {
    units.push({
      type: 'encoder',
      encoder: enc,
      displayX: enc.x - 0.5, // encoders are 1u knobs
      displayY: enc.y - 0.5,
    })
  }

  // 3. Bucket into rows
  const rows = bucketByRow(units)

  // 4. Compute matrix dimensions (bump if keys exceed declared size)
  let rows_dim = state.matrixRows
  let cols_dim = state.matrixCols
  if (validKeys.length > 0) {
    const maxRow = Math.max(...validKeys.map(k => k.row))
    const maxCol = Math.max(...validKeys.map(k => k.col))
    rows_dim = Math.max(rows_dim, maxRow + 1)
    cols_dim = Math.max(cols_dim, maxCol + 1)
  }

  // 5. Cursor-walk the map
  const reg = new ShapeRegistry()
  const mapLines: string[] = []
  // Track shape name assigned to each key's (row,col) for variant comparison
  const mapShape = new Map<string, string>()  // "row,col" -> shapeName
  const cellBaseline = new Map<string, number>() // "row,col" -> baseline

  let prevBaseline: number | undefined

  for (const row of rows) {
    // Baseline = first unit's display top-left y
    const baseline = row[0].displayY

    // Vertical step from previous row
    if (prevBaseline !== undefined) {
      const vstep = baseline - prevBaseline - 1.0
      if (!approx(vstep, 0)) {
        mapLines.push(`[y=${fmt(vstep)}]`)
      }
    }

    let cursorX = 0
    const rowTokens: string[] = []

    for (const unit of row) {
      const displayX = unit.displayX
      const gap = displayX - cursorX
      let xNudge = 0

      if (gap > EPS) {
        rowTokens.push(`[${fmt(gap)}]`)
      } else if (gap < -EPS) {
        // Backward jump: carry in shape's x nudge, cursor does NOT move backward
        xNudge = gap
      }

      if (unit.type === 'key') {
        const key = unit.key
        const rc = `${key.row},${key.col}`
        cellBaseline.set(rc, baseline)

        // Build shape descriptor
        const rect2 = buildRect2(key)
        const desc: ShapeDesc = {
          w: key.w,
          h: key.h,
          x: xNudge,
          y: unit.displayY - baseline,
          r: key.r,
          rect2,
        }

        if (isPlainShape(desc)) {
          rowTokens.push(`(${key.row},${key.col})`)
        } else {
          const name = reg.nameFor(desc)
          mapShape.set(rc, name)
          rowTokens.push(`(${key.row},${key.col},@${name})`)
        }

        // Advance cursor: from un-nudged base + width
        cursorX = displayX - xNudge + key.w
      } else {
        // Encoder: always a 1u knob, no shape needed
        rowTokens.push(`(e,${unit.encoder.encoderIndex})`)
        cursorX = displayX + 1 // 1u wide
      }
    }

    mapLines.push(rowTokens.join(' '))
    prevBaseline = baseline
  }

  // 6. Variant sections
  const variantSections: string[] = []

  for (const variant of state.variants) {
    const parts: string[] = []
    parts.push(`name = "${variant.name}"`)

    // Hidden keys
    if (variant.hiddenKeys.length > 0) {
      const hiddenList = variant.hiddenKeys
        .map(([r, c]) => `"(${r},${c})"`)
        .join(', ')
      parts.push(`hidden = [${hiddenList}]`)
    }

    // Shape overrides
    if (Object.keys(variant.shapeOverrides).length > 0) {
      const entries: string[] = []
      for (const [rc, override] of Object.entries(variant.shapeOverrides)) {
        // Build a shape descriptor from the override applied to the base key
        const baseKey = validKeys.find(k => `${k.row},${k.col}` === rc)
        const w = override.w ?? baseKey?.w ?? 1
        const h = override.h ?? baseKey?.h ?? 1
        const r = override.r ?? baseKey?.r ?? 0
        const rect2 = override.lshape
          ? { w2: override.lshape.w2, h2: override.lshape.h2, x2: override.lshape.x2, y2: override.lshape.y2 }
          : baseKey?.lshape
            ? { w2: baseKey.lshape.w2, h2: baseKey.lshape.h2, x2: baseKey.lshape.x2, y2: baseKey.lshape.y2 }
            : undefined

        const desc: ShapeDesc = { w, h, x: 0, y: 0, r, rect2 }

        // Compare with the map's shape for this key
        const mapShapeName = mapShape.get(rc)
        let overrideShapeName: string

        if (isPlainShape(desc)) {
          // Reset to 1u plain — register a plain reset shape
          overrideShapeName = reg.nameFor({ w: 1, h: 1, x: 0, y: 0, r: 0 })
        } else {
          overrideShapeName = reg.nameFor(desc)
        }

        // Only emit if different from the map's shape
        if (overrideShapeName !== mapShapeName) {
          entries.push(`"(${rc})" = "@${overrideShapeName}"`)
        }
      }

      if (entries.length > 0) {
        parts.push(`shapes = { ${entries.join(', ')} }`)
      }
    }

    variantSections.push(parts.join('\n'))
  }

  // 7. Assemble TOML
  const lines: string[] = []

  lines.push('[layout]')
  lines.push(`rows = ${rows_dim}`)
  lines.push(`cols = ${cols_dim}`)

  // Default variant
  const defaultVariant = state.variants.length > 0 ? 'default' : ''
  if (defaultVariant) {
    lines.push(`default_variant = "${defaultVariant}"`)
  }

  lines.push(`map = """`)
  lines.push(mapLines.join('\n'))
  lines.push(`"""`)

  // Shapes section
  const shapeDefs = [...reg.generated()]
  if (shapeDefs.length > 0) {
    lines.push('')
    lines.push('[layout.shapes]')
    for (const [name, desc] of shapeDefs) {
      lines.push(`${name} = ${shapeToml(desc)}`)
    }
  }

  // Variant sections
  for (const section of variantSections) {
    lines.push('')
    lines.push('[[layout.variant]]')
    lines.push(section)
  }

  return lines.join('\n')
}
