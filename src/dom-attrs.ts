// Shared DOM attribute and style helpers used by JSX runtime and DSL
// Centralizes class token diffing, style application, and attribute setting

export const CLASS_TOKENS = Symbol('auwla_class_tokens');

export function tokenizeClass(str: any): string[] {
  const s = String(str ?? '').trim();
  return s ? s.split(/\s+/).filter(Boolean) : [];
}

export function applyClassTokens(el: HTMLElement, nextStr: any) {
  const prev: Set<string> = (el as any)[CLASS_TOKENS] || new Set<string>();
  const nextTokens = tokenizeClass(nextStr);
  const nextSet = new Set(nextTokens);
  // Remove tokens previously managed but no longer present
  prev.forEach((tok) => {
    if (!nextSet.has(tok)) el.classList.remove(tok);
  });
  // Add new tokens
  nextTokens.forEach((tok) => {
    if (!prev.has(tok)) el.classList.add(tok);
  });
  // Update record
  (el as any)[CLASS_TOKENS] = nextSet;
}

export function setStyleObject(element: HTMLElement, styleObj: Partial<CSSStyleDeclaration> | null | undefined) {
  if (!styleObj || typeof styleObj !== 'object') return;
  for (const k in styleObj) {
    try {
      const val = (styleObj as any)[k];
      (element.style as any)[k] = val as any;
    } catch {}
  }
}

export function applyStyle(el: HTMLElement, style: any) {
  if (!style) return;
  if (typeof style === 'string') {
    el.setAttribute('style', style);
    return;
  }
  if (typeof style === 'object') {
    setStyleObject(el, style as Partial<CSSStyleDeclaration>);
  }
}

export function setAttr(el: HTMLElement, key: string, value: any) {
  if (value == null || value === false) {
    el.removeAttribute(key);
    return;
  }
  if (value === true) {
    el.setAttribute(key, '');
    return;
  }
  // Prefer property when available, fallback to attribute
  if (key in el) {
    try {
      (el as any)[key] = value;
      return;
    } catch {}
  }
  el.setAttribute(key, String(value));
}