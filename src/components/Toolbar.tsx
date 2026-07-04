import { For, Show } from 'solid-js'
import {
  addEncoder,
  addKey,
  addPin,
  addVariant,
  autoNumberMatrix,
  deleteSelected,
  deleteVariant,
  hasSelection,
  importKleJson,
  setActiveVariant,
  setMatrixSize,
  state,
} from '../stores/layout'
import { exportKleJson } from '../utils/kle-export'
import { exportRynkToml } from '../utils/toml-export'
import type { LayoutState } from '../stores/layout'

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function Toolbar() {
  let fileInput!: HTMLInputElement

  const handleImportClick = () => {
    if (!window.confirm('Importing will replace the current layout. Continue?')) return
    fileInput.click()
  }

  const handleFileChange = (e: Event) => {
    const input = e.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      try {
        importKleJson(text)
      }
      catch (err) {
        alert(`Failed to import KLE JSON: ${err}`)
      }
    }
    reader.readAsText(file)
    // Reset so the same file can be re-imported
    input.value = ''
  }

  const handleAddVariant = () => {
    const name = window.prompt('Enter variant name:')
    if (name && name.trim()) {
      addVariant(name.trim())
    }
  }

  const handleDeleteVariant = (id: string) => {
    if (window.confirm('Are you sure you want to delete this variant?')) {
      deleteVariant(id)
    }
  }

  return (
    <div class="flex items-center gap-2 p-2 bg-base-200 border-b border-base-300">
      <input
        ref={fileInput}
        type="file"
        accept=".json"
        class="hidden"
        onChange={handleFileChange}
      />
      <button class="btn btn-sm btn-primary btn-outline" onClick={handleImportClick}>
        Import KLE
      </button>

      <button
        class="btn btn-sm btn-success btn-outline"
        onClick={() => {
          const toml = exportRynkToml(state as LayoutState)
          downloadFile(toml, 'keyboard_layout.toml', 'text/toml')
        }}
      >
        Export TOML
      </button>

      <button
        class="btn btn-sm btn-info btn-outline"
        onClick={() => {
          const json = exportKleJson(state as LayoutState)
          downloadFile(json, 'keyboard_layout.json', 'application/json')
        }}
      >
        Export KLE
      </button>

      <div class="divider divider-horizontal mx-1" />

      <button class="btn btn-sm btn-primary" onClick={() => addKey(5, 3)}>
        Add Key
      </button>

      <button class="btn btn-sm btn-accent" onClick={() => addEncoder(5, 3)}>
        Add Encoder
      </button>

      <button class="btn btn-sm btn-secondary" onClick={() => addPin(1, 1 + state.pins.filter(p => p.direction === 'row').length * 0.75, 'row')}>
        + Row Pin
      </button>
      <button class="btn btn-sm btn-secondary btn-outline" onClick={() => addPin(1, 1 + state.pins.filter(p => p.direction === 'col').length * 0.75, 'col')}>
        + Col Pin
      </button>

      <button
        class="btn btn-sm btn-error btn-outline"
        disabled={!hasSelection()}
        onClick={deleteSelected}
      >
        Delete
      </button>

      <div class="divider divider-horizontal mx-1" />

      <button class="btn btn-sm btn-ghost" onClick={autoNumberMatrix}>
        Auto Number
      </button>

      <label class="input input-xs input-bordered flex items-center gap-1">
        <span class="text-xs text-base-content/60">Rows</span>
        <input
          type="number"
          min="1"
          class="w-12"
          value={state.matrixRows}
          onInput={e =>
            setMatrixSize(
              Number.parseInt(e.currentTarget.value) || 1,
              state.matrixCols,
            )}
        />
      </label>

      <label class="input input-xs input-bordered flex items-center gap-1">
        <span class="text-xs text-base-content/60">Cols</span>
        <input
          type="number"
          min="1"
          class="w-12"
          value={state.matrixCols}
          onInput={e =>
            setMatrixSize(
              state.matrixRows,
              Number.parseInt(e.currentTarget.value) || 1,
            )}
        />
      </label>

      {/* Variant tabs */}
      <div class="tabs tabs-box tabs-xs">
        <button
          class="tab"
          classList={{ 'tab-active': state.activeVariantIndex === -1 }}
          onClick={() => setActiveVariant(-1)}
        >
          Base
        </button>
        <For each={state.variants}>
          {(variant, index) => {
            const isActive = () => state.activeVariantIndex === index()
            return (
              <button
                class="tab"
                classList={{ 'tab-active': isActive() }}
                onClick={() => setActiveVariant(index())}
              >
                <span class="flex items-center gap-1">
                  {variant.name}
                  <Show when={isActive()}>
                    <span
                      class="btn btn-xs btn-ghost btn-error"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteVariant(variant.id)
                      }}
                    >
                      ×
                    </span>
                  </Show>
                </span>
              </button>
            )
          }}
        </For>
        <button class="tab" onClick={handleAddVariant}>
          +
        </button>
      </div>

      <div class="flex-1" />

      <span class="text-xs text-base-content/60">
        {state.keys.length}
        {' '}
        keys ·
        {state.encoders.length}
        {' '}
        encoders ·
        {state.pins.length}
        {' '}
        pins
      </span>
    </div>
  )
}
