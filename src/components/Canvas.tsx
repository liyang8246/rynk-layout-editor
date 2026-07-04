import { createSignal, For, Show } from 'solid-js'
import {
  deselectAll,
  endItemDrag,
  isDragging,
  KEY_UNIT,
  pxToUnit,
  selectItemsInRect,
  startItemDrag,
  state,
  updateItemDrag,
} from '../stores/layout'
import { EncoderKnob } from './EncoderKnob'
import { KeyCap } from './KeyCap'

/** Drag state for rubber-band selection */
interface RubberBandState {
  startX: number // px in canvas coords
  startY: number
  currentX: number
  currentY: number
  additive: boolean // Ctrl held at drag start
}

/** Drag state for moving selected items */
interface ItemDragState {
  startClientX: number // screen px
  startClientY: number
  canvasRef: HTMLDivElement
}

export function Canvas() {
  const [rubberBand, setRubberBand] = createSignal<RubberBandState | null>(null)
  const [itemDrag, setItemDrag] = createSignal<ItemDragState | null>(null)
  let canvasRef!: HTMLDivElement

  const getCanvasPos = (e: MouseEvent) => {
    const rect = canvasRef.getBoundingClientRect()
    return {
      x: e.clientX - rect.left + canvasRef.scrollLeft,
      y: e.clientY - rect.top + canvasRef.scrollTop,
    }
  }

  // ── Rubber-band (canvas background drag) ───────────────────────────────────

  const handleCanvasMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return
    if (e.target !== e.currentTarget) return

    const pos = getCanvasPos(e)
    setRubberBand({
      startX: pos.x,
      startY: pos.y,
      currentX: pos.x,
      currentY: pos.y,
      additive: e.ctrlKey || e.metaKey,
    })
  }

  // ── Item drag (started from KeyCap/EncoderKnob) ────────────────────────────

  const handleDragStart = (startClientX: number, startClientY: number) => {
    startItemDrag()
    setItemDrag({ startClientX, startClientY, canvasRef })

    // Attach document-level listeners so drag continues even if pointer leaves canvas
    const onMove = (e: PointerEvent) => {
      const d = itemDrag()
      if (!d) return
      const dx = pxToUnit(e.clientX - d.startClientX)
      const dy = pxToUnit(e.clientY - d.startClientY)
      updateItemDrag(dx, dy)
    }

    const onUp = () => {
      endItemDrag()
      setItemDrag(null)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  // ── Global mouse move/up for rubber-band ───────────────────────────────────

  const handleMouseMove = (e: MouseEvent) => {
    const rb = rubberBand()
    if (!rb) return

    const pos = getCanvasPos(e)
    setRubberBand({ ...rb, currentX: pos.x, currentY: pos.y })
  }

  const handleMouseUp = (e: MouseEvent) => {
    const rb = rubberBand()
    if (!rb) return

    const pos = getCanvasPos(e)
    const ux1 = pxToUnit(rb.startX)
    const uy1 = pxToUnit(rb.startY)
    const ux2 = pxToUnit(pos.x)
    const uy2 = pxToUnit(pos.y)

    const dx = Math.abs(ux2 - ux1)
    const dy = Math.abs(uy2 - uy1)
    if (dx < 0.1 && dy < 0.1) {
      if (!rb.additive) deselectAll()
    }
    else {
      selectItemsInRect(ux1, uy1, ux2, uy2, rb.additive)
    }

    setRubberBand(null)
  }

  // ── Rubber-band rect computation ───────────────────────────────────────────

  const rubberBandRect = () => {
    const rb = rubberBand()
    if (!rb) return null
    const left = Math.min(rb.startX, rb.currentX)
    const top = Math.min(rb.startY, rb.currentY)
    const width = Math.abs(rb.currentX - rb.startX)
    const height = Math.abs(rb.currentY - rb.startY)
    if (width < 3 && height < 3) return null
    return { left, top, width, height }
  }

  return (
    <div class="flex-1 overflow-auto bg-base-100 p-4">
      <div
        ref={canvasRef}
        class="relative select-none w-full h-full"
        classList={{
          'cursor-grabbing': isDragging(),
        }}
        onMouseDown={handleCanvasMouseDown}
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
              onDragStart={handleDragStart}
            />
          )}
        </For>

        {/* Encoders */}
        <For each={state.encoders}>
          {encoder => (
            <EncoderKnob
              encoder={encoder}
              selected={state.selectedIds.includes(encoder.id)}
              onDragStart={handleDragStart}
            />
          )}
        </For>

        {/* Rubber-band selection rectangle */}
        <Show when={rubberBandRect()}>
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
