import { Component, ref, watch } from 'auwla'
import type { Ref, LayoutBuilder } from 'auwla'

// Component helpers (shared across all components)
const globalCounter: Ref<number> = ref(0)
const theme: Ref<'light' | 'dark'> = ref('light')

// Reusable component
export function Counter({
  initialValue = 0,
  globalCounter
}) {
  // Component logic (component state)
  // Component logic (not UI helpers, just component state)
const count: Ref<number> = ref(initialValue);
  const increment = () => count.value++;
  const decrement = () => count.value--;

  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: "p-4 border rounded" }, (ui: LayoutBuilder) => {
      ui.H3({ text: "Counter Component" })
      ui.Div({ className: "flex gap-2 items-center" }, (ui: LayoutBuilder) => {
        ui.Button({ text: "-", on: { click: (e) => decrement() } })
        ui.Span({ text: watch([count], () => String(count.value)) as Ref<string> })
        ui.Button({ text: "+", on: { click: (e) => increment() } })
      })
      ui.P({ text: watch([globalCounter], () => "Global:" + String(globalCounter.value)) as Ref<string> })
    })
  })
}

// Reusable component
export function ThemeToggle({
  theme
}) {
  // Component logic (component state)
  // Component logic
const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light';
};

  return Component((ui: LayoutBuilder) => {
    ui.Button({ text: watch([theme], () => String(theme.value === 'light' ? '🌙' : '☀️') + "Toggle Theme") as Ref<string>, className: `px-4 py-2 rounded ${theme.value === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-200'}`, on: { click: (e) => toggleTheme() } })
  })
}

// Page component (has lifecycle)
export default function ComponentCompositionPage() {
  return Component((ui: LayoutBuilder) => {
    // Additional UI helpers
    // UI helpers (scoped to this page's UI)
const pageTitle: Ref<string> = ref('Component Composition Demo');
    const showCounters: Ref<boolean> = ref(true);
    const addGlobalCount = () => globalCounter.value++;

    ui.Div({ className: `min-h-screen p-8 ${theme.value === 'dark' ? 'bg-gray-900 text-white' : 'bg-white'}` }, (ui: LayoutBuilder) => {
      ui.Div({ className: "max-w-4xl mx-auto" }, (ui: LayoutBuilder) => {
        ui.H1({ text: watch([pageTitle], () => String(pageTitle.value)) as Ref<string>, className: "text-3xl font-bold mb-6" })
        ui.Div({ className: "mb-6 flex gap-4 items-center" }, (ui: LayoutBuilder) => {
          ui.append(ThemeToggle({ theme: theme }))
          ui.Button({ text: watch([showCounters], () => String(showCounters.value ? 'Hide' : 'Show') + "Counters") as Ref<string>, className: "px-4 py-2 bg-blue-500 text-white rounded", on: { click: () => showCounters.value = !showCounters.value } })
          ui.Button({ text: watch([globalCounter], () => "Global +1 (" + String(globalCounter.value) + ")") as Ref<string>, className: "px-4 py-2 bg-green-500 text-white rounded", on: { click: (e) => addGlobalCount() } })
        })
        if (watch([showCounters], () => showCounters.value) as Ref<boolean>) {
          ui.Div({ className: "grid grid-cols-1 md:grid-cols-2 gap-4" }, (ui: LayoutBuilder) => {
            ui.append(Counter({ initialValue: 0, globalCounter: globalCounter }))
            ui.append(Counter({ initialValue: 10, globalCounter: globalCounter }))
            ui.append(Counter({ initialValue: 100, globalCounter: globalCounter }))
          })
        }
      })
    })
  })
}
