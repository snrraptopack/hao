import { Component, ref, watch } from 'auwla'
import type { Ref } from 'auwla'

export default function Simple() {
  const count = ref(0);

  return Component((ui) => {
    ui.Div({}, (ui) => {
      ui.H1({ text: "Simple Test" })
    })
  })
}
