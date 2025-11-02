# Installation

Use the starter to scaffold a minimal project quickly.

## Quick Start (npm create)
<code-block lang="javascript">npm create auwla@latest . </code-block>
The command will prompt for a directory and create a minimal setup with Vite.

## Template Structure (minimal)
<code-block lang="javascript">
    .
    ├── index.html
    ├── package.json
    ├── src/
    │   ├── global.d.ts
    │   ├── main.tsx
    │   └── routes.tsx
    ├── tsconfig.json
    └── vite.config.ts
</code-block>

## What's Included

- **index.html**: Entry point for your application
- **package.json**: Project dependencies and scripts (`npm run dev`, `npm run build`)
- **src/main.tsx**: Application bootstrap file
- **src/routes.tsx**: Routing configuration for your pages
- **src/global.d.ts**: Global TypeScript type definitions
- **vite.config.ts**: Vite build configuration
- **tsconfig.json**: TypeScript compiler options

## Getting Started

1. Run `npm install` to install dependencies
2. Run `npm run dev` to start the development server
3. Open `http://localhost:5173` in your browser
4. Begin editing files in the `src/` directory—changes will hot-reload automatically

## Next Steps

After your dev server is running, explore the `routes.tsx` file to understand how routing works, then start building your components in the `src/` directory.