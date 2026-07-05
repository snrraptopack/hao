import { cpSync, rmSync, existsSync } from 'node:fs';

const srcDir = './dist';
const destDir = './site/node_modules/auwla/dist';
const packageSrc = './package.json';
const packageDest = './site/node_modules/auwla/package.json';

if (existsSync(destDir)) {
  rmSync(destDir, { recursive: true, force: true });
}
cpSync(srcDir, destDir, { recursive: true });
cpSync(packageSrc, packageDest);
console.log("Synced dist to site/node_modules/auwla/dist successfully!");
