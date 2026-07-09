/** Round to 4 decimal places (matches kle-serial's roundTo4 convention) */
export const round4 = (v: number): number => Math.round(v * 1e4) / 1e4

/** Snap to 0.25 grid (used for key positions after drag/keyboard move) */
export const snap = (v: number): number => Math.round(v * 4) / 4
