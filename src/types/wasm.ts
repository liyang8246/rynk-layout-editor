/** Result of converting KLE JSON to Rynk Layout TOML */
export interface ConvertKleResult {
  display_toml: string
  inner_layout_toml: string
  warnings: string[]
}
