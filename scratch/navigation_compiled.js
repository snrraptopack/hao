import { __componentBlock, __cloneTemplate, __computed, __createBlock, __effect, __event, __hydrateElement, __hydrateComment, __keyedMap, __setChild, __setClass, __setElementText, __setProperty, __setStyle, __setText, __trackSources } from 'auwla';
// navigation.tsx
// Demonstrates: Link (active/exact-active classes), isActive, isExactActive,
// navigate with replace, route meta, getParams, getQuery, getRouteMeta.

import {} from "auwla/jsx-runtime"
import {
  Link,
  navigate,
  back,
  getParams,
  getQuery,
  getRouteMeta,
  isActive,
  RouteComponent
} from "auwla/router"

// ---------------------------------------------------------------------------
// Fake session — in a real app this would be real auth state
// ---------------------------------------------------------------------------

let loggedIn = false

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const USERS = [
  { id: "1", name: "Kwame Mensah",  role: "admin",  color: "#1f3a5f", text: "#58a6ff", bio: "Compiler engineer from Accra."   },
  { id: "2", name: "Ama Owusu",     role: "editor", color: "#1f3a2f", text: "#3fb950", bio: "Design systems lead from Kumasi." },
  { id: "3", name: "Kofi Boateng",  role: "viewer", color: "#2d2a1f", text: "#d29922", bio: "Product manager from Takoradi."   },
]

// ---------------------------------------------------------------------------
// Routes (relative — group('/navigation') will prefix them)
// ---------------------------------------------------------------------------

export const navigationRoutes = [
  { path: "/", component: Home },
  { path: "/users", component: UserList },
  { path: "/users/:id", component: UserDetail },
  {
    path: "/admin",
    meta: { requiresAuth: true, title: "Admin Panel" },
    guard: () => loggedIn || "/navigation/login",
    component: Admin,
  },
  { path: "/login", component: Login },
  { path: "*", component: NotFound },
]

// ---------------------------------------------------------------------------
// Layout shell
// ---------------------------------------------------------------------------

export function NavigationShell(Child:RouteComponent) {
  return __componentBlock(() => {
        const el0 = __hydrateElement("div");
        el0.className = "navigation-example";
        const el1 = __hydrateElement("nav");
        const el2 = __hydrateElement("span");
        el2.className = "brand";
        el2.append("auwla");
        el1.append(el2);
        let child0 = __hydrateComment("auwla:child");
        el1.append(child0);
        let child1 = __hydrateComment("auwla:child");
        el1.append(child1);
        let child2 = __hydrateComment("auwla:child");
        el1.append(child2);
        el0.append(el1);
        const el3 = __hydrateElement("main");
        let child3 = __hydrateComment("auwla:child");
        el3.append(child3);
        el0.append(el3);

        return __createBlock(() => ({
          node: el0,
          update() {
          child0 = __setChild(el1, child0, <Link href="/navigation" exactActiveClass="exact-active" activeClass="">Home</Link>);
          child1 = __setChild(el1, child1, <Link href="/navigation/users">Users</Link>);
          child2 = __setChild(el1, child2, <Link href="/navigation/admin">Admin</Link>);
          child3 = __setChild(el3, child3, <Child/>);
          },
        }));
      });
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function Home() {
  return __componentBlock(() => {
        const el0 = __hydrateElement("div");
        const el1 = __hydrateElement("h1");
        el1.append("Navigation demo");
        el0.append(el1);
        const el2 = __hydrateElement("p");
        __setStyle(el2, "marginBottom", "24px");
        el2.append("\r\n        Demonstrates ");
        const el3 = __hydrateElement("code");
        el3.append("Link");
        el2.append(el3);
        el2.append(", active classes, route meta, guarded\r\n        routes, and ");
        const el4 = __hydrateElement("code");
        el4.append("navigate(");
        const text0 = document.createTextNode("");
        el4.append(text0);
        el4.append(")");
        el2.append(el4);
        el2.append(".\r\n      ");
        el0.append(el2);
        const el5 = __hydrateElement("div");
        el5.className = "card";
        const el6 = __hydrateElement("h2");
        el6.append("What to try");
        el5.append(el6);
        const el7 = __hydrateElement("ul");
        __setStyle(el7, "paddingLeft", "18px");
        __setStyle(el7, "color", "#8b949e");
        __setStyle(el7, "fontSize", "14px");
        __setStyle(el7, "lineHeight", "2");
        const el8 = __hydrateElement("li");
        el8.append("Click the nav links and watch the active/exact-active border update.");
        el7.append(el8);
        const el9 = __hydrateElement("li");
        el9.append("Open ");
        const el10 = __hydrateElement("strong");
        el10.append("/navigation/users");
        el9.append(el10);
        el9.append(" and drill into a user detail page.");
        el7.append(el9);
        const el11 = __hydrateElement("li");
        el11.append("Try ");
        const el12 = __hydrateElement("strong");
        el12.append("/navigation/admin");
        el11.append(el12);
        el11.append(" — you'll be redirected to login.");
        el7.append(el11);
        const el13 = __hydrateElement("li");
        el13.append("On the login page, submit the form and notice the URL ");
        const el14 = __hydrateElement("em");
        el14.append("replaces");
        el13.append(el14);
        el13.append(" (no extra back entry).");
        el7.append(el13);
        const el15 = __hydrateElement("li");
        el15.append("Add ");
        const el16 = __hydrateElement("code");
        el16.append("?highlight=true");
        el15.append(el16);
        el15.append(" to a user URL and see it read in setup.");
        el7.append(el15);
        el5.append(el7);
        el0.append(el5);
        const el17 = __hydrateElement("div");
        el17.className = "card";
        const el18 = __hydrateElement("h2");
        el18.append("isActive check (live)");
        el17.append(el18);
        const el19 = __hydrateElement("p");
        const el20 = __hydrateElement("code");
        el20.append("isActive(\"/navigation\")");
        el19.append(el20);
        el19.append(" right now:");
        const text1 = document.createTextNode("");
        el19.append(text1);
        const el21 = __hydrateElement("strong");
        let child2 = __hydrateComment("auwla:child");
        el21.append(child2);
        el19.append(el21);
        el17.append(el19);
        const el22 = __hydrateElement("p");
        __setStyle(el22, "marginTop", "6px");
        const el23 = __hydrateElement("code");
        el23.append("isActive(\"/navigation/users\")");
        el22.append(el23);
        el22.append(" right now:");
        const text3 = document.createTextNode("");
        el22.append(text3);
        const el24 = __hydrateElement("strong");
        let child4 = __hydrateComment("auwla:child");
        el24.append(child4);
        el22.append(el24);
        el17.append(el22);
        el0.append(el17);

        return __createBlock(() => ({
          node: el0,
          update() {
          __setText(text0, "{ replace: true }");
          __setText(text1, " ");
          __setStyle(el21, "color", isActive("/navigation") ? "#3fb950" : "#f85149");
          child2 = __setChild(el21, child2, String(isActive("/navigation")));
          __setText(text3, " ");
          __setStyle(el24, "color", isActive("/navigation/users") ? "#3fb950" : "#f85149");
          child4 = __setChild(el24, child4, String(isActive("/navigation/users")));
          },
        }));
      });
}

function UserList() {
  return __componentBlock(() => {
        const el0 = __hydrateElement("div");
        const el1 = __hydrateElement("h1");
        el1.append("Users");
        el0.append(el1);
        const el2 = __hydrateElement("div");
        el2.className = "card";
        const el3 = __hydrateElement("ul");
        el3.className = "user-list";
        const map0 = __keyedMap(
          USERS,
          (u) => u.id,
          (u, index) => __createBlock(() => {
            
            
            __trackSources(['u.color', 'u.text', 'u.name', 'u.role']);
            const el0 = __hydrateElement("li");
            const el1 = __hydrateElement("div");
            el1.className = "avatar";
            el0.append(el1);
            let child0 = __hydrateComment("auwla:child");
            el0.append(child0);
            const el2 = __hydrateElement("span");
            el0.append(el2);

            __setStyle(el1, "background", u.color);
            __setStyle(el1, "color", u.text);
            __setElementText(el1, u.name[0]);
            child0 = __setChild(el0, child0, <Link href={`/navigation/users/${u.id}`}>{u.name}</Link>);
            __setClass(el2, `role-badge role-${u.role}`);
            __setElementText(el2, u.role);


            return {
              node: el0,
              update(u, index) {
              __setStyle(el1, "background", u.color);
              __setStyle(el1, "color", u.text);
              __setElementText(el1, u.name[0]);
              __setClass(el2, `role-badge role-${u.role}`);
              __setElementText(el2, u.role);
              },
            };
          }),
          (block, u, index) => block.update(u, index),
          (u) => [u.color, u.text, u.name, u.role],
          false,
        );
        el3.append(map0.node);
        el2.append(el3);
        el0.append(el2);

        return __createBlock(() => ({
          node: el0,
          update() {
          map0.update(USERS);
          },
        }));
      });
}

function UserDetail() {
  const __dirty = new Set();

  const { id } = getParams()
  const query = getQuery()
  const highlight = __computed(() => query.highlight === "true", ['query'])
  const user = USERS.find((u) => u.id === id)

  __effect(() => {
  if (__dirty.size === 0 || __dirty.has('user')) {
  if (!user) {
    return ()=> (
      <div>
        <button class="back" onClick={() => back()}>← Back</button>
        <div class="card"><p>User "{id}" not found.</p></div>
      </div>
    )
  }
}
}); () => back();
        el1.addEventListener("click", __event((event) => eventHandler0(event)));
        el1.append("← Back");
        el0.append(el1);
        const el2 = __hydrateElement("div");
        el2.className = "card";
        const el3 = __hydrateElement("p");
        el3.append("User \"");
        const text1 = document.createTextNode("");
        el3.append(text1);
        el3.append("\" not found.");
        el2.append(el3);
        el0.append(el2);

        return __createBlock(() => ({
          node: el0,
          update() {
          const _all = __dirty.size === 0 || __dirty.delete('__all');
          eventHandler0 = () => back();
          __setText(text1, id);
          __dirty.clear();
          },
        }));
      });
  }

  return __componentBlock(() => {
        __trackSources(['USERS.filter', 'u.id']);
        const el0 = __hydrateElement("div");
        const el1 = __hydrateElement("button");
        el1.className = "back";
        let eventHandler0 = () => back();
        el1.addEventListener("click", __event((event) => eventHandler0(event)));
        el1.append("← Back");
        el0.append(el1);
        const el2 = __hydrateElement("div");
        el2.className = "card";
        const el3 = __hydrateElement("div");
        el3.className = "meta-strip";
        const el4 = __hydrateElement("span");
        el3.append(el4);
        let child1 = __hydrateComment("auwla:child");
        el3.append(child1);
        let activeBranch2: number | null = null;
        const el5 = __hydrateElement("span");
        el5.className = "meta-tag";
        el5.append("highlighted");
        el2.append(el3);
        const el6 = __hydrateElement("h1");
        el2.append(el6);
        const el7 = __hydrateElement("p");
        el2.append(el7);
        const el8 = __hydrateElement("p");
        __setStyle(el8, "marginTop", "12px");
        __setStyle(el8, "fontSize", "13px");
        __setStyle(el8, "color", "#484f58");
        el8.append("\r\n            Try adding ");
        const el9 = __hydrateElement("code");
        el9.append("?highlight=true");
        el8.append(el9);
        el8.append(" to the URL — it's read in setup,\r\n            not inside the render closure.\r\n          ");
        el2.append(el8);
        el0.append(el2);
        const el10 = __hydrateElement("div");
        el10.className = "card";
        const el11 = __hydrateElement("h2");
        el11.append("Other users");
        el10.append(el11);
        const el12 = __hydrateElement("ul");
        el12.className = "user-list";
        const map0 = __keyedMap(
          USERS.filter((u) => u.id !== id),
          (u) => u.id,
          (u, index) => __createBlock(() => {
            
            
            __trackSources(['u.color', 'u.text', 'u.name']);
            const el0 = __hydrateElement("li");
            const el1 = __hydrateElement("div");
            el1.className = "avatar";
            el0.append(el1);
            let child0 = __hydrateComment("auwla:child");
            el0.append(child0);

            __setStyle(el1, "background", u.color);
            __setStyle(el1, "color", u.text);
            __setElementText(el1, u.name[0]);
            child0 = __setChild(el0, child0, <Link href={`/navigation/users/${u.id}`}>{u.name}</Link>);


            return {
              node: el0,
              update(u, index) {
              __setStyle(el1, "background", u.color);
              __setStyle(el1, "color", u.text);
              __setElementText(el1, u.name[0]);
              },
            };
          }),
          (block, u, index) => block.update(u, index),
          (u) => [u.color, u.text, u.name],
          false,
        );
        el12.append(map0.node);
        el10.append(el12);
        el0.append(el10);

        return __createBlock(() => ({
          node: el0,
          update() {
          const _all = __dirty.size === 0 || __dirty.delete('__all');
          const _user = _all || __dirty.delete('user');
          if (_user) {
            __setClass(el4, `role-badge role-${user.role}`);
            __setElementText(el4, user.role);
            __setElementText(el6, user.name);
            __setElementText(el7, user.bio);
          }
          if (_all) {
            map0.update(USERS.filter((u) => u.id !== id));
          }
          eventHandler0 = () => back();
          __setStyle(el2, highlight() ? { borderColor: user.text } : undefined);
          if (highlight()) {
  if (activeBranch2 !== 0) { child1 = __setChild(el3, child1, el5); activeBranch2 = 0; }
} else {
  if (activeBranch2 !== null) { child1 = __setChild(el3, child1, null); activeBranch2 = null; }
}
          __dirty.clear();
          },
        }));
      });
}

function Admin() {
  const __dirty = new Set();

  const { title } = getRouteMeta<{ requiresAuth: boolean; title: string }>()

  return __componentBlock(() => {
        const el0 = __cloneTemplate("<div><h1></h1><div class=\"card\"><div class=\"meta-strip\"><span class=\"meta-tag\">requires auth</span><span class=\"meta-tag\">meta.title = </span></div><p>You are logged in. This page was protected by <code>guard</code>.</p><p style=\"margin-top: 12px\"><button class=\"btn\" style=\"width: auto; padding: 8px 16px; background: #b62324\">\r\n            Log out\r\n          </button></p></div></div>");
        const el1 = el0.childNodes[0]! as HTMLElement;
        const el2 = el0.childNodes[1]! as HTMLElement;
        const el3 = el0.childNodes[1]!.childNodes[0]! as HTMLElement;
        const el4 = el0.childNodes[1]!.childNodes[0]!.childNodes[0]! as HTMLElement;
        const el5 = el0.childNodes[1]!.childNodes[0]!.childNodes[1]! as HTMLElement;
        const el6 = el0.childNodes[1]!.childNodes[1]! as HTMLElement;
        const el7 = el0.childNodes[1]!.childNodes[1]!.childNodes[1]! as HTMLElement;
        const el8 = el0.childNodes[1]!.childNodes[2]! as HTMLElement;
        const el9 = el0.childNodes[1]!.childNodes[2]!.childNodes[0]! as HTMLElement;
        let eventHandler1 = ((handler) => (event) => { __dirty.add("__all");  return handler(event); })(() => {
              loggedIn = false
              navigate("/navigation", { replace: true })
            });
        el9.addEventListener("click", __event((event) => eventHandler1(event)));
        const text0 = document.createTextNode("");
        el5.append(text0);

        let _init = false;
        return __createBlock(() => ({
          node: el0,
          update() {
            const first = !_init;
            if (!_init) {

              _init = true;
            }
          const _all = __dirty.size === 0 || __dirty.delete('__all');
          __setElementText(el1, title);
          __setText(text0, title);
          eventHandler1 = ((handler) => (event) => { __dirty.add("__all");  return handler(event); })(() => {
              loggedIn = false
              navigate("/navigation", { replace: true })
            });
          __dirty.clear();
          },
        }));
      });
}

function Login() {
  const __dirty = new Set();

  let username = ""
  let password = ""
  let error    = ""

  function submit(e: SubmitEvent) {
    e.preventDefault()
    if (username === "admin" && password === "1234") {
      loggedIn = true
      navigate("/navigation/admin", { replace: true })
    } else {
      error = "Wrong credentials. Try admin / 1234."
    }
  }

  return __componentBlock(() => {
        __trackSources(['e.target']);
        const el0 = __hydrateElement("div");
        const el1 = __hydrateElement("h1");
        el1.append("Log in");
        el0.append(el1);
        const el2 = __hydrateElement("div");
        el2.className = "card";
        __setStyle(el2, "maxWidth", "380px");
        let child0 = __hydrateComment("auwla:child");
        el2.append(child0);
        let activeBranch1: number | null = null;
        const el3 = __hydrateElement("p");
        __setStyle(el3, "color", "#f85149");
        __setStyle(el3, "marginBottom", "14px");
        __setStyle(el3, "fontSize", "13px");
        const el4 = __hydrateElement("form");
        let eventHandler2 = submit;
        el4.addEventListener("submit", __event((event) => eventHandler2(event)));
        const el5 = __hydrateElement("div");
        el5.className = "form-group";
        const el6 = __hydrateElement("label");
        el6.append("Username");
        el5.append(el6);
        const el7 = __hydrateElement("input");
        el7.setAttribute("type", "text");
        el7.setAttribute("placeholder", "admin");
        let eventHandler3 = ((handler) => (event) => { __dirty.add("username"); __dirty.add("error");  return handler(event); })((e: InputEvent) => {
                username = (e.target as HTMLInputElement).value
                error = ""
              });
        el7.addEventListener("input", __event((event) => eventHandler3(event)));
        el5.append(el7);
        el4.append(el5);
        const el8 = __hydrateElement("div");
        el8.className = "form-group";
        const el9 = __hydrateElement("label");
        el9.append("Password");
        el8.append(el9);
        const el10 = __hydrateElement("input");
        el10.setAttribute("type", "password");
        el10.setAttribute("placeholder", "1234");
        let eventHandler4 = ((handler) => (event) => { __dirty.add("password"); __dirty.add("error");  return handler(event); })((e: InputEvent) => {
                password = (e.target as HTMLInputElement).value
                error = ""
              });
        el10.addEventListener("input", __event((event) => eventHandler4(event)));
        el8.append(el10);
        el4.append(el8);
        const el11 = __hydrateElement("button");
        el11.setAttribute("type", "submit");
        el11.className = "btn";
        el11.append("Sign in");
        el4.append(el11);
        el2.append(el4);
        el0.append(el2);

        return __createBlock(() => ({
          node: el0,
          update() {
          const _all = __dirty.size === 0 || __dirty.delete('__all');
          const _error = _all || __dirty.delete('error');
          if (_error) {
            if (error) {
  if (activeBranch1 !== 0) { child0 = __setChild(el2, child0, el3); activeBranch1 = 0; }
  __setElementText(el3, error);
} else {
  if (activeBranch1 !== null) { child0 = __setChild(el2, child0, null); activeBranch1 = null; }
}
          }
          const _username = _all || __dirty.delete('username');
          if (_username) {
            __setProperty(el7, "value", username);
          }
          const _password = _all || __dirty.delete('password');
          if (_password) {
            __setProperty(el10, "value", password);
          }
          if (_all) {
            eventHandler3 = ((handler) => (event) => { __dirty.add("username"); __dirty.add("error");  return handler(event); })((e: InputEvent) => {
                username = (e.target as HTMLInputElement).value
                error = ""
              });
            eventHandler4 = ((handler) => (event) => { __dirty.add("password"); __dirty.add("error");  return handler(event); })((e: InputEvent) => {
                password = (e.target as HTMLInputElement).value
                error = ""
              });
          }
          eventHandler2 = submit;
          __dirty.clear();
          },
        }));
      });
}

function NotFound() {
  return __componentBlock(() => {
        const el0 = __cloneTemplate("<div class=\"not-found\"><div class=\"code\">404</div><p>Page not found</p></div>");
        const el1 = el0.childNodes[0]! as HTMLElement;
        const el2 = el0.childNodes[1]! as HTMLElement;

        let _init = false;
        return __createBlock(() => ({
          node: el0,
          update() {
            const first = !_init;
            if (!_init) {

              _init = true;
            }
          // Static block; no dynamic fields to patch.
          },
        }));
      });
}
