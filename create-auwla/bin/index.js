#!/usr/bin/env node
// Minimal, zero-dependency initializer for Auwla starter apps
// Usage:
//   npm create auwla@latest
//   npx create-auwla
//   node ./bin/index.js --dir my-app --template minimal

import fs from 'fs';
import path from 'path';
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function log(msg) { process.stdout.write(String(msg) + '\n'); }
function error(msg) { process.stderr.write(String(msg) + '\n'); }

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.replace(/^--/, '').split('=');
      args[k] = v ?? true;
    } else if (!args._) {
      args._ = [a];
    } else {
      args._.push(a);
    }
  }
  return args;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [from, to] of Object.entries(replacements)) {
    content = content.replaceAll(from, to);
  }
  fs.writeFileSync(filePath, content);
}

function main() {
  const args = parseArgs(process.argv);
  const template = args.template || 'minimal';
  const dirArg = args.dir || args._?.[0];

  if (!dirArg) {
    log('Usage: create-auwla --dir my-app [--template minimal]');
    process.exit(1);
  }

  const targetDir = path.resolve(process.cwd(), dirArg);
  const templateDir = path.join(__dirname, '..', 'templates', template);

  if (!fs.existsSync(templateDir)) {
    error(`Unknown template: ${template}`);
    process.exit(1);
  }

  // Create directory and copy template
  ensureDir(targetDir);
  copyDir(templateDir, targetDir);

  // Personalize package.json name
  const pkgPath = path.join(targetDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    replaceInFile(pkgPath, {
      '"name": "auwla-starter"': `"name": "${path.basename(targetDir)}"`
    });
  }

  log('');
  log(`✔ Project scaffolded at ${targetDir}`);
  log('');
  log('Next steps:');
  log(`  cd ${path.relative(process.cwd(), targetDir) || '.'}`);
  log('  npm install');
  log('  npm run dev');
  log('');
  log('Happy hacking with Auwla!');
}

main();