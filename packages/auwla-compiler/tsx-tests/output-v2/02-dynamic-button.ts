import { Component, ref, watch } from 'auwla'
import type { Ref, LayoutBuilder } from 'auwla'

// Page component (has lifecycle)
export default function DynamicButtonPage() {
  // UI helpers (scoped to this page UI)
  const count: Ref<number> = ref(0)

  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: "p-8" }, (ui: LayoutBuilder) => {
      ui.H1({ text: "Dynamic Button Test" })
      ui.Button({ text: watch([count], () => `Clicked${count.value}times`) as Ref<string>, className: "bg-blue-500 text-white px-4 py-2 rounded", on: { click: () => count.value++ } })
    })
  })
}
