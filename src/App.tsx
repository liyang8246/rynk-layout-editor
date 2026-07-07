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
    <div class="relative h-screen w-screen">
      <div class="absolute top-0 left-0 flex h-screen w-screen flex-col">
        {/* Header row */}
        <div class="flex h-24 w-full">
          {/* Logo pill — left */}
          <div class="flex h-full max-w-lg flex-1 grid-canvas p-4 ring ring-base-300">
            <div class="mt-auto ml-auto flex h-12 w-64 justify-center rounded-xl bg-base-100 px-4 py-3 shadow-lg ring ring-base-300">
              <h1 class="flex gap-1.5 text-base-content">
                <img src="/logo.svg" alt="logo" class="h-6" />
                <span class="font-bold">Layout Editor</span>
              </h1>
            </div>
          </div>
          {/* Toolbar — right */}
          <div class="flex h-full flex-2 grid-canvas p-4 ring ring-base-300">
            <Toolbar />
          </div>
        </div>

        {/* Content row */}
        <div class="flex w-full flex-1">
          {/* Properties panel — left */}
          <div class="flex h-full max-w-lg flex-1 grid-canvas p-4 ring ring-base-300">
            <KeyInspector />
          </div>
          {/* Canvas — right */}
          <div class="h-full flex-2 grid-canvas ring ring-base-300">
            <Canvas />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
