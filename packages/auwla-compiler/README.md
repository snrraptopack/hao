# @auwla/compiler

The official compiler for the Auwla framework. Transforms `.auwla` files into reactive components and provides automatic route generation.

## Installation

```bash
npm install @auwla/compiler
# or
bun add @auwla/compiler
```

## Usage

### Vite Plugin

Add the compiler to your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import { templateCompiler } from '@auwla/compiler/vite'

export default defineConfig({
  plugins: [
    templateCompiler({
      verbose: false,
      emitDebugFiles: true
    })
  ]
})
```

### Route Generation

Generate routes from `.auwla` files:

```typescript
import { generateRoutes } from '@auwla/compiler'

const { routes, components } = await generateRoutes(
  'src/pages',      // Input directory
  '.routes/generated' // Output directory
)
```

### Manual Compilation

Compile individual `.auwla` files:

```typescript
import { parseAuwlaFile, generateAuwlaFile } from '@auwla/compiler'

const content = await fs.readFile('MyComponent.auwla', 'utf-8')
const parsed = parseAuwlaFile(content)
const compiled = generateAuwlaFile(parsed)
```

## .auwla File Format

### Page Components

Files marked with `@page` become routes:

```typescript
// @page
// @title My Page
// @description A sample page

<script>
import { ref } from 'auwla'

const count = ref(0)
</script>

export default function MyPage() {
  return (
    <div>
      <h1>Count: {count.value}</h1>
      <button onClick={() => count.value++}>
        Increment
      </button>
    </div>
  )
}
```

### Reusable Components

Files without `@page` become reusable components:

```typescript
<script>
interface Props {
  title: string
  onClick?: () => void
}
</script>

export default function Button({ title, onClick }: Props) {
  return (
    <button onClick={onClick} class="btn">
      {title}
    </button>
  )
}
```

## Features

- ✅ **Smart Route Detection** - Only files with `@page` become routes
- ✅ **Automatic Cleanup** - Removes deleted routes from registry
- ✅ **Hot Reload** - Fast development with Vite integration
- ✅ **TypeScript Support** - Full type safety
- ✅ **Metadata Extraction** - Parse `@title`, `@description`, etc.
- ✅ **Component Composition** - Reusable components

## License

MIT