import { For } from 'solid-js'
import { addKey, KEY_UNIT, state } from '../stores/layout'
import { EncoderKnob } from './EncoderKnob'
import { KeyCap } from './KeyCap'

const MIN_WIDTH = 20 * KEY_UNIT
const MIN_HEIGHT = 8 * KEY_UNIT

export function Canvas() {
  /** Click on empty canvas: add key at grid-snapped position */
  const handleCanvasClick = (e: MouseEvent) => {
    if (e.target !== e.currentTarget) return

    const target = e.currentTarget as HTMLDivElement
    const offsetX = e.clientX - target.getBoundingClientRect().left + target.scrollLeft
    const offsetY = e.clientY - target.getBoundingClientRect().top + target.scrollTop

    const unitX = offsetX / KEY_UNIT
    const unitY = offsetY / KEY_UNIT
    // Snap center to 0.5u grid, clamp to minimum 0.5 so key is visible
    const snappedX = Math.max(0.5, Math.round(unitX * 2) / 2)
    const snappedY = Math.max(0.5, Math.round(unitY * 2) / 2)

    addKey(snappedX, snappedY)
  }

  return (
    <div class="flex-1 overflow-auto bg-base-100 p-4">
      <div
        class="relative cursor-crosshair select-none"
        style={{
          'min-width': `${MIN_WIDTH}px`,
          'min-height': `${MIN_HEIGHT}px`,
          'background-image': `
            linear-gradient(to right, hsl(var(--bc) / 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--bc) / 0.08) 1px, transparent 1px)
          `,
          'background-size': `${KEY_UNIT}px ${KEY_UNIT}px`,
        }}
        onClick={handleCanvasClick}
      >
        {/* Grid major lines (every 5u) */}
        <div
          class="pointer-events-none absolute inset-0"
          style={{
            'background-image': `
              linear-gradient(to right, hsl(var(--bc) / 0.15) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--bc) / 0.15) 1px, transparent 1px)
            `,
            'background-size': `${KEY_UNIT * 5}px ${KEY_UNIT * 5}px`,
          }}
        />

        {/* Keys */}
        <For each={state.keys}>
          {key => (
            <KeyCap
              key={key}
              selected={state.selectedIds.includes(key.id)}
            />
          )}
        </For>

        {/* Encoders */}
        <For each={state.encoders}>
          {encoder => (
            <EncoderKnob
              encoder={encoder}
              selected={state.selectedIds.includes(encoder.id)}
            />
          )}
        </For>
      </div>
    </div>
  )
}
