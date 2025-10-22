import { generateAuwlaFromTSX, parseTSXFile } from './src/tsx-compiler'

// Test with a simple $each first
const simpleInput = `
export default function TestPage() {
  const items = ref(['a', 'b', 'c'])
  
  return (
    <div>
      {$each(items, (item) => (
        <div key={item}>{item}</div>
      ))}
    </div>
  )
}
`

console.log('=== Testing Simple $each ===')
const component = parseTSXFile(simpleInput)
const result = generateAuwlaFromTSX(component)

console.log('Generated code:')
console.log(result)