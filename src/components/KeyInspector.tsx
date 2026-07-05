import type { EncoderData, KeyData, PinData } from '../stores/layout'
import { Show, Switch, Match } from 'solid-js'
import {
  removeKeyOption,
  selectedEncoder,
  selectedKey,
  selectedPin,
  toggleLShape,
  updateEncoder,
  updateKey,
  updateKeyLshape,
  updatePin,
} from '../stores/layout'
import { VariantPanel } from './VariantPanel'

export function KeyInspector() {
  return (
    <div class="w-70 bg-base-200 border-l border-base-300 p-3 overflow-y-auto">
      <Switch fallback={<p class="text-sm text-base-content/50 text-center mt-8">No selection</p>}>
        <Match when={selectedKey()} keyed>
          {k => <KeyPanel keyData={k} />}
        </Match>
        <Match when={selectedPin()} keyed>
          {p => <PinPanel pin={p} />}
        </Match>
        <Match when={selectedEncoder()} keyed>
          {e => <EncoderPanel encoder={e} />}
        </Match>
      </Switch>

      <div class="mt-4 border-t border-base-300 pt-2">
        <VariantPanel />
      </div>
    </div>
  )
}

function KeyPanel(props: { keyData: KeyData }) {
  const k = () => props.keyData

  return (
    <fieldset class="fieldset">
      <legend class="fieldset-legend text-sm">Key Properties</legend>

      <div class="flex flex-col gap-2">
        {/* Position */}
        <div class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-base-content/70">Position</span>
          <div class="grid grid-cols-2 gap-1">
            <label class="input input-sm input-bordered flex items-center gap-1">
              <span class="text-xs text-base-content/60 w-4">X</span>
              <input
                type="number"
                step="0.25"
                class="grow"
                value={k().x}
                onChange={e => updateKey(k().id, { x: Number.parseFloat(e.currentTarget.value) || 0 })}
              />
            </label>
            <label class="input input-sm input-bordered flex items-center gap-1">
              <span class="text-xs text-base-content/60 w-4">Y</span>
              <input
                type="number"
                step="0.25"
                class="grow"
                value={k().y}
                onChange={e => updateKey(k().id, { y: Number.parseFloat(e.currentTarget.value) || 0 })}
              />
            </label>
          </div>
        </div>

        {/* Size */}
        <div class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-base-content/70">Size</span>
          <div class="grid grid-cols-2 gap-1">
            <label class="input input-sm input-bordered flex items-center gap-1">
              <span class="text-xs text-base-content/60 w-4">W</span>
              <input
                type="number"
                step="0.25"
                min="0.25"
                class="grow"
                value={k().w}
                onChange={e => updateKey(k().id, { w: Number.parseFloat(e.currentTarget.value) || 1 })}
              />
            </label>
            <label class="input input-sm input-bordered flex items-center gap-1">
              <span class="text-xs text-base-content/60 w-4">H</span>
              <input
                type="number"
                step="0.25"
                min="0.25"
                class="grow"
                value={k().h}
                onChange={e => updateKey(k().id, { h: Number.parseFloat(e.currentTarget.value) || 1 })}
              />
            </label>
          </div>
        </div>

        {/* Rotation */}
        <div class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-base-content/70">Rotation</span>
          <label class="input input-sm input-bordered flex items-center gap-1">
            <span class="text-xs text-base-content/60 w-4">R</span>
            <input
              type="number"
              step="1"
              class="grow"
              value={k().r}
              onChange={e => updateKey(k().id, { r: Number.parseFloat(e.currentTarget.value) || 0 })}
            />
            <span class="text-xs text-base-content/40">deg</span>
          </label>
        </div>

        {/* Rotation Origin */}
        <div class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-base-content/70">Rotation Origin</span>
          <div class="grid grid-cols-2 gap-1">
            <label class="input input-sm input-bordered flex items-center gap-1">
              <span class="text-xs text-base-content/60 w-4">Rx</span>
              <input
                type="number"
                step="0.25"
                class="grow"
                value={k().rx}
                onChange={e => updateKey(k().id, { rx: Number.parseFloat(e.currentTarget.value) || 0 })}
              />
            </label>
            <label class="input input-sm input-bordered flex items-center gap-1">
              <span class="text-xs text-base-content/60 w-4">Ry</span>
              <input
                type="number"
                step="0.25"
                class="grow"
                value={k().ry}
                onChange={e => updateKey(k().id, { ry: Number.parseFloat(e.currentTarget.value) || 0 })}
              />
            </label>
          </div>
        </div>

        {/* L-Shape toggle */}
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            class="checkbox checkbox-xs checkbox-primary"
            checked={!!k().lshape}
            onChange={() => toggleLShape(k().id)}
          />
          <span class="text-xs text-base-content/60">L-Shape</span>
        </label>

        {/* L-Shape fields */}
        <Show when={k().lshape}>
          <div class="space-y-1 pl-4">
            <div class="grid grid-cols-2 gap-1">
              <label class="input input-xs input-bordered flex items-center gap-1">
                <span class="text-xs text-base-content/60 w-5">X2</span>
                <input
                  type="number"
                  step="0.25"
                  class="grow"
                  value={k().lshape!.x2}
                  onChange={e => updateKeyLshape(k().id, 'x2', Number.parseFloat(e.currentTarget.value) || 0)}
                />
              </label>
              <label class="input input-xs input-bordered flex items-center gap-1">
                <span class="text-xs text-base-content/60 w-5">Y2</span>
                <input
                  type="number"
                  step="0.25"
                  class="grow"
                  value={k().lshape!.y2}
                  onChange={e => updateKeyLshape(k().id, 'y2', Number.parseFloat(e.currentTarget.value) || 0)}
                />
              </label>
            </div>
            <div class="grid grid-cols-2 gap-1">
              <label class="input input-xs input-bordered flex items-center gap-1">
                <span class="text-xs text-base-content/60 w-5">W2</span>
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  class="grow"
                  value={k().lshape!.w2}
                  onChange={e => updateKeyLshape(k().id, 'w2', Number.parseFloat(e.currentTarget.value) || 1)}
                />
              </label>
              <label class="input input-xs input-bordered flex items-center gap-1">
                <span class="text-xs text-base-content/60 w-5">H2</span>
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  class="grow"
                  value={k().lshape!.h2}
                  onChange={e => updateKeyLshape(k().id, 'h2', Number.parseFloat(e.currentTarget.value) || 1)}
                />
              </label>
            </div>
          </div>
        </Show>

        {/* Matrix */}
        <div class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-base-content/70">Matrix</span>
          <div class="grid grid-cols-2 gap-1">
            <label class="input input-sm input-bordered flex items-center gap-1">
              <span class="text-xs text-base-content/60 w-4">R</span>
              <input
                type="number"
                min="-1"
                class="grow"
                value={k().row}
                onChange={e => updateKey(k().id, { row: Number.parseInt(e.currentTarget.value) || -1 })}
              />
            </label>
            <label class="input input-sm input-bordered flex items-center gap-1">
              <span class="text-xs text-base-content/60 w-4">C</span>
              <input
                type="number"
                min="-1"
                class="grow"
                value={k().col}
                onChange={e => updateKey(k().id, { col: Number.parseInt(e.currentTarget.value) || -1 })}
              />
            </label>
          </div>
        </div>

        {/* Variant */}
        <Show when={k().option}>
          {(opt) => (
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-base-content/70">Variant</span>
              <div class="flex items-center gap-2">
                <span class="text-xs text-base-content/60">
                  Group {opt().groupId}, Choice {opt().choiceId}
                </span>
                <button class="btn btn-xs btn-ghost text-error" onClick={() => removeKeyOption(k().id)}>
                  Remove
                </button>
              </div>
            </div>
          )}
        </Show>

      </div>
    </fieldset>
  )
}

function PinPanel(props: { pin: PinData }) {
  const p = () => props.pin

  return (
    <fieldset class="fieldset">
      <legend class="fieldset-legend text-sm">Pin Properties</legend>

      <div class="flex flex-col gap-2">
        {/* Direction */}
        <div class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-base-content/70">Direction</span>
          <div class="flex gap-1">
            <button
              class="btn btn-xs btn-secondary btn-outline"
              classList={{ 'btn-active': p().direction === 'row' }}
              onClick={() => updatePin(p().id, { direction: 'row' })}
            >
              Row
            </button>
            <button
              class="btn btn-xs btn-secondary btn-outline"
              classList={{ 'btn-active': p().direction === 'col' }}
              onClick={() => updatePin(p().id, { direction: 'col' })}
            >
              Col
            </button>
          </div>
        </div>

        {/* Index */}
        <label class="input input-sm input-bordered flex items-center gap-1">
          <span class="text-xs text-base-content/60 w-6">Idx</span>
          <input
            type="number"
            min="0"
            class="grow"
            value={p().index}
            onChange={e => updatePin(p().id, { index: Number.parseInt(e.currentTarget.value) || 0 })}
          />
        </label>

        {/* Position */}
        <div class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-base-content/70">Position</span>
          <div class="grid grid-cols-2 gap-1">
            <label class="input input-sm input-bordered flex items-center gap-1">
              <span class="text-xs text-base-content/60 w-4">X</span>
              <input
                type="number"
                step="0.25"
                class="grow"
                value={p().x}
                onChange={e => updatePin(p().id, { x: Number.parseFloat(e.currentTarget.value) || 0 })}
              />
            </label>
            <label class="input input-sm input-bordered flex items-center gap-1">
              <span class="text-xs text-base-content/60 w-4">Y</span>
              <input
                type="number"
                step="0.25"
                class="grow"
                value={p().y}
                onChange={e => updatePin(p().id, { y: Number.parseFloat(e.currentTarget.value) || 0 })}
              />
            </label>
          </div>
        </div>
      </div>
    </fieldset>
  )
}

function EncoderPanel(props: { encoder: EncoderData }) {
  const enc = () => props.encoder

  return (
    <fieldset class="fieldset">
      <legend class="fieldset-legend text-sm">Encoder Properties</legend>

      <div class="flex flex-col gap-2">
        <label class="input input-sm input-bordered flex items-center gap-1">
          <span class="text-xs text-base-content/60 w-6">ID</span>
          <input
            type="number"
            min="0"
            class="grow"
            value={enc().encoderIndex}
            onChange={e => updateEncoder(enc().id, { encoderIndex: Number.parseInt(e.currentTarget.value) || 0 })}
          />
        </label>

        <div class="grid grid-cols-2 gap-1">
          <label class="input input-sm input-bordered flex items-center gap-1">
            <span class="text-xs text-base-content/60 w-4">X</span>
            <input
              type="number"
              step="0.25"
              class="grow"
              value={enc().x}
              onChange={e => updateEncoder(enc().id, { x: Number.parseFloat(e.currentTarget.value) || 0 })}
            />
          </label>
          <label class="input input-sm input-bordered flex items-center gap-1">
            <span class="text-xs text-base-content/60 w-4">Y</span>
            <input
              type="number"
              step="0.25"
              class="grow"
              value={enc().y}
              onChange={e => updateEncoder(enc().id, { y: Number.parseFloat(e.currentTarget.value) || 0 })}
            />
          </label>
        </div>
      </div>
    </fieldset>
  )
}
