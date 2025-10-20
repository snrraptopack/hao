// Generated from 01-simple-button.tsx by TSX compiler
import { Component, ref, watch } from 'auwla'
import type { LayoutBuilder, Ref } from 'auwla'

export default function SimpleButtonPage() {
  const count: Ref<number> = ref(0);

  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: "p-8" }, (ui: LayoutBuilder) => {
      ui.H1({ text: "Button Test" })
      ui.Button({ 
        on: { click: () => count.value++ }, 
        text: "Click me" 
      })
      ui.P({}, (ui: LayoutBuilder) => {
        ui.Text({ value: watch([count], () => `Count: ${count.value}`) })
      })
    })
  })
}