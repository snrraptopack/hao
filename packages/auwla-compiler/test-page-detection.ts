#!/usr/bin/env node

/**
 * Test different @page directive formats to ensure flexible detection
 */

// Current strict regex
const currentRegex = /^\/\/\s*@page(?:\s*(.*))?$/

// New flexible regex - matches @page anywhere in a comment line
const flexibleRegex = /\/\/.*@page(?:[\/\s]+(.*))?/

const testCases = [
  '// @page',
  '//@page',
  '// @page /home',
  '//@page/home',
  '// @page/home',
  '// @page /home/user',
  '//@page /home/user',
  '// some comment @page/admin',
  '  // @page/dashboard',
  '/* @page/multi-line */',  // This shouldn't match (not //)
  'const x = 1 // @page/inline',
  '// @page',
  '// @page/',
  '// @page /',
  '// @route /home',  // Different directive, shouldn't match
  'no comment @page',  // No //, shouldn't match
]

console.log('🧪 Testing @page directive detection patterns...')
console.log('=' .repeat(70))

console.log('\\n📋 Test Cases:')
testCases.forEach((testCase, i) => {
  console.log(`${(i + 1).toString().padStart(2)}. "${testCase}"`)
})

console.log('\\n' + '=' .repeat(70))
console.log('🔍 Current Regex Results: /^\/\/\\s*@page(?:\\s*(.*))?$/')
console.log('=' .repeat(70))

testCases.forEach((testCase, i) => {
  const match = testCase.match(currentRegex)
  const result = match ? `✅ Match: "${match[1] || ''}"` : '❌ No match'
  console.log(`${(i + 1).toString().padStart(2)}. "${testCase}" → ${result}`)
})

console.log('\\n' + '=' .repeat(70))
console.log('🔍 New Flexible Regex Results: /\/\/.*@page(?:[\/\\s]+(.*))?/')
console.log('=' .repeat(70))

testCases.forEach((testCase, i) => {
  const match = testCase.match(flexibleRegex)
  const result = match ? `✅ Match: "${match[1] || ''}"` : '❌ No match'
  console.log(`${(i + 1).toString().padStart(2)}. "${testCase}" → ${result}`)
})

console.log('\\n' + '=' .repeat(70))
console.log('📊 Summary:')

const currentMatches = testCases.filter(tc => currentRegex.test(tc)).length
const flexibleMatches = testCases.filter(tc => flexibleRegex.test(tc)).length
const validTestCases = testCases.filter(tc => tc.includes('//') && tc.includes('@page')).length

console.log(`Current regex matches: ${currentMatches}/${validTestCases} valid cases`)
console.log(`Flexible regex matches: ${flexibleMatches}/${validTestCases} valid cases`)

// Test path extraction
console.log('\\n' + '=' .repeat(70))
console.log('🛤️  Path Extraction Test:')

const pathTestCases = [
  '// @page/home',
  '// @page /home',
  '// @page/admin/users',
  '// @page /admin/users',
  '//@page/dashboard',
  '// @page',
  '// @page/',
]

pathTestCases.forEach(testCase => {
  const match = testCase.match(flexibleRegex)
  if (match) {
    const path = match[1]?.trim() || ''
    const cleanPath = path.startsWith('/') ? path : (path ? `/${path}` : '')
    console.log(`"${testCase}" → path: "${cleanPath}"`)
  }
})