# Plugin Inheritance - Type-Safe Context from Layouts

## The Problem

When a layout provides plugins, child pages need to know about them at compile time for TypeScript autocomplete and type checking.

## The Solution

Layouts automatically export a `.definePage` helper that includes their plugins in the type signature.

## Example

### 1. Define Layout with Plugins

```typescript
// layouts/AuthLayout.tsx
import { defineLayout, authPlugin, i18nPlugin } from 'auwla'

const auth = authPlugin()
const i18n = i18nPlugin({ en: {...}, es: {...} })

export const AuthLayout = defineLayout(
  (ctx, child) => (
    <div>
      <header>{ctx.i18n.t('welcome')}</header>
      {child}
    </div>
  ),
  [auth, i18n] as const
)
```

### 2. Use Layout's Helper in Child Pages

```typescript
// pages/DashboardPage.tsx
import { AuthLayout } from '../layouts/AuthLayout'
import { analyticsPlugin } from 'auwla'

const analytics = analyticsPlugin('UA-123')

// Use AuthLayout.definePage instead of definePage
export const DashboardPage = AuthLayout.definePage(
  (ctx) => {
    // ✅ TypeScript knows about auth (from layout)
    ctx.auth.user.value
    ctx.auth.login('email', 'pass')
    
    // ✅ TypeScript knows about i18n (from layout)
    ctx.i18n.t('welcome')
    ctx.i18n.setLocale('es')
    
    // ✅ TypeScript knows about analytics (from page)
    ctx.analytics.track('page_view')
    
    return <div>Dashboard</div>
  },
  [analytics] as const
)
```

### 3. Simple Pages Without Extra Plugins

```typescript
// pages/SettingsPage.tsx
import { AuthLayout } from '../layouts/AuthLayout'

// No plugins needed - just use the layout's helper
export const SettingsPage = AuthLayout.definePage(
  (ctx) => {
    // ✅ Has auth and i18n from layout
    return <div>{ctx.auth.user.value?.name}</div>
  }
  // No second parameter needed!
)
```

## Benefits

✅ **Zero Boilerplate** - No manual helper function needed
✅ **Type-Safe** - Full TypeScript autocomplete for layout plugins
✅ **Automatic** - Layout exports the helper automatically
✅ **Composable** - Pages can add their own plugins
✅ **Clean** - Simple, intuitive API

## Comparison

### Before (Manual)

```typescript
// ❌ Developer has to write this helper manually
export function defineAuthPage<P extends readonly Plugin<any>[]>(
  component: (ctx: PageContext<[typeof auth, typeof i18n, ...P]>) => HTMLElement,
  plugins?: P
) {
  const allPlugins = plugins ? [...[auth, i18n], ...plugins] as const : [auth, i18n] as const
  return definePage(component, allPlugins)
}
```

### After (Automatic)

```typescript
// ✅ Layout automatically provides the helper
export const AuthLayout = defineLayout(..., [auth, i18n] as const)

// Use it directly
AuthLayout.definePage((ctx) => { ... })
```

## How It Works

1. `defineLayout` creates the layout component
2. It also creates a `.definePage` helper that merges layout plugins with page plugins
3. The helper is attached to the layout component
4. Child pages use `LayoutName.definePage` for automatic type safety

## Runtime Behavior

- Layout pushes its plugins to the context stack
- Child pages inherit from the stack
- Page-specific plugins are added on top
- Everything works at both compile time (types) and runtime (values)
