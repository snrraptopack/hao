//@page /test-reference-error
import { ref, computed } from "auwla"

// This should go to COMPONENT SCOPE (inside page function)
const globalCount = ref(0)

// This function references globalCount - should be in same scope
function incrementGlobal() {
  globalCount.value++
}

export default function TestReferencePage() {
  // This should go to UI SCOPE (inside Component callback)
  const localMessage = ref("Hello")
  
  // This computed references globalCount - should work since globalCount is in component scope
  const doubledCount = computed(() => globalCount.value * 2)
  
  return (
    <div>
      <h1>{localMessage.value}</h1>
      <p>Count: {globalCount.value}</p>
      <p>Doubled: {doubledCount.value}</p>
      <button onClick={incrementGlobal}>Increment</button>
    </div>
  )
}