import { Link, type Route, type RouteComponent } from 'auwla/router';
import {} from 'auwla/jsx-runtime';

import { ModifiersHome } from './home';
import { KeyboardModifiersDemo } from './keyboard';
import { MouseModifiersDemo } from './mouse';
import { GlobalModifiersDemo } from './global';
import { HotkeysDemo } from './hotkey';
import { IntersectModifiersDemo } from './intersect';
import { TouchModifiersDemo } from './touch';

import '../styles/modifiers.css';

// Sub-routes for the modifiers namespace
export const modifiersRoutes: Route[] = [
  { path: '/', component: ModifiersHome },
  { path: '/keyboard', component: KeyboardModifiersDemo },
  { path: '/mouse', component: MouseModifiersDemo },
  { path: '/global', component: GlobalModifiersDemo },
  { path: '/hotkeys', component: HotkeysDemo },
  { path: '/intersect', component: IntersectModifiersDemo },
  { path: '/touch', component: TouchModifiersDemo },
];

// Layout shell wrapping all modifiers pages
export function ModifiersShell(Child: RouteComponent) {
  return () => (
    <div class="modifiers-layout">
      <aside class="modifiers-sidebar">
        <h2>Modifiers </h2>
        <nav>
          <Link href="/modifiers" activeClass="" exactActiveClass="active">Overview</Link>
          <Link href="/modifiers/keyboard" activeClass="active" exactActiveClass="active">Keyboard</Link>
          <Link href="/modifiers/mouse" activeClass="active" exactActiveClass="active">Mouse</Link>
          <Link href="/modifiers/intersect" activeClass="active" exactActiveClass="active">Intersection</Link>
          <Link href="/modifiers/touch" activeClass="active" exactActiveClass="active">Touch & Gestures</Link>
          <Link href="/modifiers/global" activeClass="active" exactActiveClass="active">Global Listeners</Link>
          <Link href="/modifiers/hotkeys" activeClass="active" exactActiveClass="active">Global Hotkeys</Link>
        </nav>
      </aside>
      <div class="modifiers-content">
        <Child />
      </div>
    </div>
  );
}
