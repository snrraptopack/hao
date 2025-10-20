import { Component } from 'auwla'
import type { LayoutBuilder } from 'auwla'

// Page component (has lifecycle)
export default function StaticMapPage() {
  // UI helpers (scoped to this page UI)
  const staticItems = [
  { id: 1, name: 'Static Item 1' },
  { id: 2, name: 'Static Item 2' },
  { id: 3, name: 'Static Item 3' }
]

  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: "p-8" }, (ui: LayoutBuilder) => {
      ui.H1({ text: "Static Map Test" })
      ui.Div({ className: "mt-4" }, (ui: LayoutBuilder) => {
        staticItems.forEach((item, index) => {
          ui.Div({ text: `item.name`, className: "p-2 border" })
        })
      })
    })
  })
}
