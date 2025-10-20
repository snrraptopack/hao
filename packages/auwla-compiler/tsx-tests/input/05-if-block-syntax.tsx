// @page /if-block-syntax
// Test case: New $if(condition){} block syntax

import { ref, type Ref } from 'auwla'

const isVisible: Ref<boolean> = ref(true)
const count: Ref<number> = ref(0)

export default function IfBlockSyntaxPage() {
  return (
    <div className="p-8">
      <h1>If Block Syntax Test</h1>
      
      <button onClick={() => isVisible.value = !isVisible.value}>
        Toggle Visibility
      </button>
      
      <button onClick={() => count.value++}>
        Count: {count.value}
      </button>
      
      {/* New $if(condition) && (jsx) syntax - more natural */}
      {$if(isVisible.value) && (
        <div className="mt-4 p-2 bg-green-100">
          This is conditionally visible!
        </div>
      )}
      
      {/* Another conditional with complex expression */}
      {$if(count.value > 3) && (
        <div className="mt-2 p-2 bg-yellow-100">
          Count is greater than 3: {count.value}
        </div>
      )}
    </div>
  )
}