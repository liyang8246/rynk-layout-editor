import {
  addEncoder,
  addKey,
  addPin,
  autoNumberMatrix,
  deleteSelected,
  hasSelection,
  setMatrixSize,
  state,
} from '../stores/layout'

export function Toolbar() {
  return (
    <div class="flex items-center gap-2 p-2 bg-base-200 border-b border-base-300">
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
