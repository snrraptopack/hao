//@page /profile
import { ref } from "auwla"

// Global state (outside all components → should go inside page function)
const user = ref(null)
const theme = ref("light")

// Global functions (outside all components → should go inside page function)
function fetchUser() {
  // Simulate API call
  user.value = { name: "John Doe", email: "john@example.com" }
}

function toggleTheme() {
  theme.value = theme.value === "light" ? "dark" : "light"
}

// Reusable component (exported)
export function UserAvatar({ size = "medium" }) {
  // Component-specific state (inside UserAvatar → should go inside Component UI scope)
  const isHovered = ref(false)
  
  // Component-specific functions (inside UserAvatar → should go inside Component UI scope)
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
      {user.value ? (
        <img src={`/avatars/${user.value.id}.jpg`} alt={user.value.name} />
      ) : (
        <div className="placeholder">?</div>
      )}
    </div>
  )
}

// Another reusable component (exported)
export function ThemeToggle() {
  // Component-specific state (inside ThemeToggle → should go inside Component UI scope)
  const isAnimating = ref(false)
  
  // Component-specific functions (inside ThemeToggle → should go inside Component UI scope)
  function handleToggle() {
    isAnimating.value = true
    toggleTheme()
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
      Switch to {theme.value === "light" ? "dark" : "light"} mode
    </button>
  )
}

// Main page component (export default)
export default function ProfilePage() {
  // Page-specific state (inside ProfilePage → should go inside Component UI scope)
  const isEditing = ref(false)
  const editForm = ref({ name: "", email: "" })
  
  // Page-specific functions (inside ProfilePage → should go inside Component UI scope)
  function startEditing() {
    isEditing.value = true
    editForm.value = { ...user.value }
  }
  
  function cancelEditing() {
    isEditing.value = false
    editForm.value = { name: "", email: "" }
  }
  
  function saveChanges() {
    user.value = { ...editForm.value }
    isEditing.value = false
  }
  
  return (
    <div className={`profile-page ${theme.value}`}>
      <header>
        <UserAvatar size="large" />
        <ThemeToggle />
      </header>
      
      <main>
        <h1>Profile</h1>
        
        {!user.value ? (
          <div>
            <p>No user data loaded</p>
            <button onClick={fetchUser}>Load User</button>
          </div>
        ) : isEditing.value ? (
          <form>
            <input 
              value={editForm.value.name}
              placeholder="Name"
            />
            <input 
              value={editForm.value.email}
              placeholder="Email"
            />
            <button type="button" onClick={saveChanges}>Save</button>
            <button type="button" onClick={cancelEditing}>Cancel</button>
          </form>
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