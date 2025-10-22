import { Component, ref, watch } from 'auwla'
import type { LayoutBuilder, Ref } from 'auwla'

export default function IfBlockSyntaxPage() {
  // Logic that was outside page scope → now inside page scope
  const isVisible: Ref<boolean> = ref(true);
  const count: Ref<number> = ref(0);

  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: "p-8" }, (ui: LayoutBuilder) => {
      ui.H1({text: "If Block Syntax Test"})
      ui.Button({ on: { click: () => isVisible.value = !isVisible.value } , text: "Toggle Visibility"})
      ui.Button({ on: { click: () => count.value++ } , text: watch([count], () => `
        Count: ${count.value}
      `)})
      ui.When(watch([isVisible], () => $if(isVisible.value)) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Div({ className: "mt-4 p-2 bg-green-100" , text: "This is conditionally visible!"})
      })
      ui.When(watch([count], () => $if(count.value > 3)) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Div({ className: "mt-2 p-2 bg-yellow-100" }, (ui: LayoutBuilder) => {
      ui.Text({ value: `Count is greater than 3:${count.value}` })
    })
      })
    })
  })
}
