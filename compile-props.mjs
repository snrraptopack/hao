import { compileAuwla } from './src/compiler.ts';
import fs from 'fs';
const code = fs.readFileSync('./props-compiled-test.tsx', 'utf8');
const compiled = compileAuwla(code, 'props-compiled-test.tsx');
fs.writeFileSync('./props-compiled-test.out.tsx', compiled);
console.log('written');
