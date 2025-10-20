// @page /dynamic-button
// Test case: Button with dynamic text

import { ref, type Ref } from 'auwla'

const count: Ref<number> = ref(0)

export default function DynamicButtonPage() {
  return (
    <div className="p-8">
      <h1>Dynamic Button Test</h1>
      <button 
        className="bg-blue-500 text-white px-4 py-2 rounded"
        onClick={() => count.value++}
      >
        Clicked {count.value} times
      </button>
    </div>
  )
}