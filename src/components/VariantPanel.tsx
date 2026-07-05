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
        <button class="btn btn-xs btn-primary btn-outline" onClick={() => addOptionGroup(`Group ${state.optionGroups.length + 1}`)}>
          + Group
        </button>
      </div>

      <Show when={state.optionGroups.length === 0}>
        <p class="text-xs text-base-content/40 text-center">No variant groups</p>
      </Show>

      <For each={state.optionGroups}>
        {group => (
          <div class="bg-base-300/30 rounded-md p-2 flex flex-col gap-1.5">
            <div class="flex items-center gap-1">
              <input
                type="text"
                class="input input-xs input-bordered flex-1"
                value={group.name}
                onChange={e => renameOptionGroup(group.id, e.currentTarget.value)}
              />
              <button class="btn btn-xs btn-ghost btn-circle text-error" onClick={() => removeOptionGroup(group.id)}>✕</button>
            </div>

            {/* Active choice selector */}
            <div class="flex gap-1 flex-wrap">
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
                class="btn btn-xs btn-ghost btn-circle"
                onClick={() => addOptionChoice(group.id, `Choice ${group.choices.length}`)}
              >
                +
              </button>
            </div>

            {/* Assign selected key to this group/choice */}
            <Show when={selectedKey()}>
              {k => (
                <div class="flex gap-1 flex-wrap">
                  <span class="text-xs text-base-content/50">Assign:</span>
                  <For each={group.choices}>
                    {choice => (
                      <button
                        class="btn btn-xs btn-outline"
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
                    <button class="btn btn-xs btn-ghost text-error" onClick={() => removeKeyOption(k().id)}>
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
