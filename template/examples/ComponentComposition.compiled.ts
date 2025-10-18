import { Component, ref, watch } from 'auwla'
import type { Ref } from 'auwla'

interface CardProps {
  title: string
  description: string
  isHighlighted?: Ref<boolean>
  onCardClick?: () => void
}

interface ButtonProps {
  text: string
  variant?: 'primary' | 'secondary' | 'danger'
  onClick?: () => void
}

const selectedCard = ref<number | null>(null)

const counter = ref(0)

const cards = [
  { id: 1, title: 'Component Props', description: 'Pass data to child components via props' },
  { id: 2, title: 'Reactive State', description: 'Use refs to create reactive properties' },
  { id: 3, title: 'Event Handlers', description: 'Handle clicks and interactions' },
]

function selectCard(id: number) {
  selectedCard.value = selectedCard.value === id ? null : id
}

function incrementCounter() {
  counter.value++
}

function decrementCounter() {
  counter.value--
}

function resetCounter() {
  counter.value = 0
  selectedCard.value = null
}

export function Card(props: CardProps) {
  return Component((ui) => {
    ui.Div({ className: props.isHighlighted?.value ? "p-6 bg-indigo-50 border-2 border-indigo-500 rounded-lg shadow-lg cursor-pointer transition-all" : "p-6 bg-white border border-gray-200 rounded-lg shadow hover:shadow-md cursor-pointer transition-all", on: { click: props.onCardClick } }, (ui) => {
      ui.H3({ text: String(props.title), className: "text-xl font-bold text-gray-800 mb-2" })
      ui.P({ text: String(props.description), className: "text-gray-600" })
    })
  })
}

export function Button(props: ButtonProps) {
  const variant = props.variant || 'primary';
  const baseClass = "px-4 py-2 rounded-lg font-semibold transition-colors";
  const variantClass = variant === 'primary' ? "bg-indigo-600 text-white hover:bg-indigo-700" : variant === 'secondary' ? "bg-gray-200 text-gray-800 hover:bg-gray-300" : "bg-red-600 text-white hover:bg-red-700";
  return Component((ui) => {
    ui.Button({ text: String(props.text), className: `${baseClass} ${variantClass}`, on: { click: props.onClick } })
  })
}

export default Component((ui) => {
  ui.Div({ className: "min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-8" }, (ui) => {
    ui.Div({ className: "max-w-4xl mx-auto" }, (ui) => {
      ui.Div({ className: "text-center mb-8" }, (ui) => {
        ui.H1({ text: "Component Composition", className: "text-4xl font-bold text-gray-900 mb-2" })
        ui.P({ text: "Reusable components with props and events", className: "text-lg text-gray-600" })
      })
      ui.Div({ className: "bg-white rounded-xl shadow-lg p-8 mb-8" }, (ui) => {
        ui.H2({ text: watch([counter], () => "Counter:" + String(counter.value)) as Ref<string>, className: "text-2xl font-bold text-gray-800 mb-4" })
        ui.Div({ className: "flex gap-3" }, (ui) => {
          ui.append(Button({ text: "Increment", variant: "primary" }))
          ui.append(Button({ text: "Decrement", variant: "secondary" }))
          ui.append(Button({ text: "Reset All", variant: "danger" }))
        })
      })
      ui.Div({ className: "mb-4" }, (ui) => {
        ui.H2({ text: watch([selectedCard], () => "Select a Card" + String(selectedCard.value ? `(Selected: ${selectedCard.value})` : '')) as Ref<string>, className: "text-2xl font-bold text-gray-800 mb-4" })
      })
      ui.Div({ className: "grid grid-cols-1 md:grid-cols-3 gap-4" }, (ui) => {
        cards.forEach((it, index) => {
          ui.append(Card({ title: it.title, description: it.description, isHighlighted: watch([selectedCard], () => selectedCard.value === it.id) as Ref<boolean> }))
        })
      })
      ui.When(watch([selectedCard], () => selectedCard.value !== null) as Ref<boolean>, (ui) => {
        ui.Div({ className: "mt-8 p-6 bg-indigo-100 border-2 border-indigo-300 rounded-lg" }, (ui) => {
          ui.H3({ text: "✨ Card Selected!", className: "text-xl font-bold text-indigo-900 mb-2" })
          ui.P({ text: watch([selectedCard], () => "You selected card #" + String(selectedCard.value) + ". Click it again to deselect.") as Ref<string>, className: "text-indigo-700" })
        })
      })
    })
  })
})
