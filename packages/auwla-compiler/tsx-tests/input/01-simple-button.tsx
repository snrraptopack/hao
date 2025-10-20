// @page /simple-button
// Test case: Simple button with static text

import { ref, type Ref } from 'auwla'

const count: Ref<number> = ref(0)

export default function SimpleButtonPage() {
  return (
    <div className="p-8">
      <h1>Button Test</h1>
      <button onClick={() => count.value++}>
        Click me
      </button>
      <p>Count: {count.value}</p>
    </div>
  )
}