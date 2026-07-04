# Rynk Layout Editor

A web-based keyboard layout editor that outputs Rynk settings for the RMK keyboard firmware, with wiring/matrix auto-generation support.

## Mandatory Skill Loading

Before writing any SolidJS code, load the `solidjs` skill. Before writing any HTML/JSX or using daisyUI components, load the `daisyui` skill (and its sub-skills `daisyui-usage`, `daisyui-colors`, `daisyui-config` as needed). These skills contain mandatory rules and patterns that must be followed.

## Cloned Dependency Source

Read-only dependency source repositories are available under `.slim/clonedeps/repos/` for inspection. Do not edit these clones.

- `.slim/clonedeps/repos/HaoboGu__rmk/` — `HaoboGu/rmk` at `feat/rynk_layout`; KLE→Rynk TOML conversion logic, data structures, and WASM bindings (key path: `rynk/rynk-kle/`).
- `.slim/clonedeps/repos/ijprest__keyboard-layout-editor/` — `ijprest/keyboard-layout-editor` at `master`; KLE JSON schema, key metadata, and rendering reference.
