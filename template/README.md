# Auwla Template System

A Handlebars-based template compiler that converts `.html` files with special syntax into Auwla's reactive LayoutBuilder API.

## 🎯 Goal

Write HTML templates with reactivity and event handling, compile them to efficient Auwla components.

## 📝 Syntax

### Reactive Text Binding
```html
<p>Count: {{count}}</p>
```

### Event Handlers
```html
<button @click="increment">+</button>
```

### Reactive Attributes
```html
<input :value="email" placeholder="Enter email">
```

### State & Methods
```html
<script>
export default {
  state: {
    count: 0
  },
  
  methods: {
    increment() {
      this.count++
    }
  }
}
</script>
```

## 🧪 Testing

```bash
# Test the parser (extract template + script)
bun run template:parse

# Test full compilation
bun run template:test
```

## 📁 Structure

```
template/
├── examples/          # Example .html templates
├── compiler/          # Compilation pipeline
│   ├── parser.ts      # Extract template & script
│   ├── analyzer.ts    # Find @click, :value, {{}}
│   ├── codegen.ts     # Generate LayoutBuilder code
│   └── index.ts       # Main entry point
└── test/              # Test scripts
```

## 🚀 Next Steps

1. ✅ Basic compilation working
2. ⏳ Add support for {{#if}} conditionals
3. ⏳ Add support for {{#each}} loops
4. ⏳ Create Vite plugin for .html files
5. ⏳ Transition to custom .auwla extension
