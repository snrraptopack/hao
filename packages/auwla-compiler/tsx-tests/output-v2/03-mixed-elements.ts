import { Component, ref, watch } from 'auwla'
import type { LayoutBuilder, Ref } from 'auwla'

export default function MixedElementsPage() {
  // Logic that was outside page scope → now inside page scope
  const message: Ref<string> = ref('Hello');
  const isVisible: Ref<boolean> = ref(true);

  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: "p-8" }, (ui: LayoutBuilder) => {
      ui.H1({ className: "text-2xl font-bold" , text: "Mixed Elements"})
      ui.P({text: "This is static text"})
      ui.P({}, (ui: LayoutBuilder) => {
      ui.Text({ value: `Message:${message.value}` })
    })
      ui.Button({ on: { click: () => message.value = 'Updated!' } , text: "Update Message"})
      ui.Input({ type: "text", placeholder: "Enter text...", className: "border p-2 mt-2" })
      ui.When(watch([isVisible], () => isVisible.value) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Div({ className: "mt-4 p-2 bg-blue-100" , text: "This is conditionally visible"})
      })
    })
  })
}
