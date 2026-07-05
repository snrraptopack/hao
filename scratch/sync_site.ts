import { cpSync, rmSync, existsSync } from 'node:fs';

const srcDir = './dist';
const destDir = './site/node_modules/auwla/dist';

if (existsSync(destDir)) {
  rmSync(destDir, { recursive: true, force: true });
}
cpSync(srcDir, destDir, { recursive: true });
console.log("Synced dist to site/node_modules/auwla/dist successfully!");
