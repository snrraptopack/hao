import { Component, ref, watch } from 'auwla'
import type { LayoutBuilder, Ref } from 'auwla'

export default function ReactiveMapPage() {
  // Logic that was outside page scope → now inside page scope
  const reactiveItems: Ref<Array<{
  id: number;
  name: string;
}>> = ref([{
  id: 1,
  name: 'Reactive Item 1'
}, {
  id: 2,
  name: 'Reactive Item 2'
}, {
  id: 3,
  name: 'Reactive Item 3'
}]);

  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: "p-8" }, (ui: LayoutBuilder) => {
      ui.H1({text: "Reactive Map Test"})
      ui.Button({ on: { click: () => reactiveItems.value.push({
  id: Date.now(),
  name: `New Item ${reactiveItems.value.length + 1}`
}) } , text: "Add Item"})
      ui.Div({ className: "mt-4" }, (ui: LayoutBuilder) => {
      ui.Text({ value: `${reactiveItems.value.map(item => <div key={item.id} className="p-2 border">
            {item.name}
          </div>)}` })
    })
    })
  })
}
