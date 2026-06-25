# CSS & Styling

Auwla provides a typed, runtime CSS helper system under `auwla/css`. It is designed to feel like writing plain CSS objects while giving you type-safe values, units, colors, and composition helpers.

```tsx
import { css } from 'auwla/css';

function Button() {
  return () => (
    <button style={css({
      padding: css.px(12),
      background: css.color('#3b82f6'),
      color: css.color('#fff'),
      borderRadius: css.px(8),
    })}>
      Click me
    </button>
  );
}
```

---

## The `css()` call

`css(styleObject)` resolves a style object into a plain `Record<string, string>` that can be passed to the `style` attribute.

```tsx
<div style={css({ padding: css.px(16), display: 'flex' })} />
```

The compiler can statically extract `css()` calls that only contain literal values, turning them into CSS classes at build time. Dynamic values (variables, props) stay as runtime objects.

---

## Typed Units

Avoid concatenating strings manually. Every unit helper returns a typed value.

```tsx
import { px, rem, pct, ms, deg } from 'auwla/css';

css({
  width: px(320),
  fontSize: rem(1.25),
  height: pct(100),
  transitionDuration: ms(200),
  rotate: deg(45),
});
```

Available unit helpers:

| Helper | CSS output |
| :--- | :--- |
| `px(n)` | `16px` |
| `rem(n)` | `1rem` |
| `em(n)` | `1em` |
| `vw(n)` / `vh(n)` | `50vw` |
| `vmin(n)` / `vmax(n)` | `50vmin` |
| `pct(n)` | `50%` |
| `fr(n)` | `1fr` |
| `ch(n)` | `60ch` |
| `ms(n)` / `s(n)` | `200ms` / `0.2s` |
| `deg(n)` / `rad(n)` / `turn(n)` | `45deg` |
| `clamp(min, preferred, max)` | `clamp(...)` |

You can also reach them through the `css` object: `css.px(16)`, `css.rem(1.25)`, etc.

---

## Colors

Create typed colors and manipulate them fluently.

```tsx
import { color } from 'auwla/css';

const primary = color('#3b82f6');

const hover = primary.darken(0.1);
const faded = primary.alpha(0.5);
const contrast = primary.contrast();

const gradient = primary.gradient(color('#1d4ed8'), 135);
```

Use `css.color(...)` or import `color` directly.

---

## Composite Values

Higher-level helpers build common CSS values:

```tsx
import { border, shadow, transform, transition } from 'auwla/css';

css({
  border: border({ color: color('#ccc'), width: px(1), style: 'solid' }),
  boxShadow: shadow({ x: px(0), y: px(4), blur: px(12), spread: px(0), color: color('#000').alpha(0.1) }),
  transform: transform({ scale: 1.05, rotate: deg(5) }),
  transition: transition('all', ms(200), 'ease-out'),
});
```

---

## Layout Descriptors

### Flex

```tsx
css({
  display: 'flex',
  ...css.flex({ direction: 'column', gap: px(16), align: 'center', justify: 'space-between' }),
});
```

### Grid

```tsx
css({
  display: 'grid',
  ...css.grid({ columns: [1, 2, 3], gap: px(16) }),
});
```

---

## Composition

### `css.merge(...styles)`

Shallow-merge multiple style objects. Later objects win on conflict.

```tsx
const combined = css.merge(baseButton, primaryVariant, { width: pct(100) });
```

### `css.extend(base, overrides)`

Semantically the same as `merge`, but signals that `base` is the authoritative style and `overrides` are intentional divergences.

```tsx
const primaryButton = css.extend(baseButton, {
  background: css.color('#3b82f6'),
  color: css.color('#fff'),
});
```

### `css.define(styleObject)`

Name reusable style fragments. At runtime this is an identity function; in the future the compiler will extract these into CSS classes.

```tsx
const card = css.define({
  padding: css.px(16),
  borderRadius: css.px(8),
  background: css.color('#fff'),
  boxShadow: css.shadow({
    x: css.px(0), y: css.px(2), blur: css.px(8),
    spread: css.px(0), color: css.color('#000').alpha(0.08),
  }),
});

function Card() {
  return () => <div style={css(card)}>…</div>;
}
```

Parameterized fragments are also supported:

```tsx
const buttonStyle = css.define((props: { size: 'sm' | 'md' | 'lg' }) => ({
  padding: css.match(props.size, { sm: px(8), md: px(12), lg: px(16) }),
}));

<button style={css(buttonStyle({ size: 'md' }))} />
```

---

## Conditionals

### `css.when(condition, trueStyles, falseStyles?)`

```tsx
const style = css.when(isActive, {
  background: css.color('#3b82f6'),
  color: css.color('#fff'),
}, {
  background: css.color('#fff'),
  color: css.color('#333'),
});
```

### `css.match(value, cases)`

Exhaustive union matching.

```tsx
const size = css.match(variant, {
  sm: px(12),
  md: px(16),
  lg: px(24),
});
```

### `css.mergeWhen(branches)`

Combine multiple independent boolean conditions.

```tsx
const style = css.mergeWhen({
  active: { background: css.color('#3b82f6') },
  disabled: { opacity: 0.5 },
  loading: { cursor: 'wait' },
});
```

---

## Nested Selectors

Use helpers to build nested selector keys for pseudo-classes, children, and media queries.

```tsx
css({
  color: css.color('#333'),
  [css.pseudo('hover')]: {
    color: css.color('#000'),
  },
  [css.children('li')]: {
    marginBottom: css.px(8),
  },
  [css.child('button').hover]: {
    background: css.color('#eee'),
  },
});
```

Responsive helpers:

```tsx
css({
  width: pct(100),
  [css.above(px(768))]: {
    width: pct(50),
  },
});
```

---

## Design Tokens

`auwla/css` ships helpers for generating consistent design tokens:

```tsx
const spacing = css.scale({ base: 4, ratio: 1.5, steps: 8 });
const type = css.typeScale({ base: 16, ratio: 1.25, steps: 6 });
const font = css.fontStack('system-ui', 'sans-serif');
const elevation = css.elevation({ color: css.color('#000'), steps: 5 });
const bounce = css.spring({ stiffness: 500, damping: 30 });
```

---

## Import Styles

You can freely mix `auwla/css` with regular CSS files:

```tsx
import './styles.css';

function App() {
  return () => <div class="app" style={css({ padding: css.px(24) })}>…</div>;
}
```

For static-first extraction, keep an eye on the compiler milestones — `css.define()` and `css()` calls with literal values will become CSS classes automatically.

---

In the next section, we will cover client-side navigation using the [File-Based Router](/docs/router).
