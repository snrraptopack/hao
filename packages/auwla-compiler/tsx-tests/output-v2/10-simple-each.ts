import { Component } from 'auwla'
import type { LayoutBuilder } from 'auwla'

// Page component (has lifecycle)
export default function SimpleEachPage() {
  return Component((ui: LayoutBuilder) => {
    // Additional UI helpers
    const items: Ref<string[]> = ref(['Apple', 'Banana', 'Cherry']);

    ui.Div({ className: "p-8" }, (ui: LayoutBuilder) => {
      ui.H1({ text: "Simple Each Test" })
      ui.List({
        items: items,
        key: (item) => item,
        render: (item: any, index: number, ui: LayoutBuilder) => {
          ui.Div({ text: `item` })
        }
      })
    })
  })
}
