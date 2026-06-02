// main.tsx
import { Router, defineRoutes, navigate } from "../src/router/index"
import { createMemoApp } from "auwla"

defineRoutes([
  { path: "/",       component: Home },
  { path: "/about",  component: About },
])

function Home() {
  return () => (
    <section>
      <h1>Home</h1>
      <button onClick={() => navigate("/about")}>Go to about</button>
    </section>
  )
}

function About() {
  return () => (
    <section>
      <h1>About</h1>
      <a href="/">Go Home</a>
      <button onClick={() => navigate("/")}>Go home</button>
    </section>
  )
}

function App() {
  return () => (
    <main>
      <nav>
        <a href="/">Go Home</a>
        <a href="/about">About</a>
        <a href="/todos">Todos</a>
        <button onClick={() => navigate("/")}>Home</button>
        <button onClick={() => navigate("/about")}>About</button>
        <button onClick={() => navigate("/todos")}>Todos</button>
      </nav>
      <Router />
    </main>
  )
}

createMemoApp(document.getElementById("app")!, <App />)
