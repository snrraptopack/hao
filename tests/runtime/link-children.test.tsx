/** @jsxImportSource auwla */
import { describe, expect, test } from 'vitest';
import { createMemoApp } from 'auwla';
import { Link } from 'auwla/router';

describe('Link children', () => {
  test('renders string and element children', () => {
    function App() {
      const ex = { path: '/about', label: 'About' };
      return () => (
        <div>
          <Link href={ex.path}>{ex.label}</Link>
          <Link href={ex.path}><span>{ex.label}</span></Link>
        </div>
      );
    }

    const root = document.createElement('div');
    createMemoApp(root, <App />);

    const links = root.querySelectorAll('a');
    expect(links).toHaveLength(2);
    expect(links[0]!.textContent).toContain('About');
    expect(links[1]!.textContent).toContain('About');
    expect(links[1]!.querySelector('span')).not.toBeNull();
  });
});
