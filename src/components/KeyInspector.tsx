import { For, Match, Show, Switch } from 'solid-js'
import {
  assignKeyOption,
  removeKeyOption,
  selectedEncoder,
  selectedKey,
  selectedPin,
  state,
  toggleLShape,
  updateEncoder,
  updateKey,
  updateKeyLshape,
  updatePin,
} from '../stores/layout'

function fmt(v: number): string {
  const s = v.toFixed(3)
  return s.replace(/0+$/, '').replace(/\.$/, '')
}

function NumInput(props: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <label class="input font-mono input-sm">
      <span class="label font-mono">{props.label}</span>
      <input
        type="text"
        value={fmt(props.value)}
        onChange={(e) => {
          const v = Number.parseFloat(e.currentTarget.value)
          if (!Number.isNaN(v))
            props.onChange(v)
        }}
        onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
      />
    </label>
  )
}

export function KeyInspector() {
  return (
    <div class="mb-auto ml-auto flex h-fit w-64 flex-col gap-1 rounded-xl bg-base-100 px-4 py-3 shadow-lg ring ring-base-300">
      <p class="text-center text-sm font-bold text-base-content">Properties</p>
      <Switch fallback={<p class="text-center text-xs text-base-content/50">Select an item to edit</p>}>
        <Match when={state.selectedIds.length > 1}>
          <p class="text-center text-xs text-base-content/50">
            {state.selectedIds.length}
            {' '}
            items selected
          </p>
        </Match>
        <Match when={selectedKey()} keyed>
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
        <Match when={selectedEncoder()} keyed>
          {enc => (
            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs">Encoder</legend>
              <div class="flex flex-col gap-1">
                <NumInput label="Idx" value={enc.encoderIndex} step={1} min={0} onChange={v => updateEncoder(enc.id, { encoderIndex: v })} />
                <NumInput label="X" value={enc.x} onChange={v => updateEncoder(enc.id, { x: v })} />
                <NumInput label="Y" value={enc.y} onChange={v => updateEncoder(enc.id, { y: v })} />
              </div>
            </fieldset>
          )}
        </Match>
        <Match when={selectedPin()} keyed>
          {pin => (
            <fieldset class="fieldset">
              <legend class="fieldset-legend text-xs">Pin</legend>
              <div class="flex flex-col gap-1">
                <select
                  class="select select-sm"
                  value={pin.direction}
                  onChange={e => updatePin(pin.id, { direction: e.currentTarget.value as 'row' | 'col' })}
                >
                  <option value="row">Row</option>
                  <option value="col">Col</option>
                </select>
                <NumInput label="Idx" value={pin.index} step={1} min={0} onChange={v => updatePin(pin.id, { index: v })} />
                <NumInput label="X" value={pin.x} onChange={v => updatePin(pin.id, { x: v })} />
                <NumInput label="Y" value={pin.y} onChange={v => updatePin(pin.id, { y: v })} />
              </div>
            </fieldset>
          )}
        </Match>
      </Switch>
    </div>
  )
}
