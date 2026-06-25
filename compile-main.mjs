import { compileAuwla } from './src/compiler.ts';
import fs from 'fs';
const code = fs.readFileSync('./examples/main.tsx', 'utf8');
const compiled = compileAuwla(code, 'examples/main.tsx');
fs.writeFileSync('./main.compiled.tsx', compiled);
console.log('written');
