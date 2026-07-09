import { onMount } from 'solid-js'
import { Canvas } from './components/Canvas'
import { KeyInspector } from './components/KeyInspector'
import { Toolbar } from './components/Toolbar'
import { useKeyboardShortcuts } from './stores/layout'

function App() {
  onMount(() => {
    useKeyboardShortcuts()
  })

  return (
    <div class="grid h-screen w-screen grid-cols-[352px_1fr] grid-rows-[6rem_1fr] 2xl:grid-cols-[2fr_5fr]">
      {/* Logo pill — top-left */}
      <div class="flex grid-canvas p-4 ring ring-base-300">
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
      <div class="flex grid-canvas p-4 ring ring-base-300">
        <Toolbar />
      </div>
      {/* Properties panel — bottom-left */}
      <div class="grid-canvas p-4 ring ring-base-300">
        <KeyInspector />
      </div>
      {/* Canvas — bottom-right */}
      <div class="grid-canvas ring ring-base-300">
        <Canvas />
      </div>
    </div>
  )
}

export default App
