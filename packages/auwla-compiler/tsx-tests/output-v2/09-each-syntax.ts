import { Component, ref, watch } from 'auwla'
import type { LayoutBuilder, Ref } from 'auwla'
import { $each } from 'auwla/template';

export default function EachSyntaxPage() {
  // Logic that was outside page scope → now inside page scope
  const items: Ref<Array<{
  id: number;
  name: string;
  active: boolean;
}>> = ref([{
  id: 1,
  name: 'Item 1',
  active: true
}, {
  id: 2,
  name: 'Item 2',
  active: false
}, {
  id: 3,
  name: 'Item 3',
  active: true
}]);

  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: "p-8" }, (ui: LayoutBuilder) => {
      ui.H1({text: "Each Syntax Test"})
      ui.Button({ on: { click: () => items.value.push({
  id: Date.now(),
  name: `Item ${items.value.length + 1}`,
  active: Math.random() > 0.5
}) } , text: "Add Item"})
      ui.Div({ className: "mt-4" }, (ui: LayoutBuilder) => {
      ui.Text({ value: `${$each(items, item => <div key={item.id} className={item.active ? 'bg-green-100' : 'bg-gray-100'}>
            <span>{item.name}</span>
            <button onClick={() => item.active = !item.active}>
              {item.active ? 'Deactivate' : 'Activate'}
            </button>
          </div>)}` })
    })
    })
  })
}
