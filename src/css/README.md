# Auwla Styling System (`auwla/css`)

The Auwla styling system is a **compiler-driven**, type-safe atomic CSS engine. Rather than writing CSS as raw strings or using runtime CSS-in-JS libraries, styles are written as typed TypeScript expressions. 

The Vite plugin (`auwla/vite`) extracts all static and enumerable style properties at build time into an optimized, deduplicated stylesheet, leaving only dynamic CSS variables for the runtime.

---

## Table of Contents
1. [Core Philosophy](#1-core-philosophy)
2. [Typed Value Primitives](#2-typed-value-primitives)
    - [Lengths & Units](#lengths--units)
    - [Color Manipulations](#color-manipulations)
    - [Composite Values](#composite-values)
    - [Layout Descriptors](#layout-descriptors)
    - [Inline Responsiveness](#inline-responsiveness)
3. [Composition & Defining Styles](#3-composition--defining-styles)
    - [Static Styles](#static-styles)
    - [Parameterized Variant Styles](#parameterized-variant-styles)
    - [Merging & Extending](#merging--extending)
4. [Conditionals](#4-conditionals)
    - [Boolean Branching (`css.when`)](#boolean-branching-csswhen)
    - [Union Discriminant Matching (`css.match`)](#union-discriminant-matching-cssmatch)
5. [Theme & Design Tokens](#5-theme--design-tokens)
    - [Defining Tokens](#defining-tokens)
    - [Consuming Tokens](#consuming-tokens)
    - [Forward References in Token Definitions ("ref")](#forward-references-in-token-definitions-ref)
    - [Understanding Scales (`css.scale` & `css.typeScale`)](#understanding-scales-cssscale--csstypescale)
6. [Nesting & Selectors](#6-nesting--selectors)
    - [Standard String Keys](#standard-string-keys)
    - [Selector Helper Functions](#selector-helper-functions)
7. [Vite Build-Time Compilation](#7-vite-build-time-compilation)

---

## 1. Core Philosophy

1. **CSS values are objects, not strings:** Instead of `'16px'`, you write `css.px(16)`. You can do arithmetic, pass them around, and derive new values.
2. **Styles are expressions, not declarations:** Write styles using the same variables, conditions, and logic as the rest of your component.
3. **No Specificity Battles:** Atomic classes are generated deterministically. Duplicate styles are merged, and conflicts are resolved in declaration order.

---

## 2. Typed Value Primitives

### Lengths & Units

Lengths support type-safe arithmetic. Adding or subtracting different units automatically compiles to a CSS `calc()` expression.

```ts
import { css } from 'auwla/css';

// Base units
const p1 = css.px(16);          // 16px
const r1 = css.rem(1.5);        // 1.5rem
const w1 = css.vw(50);          // 50vw
const h1 = css.vh(10);          // 10vh
const pct = css.pct(100);       // 100%
const fr = css.fr(1);           // 1fr
const ch = css.ch(20);          // 20ch
const zero = css.zero();        // 0

// Arithmetic
const bigger = p1.add(css.px(8));          // 24px
const doubled = p1.multiply(2);            // 32px
const half = p1.divide(2);                 // 8px

// Mixed unit arithmetic (resolves to CSS calc())
const mixed = css.vw(50).subtract(css.px(100)); // calc(50vw - 100px)

// Clamping
const fluid = css.clamp(css.rem(1), css.vw(4), css.px(64)); // clamp(1rem, 4vw, 64px)
```

### Color Manipulations

Colors are parsed at build-time. You can adjust opacity, rotate hue, lighten/darken, mix colors, and generate CSS gradients.

```ts
const blue = css.color('#3b82f6');
const primary = css.color('rgb(59, 130, 246)');

// Transformations (evaluated to static hex colors at build time)
const hoverColor = blue.lighten(0.1);      // #5aa2ff (10% lighter)
const activeColor = blue.darken(0.1);     // #1c66d9 (10% darker)
const semiTrans = blue.alpha(0.5);        // rgba(59, 130, 246, 0.5)

// Color mixing
const purple = blue.mix(css.color('#ef4444'), 0.5); // Mix equal parts blue and red

// Smart Contrast (WCAG accessibility)
const text = blue.contrast();             // Returns #ffffff or #000000 for optimal contrast

// Gradients
const linearGrad = css.gradient(blue, blue.lighten(0.2), 45); // 45deg gradient
const complexGrad = css.gradient({
  angle: 135,
  stops: [
    [blue, 0],
    [blue.alpha(0.5), 50],
    [blue.lighten(0.3), 100]
  ]
});
```

### Composite Values

```ts
// Borders
const thinBorder = css.border({ color: blue, width: 1, style: 'solid' });
const borderNone = css.border.none();

// Outlines
const focusOutline = css.outline({ color: blue, width: 2, style: 'dashed', offset: 2 });

// Shadows
const boxElevation = css.shadow({ x: 0, y: 4, blur: 12, color: css.color.black.alpha(0.1) });
const insetShadow = css.shadow.inset({ x: 0, y: 1, blur: 2 });

// Transitions
const cardTransition = css.transition({
  background: { duration: css.ms(200) },
  transform: { duration: css.ms(300), easing: css.ease('out') }
});

// Transforms
const moveAndScale = css.transform({ translateX: css.px(10), scale: 1.1 });
const rotated = css.transform({ rotate: css.deg(45) });
const combined = moveAndScale.compose(rotated); // Multi-transform composition
```

### Layout Descriptors

Layout descriptors unpack shorthand layout configurations into flat CSS properties at compile time.

```ts
// Flexbox
const flexRow = css.flex({
  direction: 'row',
  wrap: true,
  gap: css.px(16),
  align: 'center',
  justify: 'space-between'
});

// Grid
const gridLayout = css.grid({
  columns: [css.fr(1), css.px(300)],
  rows: [css.auto(), css.fr(1)],
  areas: [
    ['header', 'sidebar'],
    ['main',   'sidebar']
  ],
  gap: css.px(24)
});
```

### Inline Responsiveness

Instead of writing separate media query blocks, any CSS property can accept a responsive object mapping screen size keys (`base`, `sm`, `md`, `lg`, `xl`, `2xl`) directly to their values.

```tsx
export function ResponsiveBox() {
  return () => (
    <div
      style={css({
        padding: {
          base: css.px(8),      // Mobile-first default (width < 640px)
          sm:   css.px(12),     // Small devices (width >= 640px)
          md:   css.px(16),     // Medium devices / Tablets (width >= 768px)
          lg:   css.px(24),     // Large devices / Laptops (width >= 1024px)
          xl:   css.px(32),     // Extra large devices / Desktops (width >= 1280px)
          '2xl': css.px(40)     // Ultra large screens (width >= 1536px)
        },
        flexDirection: {
          base: 'column',       // Stacks vertically by default on mobile
          md: 'row'             // Switches to horizontal layout on tablet and above
        }
      })}
    >
      Responsive layout
    </div>
  );
}
```

#### Breakpoint Breakdown
The compiler maps the keys to the following viewport width ranges:
* **`base`**: Default fallback. Applies from `0px` upwards (no media query wrapper).
* **`sm`**: Applies from `640px` upwards. Optimized for smartphone viewports in landscape or large portrait.
* **`md`**: Applies from `768px` upwards. Optimized for tablet-sized viewports.
* **`lg`**: Applies from `1024px` upwards. Optimized for small laptop monitors or horizontal desktop orientations.
* **`xl`**: Applies from `1280px` upwards. Optimized for standard desktop monitor resolutions.
* **`2xl`**: Applies from `1536px` upwards. Optimized for large high-resolution or widescreen desktop monitors.

#### How it compiles under the hood:
When you compile the `ResponsiveBox` component, the compiler extracts the responsive definitions and outputs:
1. **Static CSS Rules**:
   ```css
   .p_8px { padding: 8px; }
   .flex-dir_column { flex-direction: column; }
   
   @media (min-width: 640px) {
     .sm\:p_12px { padding: 12px; }
   }
   @media (min-width: 768px) {
     .md\:p_16px { padding: 16px; }
     .md\:flex-dir_row { flex-direction: row; }
   }
   @media (min-width: 1024px) {
     .lg\:p_24px { padding: 24px; }
   }
   @media (min-width: 1280px) {
     .xl\:p_32px { padding: 32px; }
   }
   @media (min-width: 1536px) {
     .\32 xl\:p_40px { padding: 40px; }
   }
   ```
2. **Rewritten JSX Component Class Attributes**:
   ```tsx
   className="p_8px flex-dir_column sm:p_12px md:p_16px md:flex-dir_row lg:p_24px xl:p_32px 2xl:p_40px"
   ```

#### Responsive Media Range Helpers

When you need style rules to apply within specific bounds (rather than standard mobile-first `min-width` behavior that inherits upwards), you can define media query range blocks:

* **`css.above(breakpoint)`**: Targets everything above or equal to `breakpoint`. Equivalent to `(min-width: X)`.
* **`css.below(breakpoint)`**: Targets everything below `breakpoint` (automatically subtracts `0.02px`/`0.01rem` to avoid viewport overlap collisions).
* **`css.between(min, max)`**: Targets screen widths between `min` and `max` (subtracting offset on the upper bound).
* **`css.matchBreakpoint(breakpoint)`**: Targets only that specific breakpoint's window (e.g. `css.matchBreakpoint('md')` is exclusively for tablets, compiling to between `md` and `lg`).

```tsx
const styles = css.define({
  // Desktop-only styles
  [css.above('lg')]: {
    maxWidth: css.px(1200)
  },
  // Mobile-only styles
  [css.below('md')]: {
    display: 'none'
  },
  // Tablet-only styles
  [css.matchBreakpoint('md')]: {
    padding: css.px(16)
  },
  // Bound range styles
  [css.between('sm', 'lg')]: {
    backgroundColor: css.color('#f3f4f6')
  }
});
```

---

## 3. Composition & Defining Styles

### Static Styles

Use `css.define` to declare top-level, named style blocks. At runtime, this acts as a typed identity function. The compiler extracts these statically.

```tsx
const baseCard = css.define({
  borderRadius: css.px(8),
  background: css.color('#ffffff'),
  padding: css.px(24),
  border: css.border({ color: css.color('#e5e7eb'), width: 1 })
});

export function Card() {
  return () => <div className={baseCard}>Content</div>;
}
```

### Parameterized Variant Styles

When passed a factory function, `css.define` expects a typed parameter signature. The compiler extracts every possible combination of union parameters (like `'sm' | 'lg'`) into dedicated static CSS classes and generates an optimized runtime lookup map.

```tsx
const buttonStyles = css.define((props: { variant: 'primary' | 'secondary'; size: 'sm' | 'lg' }) => ({
  borderRadius: css.px(4),
  cursor: 'pointer',
  padding: css.match(props.size, {
    sm: '8px',
    lg: '16px'
  }),
  background: css.match(props.variant, {
    primary: '#3b82f6',
    secondary: 'transparent'
  })
}));

export function Button(props: { variant: 'primary' | 'secondary'; size: 'sm' | 'lg' }) {
  // Compiler replaces this call with a fast class lookup
  return () => <button style={buttonStyles({ variant: props.variant, size: props.size })}>Click</button>;
}
```

### Merging & Extending

* **`css.merge(...styles)`**: Combines multiple style objects. Properties from later arguments override earlier ones.
* **`css.extend(base, overrides)`**: Signals design intent where `base` is the foundation and `overrides` are modifications.

```ts
const primaryActive = css.extend(baseButton, {
  background: theme.colors.primary,
  boxShadow: theme.shadows.active
});
```

---

## 4. Conditionals

### Boolean Branching (`css.when`)

Statically compiles boolean branching conditions. If the branches are static, the compiler rewrites the node to a ternary class switcher, bypassing runtime evaluations.

```tsx
export function Alert(props: { active: boolean }) {
  return () => (
    <div
      style={css.when(props.active, {
        true: { background: 'red', color: 'white' },
        false: { background: 'gray', color: 'black' }
      })}
    />
  );
}

// Compiler rewrites style attribute into:
// className={props.active ? "bg_red text_white" : "bg_gray text_black"}
```

### Union Discriminant Matching (`css.match`)

Performs pattern matching on a discriminant value. The compiler maps it to an object key-lookup structure.

```tsx
export function Tag(props: { status: 'success' | 'warning' | 'danger' }) {
  return () => (
    <div
      className={css.match(props.status, {
        success: { background: 'green' },
        warning: { background: 'yellow' },
        danger: { background: 'red' }
      })}
    />
  );
}

// Compiler rewrites className attribute into:
// className={({ "success": "bg_green", "warning": "bg_yellow", "danger": "bg_red" })[props.status]}
```

---

## 5. Theme & Design Tokens

### Defining Tokens
Define design tokens using `css.tokens`. All calculations are evaluated statically at build time.

```ts
export const baseTheme = css.tokens({
  colors: {
    primary: css.color.scale('#3b82f6', {
      50: '#eff6ff',
      500: '#3b82f6',
      900: '#1e3a8a'
    }),
    surface: css.color('#ffffff')
  },
  radius: {
    sm: css.px(4),
    md: css.px(8)
  }
});
```

### Consuming Tokens
Import the returned `theme` object and reference its fields inside any component's `css()` call or `css.define()` style block. The compiler resolves references statically.

```tsx
import { theme } from './theme';
import { css } from 'auwla/css';

export function Button() {
  return () => (
    <button
      style={css({
        padding: theme.spacing.md,
        background: theme.colors.primary[500],
        borderRadius: theme.radius.sm
      })}
    >
      Submit
    </button>
  );
}
```

### Forward References in Token Definitions ("ref")

Because JavaScript evaluates object literals eagerly, referencing a token property within the same `css.tokens` definition will fail at runtime because the `theme` variable is not yet initialized:

```ts
// ❌ This will throw a TDZ error at runtime because theme is undefined:
const theme = css.tokens({
  colors: {
    surface: css.color('#ffffff'),
    text: theme.colors.surface.contrast() // ❌ theme is undefined
  }
});
```

#### How to write references:
To reference a sibling property, define the specific color/spacing block as a local variable first. Then, reference it directly (e.g. `colors.surface`) when defining the tokens:

```ts
// 1. Define the colors block locally
const colors = {
  surface: css.color('#ffffff')
};

// 2. Reference it directly (e.g. colors.surface) inside css.tokens
export const theme = css.tokens({
  colors: {
    ...colors,
    text: colors.surface.contrast() // ✅ Valid reference using local 'colors' variable
  }
});
```

*Note: At build-time, the Auwla CSS compiler automatically performs a topological sort on all token references. This ensures that the generated static CSS compiles in the correct dependency order regardless of how the references are structured in JS/TS.*

### Understanding Scales (`css.scale` & `css.typeScale`)

* **`css.scale(options)`**: Generates a geometric modular scale for spacing, sizing, or layouts.
  * **Formula**: $\text{value} = \text{base} \times (\text{ratio}^{\text{step\_index}})$
  * **Configuration**: Specify the `base`, `ratio`, and a record of named `steps` with their integer step indices.
  ```ts
  const spacing = css.scale({
    base: css.rem(0.25), // 4px base
    ratio: 1.5,          // Growth multiplier
    steps: { sm: 2, md: 3, lg: 4 }
  });
  // Resolves to:
  // spacing.sm = 0.25 * (1.5^2) = 0.5625rem
  // spacing.md = 0.25 * (1.5^3) = 0.84375rem
  // spacing.lg = 0.25 * (1.5^4) = 1.265625rem
  ```

* **`css.typeScale(options)`**: Generates a typography scale using a modular ratio. If `responsive: true`, the typography scale dynamically adjusts font sizes across screen sizes using fluid typography or viewport clamps.
  ```ts
  const typography = css.typeScale({
    base: css.rem(1),
    ratio: 1.25,          // Major Third scale
    responsive: true,     // Enables fluid text sizing
    steps: { body: 0, h2: 3, h1: 5 }
  });
  ```

---

## 6. Nesting & Selectors

Nesting style blocks allows targeting child elements, pseudo-classes, pseudo-elements, or nested media query overrides.

### Standard String Keys

You can write standard CSS pseudo-classes (starting with `:`), pseudo-elements (starting with `::`), nesting combinators (starting with `&`), or media queries directly as normal string keys. The compiler automatically parses and converts these into correct nested CSS rules.

```ts
const buttonStyles = css.define({
  // Pseudo-class
  ':hover': {
    background: '#f3f4f6'
  },
  // Pseudo-element
  '::before': {
    content: '""',
    position: 'absolute'
  },
  // Nesting combinator
  '& > span': {
    fontWeight: 'bold'
  }
});
```

### Selector Helper Functions

Alternatively, if you prefer using typed helper functions or need dynamically computed selectors, you can use:
* **`css.children(selector)`**: Targets direct descendants. Resolves to `& > selector`.
* **`css.pseudo(name)`**: Targets pseudo-classes and elements. Resolves to `&:${name}`.

#### Advanced Chainable Selectors

For highly expressive layouts, use chainable builders:
* **`css.child(selector)`**: Direct child combinator (`& > selector`).
* **`css.descendant(selector)`**: Descendant combinator (`& selector`).
* **`css.sibling(selector)`**: Adjacent sibling combinator (`& + selector`).

Each builder returns a `SelectorBuilder` supporting:
* Getters: `.first`, `.last`, `.hover`, `.active`, `.focus`, `.before`, `.after`.
* Methods: `.pseudo(name)`, `.nth(n)` (supports integers or strings like `'odd'`).

```ts
const listStyles = css.define({
  // Direct child list items
  [css.child('li')]: {
    padding: '8px'
  },
  // Hovering over the first child list item
  [css.child('li').first.hover]: {
    background: '#f3f4f6'
  },
  // Targeting span descendant
  [css.descendant('span')]: {
    fontWeight: 'bold'
  },
  // Targeting adjacent sibling div on focus
  [css.sibling('div').pseudo('focus')]: {
    borderColor: '#3b82f6'
  }
});
```

---

## 7. Vite Build-Time Compilation

At build time, the Vite plugin (`auwla`) performs the following:
1. **Extracts CSS rules**: Resolves design tokens, color manipulations, and arithmetic into plain CSS rules.
2. **Aggregates virtual module**: Serves rules via `virtual:auwla.css` sorted correctly (base classes first, media queries/nested selectors last to respect specificity).
3. **Optimizes output**: Merges extracted classNames with existing inline static or dynamic class strings in TSX templates.
4. **HMR Garbage Collection**: Tracks rules by file and removes old CSS declarations during active development hot reloads.
