import { createElementSize } from '@solid-primitives/resize-observer'
import { onMount } from 'solid-js'
import { Canvas } from './components/Canvas'
import { KeyInspector } from './components/KeyInspector'
import { Toolbar } from './components/Toolbar'
import { useKeyboardShortcuts } from './stores/layout'

function App() {
  let topLeftRef!: HTMLDivElement
  // Pre-set initial origin to match CSS grid template values, avoiding a one-frame flash
  // before ResizeObserver fires. These fallbacks match grid-cols-[352px]/grid-rows-[6rem].
  const topLeftSize = createElementSize(() => topLeftRef)
  const origin = () => ({ x: topLeftSize.width ?? 352, y: topLeftSize.height ?? 96 })

  onMount(() => {
    useKeyboardShortcuts()
  })

  return (
    <div class="relative h-screen w-screen">
      <Canvas origin={origin} />
      <div class="pointer-events-none absolute inset-0 grid grid-cols-[352px_1fr] grid-rows-[6rem_1fr] 2xl:grid-cols-[2fr_5fr]">
        {/* Logo pill — top-left */}
        <div ref={topLeftRef} class="pointer-events-auto flex p-4">
          <div class="mt-auto ml-auto flex h-12 w-80 items-center justify-between rounded-xl bg-base-100 px-4 py-3 shadow-lg ring ring-base-300">
            <h1 class="flex gap-1.5 text-base-content">
              <a href="https://rmk.rs" target="_blank">
                <img src="/logo.svg" alt="logo" class="h-6" />
              </a>
              <span class="cursor-default font-bold">Layout Editor</span>
            </h1>
            <a href="https://github.com/liyang8246/rynk-layout-editor" class="icon-[lucide--github] text-xl text-base-content/50" target="_blank" />
          </div>
        </div>
        {/* Toolbar — top-right */}
        <div class="pointer-events-auto flex p-4">
          <Toolbar />
        </div>
        {/* Properties panel — bottom-left */}
        <div class="pointer-events-auto p-4">
          <KeyInspector />
        </div>
        {/* bottom-right — empty, Canvas shows through */}
        <div />
      </div>
    </div>
  )
}

export default App
