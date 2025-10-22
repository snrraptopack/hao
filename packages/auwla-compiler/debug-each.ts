// Debug script to test $each regex patterns

const testExpressions = [
  // Simple case (single parameter)
  '$each(items, (item) => <div key={item}>{item}</div>)',
  
  // Complex case (two parameters)  
  '$each(filteredTodos, (todo, index) => <div>complex jsx</div>)',
  
  // Multi-line case
  `$each(items, (item) => 
    <div key={item}>
      {item}
    </div>
  )`
]

// Current regex patterns
const oldPattern = /\$each\s*\(\s*(\w+)\s*,\s*\(([^,)]+)(?:,\s*([^)]+))?\)\s*=>\s*(.+)\)/
const newPattern = /\$each\s*\(\s*(\w+)\s*,\s*\(([^)]+)\)\s*=>\s*[\s\S]*\)/s

console.log('Testing $each regex patterns...')
console.log('=====================================')

testExpressions.forEach((expr, index) => {
  console.log(`Test ${index + 1}: ${expr.substring(0, 50)}${expr.length > 50 ? '...' : ''}`)
  console.log('---')
  
  const oldMatch = expr.match(oldPattern)
  const newMatch = expr.match(newPattern)
  
  console.log(`Old pattern match: ${oldMatch ? 'YES' : 'NO'}`)
  console.log(`New pattern match: ${newMatch ? 'YES' : 'NO'}`)
  
  if (newMatch) {
    console.log(`Captured groups:`)
    console.log(`  Array: ${newMatch[1]}`)
    console.log(`  Params: ${newMatch[2]}`)
    
    // Parse parameters
    const params = newMatch[2].split(',').map(p => p.trim())
    console.log(`  Item name: ${params[0]}`)
    console.log(`  Index name: ${params[1] || 'index'}`)
  }
  
  console.log('')
})