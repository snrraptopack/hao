// @page /mixed-elements
// Test case: Mix of different element types

import { ref, type Ref } from 'auwla'

const message: Ref<string> = ref('Hello')
const isVisible: Ref<boolean> = ref(true)

export default function MixedElementsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Mixed Elements</h1>
      
      {/* Static text */}
      <p>This is static text</p>
      
      {/* Dynamic text */}
      <p>Message: {message.value}</p>
      
      {/* Button with static text */}
      <button onClick={() => message.value = 'Updated!'}>
        Update Message
      </button>
      
      {/* Input */}
      <input 
        type="text" 
        placeholder="Enter text..."
        className="border p-2 mt-2"
      />
      
      {/* Conditional */}
      {isVisible.value && (
        <div className="mt-4 p-2 bg-blue-100">
          This is conditionally visible
        </div>
      )}
    </div>
  )
}