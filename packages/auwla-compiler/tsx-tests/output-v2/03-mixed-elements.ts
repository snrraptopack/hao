import { Component, ref, watch } from 'auwla'
import type { Ref, LayoutBuilder } from 'auwla'

// Page component (has lifecycle)
export default function MixedElementsPage() {
  // UI helpers (scoped to this page UI)
  const message: Ref<string> = ref('Hello')
  const isVisible: Ref<boolean> = ref(true)

  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: "p-8" }, (ui: LayoutBuilder) => {
      ui.H1({ text: "Mixed Elements", className: "text-2xl font-bold" })
      ui.P({ text: "This is static text" })
      ui.P({ text: watch([message], () => `Message:${message.value}`) as Ref<string> })
      ui.Button({ text: "Update Message", on: { click: () => message.value = 'Updated!' } })
      ui.Input({ type: "text", placeholder: "Enter text...", className: "border p-2 mt-2" })
      if (watch([isVisible], () => isVisible.value) as Ref<boolean>) {
        ui.Div({ text: "This is conditionally visible", className: "mt-4 p-2 bg-blue-100" })
      }
    })
  })
}
