import { Component } from 'auwla'
import type { LayoutBuilder } from 'auwla'
// @page /simple-if-else
// Test case: Simple $if, $else without reactive refs

import { $if, $else } from 'auwla/template';

export default function SimpleIfElsePage() {
  // Logic that was outside page scope → now inside page scope
  const staticValue = 42;

  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: "p-8" }, (ui: LayoutBuilder) => {
      ui.H1({text: "Simple If-Else Test"})
      ui.Text({ value: `${$if(staticValue > 30, <div className="mt-4 p-2 bg-green-100">
          Value is greater than 30: {staticValue}
        </div>)}${$else(<div className="mt-4 p-2 bg-red-100">
          Value is 30 or less: {staticValue}
        </div>)}` })
    })
  })
}
