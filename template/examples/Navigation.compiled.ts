import { Component, Link } from 'auwla'

export default Component((ui) => {
  ui.Div({ className: "bg-white shadow-lg" }, (ui) => {
    ui.Div({ className: "max-w-6xl mx-auto px-6 py-4 flex gap-6" }, (ui) => {
      ui.append(Link({ to: "/", text: 'Home', className: "text-lg font-semibold text-indigo-600 hover:text-indigo-700" }))
      ui.append(Link({ to: "/products", text: 'Products', className: "text-lg font-semibold text-gray-600 hover:text-gray-900" }))
      ui.append(Link({ to: "/about", text: 'About', className: "text-lg font-semibold text-gray-600 hover:text-gray-900" }))
    })
  })
})
