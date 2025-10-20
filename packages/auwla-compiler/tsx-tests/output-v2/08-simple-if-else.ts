import { Component } from 'auwla'
import type { LayoutBuilder } from 'auwla'

// Page component (has lifecycle)
export default function SimpleIfElsePage() {
  // UI helpers (scoped to this page UI)
  const staticValue = 42

  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: "p-8" }, (ui: LayoutBuilder) => {
      ui.H1({ text: "Simple If-Else Test" })
      if (staticValue > 30) {
        ui.Div({ text: `Value is greater than 30:${staticValue}`, className: "mt-4 p-2 bg-green-100" })
      }
      else {
        ui.Div({ text: `Value is 30 or less:${staticValue}`, className: "mt-4 p-2 bg-red-100" })
      }
    })
  })
}
