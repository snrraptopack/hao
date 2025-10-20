import { promises as fs } from 'fs'
import { parseAuwlaFile } from './auwla-parser'
import { generateAuwlaFile } from 'auwla-compiler'

async function transpile(tsSource: string) {
  try {
    const ts = await import('typescript')
    const out = ts.transpileModule(tsSource, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.Preserve,
        esModuleInterop: true,
        allowJs: true
      }
    })
    return out.outputText
  } catch (e) {
    console.error('typescript not available', e)
    return tsSource
  }
}

export default async function run() {
  const path = '../examples/TestComponent.auwla'
  const content = await fs.readFile(path, 'utf-8')
  const parsed = parseAuwlaFile(content)
  console.log('--- Parsed result (auwla-parser) ---')
  console.log(JSON.stringify(parsed, null, 2))

  const ts = generateAuwlaFile(parsed)
  console.log('--- Generated TypeScript (auwla-codegen) ---')
  console.log(ts)

  const js = await transpile(ts)
  console.log('\n--- Transpiled JavaScript ---')
  console.log(js)

  const outPath = '../examples/TestComponent.compiled.debug.auwla.js'
  await fs.writeFile(outPath, js, 'utf-8')
  console.log('\nWrote transpiled JS to', outPath)
}

// If run directly as a script, execute immediately
if (require.main === module) {
  run().catch(err => { console.error(err); process.exit(1) })
}
