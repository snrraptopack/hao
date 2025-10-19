import { generateRoutes } from './route-generator'
import { promises as fs } from 'fs'
import { join } from 'path'

async function testRouteGeneration() {
  console.log('🚀 Testing Unified Route Generation...\n')
  
  // Create a test pages directory
  const pagesDir = '../examples'
  const outputDir = '../../.routes/generated'
  
  try {
    // Ensure output directory exists
    try {
      await fs.mkdir(outputDir, { recursive: true })
    } catch (error) {
      // Directory might already exist, that's fine
    }
    
    // Generate routes and components from .auwla files
    const result = await generateRoutes(pagesDir, outputDir)
    
    console.log('✅ Generated routes:')
    result.routes.forEach(route => {
      console.log(`  ${route.path} -> ${route.component} (${route.file}.ts)`)
    })
    
    console.log('\n🧩 Generated components:')
    result.components.forEach(component => {
      console.log(`  ${component.name} (${component.file}.ts)`)
    })
    
    console.log('\n📁 Generated files:')
    result.routes.forEach(route => {
      console.log(`  ${outputDir}/${route.file}.ts - ${route.component} (route)`)
    })
    result.components.forEach(component => {
      console.log(`  ${outputDir}/${component.file}.ts - ${component.name} (component)`)
    })
    
    console.log('\n🔄 Updated unified route registry at .routes/index.ts')
    
  } catch (error) {
    console.error('❌ Error generating routes:', error)
  }
}

// Run if called directly
if (require.main === module) {
  testRouteGeneration()
}

export { testRouteGeneration }