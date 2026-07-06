import { createSignal } from 'solid-js'
import {
  addEncoder,
  addKey,
  addPin,
  autoNumberMatrix,
  canRedo,
  canUndo,
  deleteSelected,
  hasSelection,
  importKleJson,
  redo,
  setMatrixSize,
  state,
  undo,
} from '../stores/layout'
import { exportKleJson } from '../utils/kle-export'
import { convertKle } from '../utils/rynk-wasm'

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
  const [exportingRynk, setExportingRynk] = createSignal(false)

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

  const handleExportRynk = async () => {
    setExportingRynk(true)
    try {
      // Export as-is, do not auto-assign matrix

      // Build Vial-format JSON for WASM (so matrix dims are passed correctly)
      const kleJson = exportKleJson(state)
      const vialJson = JSON.stringify({
        matrix: { rows: state.matrixRows, cols: state.matrixCols },
        layouts: { keymap: JSON.parse(kleJson) },
      })

      const result = await convertKle(vialJson)
      downloadFile(result.display_toml, 'layout.toml', 'text/x-toml')

      if (result.warnings.length > 0) {
        alert(`Exported with warnings:\n\n${result.warnings.join('\n')}`)
      }
    }
    catch (err) {
      alert(`Failed to export Rynk TOML: ${err}`)
    }
    finally {
      setExportingRynk(false)
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
      <button class="btn btn-sm btn-ghost" disabled={!canUndo()} onClick={undo} title="Undo (Ctrl+Z)">
        &#x21B6; Undo
      </button>
      <button class="btn btn-sm btn-ghost" disabled={!canRedo()} onClick={redo} title="Redo (Ctrl+Y)">
        &#x21B7; Redo
      </button>

      <div class="divider divider-horizontal mx-1" />

      <button class="btn btn-sm btn-primary btn-outline" onClick={handleImportClick}>
        Import KLE
      </button>

      <button
        class="btn btn-sm btn-info btn-outline"
        onClick={() => {
          const json = exportKleJson(state)
          downloadFile(json, 'keyboard_layout.json', 'application/json')
        }}
      >
        Export KLE
      </button>

      <button
        class="btn btn-sm btn-success"
        disabled={exportingRynk() || state.keys.length === 0}
        onClick={handleExportRynk}
      >
        {exportingRynk() ? 'Exporting...' : 'Export Rynk TOML'}
      </button>

      <div class="divider divider-horizontal mx-1" />

      <button class="btn btn-sm btn-primary" onClick={() => addKey()}>
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
          onChange={e =>
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
          onChange={e =>
            setMatrixSize(
              state.matrixRows,
              Number.parseInt(e.currentTarget.value) || 1,
            )}
        />
      </label>

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
