import { describe, expect, test } from 'vitest';
import { compileAuwla, evaluateCompiled, createMemoApp, h } from './_helpers';

describe('component inlining', () => {
  test('inlines simple components that just return JSX', () => {
    const source = `
      function Label(props) {
        return <span class="label">{props.text}</span>;
      }

      function App() {
        let label = 'Hello';
        exports.update = () => { label = 'World'; };
        return () => <div><Label text={label} /></div>;
      }
      exports.App = App;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).not.toContain('<Label');
    expect(compiled).toContain('__componentBlock');
    expect(compiled).toContain('__setText');

    const evaluated = evaluateCompiled(compiled) as { App: () => unknown; update(): void };
    const root = document.createElement('div');
    const app = createMemoApp(root, h(evaluated.App as any));

    const span = root.querySelector('span')!;
    expect(span.textContent).toBe('Hello');
    expect(span.className).toBe('label');

    evaluated.update();
    app.render();

    expect(span.textContent).toBe('World');
  });

  test('leaves components that reference children for runtime fallback', () => {
    const source = `
      function Card(props) {
        return <div class="card">{props.children}</div>;
      }

      function App() {
        return () => <Card><span>Hello</span></Card>;
      }
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('<Card>');
    expect(compiled).not.toContain('__componentBlock');
  });

  test('supports bubbling emit payloads through on:custom listeners', async () => {
    const source = `
      function DeleteButton(props: { userId: string }) {
        const self = component();
        return () => (
          <button onClick={() => {
            emit(self, 'userDeleted', { id: props.userId, status: 'success' });
          }}>
            Delete User
          </button>
        );
      }

      function Dashboard() {
        let message = 'Waiting';
        exports.received = null;
        return () => (
          <main on:userDeleted={(data: { id: string; status: string }) => {
            exports.received = data;
            message = 'Deleted ' + data.id + ': ' + data.status;
          }}>
            <span>{message}</span>
            <DeleteButton userId="123" />
          </main>
        );
      }
      exports.Dashboard = Dashboard;
    `;

    const compiled = compileAuwla(source);
    expect(compiled).toContain('userDeleted');
    expect(compiled).toContain('.detail');

    const evaluated = evaluateCompiled(compiled) as {
      Dashboard: () => unknown;
      received: { id: string; status: string } | null;
    };
    const root = document.createElement('div');
    createMemoApp(root, h(evaluated.Dashboard as any));

    root.querySelector('button')!.click();
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(evaluated.received).toEqual({ id: '123', status: 'success' });
    expect(root.querySelector('span')!.textContent).toBe('Deleted 123: success');
  });
});
