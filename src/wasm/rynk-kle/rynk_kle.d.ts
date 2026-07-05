/* tslint:disable */
/* eslint-disable */

/**
 * KLE export or vial.json text → `{ display_toml, inner_layout_toml, warnings }`.
 */
export function convert_kle(json: string): any;

/**
 * `[layout]` TOML text → the decoded `LayoutInfo` as a plain JS object,
 * for rendering a preview.
 */
export function decode_layout(toml_text: string): any;

/**
 * keyboard.toml text → a minimal vial.json, pretty-printed.
 */
export function keyboard_toml_to_vial(toml_text: string): string;
