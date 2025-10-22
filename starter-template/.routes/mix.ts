import { Component, ref, watch } from 'auwla'
import type { Ref, LayoutBuilder } from 'auwla'

// Page component (has lifecycle)
export default function Mix() {
  // Logic that was outside page scope → now inside page scope
  const toggle = ref(false)
  function handleToggle(){
    toggle.value = !toggle.value
  }

  return Component((ui: LayoutBuilder) => {
    // Logic that was inside page scope → now inside Component UI scope
    const counter = ref(0)
    function inc(){
        counter.value += 1
    }

    ui.Div({ className: "p-8" }, (ui: LayoutBuilder) => {
      ui.H1({ text: "About Page", className: "text-2xl font-bold mb-4" })
      ui.P({ text: watch([counter], () => `The count is${counter.value}`) as Ref<string> })
      ui.Button({ 
        text: "Increment", 
        on: { click: () => inc() } 
      })
      ui.Button({ 
        text: "Toggle", 
        on: { click: () => handleToggle() } 
      })
      if (watch([counter], () => counter.value > 0) as Ref<boolean>) {
        ui.P({ text: "hello" })
      }
    })
  })
}
