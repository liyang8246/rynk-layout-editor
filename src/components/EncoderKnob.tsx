import type { EncoderData } from '../stores/layout'
import { isDragging, KEY_UNIT, selectItem } from '../stores/layout'

interface EncoderKnobProps {
  encoder: EncoderData
  selected: boolean
  onDragStart?: (startX: number, startY: number) => void
}

export function EncoderKnob(props: EncoderKnobProps) {
  const handlePointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()

    selectItem(props.encoder.id, e.ctrlKey || e.metaKey)

    if (props.selected)
      props.onDragStart?.(e.clientX, e.clientY)
  }

  return (
    <div
      class="absolute flex items-center justify-center"
      classList={{
        'cursor-grab': props.selected && !isDragging(),
        'cursor-grabbing': props.selected && isDragging(),
        'cursor-pointer': !props.selected,
      }}
      style={{
        left: `${(props.encoder.x - 0.5) * KEY_UNIT}px`,
        top: `${(props.encoder.y - 0.5) * KEY_UNIT}px`,
        width: `${KEY_UNIT}px`,
        height: `${KEY_UNIT}px`,
      }}
      onPointerDown={handlePointerDown}
    >
      {/* Border ring */}
      <div
        class="absolute inset-0 rounded-full"
        classList={{
          'bg-primary': props.selected,
          'bg-accent': !props.selected,
        }}
      />
      {/* Face */}
      <div
        class="absolute flex items-center justify-center bg-accent/20 rounded-full"
        style={{
          left: '2px',
          top: '2px',
          right: '2px',
          bottom: '2px',
        }}
      >
        <span class="text-sm font-bold text-accent select-none">
          E
          {props.encoder.encoderIndex}
        </span>
      </div>
    </div>
  )
}
