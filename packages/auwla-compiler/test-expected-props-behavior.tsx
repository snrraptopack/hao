//@page /profile
import { ref, Ref } from "auwla"

// Global state (outside export default → should go inside ProfilePage component scope)
const user = ref(null)
const theme = ref("light")

// Global functions (outside export default → should go inside ProfilePage component scope)
function fetchUser() {
  user.value = { name: "John Doe", email: "john@example.com" }
}

function toggleTheme() {
  theme.value = theme.value === "light" ? "dark" : "light"
}

// Reusable component - should receive global state as props
export function UserAvatar({ user, size = "medium" }: { 
  user: Ref<any>, 
  size?: string 
}) {
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
      {user.value ? (
        <img src={`/avatars/${user.value.id}.jpg`} alt={user.value.name} />
      ) : (
        <div className="placeholder">?</div>
      )}
    </div>
  )
}

// Another reusable component - should receive global state as props
export function ThemeToggle({ 
  theme, 
  onToggle 
}: { 
  theme: Ref<string>, 
  onToggle: () => void 
}) {
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
      Switch to {theme.value === "light" ? "dark" : "light"} mode
    </button>
  )
}

// Main page component - has access to global state in component scope
export default function ProfilePage() {
  // Page-specific state (inside export default → should go inside Component UI scope)
  const isEditing = ref(false)
  const editForm = ref({ name: "", email: "" })
  
  function startEditing() {
    isEditing.value = true
    editForm.value = { ...user.value }
  }
  
  function cancelEditing() {
    isEditing.value = false
  }
  
  function saveChanges() {
    user.value = { ...editForm.value }
    isEditing.value = false
  }
  
  return (
    <div className={`profile-page ${theme.value}`}>
      <header>
        {/* Pass global state as props to components */}
        <UserAvatar user={user} size="large" />
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
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