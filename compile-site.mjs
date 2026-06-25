import { compileAuwla } from './src/compiler.ts';
import fs from 'fs';
const code = fs.readFileSync('./props-site-test.tsx', 'utf8');
const compiled = compileAuwla(code, 'props-site-test.tsx');
fs.writeFileSync('./props-site-test.out.tsx', compiled);
console.log('written');
