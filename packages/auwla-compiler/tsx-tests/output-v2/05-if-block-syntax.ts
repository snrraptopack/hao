import { Component, ref, watch } from 'auwla'
import type { Ref, LayoutBuilder } from 'auwla'

// Page component (has lifecycle)
export default function IfBlockSyntaxPage() {
  // UI helpers (scoped to this page UI)
  const isVisible: Ref<boolean> = ref(true)
  const count: Ref<number> = ref(0)

  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: "p-8" }, (ui: LayoutBuilder) => {
      ui.H1({ text: "If Block Syntax Test" })
      ui.Button({ text: "Toggle Visibility", on: { click: () => isVisible.value = !isVisible.value } })
      ui.Button({ text: watch([count], () => `Count:${count.value}`) as Ref<string>, on: { click: () => count.value++ } })
      if (watch([isVisible], () => isVisible.value) as Ref<boolean>) {
        ui.Div({ text: "This is conditionally visible!", className: "mt-4 p-2 bg-green-100" })
      }
      if (watch([count], () => count.value > 3) as Ref<boolean>) {
        ui.Div({ text: watch([count], () => `Count is greater than 3:${count.value}`) as Ref<string>, className: "mt-2 p-2 bg-yellow-100" })
      }
    })
  })
}
