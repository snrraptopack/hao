import { Component, ref, watch } from 'auwla'
import type { Ref, LayoutBuilder } from 'auwla'

// Page component (has lifecycle)
export default function AboutPage() {
  // UI helpers (scoped to this page UI)
  const counter = ref(0)
  function inc(){
  counter.value += 1
}

  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: "p-8" }, (ui: LayoutBuilder) => {
      ui.H1({ text: "About Page", className: "text-2xl font-bold mb-4" })
      ui.P({ text: watch([counter], () => `The count is${counter.value}`) as Ref<string> })
      ui.Button({ on: { click: (e) => inc(), doubleClick: (e) => inc() } })
    })
  })
}
