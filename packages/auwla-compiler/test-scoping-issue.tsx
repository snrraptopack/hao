//@page /test-scoping
import { ref } from "auwla"

// This should go to COMPONENT SCOPE (inside page function)
const globalCount = ref(0)
const API_URL = "https://api.example.com"

export default function TestScopingPage() {
  // This should go to UI SCOPE (inside Component callback)
  const localMessage = ref("Hello")
  const isVisible = ref(true)
  
  return (
    <div>
      <h1>{localMessage.value}</h1>
      <p>Count: {globalCount.value}</p>
      <p>API: {API_URL}</p>
    </div>
  )
}