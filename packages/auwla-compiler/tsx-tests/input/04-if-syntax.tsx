// @page /if-syntax
// Test case: New $if() syntax for conditionals

import { ref, type Ref } from 'auwla'
import { $if } from 'auwla/template'

const isVisible: Ref<boolean> = ref(true)
const count: Ref<number> = ref(0)

export default function IfSyntaxPage() {
  return (
    <div className="p-8">
      <h1>If Syntax Test</h1>
      
      <button onClick={() => isVisible.value = !isVisible.value}>
        Toggle Visibility
      </button>
      
      <button onClick={() => count.value++}>
        Count: {count.value}
      </button>
      
      {/* New $if syntax - this should compile to if(watch(() => condition)) */}
      {$if(isVisible.value, 
        <div className="mt-4 p-2 bg-green-100">
          This is conditionally visible!
        </div>
      )}
      
      {/* Another conditional */}
      {$if(count.value > 3,
        <div className="mt-2 p-2 bg-yellow-100">
          Count is greater than 3: {count.value}
        </div>
      )}
    </div>
  )
}