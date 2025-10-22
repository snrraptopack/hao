# Expected Behavior for @page Files with Multiple Components

## 🎯 **Correct Pattern Clarified**

Thank you for the clarification! The expected behavior for @page files with multiple components is:

### **Scoping Rules:**
1. **Logic outside `export default`** → moves to **component scope** (inside the default page function)
2. **Logic inside `export default`** → moves to **UI scope** (inside Component callback)
3. **Other components** (export/non-export, non-default) → **access global variables through props**

### **Implementation Pattern:**

```tsx
//@page /profile
import { ref, Ref } from "auwla"

// Global state (moves to ProfilePage component scope)
const user = ref(null)
const theme = ref("light")

// Global functions (moves to ProfilePage component scope)  
function toggleTheme() {
  theme.value = theme.value === "light" ? "dark" : "light"
}

// Reusable component - receives global state as props
export function UserAvatar({ user, size }: { 
  user: Ref<any>, 
  size?: string 
}) {
  // Component logic here
  return <div>...</div>
}

// Another reusable component - receives global state as props
export function ThemeToggle({ 
  theme, 
  onToggle 
}: { 
  theme: Ref<string>, 
  onToggle: () => void 
}) {
  // Component logic here
  return <button onClick={onToggle}>...</button>
}

// Main page component - has access to global state
export default function ProfilePage() {
  // Page-specific state (moves to UI scope)
  const isEditing = ref(false)
  
  return (
    <div>
      {/* Pass global state as props */}
      <UserAvatar user={user} size="large" />
      <ThemeToggle theme={theme} onToggle={toggleTheme} />
    </div>
  )
}
```

### **Expected Compiled Output:**

```js
// Reusable component
export function UserAvatar({ user, size = "medium" }) {
  return Component((ui) => {
    // Component logic here
  })
}

// Reusable component  
export function ThemeToggle({ theme, onToggle }) {
  return Component((ui) => {
    // Component logic here
  })
}

// Page component (has lifecycle)
export default function ProfilePage() {
  // Logic that was outside page scope → now inside page scope
  const user = ref(null)
  const theme = ref("light")
  function toggleTheme() {
    theme.value = theme.value === "light" ? "dark" : "light"
  }
  
  return Component((ui) => {
    // Logic that was inside page scope → now inside Component UI scope
    const isEditing = ref(false)
    
    // UI generation with props passed to components
    ui.append(UserAvatar({ user: user, size: "large" }))
    ui.append(ThemeToggle({ theme: theme, onToggle: toggleTheme }))
  })
}
```

## ✅ **Key Benefits:**
1. **No reference errors** - components access global state through props
2. **Type safety** - props have proper TypeScript annotations
3. **Clean separation** - global state stays in page scope, components are reusable
4. **Proper scoping** - follows the @page scoping rules correctly

## 🎯 **This is the correct architectural pattern for @page files with multiple components!**

The current compiler implementation works perfectly for single-component @page files. For multiple components, developers should follow this props-based pattern to avoid scoping issues.