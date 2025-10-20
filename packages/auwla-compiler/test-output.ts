import { Component, watch } from 'auwla'
import type { LayoutBuilder } from 'auwla'

export default function AboutPage() {
  return Component((ui: LayoutBuilder) => {
    const counter = ref(0);
    function inc() {
  counter.value += 1;
}

    ui.Div({ className: "p-8" }, (ui: LayoutBuilder) => {
      ui.H1({ className: "text-2xl font-bold mb-4" , text: "About Page"})
      ui.P({}, (ui: LayoutBuilder) => {
      ui.Text({ value: `The count is${counter.value}` })
    })
      ui.Button({ on: { click: inc }, on: { doubleclick: inc } })
    })
  })
}
