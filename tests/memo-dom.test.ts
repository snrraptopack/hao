import { describe, expect, test, vi } from 'vitest';
import { createMemoApp } from '../src/memo-dom';

const tick = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe('memo-dom', () => {
  test('rerenders once after event handlers mutate a plain model', async () => {
    const root = document.createElement('div');
    const app = createMemoApp(root, { count: 0 }, (ctx) =>
      ctx.el(
        'button',
        { onClick: ctx.event((_event, model) => { model.count += 1; }) },
        `Count: ${ctx.model.count}`,
      )
    );

    expect(root.textContent).toBe('Count: 0');

    root.querySelector('button')!.click();
    await tick();

    expect(app.model.count).toBe(1);
    expect(root.textContent).toBe('Count: 1');
  });

  test('memo reuses DOM nodes while dependencies are unchanged', async () => {
    const root = document.createElement('div');
    const renderExpensive = vi.fn((label: string) => {
      const span = document.createElement('span');
      span.dataset.memo = 'expensive';
      span.textContent = label;
      return span;
    });

    createMemoApp(root, { count: 0, label: 'stable' }, (ctx) =>
      ctx.el(
        'section',
        null,
        ctx.el(
          'button',
          { onClick: ctx.event((_event, model) => { model.count += 1; }) },
          String(ctx.model.count),
        ),
        ctx.memo('expensive', [ctx.model.label], () => renderExpensive(ctx.model.label)),
      )
    );

    const initialMemoNode = root.querySelector('[data-memo="expensive"]');
    root.querySelector('button')!.click();
    await tick();

    expect(renderExpensive).toHaveBeenCalledTimes(1);
    expect(root.querySelector('[data-memo="expensive"]')).toBe(initialMemoNode);
    expect(root.querySelector('button')!.textContent).toBe('1');
  });

  test('memo patches stable DOM nodes when dependencies change', async () => {
    const root = document.createElement('div');
    const app = createMemoApp(root, { label: 'A' }, (ctx) =>
      ctx.el('section', null, ctx.memo('label', [ctx.model.label], () => ctx.el('span', null, ctx.model.label)))
    );

    const initial = root.querySelector('span');

    app.model.label = 'B';
    app.render();

    expect(root.querySelector('span')).toBe(initial);
    expect(root.textContent).toBe('B');
  });
});
