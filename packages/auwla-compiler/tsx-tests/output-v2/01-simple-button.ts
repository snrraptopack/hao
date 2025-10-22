import { Component, ref, watch } from 'auwla'
import type { LayoutBuilder, Ref } from 'auwla'

export default function SimpleButtonPage() {
  return Component((ui: LayoutBuilder) => {
    // Logic that was inside page scope → now inside Component UI scope
    const count: Ref<number> = ref(0);

    ui.Div({ className: "p-8" }, (ui: LayoutBuilder) => {
      ui.H1({text: "Button Test"})
      ui.Button({ on: { click: () => count.value++ } , text: "Click me"})
      ui.P({}, (ui: LayoutBuilder) => {
      ui.Text({ value: `Count:${count.value}` })
    })
    })
  })
}
