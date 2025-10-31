# 007 — JSX Typing and Runtime Refinement (Option C)

Status: pending review

## Overview

This change focuses on typed JSX refinement without altering runtime behavior. It strengthens intrinsic element prop typing, formalizes event handler types, and adds light typing to the JSX factory so developers get accurate IntelliSense and compile‑time feedback in plain TypeScript projects.

## Why

- Improve developer experience with explicit prop types and event handler signatures.
- Prevent common mistakes (e.g., KeyboardEvent passed to onClick).
- Keep the JSX DSL familiar while enabling Reactive<T> binding across props and children.
- Provide a broad set of intrinsic elements so usage in app and website docs is fully typed.

## Key Changes

1) Stronger base props and children typing
- `BaseProps<E extends HTMLElement>` is now a type alias built from intersections; avoids invalid interface intersections (fixes ts(1109): “Expression expected”).
- `Children` typing simplified to avoid circular alias patterns.
- Standardized `key?: string | number` and `ref?: (el: E) => void` across intrinsic elements.

2) Event handler types
- Added a comprehensive `EventProps` surface (Mouse/Keyboard/Focus/Input/Change/Form/Pointer/Touch) so common handlers are correctly typed.
- Example: `onClick: (e: MouseEvent) => void`, `onKeydown: (e: KeyboardEvent) => void`, `onInput: (e: InputEvent) => void`.

3) JSX factory overloads
- `h()` overloads added to consume `JSX.IntrinsicElements[K]` and provide typed component props.
- Generic tag constrained via `IntrinsicTagName = keyof JSX.IntrinsicElements & keyof HTMLElementTagNameMap` to fix ts(2536): “Type 'K' cannot be used to index type 'IntrinsicElements'”.

4) Extended intrinsic coverage
- Broadened `JSX.IntrinsicElements` (in both `auwla-jsx.d.ts` and `src/jsx-runtime.d.ts`) to include:
  - Headings & text: h1–h6, pre, code, blockquote, small, strong, em, i, b, u, s, sup, sub
  - Lists: ul, ol, dl, dt, dd, li
  - Structure: section, article, aside, header, footer, nav, main, figure, figcaption, details, summary, dialog, label
  - Forms: a, button, input, textarea, select, option, form, fieldset, legend
  - Media/embedded: img, audio, video, source, track, canvas, iframe
  - Tables: table, thead, tbody, tfoot, tr, th, td, col, colgroup
  - Misc: hr, br, address, time, progress, meter, template

## Files Touched

- `auwla-jsx.d.ts`: BaseProps alias; EventProps; Children; IntrinsicElements expansions.
- `src/jsx-runtime.d.ts`: Mirrored the IntrinsicElements expansions and base typing.
- `src/jsx.ts`: Overloads for `h()` and IntrinsicTagName constraint to align with IntrinsicElements.

## Tests & Docs

- `tests/jsx-typing.test.ts`: Annotated intentionally invalid lines with `@ts-expect-error` (e.g., className: number, onClick with KeyboardEvent, checked: string, href: number, value: object) to assert type enforcement.
- `tests/jsx-events.test.ts`: Validates runtime and typed event dispatch (MouseEvent, KeyboardEvent, InputEvent) and ref callback typing.
- `docs/05-jsx-guide.md`: Examples reflect typed events, reactive props, and ref typing.

## Runtime Behavior

- No changes to runtime logic. Event binding is still generic: any prop matching `/^on[A-Z]/` lowers to an addEventListener for the derived name (e.g., onClick → click).
- Class/style/id and common input attributes retain existing behavior with added reactive binding support.

## Compatibility Notes

- `SubmitEvent`: Some DOM shims model it as `Event`. If you encounter type mismatch in older environments, you can widen to `(e: Event)` temporarily.
- Editor cache: If you see stale type errors, restart your TypeScript server (TS Server) or reload the workspace.

## Guidance

- Mouse vs Keyboard: Use `onClick` for mouse interactions and `onKeydown/onKeyup` for keyboard. If you want a single handler, type it as `(e: Event)` and narrow via `instanceof` at runtime.
- Reactive props: Prefer `Ref<T>` for attributes you expect to change. Primitive values are set once; refs auto‑update.
- Children: Text/Node or `Ref` to either. Arrays supported.

## Next Steps (Proposed)

- SVG intrinsic typing pass (common elements and attributes, typed as `SVGElement`).
- Expand attribute coverage for anchors (download, referrerPolicy), inputs (pattern, accept, autofocus, autocomplete), and more.
- Component prop generics for typed factories beyond HTMLElement returns.

## Review Checklist

- [ ] IntrinsicElements coverage meets current app and docs usage.
- [ ] Event handler typing aligns with runtime binding strategy.
- [ ] Tests pass and assertions reflect intended strictness.
- [ ] No runtime regressions or behavior changes.