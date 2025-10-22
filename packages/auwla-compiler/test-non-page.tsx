// No @page directive
import { ref } from "auwla"

// This should go to GLOBAL SCOPE (component helpers)
const globalCount = ref(0)
const API_URL = "https://api.example.com"

export default function TestNonPageComponent() {
  // This should go to UI SCOPE (inside Component callback)
  const localMessage = ref("Hello")
  
  return (
    <div>
      <h1>{localMessage.value}</h1>
      <p>Count: {globalCount.value}</p>
    </div>
  )
}