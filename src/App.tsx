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
          <div class="flex h-full max-w-lg flex-1 p-4 ring ring-base-300 grid-canvas">
            <div class="ml-auto mt-auto flex h-12 w-64 justify-center rounded-xl bg-base-100 px-4 py-3 shadow-lg ring ring-base-300">
              <h1 class="flex gap-1.5 text-base-content">
                <img src="/logo.svg" alt="logo" class="h-6" />
                <span class="font-bold">Layout Editor</span>
              </h1>
            </div>
          </div>
          {/* Toolbar — right */}
          <div class="flex h-full flex-2 p-4 ring ring-base-300 grid-canvas">
            <Toolbar />
          </div>
        </div>

        {/* Content row */}
        <div class="flex flex-1 w-full">
          {/* Properties panel — left */}
          <div class="flex h-full max-w-lg flex-1 p-4 ring ring-base-300 grid-canvas">
            <KeyInspector />
          </div>
          {/* Canvas — right */}
          <div class="h-full flex-2 p-4 ring ring-base-300 grid-canvas">
            <Canvas />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
