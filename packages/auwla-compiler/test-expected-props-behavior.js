import { Component, ref, watch } from 'auwla'
import type { Ref, LayoutBuilder } from 'auwla'

// Reusable component
export function UserAvatar({
  user,
  size = "medium"
}) {
  // Component logic (component state)
  // Component-specific state
const isHovered = ref(false);

  return Component((ui: LayoutBuilder) => {
    ui.Div({ text: watch([user], () => `user.value ? <img src={`/avatars/${user.value.id}.jpg`} alt={user.value.name} /> : <div className="placeholder">?</div>`) as Ref<string>, className: `avatar ${size} ${isHovered.value ? 'hovered' : ''}`, on: { mouseEnter: (e) => handleMouseEnter(), mouseLeave: (e) => handleMouseLeave() } })
  })
}

// Reusable component
export function ThemeToggle({
  theme,
  onToggle
}) {
  // Component logic (component state)
  const isAnimating = ref(false);

  return Component((ui: LayoutBuilder) => {
    ui.Button({ text: watch([theme], () => `Switch to${theme.value === "light" ? "dark" : "light"}mode`) as Ref<string>, className: `theme-toggle ${isAnimating.value ? 'animating' : ''}`, on: { click: (e) => handleToggle() }, disabled: isAnimating.value })
  })
}

// Page component (has lifecycle)
export default function ProfilePage() {
  // Logic that was outside page scope → now inside page scope
  const user = ref(null)
  const theme = ref("light")
  function fetchUser() {
  user.value = { name: "John Doe", email: "john@example.com" }
}
  function toggleTheme() {
  theme.value = theme.value === "light" ? "dark" : "light"
}

  return Component((ui: LayoutBuilder) => {
    // Logic that was inside page scope → now inside Component UI scope
    const isHovered = ref(false)
    function handleMouseEnter() {
    isHovered.value = true
  }
    function handleMouseLeave() {
    isHovered.value = false
  }
    const isAnimating = ref(false)
    function handleToggle() {
    isAnimating.value = true
    onToggle()
    setTimeout(() => {
      isAnimating.value = false
    }, 300)
  }
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

    ui.Div({ className: `profile-page ${theme.value}` }, (ui: LayoutBuilder) => {
      ui.Header({}, (ui: LayoutBuilder) => {
        ui.append(UserAvatar({ user: user, size: "large" }))
        ui.append(ThemeToggle({ theme: theme, onToggle: toggleTheme }))
      })
      ui.Main({}, (ui: LayoutBuilder) => {
        ui.H1({ text: "Profile" })
        ui.Text({ value: watch([isEditing], () => String(!user.value ? <div>
            <p>No user data loaded</p>
            <button onClick={fetchUser}>Load User</button>
          </div> : isEditing.value ? <form>
            <input value={editForm.value.name} placeholder="Name" />
            <input value={editForm.value.email} placeholder="Email" />
            <button type="button" onClick={saveChanges}>Save</button>
            <button type="button" onClick={cancelEditing}>Cancel</button>
          </form> : <div>
            <p>Name: {user.value.name}</p>
            <p>Email: {user.value.email}</p>
            <button onClick={startEditing}>Edit Profile</button>
          </div>)) as Ref<string> })
      })
    })
  })
}
