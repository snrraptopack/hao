# Quick Start

This guide will walk you through scaffolding a new Auwla project using the official starter template. You'll get a simple, file-based routing setup and a working application right out of the box, ready for you to customize.

## 1. Scaffold Your Project

First, let's create a new Auwla project. Run the following command in your terminal. It will create a new directory with the starter files.

<code-block lang="shell">npm create auwla@latest my-auwla-app</code-block>

This command scaffolds a new project in a directory named `my-auwla-app`.

## 2. Install Dependencies and Run the Server

Now, navigate into your new project directory, install the necessary dependencies with `npm`, and start the development server.

<code-block lang="shell">
cd my-auwla-app
npm install
npm run dev
</code-block>

Once the server is running, open your browser to **http://localhost:5173**. You should see your new Auwla application running!

## 3. Understanding the Project Structure

The starter template provides a minimal, yet complete, setup for a web application. Here's a look at the files it creates for you:

- `index.html`: The main entry point of your application. The Auwla app is mounted into an element in this file.
- `package.json`: Defines your project's dependencies and scripts, like `dev` and `build`.
- `vite.config.ts`: Configuration for Vite, the build tool that powers the development server and bundles your code for production.
- `src/main.tsx`: This is where your Auwla application is initialized. It imports the routes and starts the router.
- `src/routes.tsx`: The heart of your application's navigation. Here, you define the pages and layouts for your site.

The `routes.tsx` file comes with a basic layout and a few example pages to get you started:

```TypeScriptJSX
// src/routes.tsx
import { h, defineRoutes, group, Link } from 'auwla';

// A layout component that wraps around your pages
function BaseLayout(child: HTMLElement) {
    return (
        <div class="container">
            <nav>
                <Link to="/" text="Home" className="btn" activeClassName="active" />
                <Link to="/about" text="About" className="btn" activeClassName="active" />
                <Link to="/users/42" text="User 42" className="btn" activeClassName="active" />
            </nav>
            <main>{child}</main>
        </div>
    ) as HTMLElement;
}

// Page components
function Home() { /* ... */ }
function About() { /* ... */ }
function User(params?: { id: string }) { /* ... */ }

// Route definitions
const baseRoutes = defineRoutes([
    { path: '/', component: Home },
    { path: '/about', component: About },
    { path: '/users/:id', component: User },
]);

// Group routes with the layout
export default group('/', { layout: BaseLayout }, baseRoutes);
```

## 4. Add a New Page

Now, let's add a new page to our application.

First, create a new file at `src/pages/Hello.tsx`. We'll create a simple component that returns some HTML.

> **Note:** Auwla uses JSX to create real DOM elements. You need to import `h` in every `.tsx` file to let TypeScript know how to process the JSX syntax.

```TypeScriptJSX
// src/pages/Hello.tsx
import { h } from 'auwla';

export function Hello() {
    return (
        <section>
            <h1>Hello from a New Page!</h1>
            <p>This is great!</p>
        </section>
    ) as HTMLElement;
}
```

Next, register this new page in `src/routes.tsx` and add a `Link` to it in the `BaseLayout` so you can navigate to it.

```typescriptjsx
// src/routes.tsx
import { h, defineRoutes, group, Link } from 'auwla';
import { Hello } from './pages/Hello'; // 1. Import the new page

function BaseLayout(child: HTMLElement) {
    return (
        <div class="container">
            <nav>
                <Link to="/" text="Home" className="btn" activeClassName="active" />
                <Link to="/about" text="About" className="btn" activeClassName="active" />
                <Link to="/users/42" text="User 42" className="btn" activeClassName="active" />
                <Link to="/hello" text="Hello" className="btn" activeClassName="active" /> {/* 3. Add the link */}
            </nav>
            <main>{child}</main>
        </div>
    ) as HTMLElement;
}

// ... other page components

const baseRoutes = defineRoutes([
    { path: '/', component: Home },
    { path: '/about', component: About },
    { path: '/users/:id', component: User },
    { path: '/hello', component: Hello, name: 'hello' }, // 2. Add the new route
]);

export default group('/', { layout: BaseLayout }, baseRoutes);
```

Save your changes. The development server will automatically reload. Now you can click the "Hello" link in the navigation to see your new page.

That's it! You've successfully added a new page to your Auwla application. You can now continue building out your app by creating more components and pages.
