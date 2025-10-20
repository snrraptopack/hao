// @page /if-else-chain
// Test case: $if, $elseif, $else chain

import { ref, type Ref } from 'auwla'
import { $if, $elseif, $else } from 'auwla/template'

const score: Ref<number> = ref(75)

export default function IfElseChainPage() {
  return (
    <div className="p-8">
      <h1>If-Else Chain Test</h1>
      
      <button onClick={() => score.value = Math.floor(Math.random() * 100)}>
        Random Score: {score.value}
      </button>
      
      {/* Test $if, $elseif, $else chain */}
      {$if(score.value >= 90, 
        <div className="mt-4 p-2 bg-green-100">
          Excellent! Score: {score.value}
        </div>
      )}
      
      {$elseif(score.value >= 70,
        <div className="mt-4 p-2 bg-blue-100">
          Good! Score: {score.value}
        </div>
      )}
      
      {$elseif(score.value >= 50,
        <div className="mt-4 p-2 bg-yellow-100">
          Average. Score: {score.value}
        </div>
      )}
      
      {$else(
        <div className="mt-4 p-2 bg-red-100">
          Needs improvement. Score: {score.value}
        </div>
      )}
    </div>
  )
}