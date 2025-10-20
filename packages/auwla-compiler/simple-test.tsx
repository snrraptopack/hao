// @page /simple-test
// @title Simple Test Page

import { ref, type Ref } from 'auwla'

const count: Ref<number> = ref(0)
const message: Ref<string> = ref('Hello World!')

export default function SimpleTestPage() {
  const localVar = 'I am in UI scope'
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Simple Test</h1>
      <p>Count: {count.value}</p>
      <p>{message.value}</p>
      <button onClick={() => count.value++}>
        Increment
      </button>
      {count.value > 3 && (
        <div className="mt-4 p-2 bg-yellow-100">
          You clicked {count.value} times!
        </div>
      )}
    </div>
  )
}