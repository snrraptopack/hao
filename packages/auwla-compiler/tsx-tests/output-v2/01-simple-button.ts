import { Component, ref, watch } from 'auwla'
import type { Ref, LayoutBuilder } from 'auwla'

// Component helpers (shared across all components)
const count: Ref<number> = ref(0)

// Page component (has lifecycle)
export default function SimpleButtonPage() {
  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: "p-8" }, (ui: LayoutBuilder) => {
      ui.H1({ text: "Button Test" })
      ui.Button({ text: "Click me", on: { click: () => count.value++ } })
      ui.P({ text: watch([count], () => "Count:" + String(count.value)) as Ref<string> })
    })
  })
}
