import { cpSync, rmSync, existsSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';

const srcDir = './dist';
const destDir = './site/node_modules/auwla/dist';
const packageSrc = './package.json';
const packageDest = './site/node_modules/auwla/package.json';

let srcResolved = resolve(srcDir);
let destResolved = resolve(destDir);

try {
  if (existsSync(srcDir)) srcResolved = realpathSync(srcDir);
  if (existsSync(destDir)) destResolved = realpathSync(destDir);
} catch (e) {}

if (srcResolved === destResolved) {
  console.log("dist is already mapped via symlink. No copy needed.");
} else {
  if (existsSync(destDir)) {
    rmSync(destDir, { recursive: true, force: true });
  }
  cpSync(srcDir, destDir, { recursive: true });
  cpSync(packageSrc, packageDest);
  console.log("Synced dist to site/node_modules/auwla/dist successfully!");
}
