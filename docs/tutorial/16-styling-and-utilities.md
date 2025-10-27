# Chapter 16 — Styling & Utility Classes

Use small, composable classes for spacing, typography, and layout. Keep visual logic in markup, not in JS.

## Common Classes
- `space-y-4` — vertical spacing between children
- `text-xl font-semibold` — headings
- `rounded border bg-white p-3` — cards
- `flex items-center gap-3` — toolbar layouts

## Example
```tsx
function Panel(): HTMLElement {
  return (
    <div class="space-y-4">
      <h2 class="text-xl font-semibold">Panel</h2>
      <div class="p-3 rounded border bg-white">
        Content goes here
      </div>
    </div>
  )
}
```

## Tips
- Prefer semantic HTML (`<h1>`, `<p>`, `<ul>`) with utility classes.
- Keep class names declarative; avoid toggling classes in JS unless necessary.

## Exercise
- Restyle an existing page using the utility class approach.
- Create a reusable `Card` component with sane defaults.

## Checklist
- [ ] You used utility classes to compose layouts.
- [ ] You kept styling out of JS logic.
- [ ] You introduced small visual components (Card, Panel).