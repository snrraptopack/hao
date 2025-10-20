// @page /comprehensive-test
// @title Comprehensive Test
// @description Testing all TSX features

import { ref, watch, type Ref } from 'auwla'

// Component scope - these go outside the component function
const globalCount: Ref<number> = ref(0)
const todos: Ref<Array<{id: number, text: string, done: Ref<boolean>}>> = ref([
  { id: 1, text: 'Learn Auwla', done: ref(false) },
  { id: 2, text: 'Build app', done: ref(true) }
])

function helperFunction(x: number) {
  return x * 2
}

export default function ComprehensiveTestPage() {
  // UI scope - these go inside the component function
  const localMessage = 'I am local to the component'
  const computedValue = globalCount.value * 2
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Comprehensive Test</h1>
      
      {/* Simple text */}
      <p>Static text here</p>
      
      {/* Reactive text */}
      <p>Count: {globalCount.value}</p>
      <p>{localMessage}</p>
      
      {/* Button with event */}
      <button 
        className="bg-blue-500 text-white px-4 py-2 rounded"
        onClick={() => globalCount.value++}
      >
        Increment ({globalCount.value})
      </button>
      
      {/* Conditional rendering */}
      {globalCount.value > 5 && (
        <div className="mt-4 p-4 bg-yellow-100 border rounded">
          <p>Count is greater than 5!</p>
          <p>Current value: {globalCount.value}</p>
        </div>
      )}
      
      {/* Nested elements */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold">Nested Content</h2>
        <div className="flex gap-4">
          <span>Left</span>
          <span>Right</span>
        </div>
      </div>
      
      {/* Input example */}
      <div className="mt-4">
        <input 
          type="text" 
          placeholder="Enter something..."
          className="border p-2 rounded"
        />
      </div>
    </div>
  )
}