# Chapter 20 — Build & Deploy

Ship your app using the provided build scripts. Preview locally and deploy to static hosting.

## Build
```bash
npm run build:app
# Outputs to dist-app/
```

## Preview
```bash
npm run preview:app
# Opens a local server serving dist-app/
```

## Deploy
- Static hosting: upload `dist-app/` to any static host (Netlify, Vercel, S3, Nginx).
- Ensure SPA fallback to `index.html` for client-side routing.

## Asset Considerations
- Keep external API endpoints and environment variables configurable.
- Consider cache busting via build output naming.

## Exercise
- Build and preview locally.
- Deploy to a static host, confirm routes work (including deep links).

## Checklist
- [ ] You built the app.
- [ ] You previewed the output.
- [ ] You deployed and confirmed routing.