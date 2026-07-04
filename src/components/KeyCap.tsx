import type { KeyData } from '../stores/layout'
import { Show } from 'solid-js'
import { KEY_UNIT, selectItem } from '../stores/layout'

interface KeyCapProps {
  key: KeyData
  selected: boolean
}

export function KeyCap(props: KeyCapProps) {
  const handleClick = (e: MouseEvent) => {
    e.stopPropagation()
    selectItem(props.key.id, e.shiftKey)
  }

  return (
    <div
      class="absolute cursor-pointer"
      style={{
        left: `${(props.key.x - props.key.w / 2) * KEY_UNIT}px`,
        top: `${(props.key.y - props.key.h / 2) * KEY_UNIT}px`,
        width: `${props.key.w * KEY_UNIT}px`,
        height: `${props.key.h * KEY_UNIT}px`,
        transform: `rotate(${props.key.r}deg)`,
      }}
      onClick={handleClick}
    >
      {/* Primary key cap */}
      <div
        class="absolute inset-0 flex items-center justify-center bg-base-200 border border-base-300 rounded-md transition-shadow"
        classList={{
          'ring-2 ring-primary': props.selected,
        }}
      >
        {/* Matrix label */}
        <span class="text-xs text-base-content/50 select-none">
          {props.key.row >= 0 && props.key.col >= 0 ? `(${props.key.row},${props.key.col})` : '?'}
        </span>
      </div>

      {/* L-shape secondary rectangle */}
      <Show when={props.key.lshape}>
        {lshape => (
          <div
            class="absolute bg-base-300 border border-base-300 rounded-md"
            style={{
              left: `${lshape().x2 * KEY_UNIT}px`,
              top: `${lshape().y2 * KEY_UNIT}px`,
              width: `${lshape().w2 * KEY_UNIT}px`,
              height: `${lshape().h2 * KEY_UNIT}px`,
            }}
          />
        )}
      </Show>
    </div>
  )
}
