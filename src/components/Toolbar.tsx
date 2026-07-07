import {
  addEncoder,
  addKey,
  addPin,
  canRedo,
  canUndo,
  deleteSelected,
  hasSelection,
  redo,
  state,
  undo,
} from '../stores/layout'

export function Toolbar() {
  return (
    <div class="mr-auto mt-auto flex h-12 w-fit items-center justify-start gap-1 rounded-xl bg-base-100 px-2 py-1 shadow-lg ring ring-base-300">
      <button
        class="flex cursor-pointer items-center gap-1 rounded-xl p-2 text-sm hover:bg-base-300"
        onClick={() => addKey()}
      >
        <span class="icon-[lucide--plus]" />
        <span>Key</span>
      </button>
      <button
        class="flex cursor-pointer items-center gap-1 rounded-xl p-2 text-sm hover:bg-base-300"
        onClick={() => addEncoder(5, 3)}
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
    </div>
  )
}
