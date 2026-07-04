/**
 * Geometry helpers for keyboard layout coordinate conversion.
 *
 * Our internal model stores key center coordinates (Rynk convention).
 * KLE uses top-left coordinates with cluster-based rotation (rx, ry).
 * These helpers bridge the two models.
 */

// ── Center ↔ Top-left ──────────────────────────────────────────────────────────

/** Convert center + size to top-left position */
export function centerToTopLeft(cx: number, cy: number, w: number, h: number): [number, number] {
  return [cx - w / 2, cy - h / 2]
}

/** Convert top-left + size to center position */
export function topLeftToCenter(x: number, y: number, w: number, h: number): [number, number] {
  return [x + w / 2, y + h / 2]
}

// ── Rotation ───────────────────────────────────────────────────────────────────

/** Rotate a point about an origin by the given angle (degrees, CW positive in screen space) */
export function rotatePoint(
  px: number,
  py: number,
  ox: number,
  oy: number,
  angleDeg: number,
): [number, number] {
  if (angleDeg === 0) return [px, py]
  const rad = angleDeg * Math.PI / 180
  const sin = Math.sin(rad)
  const cos = Math.cos(rad)
  const dx = px - ox
  const dy = py - oy
  return [
    ox + dx * cos - dy * sin,
    oy + dx * sin + dy * cos,
  ]
}

/**
 * Convert KLE cluster rotation to Rynk center rotation.
 *
 * KLE rotates the key about cluster origin (rx, ry), so the key center moves.
 * Rynk rotates about the key's own center.
 *
 * Returns the display top-left position and the rotation angle for Rynk.
 */
export function kleToRynkRotation(
  kleX: number,
  kleY: number,
  kleW: number,
  kleH: number,
  r: number,
  rx: number,
  ry: number,
): { displayX: number, displayY: number, rotation: number } {
  if (r === 0)
    return { displayX: kleX, displayY: kleY, rotation: 0 }

  // Rotate the key's center about the cluster origin
  const [cx, cy] = topLeftToCenter(kleX, kleY, kleW, kleH)
  const [rcx, rcy] = rotatePoint(cx, cy, rx, ry, r)

  // Display top-left = rotated center minus half size
  const [displayX, displayY] = centerToTopLeft(rcx, rcy, kleW, kleH)

  return { displayX, displayY, rotation: r }
}

// ── L-Shape ────────────────────────────────────────────────────────────────────

/**
 * Convert KLE L-shape offsets to Rynk rect2 center-offset.
 *
 * KLE: x2/y2 are offsets from the primary top-left, w2/h2 is the secondary size.
 * Rynk: rect2 x2/y2 are the offset from the primary CENTER to the secondary CENTER.
 */
export function kleLshapeToRynk(
  kleX2: number,
  kleY2: number,
  kleW2: number,
  kleH2: number,
  primaryW: number,
  primaryH: number,
): { x2: number, y2: number, w2: number, h2: number } {
  const rynkX2 = kleX2 + kleW2 / 2 - primaryW / 2
  const rynkY2 = kleY2 + kleH2 / 2 - primaryH / 2
  return { x2: rynkX2, y2: rynkY2, w2: kleW2, h2: kleH2 }
}

/**
 * Convert Rynk rect2 center-offset back to KLE L-shape offsets.
 *
 * Inverse of kleLshapeToRynk.
 */
export function rynkLshapeToKle(
  rynkX2: number,
  rynkY2: number,
  rynkW2: number,
  rynkH2: number,
  primaryW: number,
  primaryH: number,
): { x2: number, y2: number, w2: number, h2: number } {
  const kleX2 = rynkX2 - rynkW2 / 2 + primaryW / 2
  const kleY2 = rynkY2 - rynkH2 / 2 + primaryH / 2
  return { x2: kleX2, y2: kleY2, w2: rynkW2, h2: rynkH2 }
}
