#!/usr/bin/env node

import { parseAuwlaFile } from './src/auwla-parser.js'
import { generateAuwlaFile } from './src/codegen/main.js'

const testContent = `
//@page/mix
import {ref } from "auwla"

const toggle = ref(false)  // Outside component → should go inside page function

function handleToggle(){   // Outside component → should go inside page function
    toggle.value = true
}

export default function Mix() {
    const counter = ref(0)  // Inside component → should go inside Component UI scope
    
    function inc(){         // Inside component → should go inside Component UI scope
        counter.value += 1
    }
    
    return (
        <div className="p-8">
            <p>The count is {counter.value}</p>
            <button onClick={inc}>Click</button>
        </div>
    )
}
`

console.log('🔍 Debugging scoping in detail...')
console.log('Input:')
console.log(testContent)
console.log('\n' + '='.repeat(60) + '\n')

try {
  const parsed = parseAuwlaFile(testContent)
  
  console.log('Parsed structure:')
  console.log('metadata:', parsed.metadata)
  console.log('helpers (component scope):', parsed.helpers)
  console.log('pageHelpers (callback scope):', parsed.pageHelpers)
  console.log('components:', parsed.components.map(c => ({ name: c.name, isDefault: c.isDefault })))
  
  console.log('\n' + '='.repeat(60) + '\n')
  
  const result = generateAuwlaFile(parsed)
  console.log('Generated output:')
  console.log(result)
} catch (error) {
  console.error('Error:', error)
}