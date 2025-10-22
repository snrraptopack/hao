//@page /counter
import { ref } from "auwla"

// Global state (outside page scope → should go inside page function)
const count = ref(0)
const step = ref(1)

// Global functions (outside page scope → should go inside page function)  
function increment() {
  count.value += step.value
}

function decrement() {
  count.value -= step.value
}

function reset() {
  count.value = 0
}

export default function CounterPage() {
  // Local state (inside page scope → should go inside Component UI scope)
  const message = ref("Counter App")
  const isVisible = ref(true)
  
  // Local functions (inside page scope → should go inside Component UI scope)
  function toggleVisibility() {
    isVisible.value = !isVisible.value
  }
  
  function updateMessage() {
    message.value = `Count is ${count.value}`
  }
  
  return (
    <div>
      <h1>{message.value}</h1>
      {isVisible.value && (
        <div>
          <p>Current count: {count.value}</p>
          <p>Step: {step.value}</p>
          <button onClick={increment}>+</button>
          <button onClick={decrement}>-</button>
          <button onClick={reset}>Reset</button>
          <button onClick={toggleVisibility}>Hide</button>
          <button onClick={updateMessage}>Update Message</button>
        </div>
      )}
    </div>
  )
}