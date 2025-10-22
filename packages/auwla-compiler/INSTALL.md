# Auwla Compiler Installation Guide

## Package Information
- **Package**: `auwla-compiler-0.3.1.tgz`
- **Version**: 0.3.1
- **Size**: 42.2 kB (unpacked: 194.3 kB)

## Installation Options

### Option 1: Install from Local Package File
```bash
# Navigate to where you want to install
cd /path/to/your/project

# Install the local package
npm install /path/to/auwla-compiler-0.3.1.tgz
```

### Option 2: Global Installation
```bash
# Install globally for CLI usage
npm install -g /path/to/auwla-compiler-0.3.1.tgz

# Then use anywhere
auwla-compiler --help
```

### Option 3: Copy and Install
```bash
# Copy the package file to your project
cp /path/to/auwla-compiler-0.3.1.tgz ./

# Install from current directory
npm install ./auwla-compiler-0.3.1.tgz
```

## Usage

### As a Library
```javascript
import { compileTSX } from 'auwla-compiler/tsx-only-compiler'

const tsxCode = `
//@page/test
import { ref } from "auwla"

const counter = ref(0)

export default function TestPage() {
  return <div>{counter.value}</div>
}
`

const compiled = compileTSX(tsxCode)
console.log(compiled)
```

### As CLI Tool
```bash
# Generate routes from TSX pages
auwla-compiler generate

# Show help
auwla-compiler --help

# Show version
auwla-compiler --version
```

### With Vite Plugin
```javascript
import { defineConfig } from 'vite'
import { auwlaPlugin } from 'auwla-compiler/vite-plugin'

export default defineConfig({
  plugins: [
    auwlaPlugin({
      // Plugin options
    })
  ]
})
```

## Features

✅ **TSX to Auwla DSL Compilation**
- Transforms TSX components to Auwla's reactive component format
- Proper scoping rules for @page components
- Reactive expression handling with `watch()`

✅ **CLI Tools**
- Route generation from page components
- File watching and compilation

✅ **Vite Integration**
- Hot module replacement support
- Development server integration

✅ **TypeScript Support**
- Full TypeScript definitions included
- Proper type checking and inference

## Testing the Installation

Create a test file to verify the installation:

```javascript
// test-compiler.js
import { compileTSX } from 'auwla-compiler'

const result = compileTSX(`
//@page/test
import { ref } from "auwla"
const count = ref(0)
export default function Test() {
  return <div>{count.value}</div>
}
`)

console.log(result)
```

Run with:
```bash
node test-compiler.js
```

## Troubleshooting

### Module Resolution Issues
If you encounter import issues, make sure your project supports ES modules:
```json
// package.json
{
  "type": "module"
}
```

### TypeScript Issues
Ensure you have TypeScript configured for ES modules:
```json
// tsconfig.json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "node"
  }
}
```