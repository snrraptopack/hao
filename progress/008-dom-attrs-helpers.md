# 008 — Shared DOM attribute helpers (dom-attrs)

Status: Completed

Summary
- Introduced src/dom-attrs.ts to centralize DOM attribute and style handling used by both the JSX runtime and the DSL (LayoutBuilder).
- Removed duplicated logic from src/jsx.ts and src/dsl.ts and refactored them to consume the shared helpers.
- This ensures consistent behavior, reduces code duplication, and makes future enhancements to attribute handling straightforward.

Motivation
- Prior to this change, className token diffing, style object application, and attribute setting logic lived in multiple places (JSX runtime and DSL). The duplication made maintenance error-prone and led to subtle inconsistencies.
- Centralizing these into a single module improves reliability and makes it easier to evolve attribute handling uniformly.

What’s included
- src/dom-attrs.ts exports the following helpers:
  - CLASS_TOKENS: a per-element symbol-based store of class tokens managed by the runtime.
  - tokenizeClass(str): splits a className string into tokens.
  - applyClassTokens(el, nextStr): diffs class tokens and updates el.classList accordingly.
  - setStyleObject(el, styleObj): applies a Partial<CSSStyleDeclaration> object onto el.style.
  - applyStyle(el, style): applies either a string style (via setAttribute) or a style object (via setStyleObject).
  - setAttr(el, key, value): sets/remove attributes, preferring the DOM property when available.

Refactors
- src/jsx.ts and src/dsl.ts now import and use applyClassTokens, tokenizeClass, CLASS_TOKENS, applyStyle, setStyleObject, and setAttr for all attribute handling paths.
- Behavior remains the same from the perspective of user code, but the logic is centralized.

Usage examples

JSX runtime
```tsx
import { h } from './jsx';

const view = () =>
  h('div', {
    className: 'card highlighted',
    style: { backgroundColor: 'papayawhip', padding: '8px' },
    id: 'demo',
  }, 'Hello');
```

DSL (LayoutBuilder)
```ts
import { Column } from './dsl';

const el = Column(ui => {
  ui.Div({
    className: 'card highlighted',
    style: { backgroundColor: 'papayawhip', padding: '8px' },
    id: 'demo',
  }, builder => {
    builder.Text({ value: 'Hello' });
  });
});
```

Notes
- className accepts a string (and in many places a Ref<string>); applyClassTokens performs token diffing to avoid redundant add/remove operations on classList.
- style can be a string or a Partial<CSSStyleDeclaration> object; applyStyle routes to the correct path.
- setAttr prefers assigning DOM properties (e.g., el.value = ...) when available, falling back to setAttribute for attributes not exposed as properties.

Impact
- No breaking changes in public API.
- Reduced duplication and improved consistency across JSX and DSL attribute handling.

Follow-ups
- Extend docs/05-jsx-guide.md and docs/16-styling-and-utilities.md with a short section referencing dom-attrs helpers used under the hood.
- Consider adding unit tests specifically targeting dom-attrs.ts to lock down behavior.