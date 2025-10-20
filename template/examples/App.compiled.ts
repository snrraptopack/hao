import { Component, ref, watch } from 'auwla'
import type { Ref } from 'auwla'

export default function Home() {
  const counter = ref(0);
  function inc(){
    counter.value += 1;
}

  return Component((ui) => {
    ui.H1({}, (ui) => {
      ui.H1({ text: "Hello from Auwla SPA! 🚀" })
      ui.P({ text: "Edit this .auwla file and watch it hot-reload!" })
    })
  })
}
