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
    <div class="grid h-screen w-screen grid-cols-[1fr_2fr] grid-rows-[6rem_1fr]">
      {/* Logo pill — top-left */}
      <div class="grid-canvas p-4 ring ring-base-300">
        <div class="mt-auto ml-auto flex h-12 w-80 justify-center rounded-xl bg-base-100 px-4 py-3 shadow-lg ring ring-base-300">
          <h1 class="flex gap-1.5 text-base-content">
            <img src="/logo.svg" alt="logo" class="h-6" />
            <span class="font-bold">Layout Editor</span>
          </h1>
        </div>
      </div>
      {/* Toolbar — top-right */}
      <div class="grid-canvas p-4 ring ring-base-300">
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
