//@page /profile-correct
import { ref } from "auwla"

// Global state (outside all components → will be moved inside main page function)
const user = ref(null)
const theme = ref("light")

// Global functions (outside all components → will be moved inside main page function)
function fetchUser() {
  user.value = { name: "John Doe", email: "john@example.com" }
}

function toggleTheme() {
  theme.value = theme.value === "light" ? "dark" : "light"
}

// Reusable component - should receive data via props
export function UserAvatar({ user, size = "medium" }) {
  // Component-specific state
  const isHovered = ref(false)
  
  function handleMouseEnter() {
    isHovered.value = true
  }
  
  function handleMouseLeave() {
    isHovered.value = false
  }
  
  return (
    <div 
      className={`avatar ${size} ${isHovered.value ? 'hovered' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {user ? (
        <img src={`/avatars/${user.id}.jpg`} alt={user.name} />
      ) : (
        <div className="placeholder">?</div>
      )}
    </div>
  )
}

// Reusable component - should receive data and functions via props
export function ThemeToggle({ theme, onToggle }) {
  const isAnimating = ref(false)
  
  function handleToggle() {
    isAnimating.value = true
    onToggle()
    setTimeout(() => {
      isAnimating.value = false
    }, 300)
  }
  
  return (
    <button 
      onClick={handleToggle}
      className={`theme-toggle ${isAnimating.value ? 'animating' : ''}`}
      disabled={isAnimating.value}
    >
      Switch to {theme === "light" ? "dark" : "light"} mode
    </button>
  )
}

// Main page component - has access to all global state and passes via props
export default function ProfilePage() {
  // Page-specific state
  const isEditing = ref(false)
  
  function startEditing() {
    isEditing.value = true
  }
  
  return (
    <div className={`profile-page ${theme.value}`}>
      <header>
        <UserAvatar user={user.value} size="large" />
        <ThemeToggle theme={theme.value} onToggle={toggleTheme} />
      </header>
      
      <main>
        <h1>Profile</h1>
        
        {!user.value ? (
          <div>
            <p>No user data loaded</p>
            <button onClick={fetchUser}>Load User</button>
          </div>
        ) : (
          <div>
            <p>Name: {user.value.name}</p>
            <p>Email: {user.value.email}</p>
            <button onClick={startEditing}>Edit Profile</button>
          </div>
        )}
      </main>
    </div>
  )
}