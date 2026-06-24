# Auwla Playground

A minimal fullstack starter using file-based routing, server functions, and `track`.

## Run

```bash
# Development — Vite + RPC handled by the Auwla plugin
bun run dev

# Production build (client + server)
bun run build

# Production server
bun run serve
```

> These commands run from the playground's own `package.json`. If you are in the repo root, the same script names are available via workspace scripts.

## What's inside

- `src/pages/` — file-based routes (client components)
- `src/pages/**/*.server.ts` — server-only functions
- `src/server.ts` — production Bun server (static files + RPC)
- `vite.config.ts` — dev server with built-in RPC middleware

## Notes

- `auwla` is linked locally via `bun link auwla`.
- Generated files (`.auwla/`, `src/auwla.gen.ts`) are created by Vite and ignored.
