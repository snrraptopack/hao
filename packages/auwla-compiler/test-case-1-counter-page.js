import { Component, ref, watch } from 'auwla'
import type { Ref, LayoutBuilder } from 'auwla'

// Page component (has lifecycle)
export default function CounterPage() {
  // Logic that was outside page scope → now inside page scope
  const count = ref(0)
  const step = ref(1)
  function increment() {
  count.value += step.value
}
  function decrement() {
  count.value -= step.value
}
  function reset() {
  count.value = 0
}

  return Component((ui: LayoutBuilder) => {
    // Logic that was inside page scope → now inside Component UI scope
    const message = ref("Counter App")
    const isVisible = ref(true)
    function toggleVisibility() {
    isVisible.value = !isVisible.value
  }
    function updateMessage() {
    message.value = `Count is ${count.value}`
  }

    ui.Div({}, (ui: LayoutBuilder) => {
      ui.H1({ text: watch([message], () => `message.value`) as Ref<string> })
      if (watch([isVisible], () => isVisible.value) as Ref<boolean>) {
        ui.Div({}, (ui: LayoutBuilder) => {
          ui.P({ text: watch([count], () => `Current count:${count.value}`) as Ref<string> })
          ui.P({ text: watch([step], () => `Step:${step.value}`) as Ref<string> })
          ui.Button({ text: "+", on: { click: (e) => increment() } })
          ui.Button({ text: "-", on: { click: (e) => decrement() } })
          ui.Button({ text: "Reset", on: { click: (e) => reset() } })
          ui.Button({ text: "Hide", on: { click: (e) => toggleVisibility() } })
          ui.Button({ text: "Update Message", on: { click: (e) => updateMessage() } })
        })
      }
    })
  })
}
