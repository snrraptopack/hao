//@page /dashboard
//@title Dashboard
import { ref, computed } from "auwla"

// Global state management (outside page scope → should go inside page function)
const user = ref(null)
const notifications = ref([])
const settings = ref({ theme: 'light', language: 'en' })

// Global API functions (outside page scope → should go inside page function)
async function fetchUserData() {
  const response = await fetch('/api/user')
  user.value = await response.json()
}

async function fetchNotifications() {
  const response = await fetch('/api/notifications')
  notifications.value = await response.json()
}

function updateSettings(key, value) {
  settings.value[key] = value
}

// Global computed values (outside page scope → should go inside page function)
const unreadCount = computed(() => 
  notifications.value.filter(n => !n.read).length
)

const userDisplayName = computed(() => 
  user.value ? `${user.value.firstName} ${user.value.lastName}` : 'Guest'
)

export default function DashboardPage() {
  // Local UI state (inside page scope → should go inside Component UI scope)
  const activeTab = ref('overview')
  const isLoading = ref(false)
  const searchQuery = ref('')
  
  // Local UI functions (inside page scope → should go inside Component UI scope)
  function switchTab(tab) {
    activeTab.value = tab
  }
  
  function handleSearch() {
    console.log('Searching for:', searchQuery.value)
  }
  
  async function refreshData() {
    isLoading.value = true
    try {
      await Promise.all([fetchUserData(), fetchNotifications()])
    } finally {
      isLoading.value = false
    }
  }
  
  // Local computed values (inside page scope → should go inside Component UI scope)
  const filteredNotifications = computed(() =>
    notifications.value.filter(n => 
      n.message.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  )
  
  return (
    <div className={`dashboard ${settings.value.theme}`}>
      <header>
        <h1>Welcome, {userDisplayName.value}!</h1>
        <div className="notifications">
          Notifications ({unreadCount.value})
        </div>
        <button onClick={refreshData} disabled={isLoading.value}>
          {isLoading.value ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>
      
      <nav>
        <button 
          className={activeTab.value === 'overview' ? 'active' : ''}
          onClick={() => switchTab('overview')}
        >
          Overview
        </button>
        <button 
          className={activeTab.value === 'notifications' ? 'active' : ''}
          onClick={() => switchTab('notifications')}
        >
          Notifications
        </button>
      </nav>
      
      <main>
        {activeTab.value === 'overview' && (
          <div>
            <h2>Dashboard Overview</h2>
            <p>User: {user.value?.email}</p>
            <p>Theme: {settings.value.theme}</p>
          </div>
        )}
        
        {activeTab.value === 'notifications' && (
          <div>
            <h2>Notifications</h2>
            <input 
              value={searchQuery.value}
              placeholder="Search notifications..."
            />
            <button onClick={handleSearch}>Search</button>
            
            <div className="notification-list">
              {filteredNotifications.value.map(notification => (
                <div key={notification.id} className={notification.read ? 'read' : 'unread'}>
                  {notification.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}