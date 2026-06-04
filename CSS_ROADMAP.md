# CSS Roadmap — Auwla Styling System

This is the incremental plan for building the CSS system described in `note.txt`.

The system is **compiler-driven**. The Vite plugin (`auwla/vite`) is the production
path — it scans all component and style files at build time, resolves theme tokens to
concrete values, extracts static styles into CSS classes, and leaves only genuinely
dynamic branches for a minimal runtime. Milestones 1–3 prove the API is correct before
the compiler is written. Nothing in those milestones should contradict what the compiler
will eventually do.

> **Rule:** Each milestone must be usable in real examples before moving to the next.
> No compiler work until Milestone 4.

---

## Milestone 1 — Typed Value Primitives (Runtime)

**Goal:** You can write `css({ padding: css.px(16) })` and get a plain style object
that works as a `style={}` prop today. The API shape is final — this is exactly what
the Vite plugin will scan and extract later.

**Deliverables:**
- `src/css/units.ts` — `px()`, `rem()`, `vw()`, `vh()`, `pct()`, `fr()`, `ms()`, `deg()`
- `src/css/color.ts` — `color()`, `lighten()`, `darken()`, `alpha()`, `mix()`, `contrast()`, `gradient()`
- `src/css/values.ts` — `border()`, `shadow()`, `transform()`, `transition()`, `grid()`, `flex()`
- `src/css/css.ts` — `css({...})` entry point; returns a `CSSProperties`-compatible object
- `src/css/compose.ts` — `merge()`, `extend()`, `css.define({...})` for shallow style composition and same-file named fragments

**Note on `css.define({...})` — same-file composability:**

`css.define()` with a static style object ships here alongside `merge()` and `extend()`.
At runtime it is nothing more than an identity function — it takes a style object and
returns it typed. The value is ergonomic: you can name and reuse style fragments at the
top of a component file without reaching for a separate `.styles.ts` file or cramming
everything into JSX. The API is identical to what the compiler will target in Milestone 5,
so there is zero migration cost when extraction arrives.

```ts
// top of button.tsx — no separate file needed yet
const base = css.define({
  borderRadius: css.px(4),
  cursor: 'pointer',
  border: css.border.none()
})

const primary = css.define({
  background: css.color('#3b82f6'),
  color: css.color('#fff')
})

return () => (
  <button style={css.merge(base, primary)}>Click</button>
)
```

**Out of scope:**
- No compiler extraction
- No theming
- No responsive breakpoints
- No pseudo-class or selector support
- No parameterized `css.define((props) => ...)` yet — that requires `css.match()` first

**Done when:** One existing example is rewritten using `css()` with typed value primitives
and produces correct inline styles.

---

## Milestone 2 — Conditionals (Runtime)

**Goal:** `css.match()` and `css.when()` work as pure functions that return a resolved
style object. No hook, no subscription, no reactive system — just functions the compiler
will later be able to statically enumerate.

**Deliverables:**
- `css.when({ [condition]: style, default: style })` — boolean branching
- `css.match(value, cases)` — union narrowing with TypeScript exhaustiveness checking
- `css.define((props: T) => styleObject)` — parameterized style fragments; the function
  form ships here because `css.match()` is its natural building block

**Note on parameterized `css.define()`:**

At runtime the function is called with the props object and returns a plain style object.
The compiler upgrade (Milestone 5) will enumerate every combination of the prop type
union and emit a static CSS class for each — but the call site never changes.

```ts
// same file as the component, no .styles.ts needed yet
const cardStyle = css.define((props: { elevated: boolean; size: 'sm' | 'md' | 'lg' }) => ({
  borderRadius: css.px(8),
  boxShadow: css.match(props.elevated, {
    true:  css.shadow({ y: 4, blur: 12, color: css.color.black.alpha(0.1) }),
    false: css.shadow({ y: 0, blur: 0,  color: css.color.black.alpha(0) })
  }),
  padding: css.match(props.size, {
    sm: css.px(8),
    md: css.px(16),
    lg: css.px(24)
  })
}))

return () => (
  <div style={cardStyle({ elevated: true, size: 'md' })}>{children}</div>
)
```

**How interactivity works at this stage:**

State (hover, focus, active) is managed as plain component variables. The component
re-renders when state changes, `css.when()` is called again, and a new plain object is
returned. No special hook is needed — this is the same pattern `note.txt` describes
for inline styles:

```tsx
function Button({ variant, disabled }) {
  let hovered = false;

  return () => (
    <button
      style={css({
        opacity: css.when({ [disabled]: 0.5, default: 1 }),
        cursor: css.when({ [disabled]: 'not-allowed', default: 'pointer' })
      })}
      onMouseEnter={() => { hovered = true; }}
      onMouseLeave={() => { hovered = false; }}
    >
      {variant}
    </button>
  );
}
```

When the compiler arrives (Milestone 4), it sees `css.when()` calls, enumerates the
branches, and emits one CSS class per branch. The runtime then switches classes instead
of recomputing styles.

**Out of scope:**
- No breakpoint matching yet
- No pseudo-class extraction (still event-driven)

**Done when:** A component with 3+ interactive states works using `css.when()` and
`css.match()` with no manual style string construction.

---

## Milestone 3 — Theme & Tokens (Runtime)

**Goal:** Centralized design tokens. Components read from a shared theme object instead
of hardcoded values. Token values are typed value primitives from Milestone 1 — they
compose and do arithmetic the same way.

**Deliverables:**
- `css.tokens({ colors, spacing, radius, shadows, typography, motion })` — token definition
- `css.scale({ base, ratio, steps })` — geometric spacing/type scales
- `css.typeScale({ base, ratio, steps, responsive })` — typography scale
- `css.fontStack([...])` — typed font-family value
- `css.elevation({ base, levels })` — shadow scale
- `useTheme()` accessor (or module-level export if simpler at this stage)
- Token arithmetic: `theme.spacing.md.add(css.px(4))`
- Color scales: `theme.colors.primary[500]`, `color.group({ base, hover, active, disabled })`

**Out of scope:**
- No CSS custom property emission yet
- No dark mode toggle optimization (that comes with the compiler)

**Done when:** All examples use a shared theme instead of hardcoded values. The theme
object itself is a valid extraction target — the compiler will resolve all token
references to concrete values at build time.

---

## Milestone 4 — Vite Plugin / Compiler

**Goal:** The Vite plugin scans all component and style files, extracts static styles
into a CSS file, and shrinks the runtime to class-switching only.

This is the point where the system becomes production-grade. Milestones 1–3 are
scaffolding; this milestone is where the architecture pays off.

**Prerequisites:**
- Router build step stabilized (shares the same Vite plugin infrastructure)
- Milestones 1–3 API is frozen enough to target

**Deliverables:**
- `auwla/vite` plugin entry — hooks into Vite's transform and bundle pipeline
- File scanner — walks all `.ts`, `.tsx`, and `.styles.ts` files in the project
- AST walker — finds `css({...})`, `css.define({...})`, and `css.tokens({...})` calls
- Static resolver — evaluates theme token references, unit arithmetic, color operations
  at build time; emits concrete values
- CSS emitter — generates stable-hash class names, writes a virtual CSS module
- Runtime shim — receives only the dynamic branches; boolean conditions become
  `condition ? classA : classB`; truly dynamic values become CSS custom properties

**What resolves at build time:**
- All theme token references → concrete hex / px / rem values
- All unit arithmetic → resolved CSS values
- All color operations (`.lighten()`, `.alpha()`, `.contrast()`) → concrete color strings
- All static `css.define({...})` objects

**What stays at runtime:**
- `css.when()` with boolean conditions → class switching between pre-emitted classes
- Truly dynamic values (user-input dimensions, JS-computed sizes) → inline `style` or
  CSS custom properties set by a minimal JS setter

**What the developer never sees:**
- Class name generation or collision
- Vendor prefixes
- Specificity management
- Dead CSS — only styles reachable from the component tree are emitted

**Done when:** Bundle size and initial render are measurably better than Milestone 3
runtime-only baseline.

---

## Milestone 5 — Cross-file Extraction (Compiler Upgrade)

**Goal:** The compiler learns to cross file boundaries. `css.define()` calls inside
`.styles.ts` files are fully extracted at build time — zero runtime style computation
for any component that imports them.

The `css.define()` API is unchanged from Milestones 1 and 2. This milestone is purely
a compiler upgrade: the Vite plugin gains the ability to scan imported style files,
enumerate every prop type union combination, and emit one static CSS class per
combination. The runtime replaces function calls with a pre-built class lookup.

**Compiler additions:**
- Extend the file scanner to follow import chains into `.styles.ts` files
- Enumerate prop type union combinations from `css.define((props: T) => ...)` type signatures
- Emit one CSS class per combination into the virtual CSS module
- Replace each call site with a lookup: `cardStyle({ elevated: true, size: 'md' })`
  → `classMap['elevated=true|size=md']`
- Runtime lookup table: `Record<string, string>` keyed by serialized prop combination

**Example — before (Milestone 2 runtime behaviour):**
```ts
// button.styles.ts — same file the developer already wrote in M2
export const buttonStyles = css.define((props: { variant: 'primary' | 'secondary' }) => ({
  root: {
    background: css.match(props.variant, {
      primary:   theme.colors.primary,
      secondary: 'transparent'
    })
  }
}))
```

**After (Milestone 5 compiler output):**
```css
/* emitted by the Vite plugin — developer never writes this */
.ax1 { background: #3b82f6; } /* variant=primary  */
.ax2 { background: transparent; } /* variant=secondary */
```
```tsx
// button.tsx — call site is identical, compiler rewrites the import
import { buttonStyles } from './button.styles'

return () => (
  <button class={buttonStyles.root({ variant })}>
    {children}
  </button>
)
```

**Done when:** A component imports styles from a `.styles.ts` file, the bundle contains
no style computation code for that component, and class names are stable across rebuilds.

---

## Milestone 6 — Advanced Features (Post-Compiler)

**Goal:** Everything remaining in `note.txt` that is not yet implemented.

**In any order:**
- **Responsive:** `css.matchBreakpoint()`, `css.above()`, `css.below()`, container queries via `css.matchContainer()`
- **Pseudo-classes & selectors:** `css.pseudo()`, `css.children()`, `css.child()`, `css.descendant()`, nested selectors (requires compiler — runtime cannot emit CSS rules)
- **Animations:** `css.animation()`, `css.spring()`, `css.stagger()`, `css.scrollTimeline()`, `css.tween()`
- **User preferences:** `css.matchPreference()` for `prefers-color-scheme`, `prefers-reduced-motion`
- **Typography utilities:** `css.typeScale()`, `css.fontStack()` (token definitions from M3 get their compiler extraction here)

**Done when:** `note.txt` spec is fully implemented and documented.

---

## Current Status

| Milestone | Status |
|---|---|
| 1. Typed Primitives | **Not started** — ready to scaffold |
| 2. Conditionals | Not started |
| 3. Theme & Tokens | Not started |
| 4. Vite Plugin / Compiler | **Blocked** — wait for router stabilization |
| 5. Cross-file Extraction | **Blocked** — depends on compiler |
| 6. Advanced Features | Not started |

---

## Decision Log

| Decision | Rationale |
|---|---|
| Compiler-first architecture | The Vite plugin is the production path, not an optimization. Milestones 1–3 are API scaffolding only |
| `css({...})` returns plain objects initially | Works with existing `style={}` prop today; the API shape is already the compiler's extraction surface |
| No `useStyles()` hook | The system is compiler-driven. Reactivity comes from class-switching between pre-emitted classes, not a hook lifecycle. A hook would imply a runtime reactive system — that is a different and incompatible architecture |
| `css.when()` / `css.match()` are pure functions | They return a resolved style object in runtime mode. The compiler enumerates their branches statically. No subscription or invalidation needed |
| `css.define()` ships in Milestone 1 & 2, not 5 | The API is identical in both lives — runtime returns a plain object, compiler extracts classes. Shipping early means composability without forcing everything into JSX, with zero migration cost when the compiler arrives |
| Milestone 5 is a compiler upgrade, not a new API | `css.define()` already exists. M5 only adds cross-file scanning and static class enumeration to what the compiler already does with same-file usages |
| No pseudo-class support until compiler | Runtime cannot emit CSS rules; event handlers are the workaround in Milestones 1–3 |
| Animations last | Largest surface area; depends on all other primitives and the compiler being in place |
