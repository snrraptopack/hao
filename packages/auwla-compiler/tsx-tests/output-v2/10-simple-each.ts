import { Component, ref } from 'auwla'
import type { LayoutBuilder, Ref } from 'auwla'
import { $each } from 'auwla/template';

export default function SimpleEachPage() {
  return Component((ui: LayoutBuilder) => {
    // Logic that was inside page scope → now inside Component UI scope
    const items: Ref<string[]> = ref(['Apple', 'Banana', 'Cherry']);

    ui.Div({ className: "p-8" }, (ui: LayoutBuilder) => {
      ui.H1({text: "Simple Each Test"})
      ui.Text({ value: `${$each(items, item => <div key={item}>
          {item}
        </div>)}` })
    })
  })
}
