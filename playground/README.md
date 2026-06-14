# Auwla Playground

A minimal fullstack starter using file-based routing, server functions, and `track`.

## Run

```bash
# From the repo root — one dev server handles Vite + RPC
bun run dev

# Production build + server
bun run build
bun run serve
```

## What's inside

- `src/pages/` — file-based routes (client components)
- `src/pages/**/*.server.ts` — server-only functions
- `src/server.ts` — production Bun server (static files + RPC)
- `vite.config.ts` — dev server with built-in RPC middleware

## Notes

- `auwla` is linked locally via `bun link auwla`.
- Generated files (`.auwla/`, `src/auwla.gen.ts`) are created by Vite and ignored.
