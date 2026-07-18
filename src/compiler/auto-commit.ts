/**
 * @fileoverview Auto-commit analysis for the Auwla compiler.
 *
 * Pure predicates used by the main walker to decide which functions get an
 * automatic `commit()` boundary: async/timer/promise callbacks that mutate
 * setup-scoped locals and don't already commit manually (M5 — lifted out of
 * compiler/index.ts; all functions are pure and closure-free).
 */

import ts from 'typescript';
import { ASSIGNMENT_TOKENS, INC_DEC_TOKENS } from './constants';

/**
 * Methods that register a callback for later (out-of-band) invocation:
 * DOM/EventTarget listeners, EventEmitter-style `.on`/`.once`, and
 * store/observable `.subscribe`/`.watch`. Callbacks passed to these that
 * mutate setup locals need an auto-commit boundary — the runtime's event
 * pipeline never sees them.
 */
export const CALLBACK_REGISTRATION_METHODS: ReadonlySet<string> = new Set([
  'addEventListener',
  'addListener',
  'on',
  'once',
  'subscribe',
  'watch',
]);

/**
 * Observer constructors whose first argument is a callback
 * (`new IntersectionObserver(cb)`, `new MutationObserver(cb)`, …).
 */
export const OBSERVER_CONSTRUCTORS: ReadonlySet<string> = new Set([
  'IntersectionObserver',
  'MutationObserver',
  'ResizeObserver',
  'PerformanceObserver',
]);

/** Best-effort name for a function-like node (declaration or `const x = () => …`). */
export function getFunctionName(node: ts.Node): string | null {
  if (ts.isFunctionDeclaration(node) && node.name) {
    return node.name.text;
  }
  if (ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) {
    return node.parent.name.text;
  }
  return null;
}

/** True for async functions, callbacks passed to timers/promise chains, and
 * callbacks registered on external emitters (addEventListener, .on, .subscribe,
 * observer constructors, `x.onFoo = fn` assignments). */
export function isAsyncOrTimerCallback(node: ts.Node): boolean {
  const isAsync = (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node))
    ? node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) || false
    : false;
  if (isAsync) return true;

  let parent = node.parent;
  if (parent && ts.isParenthesizedExpression(parent)) {
    parent = parent.parent;
  }

  // `ws.onmessage = fn` — property-assigned event handler (DOM handler
  // properties are all-lowercase: onmessage, onopen, ontimeupdate, …).
  if (
    parent &&
    ts.isBinaryExpression(parent) &&
    parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    ts.isPropertyAccessExpression(parent.left) &&
    /^on[a-z]/i.test(parent.left.name.text)
  ) {
    return true;
  }

  // `new IntersectionObserver(fn)` — callback passed to an observer constructor.
  if (parent && ts.isNewExpression(parent) && ts.isIdentifier(parent.expression)) {
    if (OBSERVER_CONSTRUCTORS.has(parent.expression.text)) return true;
  }

  if (parent && ts.isCallExpression(parent)) {
    const expr = parent.expression;
    if (ts.isIdentifier(expr)) {
      const name = expr.text;
      if (name === 'setTimeout' || name === 'setInterval' || name === 'queueMicrotask' || name === 'requestAnimationFrame') {
        return true;
      }
    } else if (ts.isPropertyAccessExpression(expr)) {
      const name = expr.name.text;
      if (name === 'then' || name === 'catch' || name === 'finally') {
        return true;
      }
      // `ws.addEventListener('message', fn)`, `emitter.on('x', fn)`,
      // `store.subscribe(fn)` — external emitter registrations.
      if (CALLBACK_REGISTRATION_METHODS.has(name)) {
        return true;
      }
    }
  }
  return false;
}

/** True when the subtree contains a side effect (call, new, return, throw, delete, assignment, ++/--). */
export function hasSideEffects(node: ts.Node): boolean {
  let sideEffect = false;
  function walk(n: ts.Node) {
    if (sideEffect) return;
    if (
      ts.isCallExpression(n) ||
      ts.isNewExpression(n) ||
      ts.isReturnStatement(n) ||
      ts.isThrowStatement(n) ||
      ts.isDeleteExpression(n)
    ) {
      sideEffect = true;
      return;
    }
    if (ts.isBinaryExpression(n)) {
      const op = n.operatorToken.kind;
      if (
        ASSIGNMENT_TOKENS.has(op)
      ) {
        sideEffect = true;
        return;
      }
    }
    if (
      (ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) &&
      INC_DEC_TOKENS.has(n.operator)
    ) {
      sideEffect = true;
      return;
    }
    ts.forEachChild(n, walk);
  }
  walk(node);
  return sideEffect;
}

/** True when the subtree assigns (or ++/--) any of the given setup-local variables. */
export function mutatesLocals(body: ts.Node, locals: Set<string>): boolean {
  let mutates = false;

  const assignOps = ASSIGNMENT_TOKENS;

  const shadowed = new Set<string>();

  function walk(node: ts.Node) {
    if (mutates) return;

    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      shadowed.add(node.name.text);
    }
    if (ts.isParameter(node) && ts.isIdentifier(node.name)) {
      shadowed.add(node.name.text);
    }

    if (ts.isBinaryExpression(node) && assignOps.has(node.operatorToken.kind)) {
      let root: string | null = null;
      if (ts.isIdentifier(node.left)) {
        root = node.left.text;
      } else if (ts.isPropertyAccessExpression(node.left) && ts.isIdentifier(node.left.expression)) {
        root = node.left.expression.text;
      }
      if (root && locals.has(root) && !shadowed.has(root)) {
        mutates = true;
        return;
      }
    }

    if (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) {
      if (INC_DEC_TOKENS.has(node.operator)) {
        let root: string | null = null;
        if (ts.isIdentifier(node.operand)) {
          root = node.operand.text;
        } else if (ts.isPropertyAccessExpression(node.operand) && ts.isIdentifier(node.operand.expression)) {
          root = node.operand.expression.text;
        }
        if (root && locals.has(root) && !shadowed.has(root)) {
          mutates = true;
          return;
        }
      }
    }

    ts.forEachChild(node, walk);
  }

  walk(body);
  return mutates;
}

/** True when the subtree already calls `commit(selfName)` / `__commit(selfName)` manually. */
export function hasCommitCall(body: ts.Node, selfName: string): boolean {
  let hasCall = false;

  function walk(node: ts.Node) {
    if (hasCall) return;

    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      (node.expression.text === 'commit' || node.expression.text === '__commit') &&
      node.arguments.length > 0 &&
      ts.isIdentifier(node.arguments[0]!) &&
      node.arguments[0]!.text === selfName
    ) {
      hasCall = true;
      return;
    }

    ts.forEachChild(node, walk);
  }

  walk(body);
  return hasCall;
}
