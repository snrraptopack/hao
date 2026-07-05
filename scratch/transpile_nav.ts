import { readFileSync, writeFileSync } from 'fs';
import * as ts from 'typescript';
import { compileAuwla } from '../src/compiler';

const source = readFileSync('./scratch/test_direct_jsx.tsx', 'utf-8');
const compiled = compileAuwla(source, './scratch/test_direct_jsx.tsx', { ssr: true, islands: true });
writeFileSync('./scratch/test_direct_jsx_compiled.js', compiled);
console.log("Transpiled!");
