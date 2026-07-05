import { createEffect, createMemo, createSignal, For, Show } from 'solid-js'
import {
  deselectAll,
  endItemDrag,
  isDragging,
  KEY_UNIT,
  PIN_H,
  PIN_W,
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
  highlighted: boolean
}

export function Canvas() {
  const [rubberBand, setRubberBand] = createSignal<RubberBandState | null>(null)
  const [canvasDrag, setCanvasDrag] = createSignal<CanvasDragState | null>(null)
  let canvasRef!: HTMLDivElement
  let svgBgRef!: SVGSVGElement
  let svgFgRef!: SVGSVGElement

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

    const selected = new Set(state.selectedIds)

    // Build pin lookup maps — positions stored in px (center of pin)
    const rowPins = new Map<number, { id: string, x: number, y: number }>()
    const colPins = new Map<number, { id: string, x: number, y: number }>()
    for (const pin of state.pins) {
      const pos = { id: pin.id, x: (pin.x + PIN_W / 2) * KEY_UNIT, y: (pin.y + PIN_H / 2) * KEY_UNIT }
      if (pin.direction === 'row')
        rowPins.set(pin.index, pos)
      else
        colPins.set(pin.index, pos)
    }

    // Group keys by row/col pin index, track key ids for highlight
    // Positions stored in px (center of key, rotated if applicable)
    const keysByRow = new Map<number, { id: string, x: number, y: number }[]>()
    const keysByCol = new Map<number, { id: string, x: number, y: number }[]>()
    for (const key of state.keys) {
      // Compute visual center (accounting for rotation)
      const cx = key.x + key.w / 2
      const cy = key.y + key.h / 2
      let px: number, py: number
      if (key.r !== 0) {
        const rad = key.r * Math.PI / 180
        const dx = cx - key.rx
        const dy = cy - key.ry
        px = (key.rx + dx * Math.cos(rad) - dy * Math.sin(rad)) * KEY_UNIT
        py = (key.ry + dx * Math.sin(rad) + dy * Math.cos(rad)) * KEY_UNIT
      } else {
        px = cx * KEY_UNIT
        py = cy * KEY_UNIT
      }
      if (key.row >= 0) {
        let group = keysByRow.get(key.row)
        if (!group) {
          group = []
          keysByRow.set(key.row, group)
        }
        group.push({ id: key.id, x: px, y: py })
      }
      if (key.col >= 0) {
        let group = keysByCol.get(key.col)
        if (!group) {
          group = []
          keysByCol.set(key.col, group)
        }
        group.push({ id: key.id, x: px, y: py })
      }
    }

    // Check if a chain involves any selected item
    const isChainHighlighted = (pinId: string, keys: { id: string }[]): boolean => {
      if (selected.has(pinId)) return true
      return keys.some(k => selected.has(k.id))
    }

    // Build chain lines for a pin group — all positions already in px
    const buildChain = (
      pin: { id: string, x: number, y: number },
      keys: { id: string, x: number, y: number }[],
      type: 'row' | 'col',
    ) => {
      const highlighted = isChainHighlighted(pin.id, keys)
      const px = pin.x
      const py = pin.y

      // Sort keys by distance from pin
      const sorted = [...keys].sort((a, b) => {
        const da = (a.x - px) ** 2 + (a.y - py) ** 2
        const db = (b.x - px) ** 2 + (b.y - py) ** 2
        return da - db
      })

      // Pin → first key
      lines.push({ x1: px, y1: py, x2: sorted[0].x, y2: sorted[0].y, type, highlighted })

      // Chain: each key → nearest unvisited key
      for (let i = 0; i < sorted.length - 1; i++) {
        const current = sorted[i]
        let bestDist = Infinity
        let bestIdx = i + 1
        for (let j = i + 1; j < sorted.length; j++) {
          const d = (sorted[j].x - current.x) ** 2 + (sorted[j].y - current.y) ** 2
          if (d < bestDist) {
            bestDist = d
            bestIdx = j
          }
        }
        if (bestIdx !== i + 1)
          [sorted[i + 1], sorted[bestIdx]] = [sorted[bestIdx], sorted[i + 1]]

        lines.push({ x1: current.x, y1: current.y, x2: sorted[i + 1].x, y2: sorted[i + 1].y, type, highlighted })
      }
    }

    for (const [rowIdx, keys] of keysByRow) {
      const pin = rowPins.get(rowIdx)
      if (pin) buildChain(pin, keys, 'row')
    }

    for (const [colIdx, keys] of keysByCol) {
      const pin = colPins.get(colIdx)
      if (pin) buildChain(pin, keys, 'col')
    }

    return lines
  })

  // ── SVG wiring overlay — imperative DOM update via createEffect ────────────
  // Using createEffect + direct SVG DOM manipulation avoids SolidJS <For>-in-SVG
  // namespace issues and ensures lines update reactively.

  createEffect(() => {
    const svgBg = svgBgRef
    const svgFg = svgFgRef
    const canvas = canvasRef
    if (!svgBg || !svgFg || !canvas) return

    const lines = wiringLines()

    if (lines.length === 0) {
      while (svgBg.firstChild) svgBg.removeChild(svgBg.firstChild)
      while (svgFg.firstChild) svgFg.removeChild(svgFg.firstChild)
      return
    }

    // Resolve daisyUI semantic colors to computed rgb values via a temp HTML element
    const resolveColor = (cls: string): string => {
      const tmp = document.createElement('div')
      tmp.className = cls
      tmp.style.position = 'absolute'
      tmp.style.visibility = 'hidden'
      tmp.style.pointerEvents = 'none'
      canvas.appendChild(tmp)
      const color = getComputedStyle(tmp).backgroundColor
      canvas.removeChild(tmp)
      return color
    }
    const rowColor = resolveColor('bg-secondary')
    const colColor = resolveColor('bg-accent')

    const makeLineEl = (line: WireLine) => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      el.setAttribute('x1', String(line.x1))
      el.setAttribute('y1', String(line.y1))
      el.setAttribute('x2', String(line.x2))
      el.setAttribute('y2', String(line.y2))
      el.setAttribute('stroke', line.type === 'row' ? rowColor : colColor)
      el.setAttribute('stroke-opacity', line.highlighted ? '1' : '0.4')
      el.setAttribute('stroke-width', line.highlighted ? '3' : '2')
      el.setAttribute('stroke-dasharray', '6 4')
      return el
    }

    // bg SVG: non-highlighted lines (behind keys)
    while (svgBgRef.firstChild) svgBgRef.removeChild(svgBgRef.firstChild)
    for (const line of lines) {
      if (!line.highlighted) svgBgRef.appendChild(makeLineEl(line))
    }

    // fg SVG: highlighted lines (on top of keys)
    while (svgFgRef.firstChild) svgFgRef.removeChild(svgFgRef.firstChild)
    for (const line of lines) {
      if (line.highlighted) svgFgRef.appendChild(makeLineEl(line))
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

        {/* Wiring lines SVG — background (non-highlighted, behind keys) */}
        <svg
          ref={svgBgRef}
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

        {/* Wiring lines SVG — foreground (highlighted, on top of keys) */}
        <svg
          ref={svgFgRef}
          class="pointer-events-none absolute inset-0"
          style={{ width: '100%', height: '100%' }}
        />

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
