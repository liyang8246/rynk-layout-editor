# Rynk Layout Editor

Web-based keyboard layout editor for Rynk (RMK firmware). Outputs Rynk Layout TOML with wiring/matrix auto-generation.

## Mandatory Skill Loading

Before writing any SolidJS code, load the `solidjs` skill. Before writing any HTML/JSX or using daisyUI components, load the `daisyui` skill (and its sub-skills `daisyui-usage`, `daisyui-colors`, `daisyui-config` as needed). These skills contain mandatory rules and patterns that must be followed.

## Commands

```bash
pnpm install          # install deps (pnpm only, no npm/yarn)
pnpm dev              # vite dev server → http://localhost:5173
pnpm build            # tsc typecheck → vite build → dist/
pnpm lint             # eslint (uses @antfu/eslint-config + solid plugin)
pnpm lint:fix         # eslint --fix
pnpm test             # vitest run (node env, test/**/*.test.ts)
pnpm test:watch       # vitest in watch mode
```

**CI verification order**: `lint → test → build` (see `.github/workflows/ci.yml`)

## Architecture

Single-page app, not a monorepo.

- **Entry**: `src/index.tsx` → `App.tsx`
- **State**: `src/stores/layout.ts` — single SolidJS `createStore` holding all layout data (keys, encoders, pins, matrix, selection, option groups, undo/redo history). All mutations go through exported action functions.
- **Components**: `src/components/` — Canvas, KeyCap, KeyInspector, Toolbar, VariantPanel, EncoderKnob, PinNode
- **Utils**: `src/utils/` — `kle-import.ts`, `kle-export.ts`, `rynk-wasm.ts` (WASM wrapper)
- **WASM**: `src/wasm/rynk-kle/` — pre-built rynk-kle WASM (from `HaoboGu/rmk`), lazy-loaded on first use

## Key Conventions

- **Key unit**: 60px (`KEY_UNIT` constant in `layout.ts`, also `--key-unit` CSS var)
- **Snap grid**: 0.25u (positions snap on drag end and keyboard move)
- **KLE serial library**: `@liyang8246/kle-serial` (not `@ijprest/kle-serial`)
- **Canvas items**: discriminated union `CanvasItem = { type: 'key'|'encoder'|'pin', data: ... }`
- **IDs**: `nanoid()` — never compare by ID across import/export rounds

## Toolchain Quirks

- **Tailwind CSS 4**: uses `@import "tailwindcss"` + `@plugin "daisyui"` in `src/index.css` — no `tailwind.config.*` file, no PostCSS config
- **daisyUI 5**: imported as a Tailwind plugin, not standalone
- **TypeScript**: `jsxImportSource: "solid-js"`, `verbatimModuleSyntax: true`, `erasableSyntaxOnly: true`, `noEmit: true` — use `import type` for type-only imports
- **ESLint**: `@antfu/eslint-config` with `solid: true`. Rule overrides: `antfu/if-newline: off`, `no-alert: off` for `Toolbar.tsx`
- **WASM in Vite**: `assetsInclude: ['**/*.wasm']`, `optimizeDeps.exclude: ['**/rynk-kle/**']` — the WASM package must not be pre-bundled
- **ESLint ignores**: `src/wasm/rynk-kle/**` is excluded (generated WASM glue code)

## Testing

- **Runner**: Vitest, node environment
- **Location**: `test/**/*.test.ts` (not in `src/`)
- **Fixtures**: `test/fixtures/*.json` — KLE JSON files for round-trip testing (ansi-104, iso-105, ergodox, planck, etc.)
- **Round-trip test**: import KLE JSON → export → reimport → compare key signatures (position/shape/rotation/matrix/option, ignoring nanoid IDs)

## Cloned Dependency Source

Read-only dependency source repositories under `.slim/clonedeps/repos/`. Do not edit these clones.

- `HaoboGu__rmk/` — `HaoboGu/rmk` at `feat/rynk_layout`; KLE→Rynk TOML conversion logic, data structures, and WASM bindings (key path: `rynk/rynk-kle/`)
- `ijprest__keyboard-layout-editor/` — `ijprest/keyboard-layout-editor` at `master`; KLE JSON schema, key metadata, and rendering reference
- `saadeghi__daisyui/` — `saadeghi/daisyui` at `v5.6.13`; component styling reference for custom components matching daisyUI style and theme compatibility
