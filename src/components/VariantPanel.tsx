import { For, Show } from 'solid-js'
import {
  addOptionChoice,
  addOptionGroup,
  assignKeyOption,
  removeKeyOption,
  removeOptionGroup,
  renameOptionGroup,
  selectedKey,
  setActiveChoice,
  state,
} from '../stores/layout'

export function VariantPanel() {
  return (
    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-base-content/70">Layout Variants</span>
        <button class="btn btn-outline btn-primary btn-xs" onClick={() => addOptionGroup(`Group ${state.optionGroups.length + 1}`)}>
          + Group
        </button>
      </div>

      <Show when={state.optionGroups.length === 0}>
        <p class="text-center text-xs text-base-content/40">No variant groups</p>
      </Show>

      <For each={state.optionGroups}>
        {group => (
          <div class="flex flex-col gap-1.5 rounded-md bg-base-300/30 p-2">
            <div class="flex items-center gap-1">
              <input
                type="text"
                class="input-bordered input flex-1 input-xs"
                value={group.name}
                onChange={e => renameOptionGroup(group.id, e.currentTarget.value)}
              />
              <button class="btn btn-circle btn-ghost text-error btn-xs" onClick={() => removeOptionGroup(group.id)}>✕</button>
            </div>

            {/* Active choice selector */}
            <div class="flex flex-wrap gap-1">
              <For each={group.choices}>
                {choice => (
                  <button
                    class="btn btn-xs"
                    classList={{
                      'btn-primary': state.activeChoices[group.id] === choice.id,
                      'btn-ghost': state.activeChoices[group.id] !== choice.id,
                    }}
                    onClick={() => setActiveChoice(group.id, choice.id)}
                  >
                    {choice.name}
                  </button>
                )}
              </For>
              <button
                class="btn btn-circle btn-ghost btn-xs"
                onClick={() => addOptionChoice(group.id, `Choice ${group.choices.length}`)}
              >
                +
              </button>
            </div>

            {/* Assign selected key to this group/choice */}
            <Show when={selectedKey()}>
              {k => (
                <div class="flex flex-wrap gap-1">
                  <span class="text-xs text-base-content/50">Assign:</span>
                  <For each={group.choices}>
                    {choice => (
                      <button
                        class="btn btn-outline btn-xs"
                        classList={{
                          'btn-active': k().option?.groupId === group.id && k().option?.choiceId === choice.id,
                        }}
                        onClick={() => assignKeyOption(k().id, group.id, choice.id)}
                      >
                        {choice.name}
                      </button>
                    )}
                  </For>
                  <Show when={k().option?.groupId === group.id}>
                    <button class="btn btn-ghost text-error btn-xs" onClick={() => removeKeyOption(k().id)}>
                      Clear
                    </button>
                  </Show>
                </div>
              )}
            </Show>
          </div>
        )}
      </For>
    </div>
  )
}
