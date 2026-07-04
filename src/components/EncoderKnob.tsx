import type { EncoderData } from '../stores/layout'
import { KEY_UNIT, selectItem } from '../stores/layout'

interface EncoderKnobProps {
  encoder: EncoderData
  selected: boolean
}

export function EncoderKnob(props: EncoderKnobProps) {
  const handleClick = (e: MouseEvent) => {
    e.stopPropagation()
    selectItem(props.encoder.id, e.shiftKey)
  }

  return (
    <div
      class="absolute flex items-center justify-center cursor-pointer"
      style={{
        left: `${(props.encoder.x - 0.5) * KEY_UNIT}px`,
        top: `${(props.encoder.y - 0.5) * KEY_UNIT}px`,
        width: `${KEY_UNIT}px`,
        height: `${KEY_UNIT}px`,
      }}
      onClick={handleClick}
    >
      <div
        class="w-full h-full flex items-center justify-center bg-accent/20 border-2 border-accent rounded-full transition-shadow"
        classList={{
          'ring-2 ring-primary': props.selected,
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
