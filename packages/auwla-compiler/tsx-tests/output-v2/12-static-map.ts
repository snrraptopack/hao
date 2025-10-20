import { Component } from 'auwla'
import type { LayoutBuilder } from 'auwla'

// Component helpers (shared across all components)
const staticItems = [
  { id: 1, name: 'Static Item 1' },
  { id: 2, name: 'Static Item 2' },
  { id: 3, name: 'Static Item 3' }
]

// Page component (has lifecycle)
export default function StaticMapPage() {
  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: "p-8" }, (ui: LayoutBuilder) => {
      ui.H1({ text: "Static Map Test" })
      ui.Div({ className: "mt-4" }, (ui: LayoutBuilder) => {
        staticItems.forEach((item, index) => {
          ui.Div({ text: String(item.name), className: "p-2 border" })
        })
      })
    })
  })
}
