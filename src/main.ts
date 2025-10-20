// Main entry point for development
import { Component, ref, watch } from './index'

// Simple demo component to show the framework is working
const DemoApp = Component((ui) => {
  const count = ref(0)
  
  ui.Div({ className: "p-8" }, (ui) => {
    ui.H1({ text: "Auwla Framework Demo", className: "text-2xl font-bold mb-4" })
    ui.P({ text: "Framework is loaded and working!" })
    
    ui.Div({ className: "mt-4" }, (ui) => {
      ui.Button({ 
        text: watch([count], () => `Count: ${count.value}`) as any,
        className: "px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600",
        on: { click: () => count.value++ }
      })
    })
    
    ui.Div({ className: "mt-4" }, (ui) => {
      ui.A({ 
        href: "/test-tsx-browser.html",
        text: "Go to TSX Tests",
        className: "text-blue-600 hover:underline"
      })
    })
  })
})

// Mount the demo app
const app = document.getElementById('app')
if (app) {
  app.appendChild(DemoApp)
}