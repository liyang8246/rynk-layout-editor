/**
 * KLE JSON export — the internal data model is already KLE-compatible
 * (top-left coordinates, cluster rotation rx/ry, KLE L-shape offsets),
 * so export is a direct mapping.
 */

import type { LayoutState } from '../stores/layout'

// ── Helpers ────────────────────────────────────────────────────────────────────

const EPS = 1e-4

function approx(a: number, b: number): boolean {
  return Math.abs(a - b) < EPS
}

function round(v: number): number {
  return Math.round(v * 1e4) / 1e4
}

// ── Export ─────────────────────────────────────────────────────────────────────

/**
 * Export a LayoutState as a KLE JSON string.
 *
 * Each key is emitted on its own KLE row with absolute positioning.
 * Since the internal model uses KLE conventions (top-left x/y, rx/ry rotation),
 * no coordinate conversion is needed.
 */
export function exportKleJson(state: LayoutState): string {
  const rows: unknown[] = []

  // Emit keys
  for (const key of state.keys) {
    const props: Record<string, number> = {}

    if (!approx(key.r, 0)) {
      props.r = round(key.r)
      props.rx = round(key.rx)
      props.ry = round(key.ry)
    }

    props.x = round(key.x)
    props.y = round(key.y)

    if (!approx(key.w, 1)) props.w = round(key.w)
    if (!approx(key.h, 1)) props.h = round(key.h)

    // Handle L-shape (already in KLE offset convention)
    if (key.lshape) {
      props.x2 = round(key.lshape.x2)
      props.y2 = round(key.lshape.y2)
      props.w2 = round(key.lshape.w2)
      props.h2 = round(key.lshape.h2)
    }

    const legend = key.row >= 0 && key.col >= 0 ? `${key.row},${key.col}` : ''
    rows.push([props, legend])
  }

  // Emit encoders — two 1u keys (CCW and CW) side by side
  for (const encoder of state.encoders) {
    // CCW key (direction 0)
    const ccwProps: Record<string, number> = {
      x: round(encoder.x),
      y: round(encoder.y),
    }
    const ccwLegend = `${encoder.encoderIndex},0\n\n\n\n\n\n\n\n\ne`
    rows.push([ccwProps, ccwLegend])

    // CW key (direction 1)
    const cwProps: Record<string, number> = {
      x: round(encoder.x + 1),
      y: round(encoder.y),
    }
    const cwLegend = `${encoder.encoderIndex},1\n\n\n\n\n\n\n\n\ne`
    rows.push([cwProps, cwLegend])
  }

  return JSON.stringify(rows, null, 2)
}
