import { Component, ref, watch } from 'auwla'
import type { LayoutBuilder, Ref } from 'auwla'

export default function ComprehensiveTestPage() {
  // Component scope - these go outside the component function
const globalCount: Ref<number> = ref(0);
  const todos: Ref<Array<{
  id: number;
  text: string;
  done: Ref<boolean>;
}>> = ref([{
  id: 1,
  text: 'Learn Auwla',
  done: ref(false)
}, {
  id: 2,
  text: 'Build app',
  done: ref(true)
}]);
  function helperFunction(x: number) {
  return x * 2;
}

  return Component((ui: LayoutBuilder) => {
    // UI scope - these go inside the component function
const localMessage = 'I am local to the component';
    const computedValue = globalCount.value * 2;

    ui.Div({ className: "container mx-auto p-8" }, (ui: LayoutBuilder) => {
      ui.H1({ className: "text-3xl font-bold mb-6" , text: "Comprehensive Test"})
      ui.P({text: "Static text here"})
      ui.P({}, (ui: LayoutBuilder) => {
      ui.Text({ value: `Count:${globalCount.value}` })
    })
      ui.P({value: localMessage})
      ui.Button({ className: "bg-blue-500 text-white px-4 py-2 rounded", on: { click: () => globalCount.value++ } }, (ui: LayoutBuilder) => {
      ui.Text({ value: `Increment (${globalCount.value})` })
    })
      ui.When(watch([globalCount], () => globalCount.value > 5) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Div({ className: "mt-4 p-4 bg-yellow-100 border rounded" }, (ui: LayoutBuilder) => {
      ui.P({text: "Count is greater than 5!"})
      ui.P({}, (ui: LayoutBuilder) => {
      ui.Text({ value: `Current value:${globalCount.value}` })
    })
    })
      })
      ui.Div({ className: "mt-6" }, (ui: LayoutBuilder) => {
      ui.H2({ className: "text-xl font-semibold" , text: "Nested Content"})
      ui.Div({ className: "flex gap-4" }, (ui: LayoutBuilder) => {
      ui.Span({text: "Left"})
      ui.Span({text: "Right"})
    })
    })
      ui.Div({ className: "mt-4" }, (ui: LayoutBuilder) => {
      ui.Input({ type: "text", placeholder: "Enter something...", className: "border p-2 rounded" })
    })
    })
  })
}
