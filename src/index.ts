// Import what we need for internal use
import { Component } from './dsl'
import type { LayoutBuilder } from './dsl'

// Re-export for external use
export { ref, watch } from './state'
export type { Ref } from './state'
export { Component } from './dsl'
export type { LayoutBuilder } from './dsl'
export { h, Fragment } from './jsx'

// Simple routing utilities (basic implementation)
export function createApp(config: { routes: any[], target: string }) {
  return {
    mount() {
      const target = document.querySelector(config.target)
      if (target) {
        // Simple demo - just show first route or a default component
        const DemoApp = Component((ui: LayoutBuilder) => {
          ui.Div({ className: "p-8" }, (ui: LayoutBuilder) => {
            ui.H1({ text: "Auwla App Running!", className: "text-2xl font-bold mb-4" })
            ui.P({ text: `Found ${config.routes.length} routes` })
            ui.Div({ className: "mt-4" }, (ui: LayoutBuilder) => {
              config.routes.forEach((route, index) => {
                ui.Div({ className: "p-2 border-b" }, (ui: LayoutBuilder) => {
                  ui.P({ text: `Route ${index + 1}: ${route.path || 'Unknown'}` })
                })
              })
            })
          })
        })
        target.appendChild(DemoApp)
      }
    }
  }
}

// Basic routing utilities (placeholders)
export function useParams() {
  return {}
}

export function useQuery() {
  return {}
}