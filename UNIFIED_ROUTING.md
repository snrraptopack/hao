# Unified Routing System

This document describes the new unified routing system that consolidates all route management into a single `.routes` folder.

## 🎯 Overview

The unified routing system provides:
- **Single source of truth** for all routes
- **Smart .auwla compilation** - only files marked as pages become routes
- **File-based routing conventions**
- **Automatic route discovery and registration**
- **Clean separation** between manual and generated routes

## 📁 Directory Structure

```
.routes/
├── index.ts              # Unified route registry (single source of truth)
├── manual/               # Hand-written page components
│   ├── home.ts          # HomePage component (/)
│   ├── comments.ts      # CommentsPage component (/comments)
│   ├── products/
│   │   ├── index.ts     # ProductsPage component (/products)
│   │   └── [id].ts      # ProductDetailPage component (/products/:id)
│   └── _404.ts          # 404 page component
├── generated/           # Auto-generated from .auwla files
│   ├── testcomponent.ts # Generated from TestComponent.auwla (/test-component)
│   ├── app.ts           # Generated from App.auwla (/app)
│   └── Button.component.ts # Generated component (not a route)
└── middleware/          # Route guards and middleware
    └── auth.ts          # Authentication guard
```

## 🔄 How .auwla Files Become Routes

The compiler uses smart detection to determine if an `.auwla` file should become a route:

### ✅ Becomes a Route:
1. **Has `@page` directive** at start of line:
   ```typescript
   // @page
   // @title My Page
   export default function MyPage() { ... }
   ```

2. **File name ends with "Page"**:
   - `UserProfilePage.auwla` → `/user-profile`
   - `AboutPage.auwla` → `/about`

3. **File is in a `pages/` subfolder**:
   - `pages/Dashboard.auwla` → `/dashboard`

### 🧩 Becomes a Component:
- **No route indicators** (default behavior)
- Files like `Button.auwla`, `Card.auwla`, `Modal.auwla`
- Generated as `.component.ts` files for reuse

## 🚀 Usage

### Adding a New Manual Route

1. Create the component in `.routes/manual/`:
   ```typescript
   // .routes/manual/about.ts
   export const AboutPage = () => {
     return Component((ui) => {
       ui.Text({ value: "About Us" })
     })
   }
   ```

2. Add to the route registry in `.routes/index.ts`:
   ```typescript
   const manualRoutes: RouteDefinition[] = [
     // ... existing routes
     {
       path: '/about',
       component: AboutPage,
       name: 'about',
       meta: { title: 'About Us' }
     }
   ]
   ```

### Adding a New .auwla Route

1. Create the `.auwla` file with `@page` directive:
   ```typescript
   // template/examples/Dashboard.auwla
   // @page
   // @title Dashboard
   
   export default function Dashboard() {
     return <div>Dashboard Content</div>
   }
   ```

2. Run the route generator:
   ```bash
   cd template/compiler
   bun run test-route-generator.ts
   ```

3. The route is automatically added to the registry!

### Adding a Reusable Component

1. Create the `.auwla` file **without** `@page`:
   ```typescript
   // template/examples/Card.auwla
   // This is a reusable component
   
   export default function Card({ title, content }) {
     return (
       <div class="border rounded p-4">
         <h3>{title}</h3>
         <p>{content}</p>
       </div>
     )
   }
   ```

2. Run the generator - it becomes a `.component.ts` file
3. Import and use in other components

## 🛠️ Route Generation Process

1. **Scan** `.auwla` files in `template/examples/`
2. **Detect** which should be routes vs components
3. **Compile** using the Auwla compiler
4. **Generate** route/component files in `.routes/generated/`
5. **Update** the unified route registry automatically

## 🔧 Configuration

### Route Metadata

Add metadata to routes using directives:

```typescript
// @page
// @title My Page Title
// @description Page description for SEO
// @guard auth  // Require authentication

export default function MyPage() { ... }
```

### Route Guards

Apply guards to routes:

```typescript
{
  path: '/admin',
  component: AdminPage,
  guard: authGuard,  // Imported from middleware/auth.ts
  meta: { requiresAuth: true }
}
```

## 📊 Benefits

### Before (Old System):
- ❌ Routes split between `main.ts` and `src/pages/router.ts`
- ❌ Manual integration required
- ❌ All `.auwla` files became routes
- ❌ Dead code accumulation

### After (Unified System):
- ✅ Single source of truth in `.routes/index.ts`
- ✅ Automatic route discovery and registration
- ✅ Smart component vs route detection
- ✅ Clean separation of concerns
- ✅ Dead code eliminated

## 🚀 Getting Started

The system is already set up and working! To test:

1. **Start the dev server**: `bun run dev`
2. **Visit the home page**: All routes are linked from `/`
3. **Add new routes**: Follow the patterns above
4. **Generate routes**: Run `bun run template:test` to regenerate

## 🔄 Migration Notes

- ✅ Old `src/pages/` directory removed
- ✅ Manual routes moved to `.routes/manual/`
- ✅ Generated routes moved to `.routes/generated/`
- ✅ `main.ts` simplified to just router setup
- ✅ All existing functionality preserved

The unified routing system is now the single way to manage routes in the application!