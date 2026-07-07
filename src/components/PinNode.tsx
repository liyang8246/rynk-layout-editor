import type { PinData } from '../stores/layout'
import { connectSelectedToPin, hasSelectedKeys, isDragging, KEY_UNIT, PIN_H, PIN_W, selectItem } from '../stores/layout'

interface PinNodeProps {
  pin: PinData
  selected: boolean
  onDragStart?: (startX: number, startY: number) => void
}

export function PinNode(props: PinNodeProps) {
  const handlePointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()

    if (e.ctrlKey || e.metaKey) {
      selectItem(props.pin.id, true)
    }
    else if (props.selected) {
      props.onDragStart?.(e.clientX, e.clientY)
    }
    else if (hasSelectedKeys()) {
      connectSelectedToPin(props.pin.id)
    }
    else {
      selectItem(props.pin.id, false)
    }
  }

  const label = () => props.pin.direction === 'row'
    ? `R${props.pin.index}`
    : `C${props.pin.index}`

  return (
    <div
      class="absolute flex items-center justify-center rounded-lg bg-base-200 ring-2"
      classList={{
        'cursor-grab': props.selected && !isDragging(),
        'cursor-grabbing': props.selected && isDragging(),
        'cursor-pointer': !props.selected,
        'ring-primary': props.selected,
        'ring-base-300': !props.selected,
      }}
      style={{
        left: `${props.pin.x * KEY_UNIT}px`,
        top: `${props.pin.y * KEY_UNIT}px`,
        width: `${PIN_W * KEY_UNIT}px`,
        height: `${PIN_H * KEY_UNIT}px`,
      }}
      onPointerDown={handlePointerDown}
    >
      <span
        class="text-xs font-bold select-none"
        classList={{
          'text-info': props.pin.direction === 'row',
          'text-error': props.pin.direction === 'col',
        }}
      >
        {label()}
      </span>
    </div>
  )
}
