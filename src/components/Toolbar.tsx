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

/** Extract KLE keymap array from KLE or Vial JSON string */
function extractKleJson(text: string): string {
  const parsed = JSON.parse(text)
  if (Array.isArray(parsed)) return text
  const keymap = parsed?.layouts?.keymap
  if (keymap) return JSON.stringify(keymap)
  throw new Error('Unrecognized format: expected KLE JSON array or Vial JSON with layouts.keymap')
}

export function Toolbar() {
  let fileInputRef: HTMLInputElement | undefined

  async function handleFileImport(e: Event): Promise<void> {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    try {
      importKleJson(extractKleJson(await file.text()))
    }
    catch (err) {
      alert(`Import failed: ${err instanceof Error ? err.message : String(err)}`)
    }
    if (fileInputRef) fileInputRef.value = ''
  }

  async function handleExportRynk(): Promise<void> {
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
  }

  return (
    <>
      <div class="pointer-events-auto mt-auto mr-auto flex h-12 w-fit items-center justify-start gap-1 rounded-xl bg-base-100 px-2 py-1 shadow-lg ring ring-base-300">
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
        <button
          class="flex cursor-pointer items-center gap-1 rounded-xl p-2 text-sm hover:bg-base-300"
          onClick={() => fileInputRef?.click()}
        >
          <span class="icon-[lucide--file-input]" />
          <div class="flex gap-0.5">
            <span> Vial </span>
            <span> / </span>
            <span> Kle </span>
          </div>
        </button>
        <input ref={fileInputRef} type="file" accept=".json" class="hidden" onChange={handleFileImport} />
        <button
          class="flex cursor-pointer items-center gap-1 rounded-xl p-2 text-sm hover:bg-base-300"
          onClick={handleExportRynk}
        >
          <span class="icon-[lucide--download]" />
          <span>Rynk</span>
        </button>
      </div>
    </>
  )
}
