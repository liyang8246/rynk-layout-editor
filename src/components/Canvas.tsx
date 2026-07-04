import { createEffect, createMemo, createSignal, For, Show } from 'solid-js'
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
import { PinNode } from './PinNode'

/** Drag state for rubber-band selection */
interface RubberBandState {
  startX: number // px in canvas coords
  startY: number
  currentX: number
  currentY: number
  additive: boolean // Ctrl held at drag start
}

/** Drag state for moving selected items */
interface CanvasDragState {
  startClientX: number // screen px
  startClientY: number
  canvasRef: HTMLDivElement
}

interface WireLine {
  x1: number
  y1: number
  x2: number
  y2: number
  type: 'row' | 'col'
  dashed: boolean
}

export function Canvas() {
  const [rubberBand, setRubberBand] = createSignal<RubberBandState | null>(null)
  const [canvasDrag, setCanvasDrag] = createSignal<CanvasDragState | null>(null)
  let canvasRef!: HTMLDivElement
  let svgRef!: SVGSVGElement

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
    setCanvasDrag({ startClientX, startClientY, canvasRef })

    // Attach document-level listeners so drag continues even if pointer leaves canvas
    const onMove = (e: PointerEvent) => {
      const d = canvasDrag()
      if (!d) return
      const dx = pxToUnit(e.clientX - d.startClientX)
      const dy = pxToUnit(e.clientY - d.startClientY)
      updateItemDrag(dx, dy)
    }

    const onUp = () => {
      endItemDrag()
      setCanvasDrag(null)
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

  // ── Wiring lines computation ───────────────────────────────────────────────

  const wiringLines = createMemo((): WireLine[] => {
    const lines: WireLine[] = []

    const rowPins = new Map<number, { x: number, y: number }>()
    const colPins = new Map<number, { x: number, y: number }>()
    for (const pin of state.pins) {
      if (pin.direction === 'row')
        rowPins.set(pin.index, { x: pin.x, y: pin.y })
      else
        colPins.set(pin.index, { x: pin.x, y: pin.y })
    }

    for (const key of state.keys) {
      const kx = key.x * KEY_UNIT
      const ky = key.y * KEY_UNIT
      const hasRow = key.row >= 0
      const hasCol = key.col >= 0
      const fullyWired = hasRow && hasCol

      if (hasRow) {
        const pin = rowPins.get(key.row)
        if (pin) {
          lines.push({
            x1: kx,
            y1: ky,
            x2: pin.x * KEY_UNIT,
            y2: pin.y * KEY_UNIT,
            type: 'row',
            dashed: !fullyWired,
          })
        }
      }

      if (hasCol) {
        const pin = colPins.get(key.col)
        if (pin) {
          lines.push({
            x1: kx,
            y1: ky,
            x2: pin.x * KEY_UNIT,
            y2: pin.y * KEY_UNIT,
            type: 'col',
            dashed: !fullyWired,
          })
        }
      }
    }

    return lines
  })

  // ── SVG wiring overlay — imperative DOM update via createEffect ────────────
  // Using createEffect + direct SVG DOM manipulation avoids SolidJS <For>-in-SVG
  // namespace issues and ensures lines update reactively.

  createEffect(() => {
    const svg = svgRef
    if (!svg) return

    const lines = wiringLines()

    // Clear previous lines
    while (svg.firstChild)
      svg.removeChild(svg.firstChild)

    // Draw new lines
    const rowColor = getComputedStyle(document.documentElement).getPropertyValue('--s').trim()
    const colColor = getComputedStyle(document.documentElement).getPropertyValue('--a').trim()
    for (const line of lines) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      el.setAttribute('x1', String(line.x1))
      el.setAttribute('y1', String(line.y1))
      el.setAttribute('x2', String(line.x2))
      el.setAttribute('y2', String(line.y2))
      el.setAttribute('stroke', line.type === 'row' ? `oklch(${rowColor} / 0.6)` : `oklch(${colColor} / 0.6)`)
      el.setAttribute('stroke-width', '2')
      if (line.dashed)
        el.setAttribute('stroke-dasharray', '6 4')
      svg.appendChild(el)
    }
  })

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

        {/* Wiring lines SVG overlay */}
        <svg
          ref={svgRef}
          class="pointer-events-none absolute inset-0"
          style={{ width: '100%', height: '100%' }}
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

        {/* Pins */}
        <For each={state.pins}>
          {pin => (
            <PinNode
              pin={pin}
              selected={state.selectedIds.includes(pin.id)}
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
