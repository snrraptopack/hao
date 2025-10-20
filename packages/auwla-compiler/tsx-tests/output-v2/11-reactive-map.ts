import { Component, ref, watch } from 'auwla'
import type { Ref, LayoutBuilder } from 'auwla'

// Page component (has lifecycle)
export default function ReactiveMapPage() {
  // UI helpers (scoped to this page UI)
  const reactiveItems: Ref<Array<{ id: number; name: string }>> = ref([
  { id: 1, name: 'Reactive Item 1' },
  { id: 2, name: 'Reactive Item 2' },
  { id: 3, name: 'Reactive Item 3' }
])

  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: "p-8" }, (ui: LayoutBuilder) => {
      ui.H1({ text: "Reactive Map Test" })
      ui.Button({ text: "Add Item", on: { click: () => reactiveItems.value.push({
  id: Date.now(),
  name: `New Item ${reactiveItems.value.length + 1}`
}) } })
      ui.Div({ className: "mt-4" }, (ui: LayoutBuilder) => {
        ui.List({
          items: reactiveItems,
          key: (item) => item.id,
          render: (item: any, index: number, ui: LayoutBuilder) => {
            ui.Div({ text: `item.name`, className: "p-2 border" })
          }
        })
      })
    })
  })
}
