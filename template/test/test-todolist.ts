import { compile } from '../compiler';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { promises as fs } from 'fs';

const templatePath = resolve(__dirname, '../examples/TodoList.html');
const outputPath = resolve(__dirname, '../examples/TodoList.compiled.js');

console.log('🚀 Testing TodoList Template Compiler (auwla pipeline)...\n');

const htmlContent = readFileSync(templatePath, 'utf-8');

// Compile to TypeScript (canonical pipeline)
const ts = compile(htmlContent);

console.log('⚡ Generated TypeScript:');
console.log('=======================');
console.log(ts);

// Try to transpile to JS if typescript is installed
async function transpileAndWrite() {
	try {
		const tsMod = await import('typescript');
		const out = tsMod.transpileModule(ts, {
			compilerOptions: { module: tsMod.ModuleKind.ESNext, target: tsMod.ScriptTarget.ES2020, jsx: tsMod.JsxEmit.Preserve }
		});
		await fs.writeFile(outputPath, out.outputText, 'utf-8');
		console.log(`\n✅ Transpiled JS saved to: ${outputPath}`);
	} catch (e) {
		// If typescript isn't available, just write the TS output
		writeFileSync(outputPath, ts, 'utf-8');
		console.log(`\n⚠️ TypeScript not available - wrote TypeScript to: ${outputPath}`);
	}
}

transpileAndWrite().then(() => console.log('\n🎉 Compilation successful!'));
