#!/usr/bin/env node

import { compileTSX } from './src/tsx-only-compiler.js'

const testContent = `
//@page
import {ref } from "auwla"

const counter = ref(0)

function inc(){
  counter.value += 1
}

export default function AboutPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">About Page</h1>
      <p>The count is {counter.value}</p>
      <button onClick={inc} onDoubleClick={inc}></button>
      {$if(counter.value,<p>hello</p>)}
    </div>
  )
}
`

console.log('🔍 Testing page scoping...')
console.log('Input:')
console.log(testContent)
console.log('\n' + '='.repeat(60) + '\n')

try {
  const result = compileTSX(testContent)
  console.log('Output:')
  console.log(result)
} catch (error) {
  console.error('Error:', error)
}