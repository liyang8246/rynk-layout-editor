import { createMemo, createSignal, For, onMount, Show } from 'solid-js'
import {
  deselectAll,
  endItemDrag,
  isDragging,
  isKeyVisible,
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

interface CanvasProps {
  origin: () => { x: number, y: number }
}

export function Canvas(props: CanvasProps) {
  const [rubberBand, setRubberBand] = createSignal<RubberBandState | null>(null)
  const [canvasDrag, setCanvasDrag] = createSignal<CanvasDragState | null>(null)
  let canvasRef!: HTMLDivElement
  let innerRef!: HTMLDivElement

  // ── Resolve daisyUI colors once on mount ────────────────────────────────────
  const [rowColor, setRowColor] = createSignal('')
  const [colColor, setColColor] = createSignal('')

  onMount(() => {
    const resolveColor = (cls: string): string => {
      const tmp = document.createElement('div')
      tmp.className = cls
      tmp.style.position = 'absolute'
      tmp.style.visibility = 'hidden'
      tmp.style.pointerEvents = 'none'
      canvasRef.appendChild(tmp)
      const color = getComputedStyle(tmp).backgroundColor
      canvasRef.removeChild(tmp)
      return color
    }
    setRowColor(resolveColor('bg-sky-300'))
    setColColor(resolveColor('bg-rose-300'))
  })

  const getCanvasPos = (e: MouseEvent) => {
    const rect = canvasRef.getBoundingClientRect()
    const o = props.origin()
    return {
      x: e.clientX - rect.left + canvasRef.scrollLeft - o.x,
      y: e.clientY - rect.top + canvasRef.scrollTop - o.y,
    }
  }

  // ── Rubber-band (canvas background drag) ───────────────────────────────────

  const handleCanvasMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return
    // Only start rubber-band when clicking the canvas background (outer or inner div),
    // not when clicking on keys/encoders/pins (which stopPropagation)
    const target = e.target as HTMLElement
    if (target !== canvasRef && target !== innerRef) return

    const pos = getCanvasPos(e)
    const rbState: RubberBandState = {
      startX: pos.x,
      startY: pos.y,
      currentX: pos.x,
      currentY: pos.y,
      additive: e.ctrlKey || e.metaKey,
    }
    setRubberBand(rbState)

    // Attach document-level listeners so rubber-band continues even if pointer leaves canvas
    const onMove = (ev: PointerEvent) => {
      const rb = rubberBand()
      if (!rb) return
      const p = getCanvasPos(ev)
      setRubberBand({ ...rb, currentX: p.x, currentY: p.y })
    }

    const onUp = (ev: PointerEvent) => {
      const rb = rubberBand()
      if (!rb) return

      const pos = getCanvasPos(ev)
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
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
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
      // Skip keys hidden by variant choice
      if (!isKeyVisible(key)) continue

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
      }
      else {
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

  // ── SVG wiring overlay — declarative <For> rendering ───────────────────────

  const bgLines = createMemo(() => wiringLines().filter(l => !l.highlighted))
  const fgLines = createMemo(() => wiringLines().filter(l => l.highlighted))

  return (
    <div
      ref={canvasRef}
      class="relative size-full overflow-auto select-none"
      classList={{
        'cursor-grabbing': isDragging(),
      }}
      onMouseDown={handleCanvasMouseDown}
    >
      {/* Full-viewport grid background, offset to align with canvas origin */}
      <div
        class="pointer-events-none absolute inset-0 grid-canvas"
        style={{ 'background-position': `${props.origin().x}px ${props.origin().y}px` }}
      />
      <div
        ref={innerRef}
        class="relative"
        style={{
          'transform': `translate(${props.origin().x}px, ${props.origin().y}px)`,
          // TODO: compute from item bounding box for edge-case layouts
          'min-width': '2000px',
          'min-height': '1500px',
        }}
      >
        {/* Wiring lines SVG — background (non-highlighted, behind keys) */}
        <svg
          class="pointer-events-none absolute inset-0"
          style={{ width: '100%', height: '100%' }}
        >
          <For each={bgLines()}>
            {line => (
              <line
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={line.type === 'row' ? rowColor() : colColor()}
                stroke-width="2"
                stroke-dasharray="6 4"
              />
            )}
          </For>
        </svg>

        {/* Keys */}
        <For each={state.keys.filter(isKeyVisible)}>
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
          class="pointer-events-none absolute inset-0"
          style={{ width: '100%', height: '100%' }}
        >
          <For each={fgLines()}>
            {line => (
              <line
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={line.type === 'row' ? rowColor() : colColor()}
                stroke-width="2"
                stroke-dasharray="6 4"
              />
            )}
          </For>
        </svg>

        {/* Rubber-band selection rectangle — rendered inside canvas coordinate space */}
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
