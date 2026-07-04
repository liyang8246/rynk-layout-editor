import type { KeyData } from '../stores/layout'
import { Show } from 'solid-js'
import { isDragging, KEY_UNIT, selectItem } from '../stores/layout'

interface KeyCapProps {
  key: KeyData
  selected: boolean
  onDragStart?: (startX: number, startY: number) => void
  ghost?: boolean
  effectiveKey?: KeyData
  displayPos?: { displayX: number, displayY: number } | null
}

const FACE_GAP = 2 // px, m-0.5 ≈ 2px

export function KeyCap(props: KeyCapProps) {
  const handlePointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()

    // Ghost keys are not selectable or draggable
    if (props.ghost) return

    if (props.selected) {
      // Already selected: start drag (keep current multi-selection)
      props.onDragStart?.(e.clientX, e.clientY)
    }
    else {
      // Not selected: select it (no drag this click)
      selectItem(props.key.id, e.ctrlKey || e.metaKey)
    }
  }

  // Determine which key data to use for rendering
  const renderKey = () => props.effectiveKey ?? props.key

  // Determine position: use displayPos for reflowed variant position, or raw key position
  const pos = () => {
    if (props.ghost) {
      // Ghost keys render at their RAW position
      return {
        x: props.key.x,
        y: props.key.y,
        w: props.key.w,
        h: props.key.h,
      }
    }
    if (props.displayPos) {
      return {
        x: props.displayPos.displayX,
        y: props.displayPos.displayY,
        w: renderKey().w,
        h: renderKey().h,
      }
    }
    return {
      x: props.key.x,
      y: props.key.y,
      w: renderKey().w,
      h: renderKey().h,
    }
  }

  return (
    <div
      class="absolute"
      classList={{
        'cursor-grab': props.selected && !isDragging() && !props.ghost,
        'cursor-grabbing': props.selected && isDragging() && !props.ghost,
        'cursor-pointer': !props.selected && !props.ghost,
        'pointer-events-none': props.ghost,
        'opacity-30': props.ghost,
      }}
      style={{
        left: `${(pos().x - pos().w / 2) * KEY_UNIT}px`,
        top: `${(pos().y - pos().h / 2) * KEY_UNIT}px`,
        width: `${pos().w * KEY_UNIT}px`,
        height: `${pos().h * KEY_UNIT}px`,
        transform: `rotate(${renderKey().r}deg)`,
      }}
      onPointerDown={handlePointerDown}
    >
      {/* Border layer: two rects forming the L-shape border */}
      <div class="absolute inset-0 rounded-md">
        {/* Primary border rect */}
        <div
          class="absolute inset-0 rounded-md"
          classList={{
            'bg-primary': props.selected && !props.ghost,
            'bg-base-300': !props.selected && !props.ghost,
            'border-2 border-dashed border-base-content/30': props.ghost,
          }}
        />

        {/* L-shape secondary border rect */}
        <Show when={renderKey().lshape}>
          {lshape => {
            const ls = lshape()
            // x2/y2 are center-offsets (Rynk convention): offset from primary center to secondary center.
            // CSS positions are relative to the primary rect's top-left, so convert:
            // secondary top-left offset = centerOffset - secondaryHalfSize + primaryHalfSize
            const leftOffset = ls.x2 - ls.w2 / 2 + renderKey().w / 2
            const topOffset = ls.y2 - ls.h2 / 2 + renderKey().h / 2
            return (
              <div
                class="absolute rounded-md"
                classList={{
                  'bg-primary': props.selected && !props.ghost,
                  'bg-base-300': !props.selected && !props.ghost,
                  'border-2 border-dashed border-base-content/30': props.ghost,
                }}
                style={{
                  left: `${leftOffset * KEY_UNIT}px`,
                  top: `${topOffset * KEY_UNIT}px`,
                  width: `${ls.w2 * KEY_UNIT}px`,
                  height: `${ls.h2 * KEY_UNIT}px`,
                }}
              />
            )
          }}
        </Show>
      </div>

      {/* Face layer: primary face (inset by FACE_GAP) — only for non-ghost keys */}
      <Show when={!props.ghost}>
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
      </Show>

      {/* Ghost key label — very faint */}
      <Show when={props.ghost}>
        <div class="absolute inset-0 flex items-center justify-center">
          <span class="text-xs text-base-content/20 select-none">
            {props.key.row >= 0 && props.key.col >= 0 ? `(${props.key.row},${props.key.col})` : '?'}
          </span>
        </div>
      </Show>

      {/* Face layer: L-shape secondary face — only for non-ghost keys */}
      <Show when={!props.ghost && renderKey().lshape}>
        {lshape => {
          const ls = lshape()
          const leftOffset = ls.x2 - ls.w2 / 2 + renderKey().w / 2
          const topOffset = ls.y2 - ls.h2 / 2 + renderKey().h / 2
          return (
            <div
              class="absolute bg-base-200 rounded-md"
              style={{
                left: `${leftOffset * KEY_UNIT + FACE_GAP}px`,
                top: `${topOffset * KEY_UNIT + FACE_GAP}px`,
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
