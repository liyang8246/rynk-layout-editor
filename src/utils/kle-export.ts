/**
 * KLE JSON export — uses @liyang8246/kle-serial's serialize() to produce
 * correct KLE JSON with proper row grouping, relative coordinates, and
 * incremental property encoding.
 *
 * The internal KeyData model uses KLE conventions (top-left x/y, rx/ry
 * rotation, x2/y2 L-shape offsets), so we map directly to the library's
 * key format and let it handle serialization.
 */

import { serialize } from '@liyang8246/kle-serial'
import type { LayoutState } from '../stores/layout'

// ── Helpers ────────────────────────────────────────────────────────────────────

function round4(v: number): number {
  return Math.round(v * 1e4) / 1e4
}

// ── Export ─────────────────────────────────────────────────────────────────────

/**
 * Export a LayoutState as a KLE JSON string.
 *
 * Converts internal KeyData/EncoderData to the kle-serial key format,
 * then uses the library's serialize() for correct KLE output.
 */
export function exportKleJson(state: LayoutState): string {
  // Build kle-serial compatible key objects from our internal data
  const kleKeys: KLEKey[] = []

  // Emit keys
  for (const key of state.keys) {
    const kleKey: KLEKey = {
      x: key.x,
      y: key.y,
      width: key.w,
      height: key.h,
      rotation_angle: key.r,
      rotation_x: key.rx,
      rotation_y: key.ry,
      x2: key.lshape?.x2 ?? 0,
      y2: key.lshape?.y2 ?? 0,
      width2: key.lshape?.w2 ?? key.w,
      height2: key.lshape?.h2 ?? key.h,
      labels: [],
      textColor: [],
      textSize: [],
      color: '#cccccc',
      profile: '',
      nub: false,
      ghost: false,
      stepped: false,
      decal: false,
      sm: '',
      sb: '',
      st: '',
      default: {
        textColor: '#000000',
        textSize: 3,
      },
    }

    // Build labels array from matrix assignment and option annotation
    // labels[0] = "row,col" if assigned
    // labels[9] = "groupId,choiceId" if option assigned (Vial convention)
    const labels: string[] = []
    if (key.row >= 0 && key.col >= 0) {
      labels[0] = `${key.row},${key.col}`
    }
    if (key.option) {
      labels[9] = `${key.option.groupId},${key.option.choiceId}`
    }
    kleKey.labels = labels

    kleKeys.push(kleKey)
  }

  // Emit encoders — two 1u keys (CCW and CW) side by side
  for (const encoder of state.encoders) {
    // CCW key (direction 0)
    kleKeys.push({
      x: round4(encoder.x),
      y: round4(encoder.y),
      width: 1,
      height: 1,
      rotation_angle: 0,
      rotation_x: 0,
      rotation_y: 0,
      x2: 0,
      y2: 0,
      width2: 1,
      height2: 1,
      labels: [`${encoder.encoderIndex},0`, '', '', '', '', '', '', '', '', 'e'],
      textColor: [],
      textSize: [],
      color: '#cccccc',
      profile: '',
      nub: false,
      ghost: false,
      stepped: false,
      decal: false,
      sm: '',
      sb: '',
      st: '',
      default: {
        textColor: '#000000',
        textSize: 3,
      },
    })

    // CW key (direction 1)
    kleKeys.push({
      x: round4(encoder.x + 1),
      y: round4(encoder.y),
      width: 1,
      height: 1,
      rotation_angle: 0,
      rotation_x: 0,
      rotation_y: 0,
      x2: 0,
      y2: 0,
      width2: 1,
      height2: 1,
      labels: [`${encoder.encoderIndex},1`, '', '', '', '', '', '', '', '', 'e'],
      textColor: [],
      textSize: [],
      color: '#cccccc',
      profile: '',
      nub: false,
      ghost: false,
      stepped: false,
      decal: false,
      sm: '',
      sb: '',
      st: '',
      default: {
        textColor: '#000000',
        textSize: 3,
      },
    })
  }

  // Use kle-serial's serialize to produce the correct KLE JSON structure
  const serialized = serialize({ meta: {} as any, keys: kleKeys as any })
  return JSON.stringify(serialized, null, 2)
}

/** Minimal type matching kle-serial's key output format */
interface KLEKey {
  x: number
  y: number
  width: number
  height: number
  rotation_angle: number
  rotation_x: number
  rotation_y: number
  x2: number
  y2: number
  width2: number
  height2: number
  labels: string[]
  textColor: string[]
  textSize: (number | undefined)[]
  color: string
  profile: string
  nub: boolean
  ghost: boolean
  stepped: boolean
  decal: boolean
  sm: string
  sb: string
  st: string
  default: {
    textColor: string
    textSize: number
  }
}
