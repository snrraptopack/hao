#!/usr/bin/env node

import { generateRoutes } from './route-generator.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const command = process.argv[2];

async function main() {
  switch (command) {
    case 'generate':
    case 'routes:generate':
      await generateRoutesCommand();
      break;
    case '--version':
    case '-v':
      showVersion();
      break;
    case '--help':
    case '-h':
    default:
      showHelp();
      break;
  }
}

async function generateRoutesCommand() {
  try {
    console.log('🔄 Generating routes...');
    
    // Look for pages directory
    const pagesDir = join(process.cwd(), 'src', 'pages');
    const outputDir = join(process.cwd(), '.routes');
    
    if (!existsSync(pagesDir)) {
      console.error('❌ Pages directory not found at src/pages');
      process.exit(1);
    }

    await generateRoutes(pagesDir, outputDir);
    console.log('✅ Routes generated successfully!');
  } catch (error) {
    console.error('❌ Error generating routes:', error);
    process.exit(1);
  }
}

function showVersion() {
  try {
    // Try multiple possible paths for package.json
    const possiblePaths = [
      join(__dirname, '..', 'package.json'),
      join(__dirname, '..', '..', 'package.json'),
      join(process.cwd(), 'node_modules', 'auwla-compiler', 'package.json')
    ];
    
    for (const packagePath of possiblePaths) {
      if (existsSync(packagePath)) {
        const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
        console.log(pkg.version);
        return;
      }
    }
    
    // Fallback to current version
    console.log('0.3.1');
  } catch {
    console.log('0.3.1');
  }
}

function showHelp() {
  console.log(`
Auwla Compiler CLI

Usage:
  auwla-compiler <command>

Commands:
  generate          Generate route files from .auwla pages
  routes:generate   Alias for generate
  --version, -v     Show version
  --help, -h        Show this help

Examples:
  auwla-compiler generate
  npx auwla-compiler generate
  bunx auwla-compiler generate
`);
}

main().catch(console.error);