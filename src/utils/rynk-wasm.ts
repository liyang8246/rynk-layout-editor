/**
 * rynk-kle WASM wrapper — lazy-loads the WASM module on first use.
 *
 * The WASM package is built with `wasm-pack build --features wasm --target web`
 * from `.slim/clonedeps/repos/HaoboGu__rmk/rynk/rynk-kle/`.
 *
 * Exported WASM functions:
 * - convert_kle(json: string) → { display_toml, inner_layout_toml, warnings }
 * - decode_layout(toml_text: string) → LayoutInfo
 * - keyboard_toml_to_vial(toml_text: string) → string
 */

import type { ConvertKleResult } from '../types'

let initPromise: Promise<void> | null = null
let wasmModule: typeof import('../wasm/rynk-kle/rynk_kle') | null = null

async function ensureInit(): Promise<void> {
  if (wasmModule) return
  if (initPromise) {
    await initPromise
    return
  }
  initPromise = (async () => {
    const mod = await import('../wasm/rynk-kle/rynk_kle')
    wasmModule = mod
  })()
  await initPromise
}

/**
 * Convert KLE JSON or Vial JSON to Rynk Layout TOML.
 *
 * @param json - KLE JSON export array or Vial keyboard definition
 * @returns The generated TOML and any warnings
 * @throws Error if WASM fails to load or conversion fails
 */
export async function convertKle(json: string): Promise<ConvertKleResult> {
  await ensureInit()
  if (!wasmModule) throw new Error('rynk-kle WASM not initialized')
  return wasmModule.convert_kle(json) as ConvertKleResult
}

/**
 * Decode a `[layout]` TOML section into a LayoutInfo object.
 *
 * @param tomlText - keyboard.toml text or [layout] TOML body
 * @returns Decoded LayoutInfo
 */
export async function decodeLayout(tomlText: string): Promise<unknown> {
  await ensureInit()
  if (!wasmModule) throw new Error('rynk-kle WASM not initialized')
  return wasmModule.decode_layout(tomlText)
}

/**
 * Convert keyboard.toml text to a minimal vial.json.
 *
 * @param tomlText - Full keyboard.toml text
 * @returns Pretty-printed vial.json string
 */
export async function keyboardTomlToVial(tomlText: string): Promise<string> {
  await ensureInit()
  if (!wasmModule) throw new Error('rynk-kle WASM not initialized')
  return wasmModule.keyboard_toml_to_vial(tomlText)
}
