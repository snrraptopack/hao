# TSX Compiler Scoping Fix Design

## Overview

This design focuses on fixing only the scoping logic in the existing Auwla compiler. The goal is to make minimal changes to correctly handle @page directive scoping while preserving all existing functionality.

## Current Problem

The existing compiler places variables in the wrong scopes for @page files:
- Variables outside `export default` should go in component scope (inside page function)
- Variables inside `export default` should go in UI scope (inside Component callback)

## Solution Approach

### 1. Identify the Scoping Logic

The scoping logic is in `packages/auwla-compiler/src/codegen/main.ts` in the `generatePageComponent` function:

```typescript
// Current (incorrect) logic:
// - parsed.helpers (outside export default) → Component helpers (global scope)
// - parsed.pageHelpers (inside export default) → UI helpers (callback scope)

// Should be (correct) logic for @page files:
// - parsed.helpers (outside export default) → Component scope (inside page function)
// - parsed.pageHelpers (inside export default) → UI scope (inside Component callback)
```

### 2. Fix the Scoping Logic

Update the `generatePageComponent` function to:

1. Check if the file has `@page` directive
2. If it's a @page file, invert the scoping:
   - Place `parsed.helpers` inside the page function (component scope)
   - Place `parsed.pageHelpers` inside the Component callback (UI scope)
3. If it's not a @page file, keep existing behavior

### 3. Implementation Plan

```typescript
function generatePageComponent(component: ComponentFunction): string {
  const currentFile = getCurrentParsedFile()
  const isPageFile = currentFile?.metadata?.page
  
  let code = `// Page component (has lifecycle)\n`
  code += `export default function ${component.name || 'Component'}() {\n`
  
  if (isPageFile) {
    // @page file: helpers go in component scope
    if (currentFile && currentFile.helpers.length > 0) {
      code += '  // Logic that was outside page scope → now inside page scope\n'
      code += currentFile.helpers.map(h => `  ${h}`).join('\n') + '\n\n'
    }
  } else {
    // Regular component: keep existing behavior
    // (helpers would be added outside the function)
  }
  
  code += `  return Component((ui: LayoutBuilder) => {\n`
  
  if (isPageFile) {
    // @page file: pageHelpers go in UI scope
    if (currentFile && currentFile.pageHelpers.length > 0) {
      code += '    // Logic that was inside page scope → now inside Component UI scope\n'
      code += currentFile.pageHelpers.map(h => `    ${h}`).join('\n') + '\n\n'
    }
  } else {
    // Regular component: keep existing behavior
    if (currentFile && currentFile.pageHelpers.length > 0) {
      code += currentFile.pageHelpers.map(h => `    ${h}`).join('\n') + '\n\n'
    }
  }
  
  // JSX generation remains unchanged
  for (const node of jsxNodes) {
    code += generateNode(node, 2)
  }
  
  code += `  })\n`
  code += `}\n`
  
  return code
}
```

## Files to Modify

1. **`packages/auwla-compiler/src/codegen/main.ts`**
   - Update `generatePageComponent` function
   - Add logic to check for @page directive
   - Implement inverted scoping for @page files

## Testing Strategy

1. Test with existing non-@page files to ensure no regression
2. Test with @page files to verify correct scoping
3. Verify that JSX generation remains unchanged
4. Check that all existing functionality works

## Risk Mitigation

- Make minimal changes to reduce risk
- Preserve all existing JSX generation logic
- Keep existing import/export handling
- Only modify the variable placement logic