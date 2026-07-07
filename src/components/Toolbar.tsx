import { createSignal, Show } from 'solid-js'
import {
  addEncoder,
  addKey,
  addPin,
  canRedo,
  canUndo,
  deleteSelected,
  hasSelection,
  importKleJson,
  redo,
  state,
  undo,
} from '../stores/layout'
import { exportKleJson } from '../utils/kle-export'
import { convertKle } from '../utils/rynk-wasm'

function downloadFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function Toolbar() {
  const [importMode, setImportMode] = createSignal<'kle' | 'vial'>('kle')
  const [importError, setImportError] = createSignal('')
  const [importLoading, setImportLoading] = createSignal(false)
  const [exportLoading, setExportLoading] = createSignal(false)
  let fileInputRef: HTMLInputElement | undefined
  let dialogRef: HTMLDialogElement | undefined

  function openImportModal(mode: 'kle' | 'vial'): void {
    setImportMode(mode)
    setImportError('')
    setImportLoading(false)
    if (fileInputRef)
      fileInputRef.value = ''
    dialogRef?.showModal()
  }

  async function handleFileImport(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    setImportError('')
    setImportLoading(true)

    try {
      const text = await file.text()
      importKleJson(text)
      dialogRef?.close()
    }
    catch (err) {
      setImportError(err instanceof Error ? err.message : String(err))
    }
    finally {
      setImportLoading(false)
    }
  }

  async function handleExportRynk(): Promise<void> {
    setExportLoading(true)
    try {
      const kleJson = exportKleJson(state)
      const result = await convertKle(kleJson)
      if (result.warnings.length > 0) {
        console.warn('Rynk export warnings:', result.warnings)
      }
      downloadFile(result.inner_layout_toml, 'layout.toml')
    }
    catch (err) {
      alert(`Export failed: ${err instanceof Error ? err.message : String(err)}`)
    }
    finally {
      setExportLoading(false)
    }
  }

  return (
    <>
      <div class="mt-auto mr-auto flex h-12 w-fit items-center justify-start gap-1 rounded-xl bg-base-100 px-2 py-1 shadow-lg ring ring-base-300">
        <button
          class="flex cursor-pointer items-center gap-1 rounded-xl p-2 text-sm hover:bg-base-300"
          onClick={() => addKey()}
        >
          <span class="icon-[lucide--plus]" />
          <span>Key</span>
        </button>
        <button
          class="flex cursor-pointer items-center gap-1 rounded-xl p-2 text-sm hover:bg-base-300"
          onClick={() => addEncoder()}
        >
          <span class="icon-[lucide--plus]" />
          <span>Encoder</span>
        </button>
        <div class="h-8 w-[1px] bg-base-300" />
        <button
          class="flex cursor-pointer items-center gap-1 rounded-xl p-2 text-sm hover:bg-base-300"
          onClick={() => addPin(1, 1 + state.pins.filter(p => p.direction === 'row').length * 0.75, 'row')}
        >
          <span class="icon-[lucide--plus]" />
          <span>RowPin</span>
        </button>
        <button
          class="flex cursor-pointer items-center gap-1 rounded-xl p-2 text-sm hover:bg-base-300"
          onClick={() => addPin(1, 1 + state.pins.filter(p => p.direction === 'col').length * 0.75, 'col')}
        >
          <span class="icon-[lucide--plus]" />
          <span>ColPin</span>
        </button>
        <div class="h-8 w-[1px] bg-base-300" />
        <button
          class="flex cursor-pointer items-center gap-1 rounded-xl p-2 text-sm hover:bg-base-300"
          disabled={!canUndo()}
          onClick={undo}
        >
          <span class="icon-[lucide--undo]" />
          <span>Undo</span>
        </button>
        <button
          class="flex cursor-pointer items-center gap-1 rounded-xl p-2 text-sm hover:bg-base-300"
          disabled={!canRedo()}
          onClick={redo}
        >
          <span class="icon-[lucide--redo]" />
          <span>Redo</span>
        </button>
        <div class="h-8 w-[1px] bg-base-300" />
        <button class="flex cursor-pointer items-center gap-1 rounded-xl p-2 text-sm hover:bg-base-300">
          <span class="icon-[lucide--copy]" />
          <span>Copy</span>
        </button>
        <button class="flex cursor-pointer items-center gap-1 rounded-xl p-2 text-sm hover:bg-base-300">
          <span class="icon-[lucide--clipboard]" />
          <span>Paste</span>
        </button>
        <button
          class="flex cursor-pointer items-center gap-1 rounded-xl p-2 text-sm hover:bg-base-300"
          disabled={!hasSelection()}
          onClick={deleteSelected}
        >
          <span class="icon-[lucide--trash]" />
          <span>Delete</span>
        </button>
        <div class="h-8 w-[1px] bg-base-300" />
        <details class="dropdown dropdown-end dropdown-bottom">
          <summary class="flex cursor-pointer items-center gap-1 rounded-xl p-2 text-sm hover:bg-base-300">
            <span class="icon-[lucide--file-input]" />
            <span>Import</span>
          </summary>
          <ul class="dropdown-content menu w-48 rounded-box bg-base-100 p-2 shadow-lg ring ring-base-300">
            <li><a onClick={() => openImportModal('kle')}>KLE JSON</a></li>
            <li><a onClick={() => openImportModal('vial')}>Vial JSON</a></li>
          </ul>
        </details>
        <button
          class="flex cursor-pointer items-center gap-1 rounded-xl p-2 text-sm hover:bg-base-300"
          disabled={exportLoading()}
          onClick={handleExportRynk}
        >
          <span class="icon-[lucide--download]" />
          <span>{exportLoading() ? 'Exporting...' : 'Export Rynk'}</span>
        </button>
      </div>

      <dialog ref={dialogRef} class="modal">
        <div class="modal-box">
          <h3 class="text-lg font-bold">{importMode() === 'kle' ? 'Import KLE JSON' : 'Import Vial JSON'}</h3>
          <p class="py-2 text-sm text-base-content/60">
            {importMode() === 'kle'
              ? 'Select a KLE JSON file to import your keyboard layout.'
              : 'Select a Vial JSON file to import your keyboard layout.'}
          </p>
          <input
            type="file"
            accept=".json"
            class="file-input-bordered file-input w-full"
            ref={fileInputRef}
            onChange={handleFileImport}
          />
          <Show when={importError()}>
            <p class="mt-2 text-sm text-error">{importError()}</p>
          </Show>
          <Show when={importLoading()}>
            <p class="mt-2 text-sm text-info">Importing...</p>
          </Show>
        </div>
        <form method="dialog" class="modal-backdrop"><button>close</button></form>
      </dialog>
    </>
  )
}
