#!/usr/bin/env bun
import { promises as fs } from 'fs'
import { compile } from '../template/compiler/index'

async function transpileTS(tsSource: string) {
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
    // If TypeScript isn't available, fall back to returning TS
    console.warn('typescript not available, outputting TypeScript')
    return tsSource
  }
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    console.log('auwla-cli — compile .auwla files to JavaScript')
    console.log('Usage: bun run src/cli.ts <input.auwla> [--out <out.js>]')
    process.exit(0)
  }

  const inputPath = args[0]
  if (!inputPath) {
    console.error('No input file provided')
    process.exit(1)
  }
  const outIndex = args.indexOf('--out')
  const outPath = outIndex >= 0 && args[outIndex + 1] ? args[outIndex + 1] : inputPath.replace(/\.(auwla|html)$/, '.compiled.js')

  const content = await fs.readFile(inputPath, 'utf-8')
  const ts = compile(content)
  const js = await transpileTS(ts)
  if (outPath) {
    await fs.writeFile(outPath, js, 'utf-8')
  }
  console.log(`Wrote compiled JS to: ${outPath}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
