import type { EncoderData, KeyData, PinData } from '../types'
import { createElementSize } from '@solid-primitives/resize-observer'
import { For, Match, Show, Switch } from 'solid-js'
import {
  assignKeyOption,
  commonValue,
  getSelectedEncoders,
  getSelectedKeys,
  getSelectedPins,
  removeKeyOption,
  selectedEncoder,
  selectedKey,
  selectedPin,
  selectionType,
  state,
  toggleLShape,
  updateEncoder,
  updateKey,
  updateKeyLshape,
  updatePin,
  updateSelectedEncoders,
  updateSelectedKeys,
  updateSelectedPins,
} from '../stores/layout'

function fmt(v: number): string {
  const s = v.toFixed(3)
  return s.replace(/0+$/, '').replace(/\.$/, '')
}

function NumInput(props: {
  label: string
  value: number | undefined
  min?: number
  step?: number
  placeholder?: string
  onChange: (v: number) => void
}) {
  return (
    <label class="input font-mono input-sm">
      <span class="label font-mono">{props.label}</span>
      <input
        type="text"
        value={props.value !== undefined ? fmt(props.value) : ''}
        placeholder={props.placeholder ?? (props.value === undefined ? '—' : undefined)}
        min={props.min}
        step={props.step}
        onChange={(e) => {
          const raw = e.currentTarget.value
          if (raw === '') return
          const v = Number.parseFloat(raw)
          if (!Number.isNaN(v))
            props.onChange(v)
        }}
        onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
      />
    </label>
  )
}

export function KeyInspector() {
  let containerRef: HTMLDivElement | undefined
  const size = createElementSize(() => containerRef)
  const height = () => size.height ?? 0

  return (
    <div class="pointer-events-auto mb-auto ml-auto flex w-80 flex-col gap-1 overflow-hidden rounded-xl bg-base-100 px-4 py-3 shadow-lg ring ring-base-300 transition-[height] duration-300 ease-in-out" style={{ height: `${height() + 24}px` }}>
      <div ref={containerRef}>
        <p class="text-sm font-bold text-base-content">
          <Switch fallback="Properties">
            <Match when={selectionType() === 'key'}>Key Properties</Match>
            <Match when={selectionType() === 'encoder'}>Encoder Properties</Match>
            <Match when={selectionType() === 'pin'}>Pin Properties</Match>
            <Match when={state.selectedIds.length > 1}>Properties</Match>
          </Switch>
        </p>
        <Switch fallback={null}>
          {/* Single key selection */}
          <Match when={state.selectedIds.length === 1 && selectedKey()} keyed>
            {key => (
              <>
                <fieldset class="fieldset">
                  <legend class="fieldset-legend text-xs">Position & Size</legend>
                  <div class="grid grid-cols-2 gap-1">
                    <NumInput label="X" value={key.x} onChange={v => updateKey(key.id, { x: v })} />
                    <NumInput label="Y" value={key.y} onChange={v => updateKey(key.id, { y: v })} />
                    <NumInput label="W" value={key.w} min={0.25} onChange={v => updateKey(key.id, { w: v })} />
                    <NumInput label="H" value={key.h} min={0.25} onChange={v => updateKey(key.id, { h: v })} />
                  </div>
                  <label class="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      class="toggle toggle-primary toggle-xs"
                      checked={!!key.lshape}
                      onChange={() => toggleLShape(key.id)}
                    />
                    L-Shape
                  </label>
                  <Show when={key.lshape}>
                    <div class="grid grid-cols-2 gap-1">
                      <NumInput label="X2" value={key.lshape!.x2} onChange={v => updateKeyLshape(key.id, 'x2', v)} />
                      <NumInput label="Y2" value={key.lshape!.y2} onChange={v => updateKeyLshape(key.id, 'y2', v)} />
                      <NumInput label="W2" value={key.lshape!.w2} min={0.25} onChange={v => updateKeyLshape(key.id, 'w2', v)} />
                      <NumInput label="H2" value={key.lshape!.h2} min={0.25} onChange={v => updateKeyLshape(key.id, 'h2', v)} />
                    </div>
                  </Show>
                </fieldset>
                <fieldset class="fieldset">
                  <legend class="fieldset-legend text-xs">Rotation</legend>
                  <div class="grid grid-cols-3 gap-1">
                    <NumInput label="R" value={key.r} step={1} onChange={v => updateKey(key.id, { r: v })} />
                    <NumInput label="X" value={key.rx} onChange={v => updateKey(key.id, { rx: v })} />
                    <NumInput label="Y" value={key.ry} onChange={v => updateKey(key.id, { ry: v })} />
                  </div>
                </fieldset>
                <Show when={state.optionGroups.length > 0}>
                  <fieldset class="fieldset">
                    <legend class="fieldset-legend text-xs">Option</legend>
                    <select
                      class="select select-sm"
                      value={key.option?.groupId ?? ''}
                      onChange={(e) => {
                        const v = e.currentTarget.value
                        if (!v)
                          removeKeyOption(key.id)
                        else
                          assignKeyOption(key.id, Number(v), state.optionGroups.find(g => g.id === Number(v))!.choices[0].id)
                      }}
                    >
                      <option value="">None</option>
                      <For each={state.optionGroups}>
                        {g => <option value={g.id}>{g.name}</option>}
                      </For>
                    </select>
                    <Show when={key.option}>
                      <select
                        class="select mt-1 select-sm"
                        value={key.option!.choiceId}
                        onChange={e => assignKeyOption(key.id, key.option!.groupId, Number(e.currentTarget.value))}
                      >
                        <For each={state.optionGroups.find(g => g.id === key.option!.groupId)?.choices ?? []}>
                          {c => <option value={c.id}>{c.name}</option>}
                        </For>
                      </select>
                    </Show>
                  </fieldset>
                </Show>
              </>
            )}
          </Match>

          {/* Multiple keys selected */}
          <Match when={selectionType() === 'key' && state.selectedIds.length > 1}>
            {(() => {
              const keys = getSelectedKeys()
              return (
                <>
                  <fieldset class="fieldset">
                    <legend class="fieldset-legend text-xs">Position & Size</legend>
                    <div class="grid grid-cols-2 gap-1">
                      <NumInput label="X" value={commonValue(keys, (k: KeyData) => k.x)} placeholder="..." onChange={v => updateSelectedKeys({ x: v })} />
                      <NumInput label="Y" value={commonValue(keys, (k: KeyData) => k.y)} placeholder="..." onChange={v => updateSelectedKeys({ y: v })} />
                      <NumInput label="W" value={commonValue(keys, (k: KeyData) => k.w)} min={0.25} placeholder="..." onChange={v => updateSelectedKeys({ w: v })} />
                      <NumInput label="H" value={commonValue(keys, (k: KeyData) => k.h)} min={0.25} placeholder="..." onChange={v => updateSelectedKeys({ h: v })} />
                    </div>
                  </fieldset>
                  <fieldset class="fieldset">
                    <legend class="fieldset-legend text-xs">Rotation</legend>
                    <div class="grid grid-cols-3 gap-1">
                      <NumInput label="R" value={commonValue(keys, (k: KeyData) => k.r)} step={1} placeholder="..." onChange={v => updateSelectedKeys({ r: v })} />
                      <NumInput label="X" value={commonValue(keys, (k: KeyData) => k.rx)} placeholder="..." onChange={v => updateSelectedKeys({ rx: v })} />
                      <NumInput label="Y" value={commonValue(keys, (k: KeyData) => k.ry)} placeholder="..." onChange={v => updateSelectedKeys({ ry: v })} />
                    </div>
                  </fieldset>
                  <Show when={state.optionGroups.length > 0}>
                    <fieldset class="fieldset">
                      <legend class="fieldset-legend text-xs">Option</legend>
                      <select
                        class="select select-sm"
                        value={commonValue(keys, (k: KeyData) => k.option?.groupId) ?? ''}
                        onChange={(e) => {
                          const v = e.currentTarget.value
                          if (!v) {
                            // Remove option from all selected keys
                            for (const k of keys) removeKeyOption(k.id)
                          }
                          else {
                            const groupId = Number(v)
                            const firstChoiceId = state.optionGroups.find(g => g.id === groupId)!.choices[0].id
                            for (const k of keys) assignKeyOption(k.id, groupId, firstChoiceId)
                          }
                        }}
                      >
                        <option value="">None</option>
                        <For each={state.optionGroups}>
                          {g => <option value={g.id}>{g.name}</option>}
                        </For>
                      </select>
                    </fieldset>
                  </Show>
                  <p class="text-center text-xs text-base-content/50">
                    {keys.length}
                    {' '}
                    keys selected
                  </p>
                </>
              )
            })()}
          </Match>

          {/* Single encoder selection */}
          <Match when={state.selectedIds.length === 1 && selectedEncoder()} keyed>
            {enc => (
              <>
                <fieldset class="fieldset">
                  <legend class="fieldset-legend text-xs">Position</legend>
                  <div class="grid grid-cols-2 gap-1">
                    <NumInput label="X" value={enc.x} onChange={v => updateEncoder(enc.id, { x: v })} />
                    <NumInput label="Y" value={enc.y} onChange={v => updateEncoder(enc.id, { y: v })} />
                  </div>
                </fieldset>
                <fieldset class="fieldset">
                  <legend class="fieldset-legend text-xs">Index</legend>
                  <NumInput label="Idx" value={enc.encoderIndex} step={1} min={0} onChange={v => updateEncoder(enc.id, { encoderIndex: v })} />
                </fieldset>
              </>
            )}
          </Match>

          {/* Multiple encoders selected */}
          <Match when={selectionType() === 'encoder' && state.selectedIds.length > 1}>
            {(() => {
              const encoders = getSelectedEncoders()
              return (
                <>
                  <fieldset class="fieldset">
                    <legend class="fieldset-legend text-xs">Position</legend>
                    <div class="grid grid-cols-2 gap-1">
                      <NumInput label="X" value={commonValue(encoders, (e: EncoderData) => e.x)} placeholder="..." onChange={v => updateSelectedEncoders({ x: v })} />
                      <NumInput label="Y" value={commonValue(encoders, (e: EncoderData) => e.y)} placeholder="..." onChange={v => updateSelectedEncoders({ y: v })} />
                    </div>
                  </fieldset>
                  <p class="text-center text-xs text-base-content/50">
                    {encoders.length}
                    {' '}
                    encoders selected
                  </p>
                </>
              )
            })()}
          </Match>

          {/* Single pin selection */}
          <Match when={state.selectedIds.length === 1 && selectedPin()} keyed>
            {pin => (
              <>
                <fieldset class="fieldset">
                  <legend class="fieldset-legend text-xs">Position</legend>
                  <div class="grid grid-cols-2 gap-1">
                    <NumInput label="X" value={pin.x} onChange={v => updatePin(pin.id, { x: v })} />
                    <NumInput label="Y" value={pin.y} onChange={v => updatePin(pin.id, { y: v })} />
                  </div>
                </fieldset>
                <fieldset class="fieldset">
                  <legend class="fieldset-legend text-xs">Index</legend>
                  <NumInput label="Idx" value={pin.index} step={1} min={0} onChange={v => updatePin(pin.id, { index: v })} />
                </fieldset>
                <fieldset class="fieldset">
                  <legend class="fieldset-legend text-xs">Type</legend>
                  <select
                    class="select select-sm"
                    value={pin.direction}
                    onChange={e => updatePin(pin.id, { direction: e.currentTarget.value as 'row' | 'col' })}
                  >
                    <option value="row">Row</option>
                    <option value="col">Col</option>
                  </select>
                </fieldset>
              </>
            )}
          </Match>

          {/* Multiple pins selected */}
          <Match when={selectionType() === 'pin' && state.selectedIds.length > 1}>
            {(() => {
              const pins = getSelectedPins()
              return (
                <>
                  <fieldset class="fieldset">
                    <legend class="fieldset-legend text-xs">Position</legend>
                    <div class="grid grid-cols-2 gap-1">
                      <NumInput label="X" value={commonValue(pins, (p: PinData) => p.x)} placeholder="..." onChange={v => updateSelectedPins({ x: v })} />
                      <NumInput label="Y" value={commonValue(pins, (p: PinData) => p.y)} placeholder="..." onChange={v => updateSelectedPins({ y: v })} />
                    </div>
                  </fieldset>
                  <p class="text-center text-xs text-base-content/50">
                    {pins.length}
                    {' '}
                    pins selected
                  </p>
                </>
              )
            })()}
          </Match>

          {/* Mixed selection (different types) */}
          <Match when={selectionType() === 'mixed'}>
            <p class="text-center text-xs text-base-content/50">
              {state.selectedIds.length}
              {' '}
              items selected
            </p>
          </Match>
        </Switch>
      </div>
    </div>
  )
}
