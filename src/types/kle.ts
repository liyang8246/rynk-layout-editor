import type { EncoderData, KeyData, OptionGroup } from './layout'

/** Result of parsing KLE JSON */
export interface KleImportResult {
  keys: KeyData[]
  encoders: EncoderData[]
  matrixRows: number
  matrixCols: number
  optionGroups: OptionGroup[]
  activeChoices: Record<number, number>
}

/** Minimal type matching kle-serial's key output format for export */
export interface KLEKey {
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
