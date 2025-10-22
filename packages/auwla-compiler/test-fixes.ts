import { parseTSXFile, generateAuwlaFromTSX } from './src/tsx-compiler'

console.log('🧪 Testing compiler fixes...')

const testCode = `
// @page /test-fixes
import { ref, watch, type Ref } from 'auwla'

const theme: Ref<'light' | 'dark'> = ref('light')
const count: Ref<number> = ref(0)

// Standalone watch call
watch([theme, count], () => {
  console.log('Theme or count changed')
})

export default function TestFixesPage() {
  return (
    <div className={\`p-8 \${theme.value === 'dark' ? 'bg-gray-900' : 'bg-white'}\`}>
      <h1>Test Fixes</h1>
      <p>Count: {count.value}</p>
      <button onClick={() => count.value++}>
        Increment
      </button>
    </div>
  )
}
`

try {
    const component = parseTSXFile(testCode)
    const result = generateAuwlaFromTSX(component)
    
    console.log('✅ Compilation successful!')
    console.log('Result:')
    console.log(result)
    
    // Check fixes
    const checks = [
        {
            name: 'Standalone watch included',
            test: result.includes('watch([theme, count], () => {'),
            expected: true
        },
        {
            name: 'Reactive className uses watch',
            test: result.includes('className: watch('),
            expected: true
        },
        {
            name: 'Template literal has ${} syntax',
            test: result.includes('${count.value}'),
            expected: true
        }
    ]
    
    console.log('\n📋 Fix Status:')
    checks.forEach(check => {
        const status = check.test === check.expected ? '✅' : '❌'
        console.log(`${status} ${check.name}: ${check.test}`)
    })
    
} catch (error) {
    console.log('❌ Compilation failed:', error)
}