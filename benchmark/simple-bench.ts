/**
 * Simple Performance Benchmark
 * Tests core operations of the framework
 */

import { ref, watch } from '../src/state'
import { Component } from '../src/dsl'

// Benchmark utilities
class BenchmarkSuite {
  private results: Map<string, number> = new Map()
  
  async run(name: string, fn: () => void | Promise<void>, iterations: number = 1000) {
    console.log(`\n🏃 Running: ${name} (${iterations} iterations)`)
    
    // Warm up (10 iterations)
    for (let i = 0; i < 10; i++) {
      await fn()
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }
    
    // Measure
    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      await fn()
    }
    const end = performance.now()
    
    const totalTime = end - start
    const avgTime = totalTime / iterations
    
    this.results.set(name, totalTime)
    
    console.log(`  ✓ Total: ${totalTime.toFixed(2)}ms`)
    console.log(`  ✓ Average: ${avgTime.toFixed(4)}ms per operation`)
    console.log(`  ✓ Ops/sec: ${(1000 / avgTime).toFixed(0)}`)
  }
  
  printSummary() {
    console.log('\n' + '='.repeat(60))
    console.log('📊 BENCHMARK SUMMARY')
    console.log('='.repeat(60))
    
    const sorted = Array.from(this.results.entries())
      .sort((a, b) => a[1] - b[1])
    
    sorted.forEach(([name, time], index) => {
      const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  '
      console.log(`${emoji} ${name.padEnd(40)} ${time.toFixed(2).padStart(10)}ms`)
    })
    
    console.log('='.repeat(60))
  }
  
  compare(baseline: string) {
    const baseTime = this.results.get(baseline)
    if (!baseTime) {
      console.log(`\n⚠️  Baseline "${baseline}" not found`)
      return
    }
    
    console.log('\n' + '='.repeat(60))
    console.log(`📊 COMPARISON (vs ${baseline})`)
    console.log('='.repeat(60))
    
    this.results.forEach((time, name) => {
      if (name === baseline) return
      
      const ratio = time / baseTime
      const percent = ((ratio - 1) * 100).toFixed(1)
      const faster = ratio < 1
      const emoji = faster ? '⚡' : '🐌'
      
      console.log(
        `${emoji} ${name.padEnd(40)} ` +
        `${ratio.toFixed(2)}x ${faster ? 'faster' : 'slower'} ` +
        `(${faster ? '-' : '+'}${Math.abs(parseFloat(percent))}%)`
      )
    })
    
    console.log('='.repeat(60))
  }
}

// Test data generators
const createData = (count: number) => 
  Array.from({ length: count }, (_, i) => ({
    id: i,
    label: `Item ${i}`,
    value: Math.random()
  }))

// Benchmarks
async function runBenchmarks() {
  const suite = new BenchmarkSuite()
  
  console.log('\n🔥 FRAMEWORK PERFORMANCE BENCHMARK')
  console.log('Testing core operations...\n')
  
  // Test 1: Create refs
  await suite.run('Create 1000 refs', () => {
    const refs = Array.from({ length: 1000 }, () => ref(0))
    refs.length = 0 // Clear for GC
  }, 100)
  
  // Test 2: Update refs
  await suite.run('Update 1000 refs', () => {
    const refs = Array.from({ length: 1000 }, () => ref(0))
    refs.forEach(r => r.value++)
    refs.length = 0
  }, 100)
  
  // Test 3: Create refs with subscriptions
  await suite.run('Create 1000 refs + subscriptions', () => {
    const refs = Array.from({ length: 1000 }, () => {
      const r = ref(0)
      r.subscribe(() => {}) // Add subscriber
      return r
    })
    refs.length = 0
  }, 100)
  
  // Test 4: Update subscribed refs
  await suite.run('Update 1000 subscribed refs', () => {
    const refs = Array.from({ length: 1000 }, () => {
      const r = ref(0)
      r.subscribe(() => {})
      return r
    })
    refs.forEach(r => r.value++)
    refs.length = 0
  }, 100)
  
  // Test 5: Watch (computed) single ref
  await suite.run('Create 1000 computed (watch)', () => {
    const source = ref(0)
    const computed = Array.from({ length: 1000 }, () => 
      watch(source, v => v * 2)
    )
    source.value++
    computed.length = 0
  }, 100)
  
  // Test 6: Watch multiple refs
  await suite.run('Create 1000 multi-watch', () => {
    const a = ref(0)
    const b = ref(0)
    const computed = Array.from({ length: 1000 }, () =>
      watch([a, b], ([x, y]) => x + y)
    )
    a.value++
    b.value++
    computed.length = 0
  }, 100)
  
  // Test 7: Component creation
  await suite.run('Create 100 components', () => {
    const components = Array.from({ length: 100 }, () =>
      Component((ui) => {
        ui.Div({ className: 'test' }, (ui) => {
          ui.Text({ value: 'Hello' })
        })
      })
    )
    components.length = 0
  }, 50)
  
  // Test 8: Component with reactive data
  await suite.run('Create 100 reactive components', () => {
    const count = ref(0)
    const components = Array.from({ length: 100 }, () =>
      Component((ui) => {
        ui.Text({ value: count })
      })
    )
    count.value++
    components.length = 0
  }, 50)
  
  // Test 9: List rendering (keyed)
  await suite.run('Render list of 1000 items', () => {
    const items = ref(createData(1000))
    const component = Component((ui) => {
      ui.List({
        items,
        key: (item) => item.id,
        render: (item, i, ui) => {
          ui.Text({ value: item.label })
        }
      })
    })
    items.value = []
  }, 10)
  
  // Test 10: List update (single item)
  await suite.run('Update 1 item in list of 1000', () => {
    const items = ref(createData(1000))
    const component = Component((ui) => {
      ui.List({
        items,
        key: (item) => item.id,
        render: (item, i, ui) => {
          ui.Text({ value: item.label })
        }
      })
    })
    
    // Update middle item
    const newItems = [...items.value]
    const itemToUpdate = newItems[500]
    if (itemToUpdate) {
      newItems[500] = { ...itemToUpdate, label: 'Updated' }
    }
    items.value = newItems
  }, 10)
  
  // Test 11: List swap
  await suite.run('Swap 2 items in list of 1000', () => {
    const items = ref(createData(1000))
    const component = Component((ui) => {
      ui.List({
        items,
        key: (item) => item.id,
        render: (item, i, ui) => {
          ui.Text({ value: item.label })
        }
      })
    })
    
    // Swap first and last
    const newItems = [...items.value]
    const first = newItems[0]
    const last = newItems[999]
    if (first && last) {
      newItems[0] = last
      newItems[999] = first
    }
    items.value = newItems
  }, 10)
  
  // Test 12: Vanilla JS baseline (create elements)
  await suite.run('Vanilla: Create 1000 divs', () => {
    const container = document.createElement('div')
    for (let i = 0; i < 1000; i++) {
      const div = document.createElement('div')
      div.textContent = `Item ${i}`
      container.appendChild(div)
    }
  }, 100)
  
  // Test 13: Vanilla JS baseline (update elements)
  await suite.run('Vanilla: Update 1000 divs', () => {
    const container = document.createElement('div')
    const divs = Array.from({ length: 1000 }, (_, i) => {
      const div = document.createElement('div')
      div.textContent = `Item ${i}`
      container.appendChild(div)
      return div
    })
    
    divs.forEach((div, i) => {
      div.textContent = `Updated ${i}`
    })
  }, 100)
  
  // Print results
  suite.printSummary()
  suite.compare('Vanilla: Create 1000 divs')
  
  console.log('\n✅ Benchmark complete!\n')
}

// Run benchmarks
runBenchmarks().catch(console.error)
