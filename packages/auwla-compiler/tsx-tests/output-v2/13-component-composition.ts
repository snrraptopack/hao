import { Component, ref, watch } from 'auwla'
import type { LayoutBuilder, Ref } from 'auwla'

export default function ComponentCompositionPage() {
  // Logic that was outside page scope → now inside page scope
  // Component helpers (shared across all components in this file)
const globalCounter: Ref<number> = ref(0);
  const theme: Ref<'light' | 'dark'> = ref('light');

// Reusable component - logic inside is component logic (no lifecycle)

  return Component((ui: LayoutBuilder) => {
    // Logic that was inside page scope → now inside Component UI scope
    // Component logic (not UI helpers, just component state)
const count: Ref<number> = ref(initialValue);
    const increment = () => count.value++;
    const decrement = () => count.value--;
    // Component logic
const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light';
};
    // UI helpers (scoped to this page's UI)
const pageTitle: Ref<string> = ref('Component Composition Demo');
    const showCounters: Ref<boolean> = ref(true);
    const addGlobalCount = () => globalCounter.value++;

    ui.Div({ className: `min-h-screen p-8 ${theme.value === 'dark' ? 'bg-gray-900 text-white' : 'bg-white'}` }, (ui: LayoutBuilder) => {
      ui.Div({ className: "max-w-4xl mx-auto" }, (ui: LayoutBuilder) => {
      ui.H1({ className: "text-3xl font-bold mb-6" , value: pageTitle})
      ui.Div({ className: "mb-6 flex gap-4 items-center" }, (ui: LayoutBuilder) => {
      ui.ThemeToggle({ theme: theme })
      ui.Button({ className: "px-4 py-2 bg-blue-500 text-white rounded", on: { click: () => showCounters.value = !showCounters.value } , text: watch([showCounters], () => `
            ${showCounters.value ? 'Hide' : 'Show'} Counters
          `)})
      ui.Button({ className: "px-4 py-2 bg-green-500 text-white rounded", on: { click: (e) => addGlobalCount() } , text: watch([globalCounter], () => `
            Global +1 (${globalCounter.value})
          `)})
    })
      ui.When(watch([showCounters], () => showCounters.value) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Div({ className: "grid grid-cols-1 md:grid-cols-2 gap-4" }, (ui: LayoutBuilder) => {
      ui.Counter({ initialValue: 0, globalCounter: globalCounter })
      ui.Counter({ initialValue: 10, globalCounter: globalCounter })
      ui.Counter({ initialValue: 100, globalCounter: globalCounter })
    })
      })
    })
    })
  })
}
