import { Component, ref, watch } from 'auwla'
import type { Ref, LayoutBuilder } from 'auwla'

// Component helpers (shared across all components)
const isVisible: Ref<boolean> = ref(true)
const count: Ref<number> = ref(0)

// Page component (has lifecycle)
export default function IfSyntaxPage() {
  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: "p-8" }, (ui: LayoutBuilder) => {
      ui.H1({ text: "If Syntax Test" })
      ui.Button({ text: "Toggle Visibility", on: { click: () => isVisible.value = !isVisible.value } })
      ui.Button({ text: watch([count], () => "Count:" + String(count.value)) as Ref<string>, on: { click: () => count.value++ } })
      if (watch([isVisible], () => isVisible.value) as Ref<boolean>) {
        ui.Div({ text: "This is conditionally visible!", className: "mt-4 p-2 bg-green-100" })
      }
      if (watch([count], () => count.value > 3) as Ref<boolean>) {
        ui.Div({ text: watch([count], () => "Count is greater than 3:" + String(count.value)) as Ref<string>, className: "mt-2 p-2 bg-yellow-100" })
      }
    })
  })
}
