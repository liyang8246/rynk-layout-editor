import { createSignal, For, Show } from 'solid-js'
import { deselectAll, KEY_UNIT, pxToUnit, selectItemsInRect, state } from '../stores/layout'
import { EncoderKnob } from './EncoderKnob'
import { KeyCap } from './KeyCap'

const MIN_WIDTH = 20 * KEY_UNIT
const MIN_HEIGHT = 8 * KEY_UNIT

/** Drag state for rubber-band selection */
interface DragState {
  startX: number // px in canvas coords
  startY: number
  currentX: number
  currentY: number
  additive: boolean // Ctrl held at drag start
}

export function Canvas() {
  const [drag, setDrag] = createSignal<DragState | null>(null)

  const getCanvasPos = (e: MouseEvent, target: HTMLDivElement) => {
    const rect = target.getBoundingClientRect()
    return {
      x: e.clientX - rect.left + target.scrollLeft,
      y: e.clientY - rect.top + target.scrollTop,
    }
  }

  const handleMouseDown = (e: MouseEvent) => {
    // Only left button on empty canvas
    if (e.button !== 0) return
    if (e.target !== e.currentTarget) return

    const target = e.currentTarget as HTMLDivElement
    const pos = getCanvasPos(e, target)

    setDrag({
      startX: pos.x,
      startY: pos.y,
      currentX: pos.x,
      currentY: pos.y,
      additive: e.ctrlKey || e.metaKey,
    })
  }

  const handleMouseMove = (e: MouseEvent) => {
    const d = drag()
    if (!d) return

    const target = e.currentTarget as HTMLDivElement
    const pos = getCanvasPos(e, target)
    setDrag({ ...d, currentX: pos.x, currentY: pos.y })
  }

  const handleMouseUp = (e: MouseEvent) => {
    const d = drag()
    if (!d) return

    const target = e.currentTarget as HTMLDivElement
    const pos = getCanvasPos(e, target)
    const endX = pos.x
    const endY = pos.y

    // Convert to key units and select items in the rect
    const ux1 = pxToUnit(d.startX)
    const uy1 = pxToUnit(d.startY)
    const ux2 = pxToUnit(endX)
    const uy2 = pxToUnit(endY)

    // If drag distance is tiny, treat as click → deselect
    const dx = Math.abs(ux2 - ux1)
    const dy = Math.abs(uy2 - uy1)
    if (dx < 0.1 && dy < 0.1) {
      if (!d.additive) deselectAll()
    } else {
      selectItemsInRect(ux1, uy1, ux2, uy2, d.additive)
    }

    setDrag(null)
  }

  /** Compute the rubber-band rectangle in px (normalized so left/top is min) */
  const rubberBand = () => {
    const d = drag()
    if (!d) return null
    const left = Math.min(d.startX, d.currentX)
    const top = Math.min(d.startY, d.currentY)
    const width = Math.abs(d.currentX - d.startX)
    const height = Math.abs(d.currentY - d.startY)
    // Only show if meaningful size
    if (width < 3 && height < 3) return null
    return { left, top, width, height }
  }

  return (
    <div class="flex-1 overflow-auto bg-base-100 p-4">
      <div
        class="relative select-none"
        classList={{
          'cursor-crosshair': !drag(),
          'cursor-default': !!drag(),
        }}
        style={{
          'min-width': `${MIN_WIDTH}px`,
          'min-height': `${MIN_HEIGHT}px`,
          'background-image': `
            linear-gradient(to right, hsl(var(--bc) / 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--bc) / 0.08) 1px, transparent 1px)
          `,
          'background-size': `${KEY_UNIT}px ${KEY_UNIT}px`,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
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

        {/* Rubber-band selection rectangle */}
        <Show when={rubberBand()}>
          {rect => (
            <div
              class="pointer-events-none absolute border-2 border-primary/50 bg-primary/10"
              style={{
                left: `${rect().left}px`,
                top: `${rect().top}px`,
                width: `${rect().width}px`,
                height: `${rect().height}px`,
              }}
            />
          )}
        </Show>
      </div>
    </div>
  )
}
