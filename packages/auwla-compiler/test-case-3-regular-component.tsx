import { ref } from "auwla"

// Global utilities (outside component → should stay global)
const theme = ref("light")
const API_BASE = "https://api.example.com"

function formatDate(date) {
  return new Intl.DateTimeFormat().format(date)
}

function toggleTheme() {
  theme.value = theme.value === "light" ? "dark" : "light"
}

export default function UserCard() {
  // Component state (inside component → should go inside Component UI scope)
  const user = ref(null)
  const loading = ref(false)
  
  // Component methods (inside component → should go inside Component UI scope)
  async function loadUser(id) {
    loading.value = true
    try {
      const response = await fetch(`${API_BASE}/users/${id}`)
      user.value = await response.json()
    } finally {
      loading.value = false
    }
  }
  
  return (
    <div className={theme.value}>
      <button onClick={toggleTheme}>Toggle Theme</button>
      {loading.value ? (
        <p>Loading...</p>
      ) : user.value ? (
        <div>
          <h2>{user.value.name}</h2>
          <p>Joined: {formatDate(new Date(user.value.createdAt))}</p>
        </div>
      ) : (
        <button onClick={() => loadUser(1)}>Load User</button>
      )}
    </div>
  )
}