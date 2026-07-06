import type { KeyData } from '../stores/layout'
import { Show } from 'solid-js'
import { isDragging, KEY_UNIT, selectItem } from '../stores/layout'

interface KeyCapProps {
  key: KeyData
  selected: boolean
  onDragStart?: (startX: number, startY: number) => void
}

const FACE_GAP = 1 // px, thin border

export function KeyCap(props: KeyCapProps) {
  const handlePointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()

    if (props.selected) {
      // Already selected: start drag (keep current multi-selection)
      props.onDragStart?.(e.clientX, e.clientY)
    }
    else {
      // Not selected: select it (no drag this click)
      selectItem(props.key.id, e.ctrlKey || e.metaKey)
    }
  }

  return (
    <div
      class="absolute"
      classList={{
        'cursor-grab': props.selected && !isDragging(),
        'cursor-grabbing': props.selected && isDragging(),
        'cursor-pointer': !props.selected,
      }}
      style={{
        'left': `${props.key.x * KEY_UNIT}px`,
        'top': `${props.key.y * KEY_UNIT}px`,
        'width': `${props.key.w * KEY_UNIT}px`,
        'height': `${props.key.h * KEY_UNIT}px`,
        'transform': `rotate(${props.key.r}deg)`,
        'transform-origin': `${((props.key.rx - props.key.x) * KEY_UNIT)}px ${((props.key.ry - props.key.y) * KEY_UNIT)}px`,
      }}
      onPointerDown={handlePointerDown}
    >
      {/* Border layer: two rects forming the L-shape border */}
      <div class="absolute inset-0 rounded-md">
        {/* Primary border rect */}
        <div
          class="absolute inset-0 rounded-md"
          classList={{
            'bg-primary': props.selected,
            'bg-base-300': !props.selected,
          }}
        />

        {/* L-shape secondary border rect */}
        <Show when={props.key.lshape}>
          {(lshape) => {
            const ls = lshape()
            return (
              <div
                class="absolute rounded-md"
                classList={{
                  'bg-primary': props.selected,
                  'bg-base-300': !props.selected,
                }}
                style={{
                  left: `${ls.x2 * KEY_UNIT}px`,
                  top: `${ls.y2 * KEY_UNIT}px`,
                  width: `${ls.w2 * KEY_UNIT}px`,
                  height: `${ls.h2 * KEY_UNIT}px`,
                }}
              />
            )
          }}
        </Show>
      </div>

      {/* Face layer: primary face (inset by FACE_GAP) */}
      <div
        class="absolute flex items-center justify-center bg-base-200 rounded-md"
        style={{
          left: `${FACE_GAP}px`,
          top: `${FACE_GAP}px`,
          right: `${FACE_GAP}px`,
          bottom: `${FACE_GAP}px`,
        }}
      >
        {/* Matrix label */}
        <span class="text-xs text-base-content/50 select-none">
          {props.key.row >= 0 && props.key.col >= 0 ? `(${props.key.row},${props.key.col})` : '?'}
        </span>
      </div>

      {/* Face layer: L-shape secondary face */}
      <Show when={props.key.lshape}>
        {(lshape) => {
          const ls = lshape()
          return (
            <div
              class="absolute bg-base-200 rounded-md"
              style={{
                left: `${ls.x2 * KEY_UNIT + FACE_GAP}px`,
                top: `${ls.y2 * KEY_UNIT + FACE_GAP}px`,
                width: `${ls.w2 * KEY_UNIT - FACE_GAP * 2}px`,
                height: `${ls.h2 * KEY_UNIT - FACE_GAP * 2}px`,
              }}
            />
          )
        }}
      </Show>
    </div>
  )
}
