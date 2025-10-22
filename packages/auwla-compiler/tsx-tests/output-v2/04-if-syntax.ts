import { Component, ref, watch } from 'auwla'
import type { LayoutBuilder, Ref } from 'auwla'
import { $if } from 'auwla/template';

export default function IfSyntaxPage() {
  // Logic that was outside page scope → now inside page scope
  const isVisible: Ref<boolean> = ref(true);
  const count: Ref<number> = ref(0);

  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: "p-8" }, (ui: LayoutBuilder) => {
      ui.H1({text: "If Syntax Test"})
      ui.Button({ on: { click: () => isVisible.value = !isVisible.value } , text: "Toggle Visibility"})
      ui.Button({ on: { click: () => count.value++ } , text: watch([count], () => `
        Count: ${count.value}
      `)})
      ui.Text({ value: `${$if(isVisible.value, <div className="mt-4 p-2 bg-green-100">
          This is conditionally visible!
        </div>)}${$if(count.value > 3, <div className="mt-2 p-2 bg-yellow-100">
          Count is greater than 3: {count.value}
        </div>)}` })
    })
  })
}
