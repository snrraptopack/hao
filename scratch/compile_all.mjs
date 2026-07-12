import { compileAuwla } from '../src/compiler/index.ts';
import fs from 'fs';
for (const name of ['test_union', 'test_nested', 'test_bind', 'test_spread']) {
  const source = fs.readFileSync(`./scratch/${name}.tsx`, 'utf8');
  console.log(`\n===== ${name} =====\n`);
  console.log(compileAuwla(source, `${name}.tsx`));
}
