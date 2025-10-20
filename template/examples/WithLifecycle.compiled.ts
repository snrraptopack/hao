import { Component, ref, watch } from 'auwla'
import type { Ref } from 'auwla'

export default function WithLifecycle() {
  const pageTimer = ref(0);

  return Component((ui) => {
    // Component builder scope - lifecycle hooks available here
const componentState = ref('mounted');
    onMount(() => {
  console.log('Component mounted!');
  componentState.value = 'ready';
});
    onUnmount(() => {
  console.log('Component unmounting!');
});

    ui.Div({}, (ui) => {
      ui.H1({ text: "Lifecycle Test" })
      ui.P({ text: watch([componentState], () => "State:" + String(componentState.value)) as Ref<string> })
    })
  })
}
