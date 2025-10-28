# create-auwla

Zero-dependency initializer for Auwla apps.

## Usage

- Quick scaffold:
  - `npm create auwla@latest my-app`
  - or `npx create-auwla my-app`

- Options:
  - `--template minimal` (default)
  - `--dir <target-dir>`

## What you get

- Vite + TypeScript configured for Auwla’s JSX runtime.
- Routing-ready starter with `src/routes.tsx` and `Router` setup in `src/main.tsx`.
- `Link` component in a shared layout for simple navigation.

## Next steps

```bash
cd my-app
npm install
npm run dev
```

Start editing `src/routes.tsx` to add pages and layouts.