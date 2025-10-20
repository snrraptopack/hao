import { Component, ref, watch } from 'auwla'
import type { Ref, LayoutBuilder } from 'auwla'

// Page component (has lifecycle)
export default function IfElseChainPage() {
  // UI helpers (scoped to this page UI)
  const score: Ref<number> = ref(75)

  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: "p-8" }, (ui: LayoutBuilder) => {
      ui.H1({ text: "If-Else Chain Test" })
      ui.Button({ text: watch([score], () => `Random Score:${score.value}`) as Ref<string>, on: { click: () => score.value = Math.floor(Math.random() * 100) } })
      if (watch([score], () => score.value >= 90) as Ref<boolean>) {
        ui.Div({ text: watch([score], () => `Excellent! Score:${score.value}`) as Ref<string>, className: "mt-4 p-2 bg-green-100" })
      }
      else if (watch([score], () => score.value >= 70) as Ref<boolean>) {
        ui.Div({ text: watch([score], () => `Good! Score:${score.value}`) as Ref<string>, className: "mt-4 p-2 bg-blue-100" })
      }
      else if (watch([score], () => score.value >= 50) as Ref<boolean>) {
        ui.Div({ text: watch([score], () => `Average. Score:${score.value}`) as Ref<string>, className: "mt-4 p-2 bg-yellow-100" })
      }
      else {
        ui.Div({ text: watch([score], () => `Needs improvement. Score:${score.value}`) as Ref<string>, className: "mt-4 p-2 bg-red-100" })
      }
    })
  })
}
