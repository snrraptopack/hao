# CSS System Fix Plan

## Overview
Systematic fix of all 19 issues identified in the `src/css/` codebase. Phased by risk, dependency, and user impact.

---

## Phase 1: Critical Runtime Bugs (Week 1)
> **Goal:** Fix correctness bugs that silently produce wrong CSS at runtime.

### 1.1 Fix `serializeValue()` misidentifying nested StyleObjects
**File:** `src/css/serialize.ts:113-129`
**Problem:** Any plain object without `_tag` is treated as a `ResponsiveValue`, so `css.when()` inside `:hover` flattens to a string.
**Fix:** Add a `ResponsiveValue` symbol tag. Check for it explicitly instead of duck-typing on object shape.
**Test:** Add test: `css.when(true, {true:{background:'blue'}})` nested inside `:hover` preserves structure.

### 1.2 Fix `css.when()` runtime `default` branch support
**File:** `src/css/conditionals.ts:84-90`
**Problem:** Runtime `when()` ignores `default`; compiler evaluator supports it. Mismatch means compiled code behaves differently from dev.
**Fix:** Add `default` fallback in runtime `when()` after checking `true`/`false`.
**Test:** Add test: `when(false, { true: A, default: B })` returns B.

### 1.3 Fix `ensureContrast()` binary search direction
**File:** `src/css/color.ts:280-309`
**Problem:** When light color fails contrast, search goes lighter (wrong). When dark color fails, search goes darker (wrong).
**Fix:** Swap `lo`/`hi` assignments in the "not met" branch.
**Test:** Add test: `ensureContrast('#ffffff', 4.5)` against light fg returns a darker color.

### 1.4 Fix `color.mix()` circular hue interpolation
**File:** `src/css/color.ts:253-263`
**Problem:** Mixing 350° and 10° gives 180° instead of 0°.
**Fix:** Implement circular lerp: if delta > 180°, subtract 360° from one angle before interpolating.
**Test:** Add test: `color('oklch(0.5 0.2 350)').mix(color('oklch(0.5 0.2 10)'), 0.5)` returns hue ~0°.

---

## Phase 2: Shared Utilities & Deduplication (Week 1-2)
> **Goal:** Eliminate 300+ lines of duplication. Runtime and compiler must share logic.

### 2.1 Extract `computeSpring()` to shared module
**Files:** `src/css/tokens.ts`, `src/css/compiler/evaluator.ts`
**Fix:** Move `computeSpring()` to `src/css/shared/spring.ts`. Import from both runtime and evaluator.
**Risk:** None. Pure function, no side effects.

### 2.2 Create shared breakpoint parsing
**Files:** `src/css/compose.ts`, `src/css/compiler/evaluator.ts`
**Fix:** Create `src/css/shared/breakpoints.ts` with `parseBreakpoint(value)`, `above(bp)`, `below(bp)`, `between(a, b)`. Export from both runtime and evaluator.
**Risk:** None. Pure functions.

### 2.3 Unify length-formatting functions
**Files:** `src/css/layout.ts`, `src/css/values.ts`, `src/css/compiler/evaluator.ts`
**Fix:** Create `src/css/shared/length.ts` with canonical `formatLength(value, fallback?)`. Replace `formatLength()`, `toLength()`, `parseLength()` callers.
**Risk:** Low. Need to verify evaluator still produces identical output.

### 2.4 Extract shared color evaluation helpers
**Files:** `src/css/color.ts`, `src/css/compiler/evaluator.ts`
**Fix:** Move evaluator's color method dispatch (`lighten`, `darken`, `alpha`, etc.) to call into a shared function that works with plain objects. OR: make `ColorImpl` serializable to a plain object that the evaluator can reconstruct.
**Risk:** Medium. Color API is large; need to ensure evaluator parity.

---

## Phase 3: Compiler/Runtime Consistency (Week 2)
> **Goal:** Ensure build-time extraction matches runtime behavior exactly.

### 3.1 Add `css.mergeWhen()` compiler support
**File:** `src/css/compiler/evaluator.ts`
**Problem:** `mergeWhen` falls back to runtime, defeating atomic CSS extraction.
**Fix:** Add `css.mergeWhen` case in evaluator function dispatch, same pattern as `css.when`/`css.match`.
**Test:** Add compiler test: `css.mergeWhen(...)` inside `style={...}` extracts classes.

### 3.2 Fix `css.outline()` evaluator structure
**File:** `src/css/compiler/evaluator.ts:667-682`
**Problem:** Evaluator returns flat object without `_tag`; runtime returns structured object with `toString()`.
**Fix:** Match runtime structure exactly. If runtime uses a special tag, evaluator must too.
**Test:** Add compiler test for `css.outline()` extraction.

### 3.3 Fix `border.none()` evaluator path
**File:** `src/css/compiler/evaluator.ts:447-455`
**Problem:** Special-cased shortcut doesn't match `border({ style: 'none' })` behavior.
**Fix:** Make `border.none` call the generic `border()` handler with `style: 'none'`.
**Test:** Add compiler test for both `border.none` and `border({ style: 'none' })`.

### 3.4 Fix nested `css.when` inside `css({...})` compilation
**File:** `src/css/compiler/replacer.ts`
**Problem:** When `css.when()` is nested inside `css({ background: css.when(...) })`, the generic `css()` handler sees a dynamic property and strips the wrapper.
**Fix:** In `replacer.ts`, when processing `css(...)` arguments, detect nested `css.when`/`css.match` calls and pre-evaluate their static branches before deciding `isStatic`. OR: modify `evalNode` to recognize `css.when` calls and evaluate them even when the condition is a dynamic variable (returning both branches as static alternatives).
**Risk:** Medium. Requires careful handling of ternary class generation.
**Test:** Add compiler test: `style={css({ background: css.when(props.active, {true:'blue',false:'red'}) })}` generates two atomic classes with a ternary expression.

---

## Phase 4: Type Safety & API Improvements (Week 3)
> **Goal:** Fix TypeScript DX issues without breaking existing code.

### 4.1 Fix `StyleObject` index signature
**File:** `src/css/types.ts:437-439`
**Problem:** `[key: string]: any` defeats all carefully typed properties.
**Fix:** Remove the broad index signature. If dynamic keys are needed, use `& Record<string, any>` at call sites or provide a separate `LooseStyleObject` type.
**Risk:** Medium. May break user code that relies on arbitrary keys. Should be done with a deprecation or separate type first.

### 4.2 Fix `DxShorthands` pseudo-class/breakpoint types
**File:** `src/css/types.ts:382-403`
**Problem:** `hover?: any`, `sm?: any`, etc. allow invalid values.
**Fix:** Change to `hover?: StyleObject | undefined`, etc.
**Risk:** Low. Catches bugs, unlikely to break valid code.

### 4.3 Fix `isResponsiveObject()` magic `base` key
**File:** `src/css/dx.ts:65-73`
**Problem:** Object with `base` property is treated as responsive, breaking legitimate style objects.
**Fix:** Add `ResponsiveValue` symbol tag (from 1.1). Check for the tag instead of `base` key. Keep `base` as a secondary heuristic ONLY if all keys are known breakpoints.
**Risk:** Low. Fixes a collision bug.

### 4.4 Document `merge()` shallow behavior
**File:** `src/css/compose.ts:41-43`
**Problem:** Nested pseudo-objects overwrite instead of merging, which is surprising.
**Fix:** Document the behavior explicitly in JSDoc. Optionally add a `deepMerge()` variant for nested selectors if needed.
**Risk:** None. Documentation + optional new API.

### 4.5 Fix `SelectorBuilder` type honesty
**File:** `src/css/compose.ts:158-200`
**Problem:** Claims to be `string & {...}` but is a class instance.
**Fix:** Change type to an interface with `[Symbol.toPrimitive]` and `toString()`. Or change runtime to return a primitive string with attached methods via `Object.setPrototypeOf` (risky). Safer: just make the type honest (`class SelectorBuilderImpl` with string coercion methods).
**Risk:** Low. Type-only change if done carefully.

---

## Phase 5: Polish & Tests (Week 3)
> **Goal:** Minor fixes and test hygiene.

### 5.1 Fix `className` regex lookbehind
**File:** `src/css/compiler/class-names.ts:158-160`
**Problem:** `(?<!` negative lookbehind is fine at build time (Node) but fragile.
**Fix:** Replace with explicit string split logic or a simpler regex that doesn't use lookbehind.
**Risk:** None. Build-time only.

### 5.2 Fix HMR test file mutation safety
**File:** `tests/css/vite-plugin-css.test.ts:189-232`
**Problem:** Killed process leaves `mock-theme.ts` corrupted.
**Fix:** Use a temp file copy for HMR tests, or use `vitest`'s `fs` mocking.
**Risk:** None. Test-only change.

---

## Dependency Graph

```
Phase 1 (Runtime Bugs)
  ├── 1.1 ResponsiveValue tag ─────┐
  ├── 1.2 when() default           │
  ├── 1.3 ensureContrast fix       │
  └── 1.4 mix() hue fix            │
                                    │
Phase 2 (Shared Utils)              │
  ├── 2.1 computeSpring ───────────┤
  ├── 2.2 breakpoints ─────────────┤
  ├── 2.3 length format ───────────┤
  └── 2.4 color eval ──────────────┤
                                    │
Phase 3 (Compiler Consistency)      │
  ├── 3.1 mergeWhen eval ◄─────────┤ (needs 1.1 tag)
  ├── 3.2 outline eval             │
  ├── 3.3 border.none eval         │
  └── 3.4 nested when ◄────────────┘ (needs 1.1 tag, 1.2 default)

Phase 4 (Types & API)
  ├── 4.1 StyleObject index
  ├── 4.2 DxShorthands types
  ├── 4.3 isResponsiveObject ◄───── (needs 1.1 tag)
  ├── 4.4 merge() docs
  └── 4.5 SelectorBuilder type

Phase 5 (Polish)
  ├── 5.1 Regex compat
  └── 5.2 Test safety
```

---

## Estimated Effort

| Phase | Issues | Est. Time | Risk |
|---|---|---|---|
| 1 | 4 | 1 day | Low |
| 2 | 4 | 2-3 days | Medium (refactoring) |
| 3 | 4 | 2-3 days | Medium (compiler AST) |
| 4 | 5 | 1-2 days | Low-Medium |
| 5 | 2 | 0.5 day | None |
| **Total** | **19** | **~1 week** | |

---

## Success Criteria

- [ ] All 231 existing tests still pass
- [ ] New tests added for each bug fix (target: 250+ tests)
- [ ] Compiler and evaluator behavior match for `when`, `match`, `mergeWhen`, `outline`, `border`
- [ ] No `computeSpring` / breakpoint / length formatting duplication remains
- [ ] `ensureContrast` passes WCAG 2.1 AA for all seed colors
- [ ] No `[key: string]: any` on `StyleObject` (or explicit `LooseStyleObject` provided)
