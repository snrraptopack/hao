import { readFileSync, writeFileSync } from 'fs';
import * as ts from 'typescript';
import { compileAuwla } from '../src/compiler';

const source = readFileSync('./examples/auto-commit-bug-proof.tsx', 'utf-8');
const compiled = compileAuwla(source);
writeFileSync('./scratch/auto_commit_bug_proof_compiled.js', compiled);
console.log("Transpiled!");
