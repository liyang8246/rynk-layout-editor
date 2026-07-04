/**
 * KLE JSON export — converts Rynk center-based layout state back to
 * KLE's top-left + cluster-rotation model.
 *
 * Each key gets its own KLE row, placed absolutely with
 * rx/ry = key center, x = -w/2, y = -h/2. This achieves
 * center rotation in KLE's model (since KLE rotates about rx,ry).
 * Encoders become two 1u CW/CCW switches side by side.
 */

import type { LayoutState } from '../stores/layout'
import { rynkLshapeToKle } from './geometry'

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
 * Each key/encoder is emitted on its own KLE row with absolute positioning.
 * Keys use rx/ry at their center so that KLE's rotation about (rx,ry)
 * equals Rynk's center rotation.
 */
export function exportKleJson(state: LayoutState): string {
  const rows: unknown[] = []

  // Emit keys
  for (const key of state.keys) {
    // Skip unassigned keys (no label)
    if (key.row < 0 || key.col < 0) continue

    const props: Record<string, number> = {}
    props.r = round(key.r)
    props.rx = round(key.x)      // rotation origin at key center
    props.ry = round(key.y)      // rotation origin at key center
    props.x = round(-key.w / 2)  // step back from center to top-left
    props.y = round(-key.h / 2)

    if (!approx(key.w, 1)) props.w = round(key.w)
    if (!approx(key.h, 1)) props.h = round(key.h)

    // Handle L-shape
    if (key.lshape) {
      const kleLshape = rynkLshapeToKle(
        key.lshape.x2,
        key.lshape.y2,
        key.lshape.w2,
        key.lshape.h2,
        key.w,
        key.h,
      )
      props.x2 = round(kleLshape.x2)
      props.y2 = round(kleLshape.y2)
      props.w2 = round(kleLshape.w2)
      props.h2 = round(kleLshape.h2)
    }

    const legend = `${key.row},${key.col}`
    rows.push([props, legend])
  }

  // Emit encoders — two 1u keys (CCW and CW) side by side
  for (const encoder of state.encoders) {
    // CCW key (direction 0)
    const ccwProps: Record<string, number> = {
      r: 0,
      rx: round(encoder.x - 0.5),
      ry: round(encoder.y),
      x: round(-0.5),
      y: round(-0.5),
    }
    const ccwLegend = `${encoder.encoderIndex},0\n\n\n\n\n\n\n\n\ne`
    rows.push([ccwProps, ccwLegend])

    // CW key (direction 1)
    const cwProps: Record<string, number> = {
      r: 0,
      rx: round(encoder.x + 0.5),
      ry: round(encoder.y),
      x: round(-0.5),
      y: round(-0.5),
    }
    const cwLegend = `${encoder.encoderIndex},1\n\n\n\n\n\n\n\n\ne`
    rows.push([cwProps, cwLegend])
  }

  return JSON.stringify(rows, null, 2)
}
