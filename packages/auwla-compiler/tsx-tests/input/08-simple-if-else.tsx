// @page /simple-if-else
// Test case: Simple $if, $else without reactive refs

import { $if, $else } from 'auwla/template'

const staticValue = 42

export default function SimpleIfElsePage() {
  return (
    <div className="p-8">
      <h1>Simple If-Else Test</h1>
      
      {/* Test with static condition */}
      {$if(staticValue > 30, 
        <div className="mt-4 p-2 bg-green-100">
          Value is greater than 30: {staticValue}
        </div>
      )}
      
      {$else(
        <div className="mt-4 p-2 bg-red-100">
          Value is 30 or less: {staticValue}
        </div>
      )}
    </div>
  )
}