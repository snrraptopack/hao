import { Component, ref, watch } from 'auwla'
import type { Ref, LayoutBuilder } from 'auwla'

// Component helpers (shared across all components)
const hello = ref(10)
setInterval(() => {
    hello.value += 1
}, 1000)

// Page component (has lifecycle)
export default function AboutPage() {
  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: "p-8" }, (ui: LayoutBuilder) => {
      ui.H1({ text: "About Page", className: "text-2xl font-bold mb-4" })
      ui.P({ text: watch([hello], () => "Hello world:" + String(hello.value)) as Ref<string> })
      ui.P({ text: "This counter updates every second!" })
    })
  })
}
