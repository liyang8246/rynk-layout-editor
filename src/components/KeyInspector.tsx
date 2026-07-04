import type { EncoderData, KeyData, PinData } from '../stores/layout'
import { Show } from 'solid-js'
import {
  activeVariant,
  clearShapeOverride,
  isKeyHiddenInVariant,
  removeShapeOverrideField,
  selectedEncoder,
  selectedKey,
  selectedPin,
  setShapeOverride,
  toggleKeyHidden,
  toggleLShape,
  updateEncoder,
  updateKey,
  updateKeyLshape,
  updatePin,
} from '../stores/layout'

export function KeyInspector() {
  return (
    <div class="w-70 bg-base-200 border-l border-base-300 p-3 overflow-y-auto">
      <Show
        when={selectedKey()}
        keyed
        fallback={(
          <Show
            when={selectedPin()}
            keyed
            fallback={(
              <Show
                when={selectedEncoder()}
                keyed
                fallback={<p class="text-sm text-base-content/50 text-center mt-8">No selection</p>}
              >
                {en => <EncoderPanel encoder={en} />}
              </Show>
            )}
          >
            {p => <PinPanel pin={p} />}
          </Show>
        )}
      >
        {k => <KeyPanel keyData={k} />}
      </Show>
    </div>
  )
}

function KeyPanel(props: { keyData: KeyData }) {
  const k = () => props.keyData
  const variant = () => activeVariant()
  const hasValidMatrix = () => k().row >= 0 && k().col >= 0

  const overrideKey = () => `${k().row},${k().col}`
  const shapeOverride = () => variant()?.shapeOverrides[overrideKey()]
  const hasOverride = () => !!shapeOverride()

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
                onInput={e => updateKey(k().id, { x: Number.parseFloat(e.currentTarget.value) || 0 })}
              />
            </label>
            <label class="input input-sm input-bordered flex items-center gap-1">
              <span class="text-xs text-base-content/60 w-4">Y</span>
              <input
                type="number"
                step="0.25"
                class="grow"
                value={k().y}
                onInput={e => updateKey(k().id, { y: Number.parseFloat(e.currentTarget.value) || 0 })}
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
                onInput={e => updateKey(k().id, { w: Number.parseFloat(e.currentTarget.value) || 1 })}
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
                onInput={e => updateKey(k().id, { h: Number.parseFloat(e.currentTarget.value) || 1 })}
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
              onInput={e => updateKey(k().id, { r: Number.parseFloat(e.currentTarget.value) || 0 })}
            />
            <span class="text-xs text-base-content/40">deg</span>
          </label>
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
                  onInput={e => updateKeyLshape(k().id, 'x2', Number.parseFloat(e.currentTarget.value) || 0)}
                />
              </label>
              <label class="input input-xs input-bordered flex items-center gap-1">
                <span class="text-xs text-base-content/60 w-5">Y2</span>
                <input
                  type="number"
                  step="0.25"
                  class="grow"
                  value={k().lshape!.y2}
                  onInput={e => updateKeyLshape(k().id, 'y2', Number.parseFloat(e.currentTarget.value) || 0)}
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
                  onInput={e => updateKeyLshape(k().id, 'w2', Number.parseFloat(e.currentTarget.value) || 1)}
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
                  onInput={e => updateKeyLshape(k().id, 'h2', Number.parseFloat(e.currentTarget.value) || 1)}
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
                onInput={e => updateKey(k().id, { row: Number.parseInt(e.currentTarget.value) || -1 })}
              />
            </label>
            <label class="input input-sm input-bordered flex items-center gap-1">
              <span class="text-xs text-base-content/60 w-4">C</span>
              <input
                type="number"
                min="-1"
                class="grow"
                value={k().col}
                onInput={e => updateKey(k().id, { col: Number.parseInt(e.currentTarget.value) || -1 })}
              />
            </label>
          </div>
        </div>

        {/* Variant Overrides */}
        <Show when={variant() && hasValidMatrix()}>
          <div class="flex flex-col gap-2 mt-2 pt-2 border-t border-base-300">
            <div class="flex items-center gap-2">
              <span class="fieldset-legend text-sm">Variant Overrides</span>
              <span class="badge badge-xs badge-warning">{variant()?.name}</span>
            </div>

            {/* Hidden toggle */}
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                class="toggle toggle-xs toggle-error"
                checked={isKeyHiddenInVariant(k().row, k().col)}
                onChange={() => toggleKeyHidden(k().row, k().col)}
              />
              <span class="text-xs text-base-content/60">Hidden in variant</span>
            </label>

            {/* Shape override fields — only when not hidden */}
            <Show when={!isKeyHiddenInVariant(k().row, k().col)}>
              <div class="flex flex-col gap-1">
                <span class="text-xs font-semibold text-base-content/70">Shape Override</span>
                <div class="grid grid-cols-3 gap-1">
                  <label class="input input-xs input-bordered flex items-center gap-1">
                    <span class="text-xs text-base-content/60 w-4">W</span>
                    <input
                      type="number"
                      step="0.25"
                      min="0.25"
                      class="grow"
                      placeholder={String(k().w)}
                      value={shapeOverride()?.w ?? ''}
                      onInput={e => {
                        const val = e.currentTarget.value
                        const num = val === '' ? undefined : Number.parseFloat(val)
                        if (num !== undefined && !Number.isNaN(num))
                          setShapeOverride(k().row, k().col, { w: num })
                        else if (val === '')
                          removeShapeOverrideField(k().row, k().col, 'w')
                      }}
                    />
                  </label>
                  <label class="input input-xs input-bordered flex items-center gap-1">
                    <span class="text-xs text-base-content/60 w-4">H</span>
                    <input
                      type="number"
                      step="0.25"
                      min="0.25"
                      class="grow"
                      placeholder={String(k().h)}
                      value={shapeOverride()?.h ?? ''}
                      onInput={e => {
                        const val = e.currentTarget.value
                        const num = val === '' ? undefined : Number.parseFloat(val)
                        if (num !== undefined && !Number.isNaN(num))
                          setShapeOverride(k().row, k().col, { h: num })
                        else if (val === '')
                          removeShapeOverrideField(k().row, k().col, 'h')
                      }}
                    />
                  </label>
                  <label class="input input-xs input-bordered flex items-center gap-1">
                    <span class="text-xs text-base-content/60 w-4">R</span>
                    <input
                      type="number"
                      step="1"
                      class="grow"
                      placeholder={String(k().r)}
                      value={shapeOverride()?.r ?? ''}
                      onInput={e => {
                        const val = e.currentTarget.value
                        const num = val === '' ? undefined : Number.parseFloat(val)
                        if (num !== undefined && !Number.isNaN(num))
                          setShapeOverride(k().row, k().col, { r: num })
                        else if (val === '')
                          removeShapeOverrideField(k().row, k().col, 'r')
                      }}
                    />
                  </label>
                </div>
                <Show when={hasOverride()}>
                  <button
                    class="btn btn-xs btn-ghost"
                    onClick={() => clearShapeOverride(k().row, k().col)}
                  >
                    Reset
                  </button>
                </Show>
              </div>
            </Show>
          </div>
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
            onInput={e => updatePin(p().id, { index: Number.parseInt(e.currentTarget.value) || 0 })}
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
                onInput={e => updatePin(p().id, { x: Number.parseFloat(e.currentTarget.value) || 0 })}
              />
            </label>
            <label class="input input-sm input-bordered flex items-center gap-1">
              <span class="text-xs text-base-content/60 w-4">Y</span>
              <input
                type="number"
                step="0.25"
                class="grow"
                value={p().y}
                onInput={e => updatePin(p().id, { y: Number.parseFloat(e.currentTarget.value) || 0 })}
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
            onInput={e => updateEncoder(enc().id, { encoderIndex: Number.parseInt(e.currentTarget.value) || 0 })}
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
              onInput={e => updateEncoder(enc().id, { x: Number.parseFloat(e.currentTarget.value) || 0 })}
            />
          </label>
          <label class="input input-sm input-bordered flex items-center gap-1">
            <span class="text-xs text-base-content/60 w-4">Y</span>
            <input
              type="number"
              step="0.25"
              class="grow"
              value={enc().y}
              onInput={e => updateEncoder(enc().id, { y: Number.parseFloat(e.currentTarget.value) || 0 })}
            />
          </label>
        </div>
      </div>
    </fieldset>
  )
}
