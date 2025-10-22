import { Component, ref, watch } from 'auwla'
import type { LayoutBuilder, Ref } from 'auwla'

export default function DynamicButtonPage() {
  // Logic that was outside page scope → now inside page scope
  const count: Ref<number> = ref(0);

  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: "p-8" }, (ui: LayoutBuilder) => {
      ui.H1({text: "Dynamic Button Test"})
      ui.Button({ className: "bg-blue-500 text-white px-4 py-2 rounded", on: { click: () => count.value++ } , text: watch([count], () => `
        Clicked ${count.value} times
      `)})
    })
  })
}
