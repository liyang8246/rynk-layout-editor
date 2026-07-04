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
    <div class="flex flex-col h-screen bg-base-100">
      {/* Top: Toolbar */}
      <Toolbar />

      {/* Main content: Canvas + Inspector */}
      <div class="flex flex-1 overflow-hidden">
        <Canvas />
        <KeyInspector />
      </div>
    </div>
  )
}

export default App
