import { Component, ref, watch } from 'auwla'
import type { Ref, LayoutBuilder } from 'auwla'

// Component helpers (shared across all components)
const theme = ref("light")
const API_BASE = "https://api.example.com"
function formatDate(date) {
  return new Intl.DateTimeFormat().format(date)
}
function toggleTheme() {
  theme.value = theme.value === "light" ? "dark" : "light"
}

// Page component (has lifecycle)
export default function UserCard() {
  return Component((ui: LayoutBuilder) => {
    const user = ref(null)
    const loading = ref(false)
    async function loadUser(id) {
    loading.value = true
    try {
      const response = await fetch(`${API_BASE}/users/${id}`)
      user.value = await response.json()
    } finally {
      loading.value = false
    }
  }

    ui.Div({ className: watch([theme], () => theme.value) as Ref<string> }, (ui: LayoutBuilder) => {
      ui.Button({ text: "Toggle Theme", on: { click: (e) => toggleTheme() } })
      ui.Text({ value: watch([loading, user], () => String(loading.value ? <p>Loading...</p> : user.value ? <div>
          <h2>{user.value.name}</h2>
          <p>Joined: {formatDate(new Date(user.value.createdAt))}</p>
        </div> : <button onClick={() => loadUser(1)}>Load User</button>)) as Ref<string> })
    })
  })
}
