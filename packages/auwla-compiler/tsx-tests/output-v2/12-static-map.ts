import { Component } from 'auwla'
import type { LayoutBuilder } from 'auwla'

export default function StaticMapPage() {
  // Logic that was outside page scope → now inside page scope
  // @page /static-map
// Test case: .map() with static array (should use forEach)

const staticItems = [{
  id: 1,
  name: 'Static Item 1'
}, {
  id: 2,
  name: 'Static Item 2'
}, {
  id: 3,
  name: 'Static Item 3'
}];

  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: "p-8" }, (ui: LayoutBuilder) => {
      ui.H1({text: "Static Map Test"})
      ui.Div({ className: "mt-4" }, (ui: LayoutBuilder) => {
      ui.Text({ value: `${staticItems.map(item => <div key={item.id} className="p-2 border">
            {item.name}
          </div>)}` })
    })
    })
  })
}
