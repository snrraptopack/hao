import { Component, ref, watch } from 'auwla'
import type { Ref, LayoutBuilder } from 'auwla'

// Component helpers (shared across all components)
const items: Ref<Array<{ id: number; name: string; active: boolean }>> = ref([
  { id: 1, name: 'Item 1', active: true },
  { id: 2, name: 'Item 2', active: false },
  { id: 3, name: 'Item 3', active: true }
])

// Page component (has lifecycle)
export default function EachSyntaxPage() {
  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: "p-8" }, (ui: LayoutBuilder) => {
      ui.H1({ text: "Each Syntax Test" })
      ui.Button({ text: "Add Item", on: { click: () => items.value.push({
  id: Date.now(),
  name: `Item ${items.value.length + 1}`,
  active: Math.random() > 0.5
}) } })
      ui.Div({ className: "mt-4" }, (ui: LayoutBuilder) => {
        ui.List({
          items: items,
          key: (item) => item.id,
          render: (item: any, index: number, ui: LayoutBuilder) => {
            ui.Div({ className: item.active ? 'bg-green-100' : 'bg-gray-100' }, (ui: LayoutBuilder) => {
              ui.Span({ text: String(item.name) })
              ui.Button({ text: String(item.active ? 'Deactivate' : 'Activate'), on: { click: () => item.active = !item.active } })
            })
          }
        })
      })
    })
  })
}
