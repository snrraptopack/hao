import { Component, ref, watch } from 'auwla'
import type { LayoutBuilder, Ref } from 'auwla'
import { $if, $elseif, $else } from 'auwla/template';

export default function IfElseChainPage() {
  // Logic that was outside page scope → now inside page scope
  const score: Ref<number> = ref(75);

  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: "p-8" }, (ui: LayoutBuilder) => {
      ui.H1({text: "If-Else Chain Test"})
      ui.Button({ on: { click: () => score.value = Math.floor(Math.random() * 100) } , text: watch([score], () => `
        Random Score: ${score.value}
      `)})
      ui.Text({ value: `${$if(score.value >= 90, <div className="mt-4 p-2 bg-green-100">
          Excellent! Score: {score.value}
        </div>)}${$elseif(score.value >= 70, <div className="mt-4 p-2 bg-blue-100">
          Good! Score: {score.value}
        </div>)}${$elseif(score.value >= 50, <div className="mt-4 p-2 bg-yellow-100">
          Average. Score: {score.value}
        </div>)}${$else(<div className="mt-4 p-2 bg-red-100">
          Needs improvement. Score: {score.value}
        </div>)}` })
    })
  })
}
