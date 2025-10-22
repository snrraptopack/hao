import { Component, ref, watch } from 'auwla'
import type { Ref, LayoutBuilder } from 'auwla'

// Page component (has lifecycle)
export default function DashboardPage() {
  // Logic that was outside page scope → now inside page scope
  const user = ref(null)
  const notifications = ref([])
  const settings = ref({ theme: 'light', language: 'en' })
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
  const unreadCount = computed(() => 
  notifications.value.filter(n => !n.read).length
)
  const userDisplayName = computed(() => 
  user.value ? `${user.value.firstName} ${user.value.lastName}` : 'Guest'
)

  return Component((ui: LayoutBuilder) => {
    // Logic that was inside page scope → now inside Component UI scope
    const activeTab = ref('overview')
    const isLoading = ref(false)
    const searchQuery = ref('')
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
    const filteredNotifications = computed(() =>
    notifications.value.filter(n => 
      n.message.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  )

    ui.Div({ className: `dashboard ${settings.value.theme}` }, (ui: LayoutBuilder) => {
      ui.Header({}, (ui: LayoutBuilder) => {
        ui.H1({ text: watch([userDisplayName], () => `Welcome,${userDisplayName.value}!`) as Ref<string> })
        ui.Div({ text: watch([unreadCount], () => `Notifications (${unreadCount.value})`) as Ref<string>, className: "notifications" })
        ui.Button({ text: watch([isLoading], () => `isLoading.value ? 'Refreshing...' : 'Refresh'`) as Ref<string>, on: { click: (e) => refreshData() }, disabled: isLoading.value })
      })
      ui.Nav({}, (ui: LayoutBuilder) => {
        ui.Button({ text: "Overview", className: watch([activeTab], () => activeTab.value === 'overview' ? 'active' : '') as Ref<string>, on: { click: () => switchTab('overview') } })
        ui.Button({ text: "Notifications", className: watch([activeTab], () => activeTab.value === 'notifications' ? 'active' : '') as Ref<string>, on: { click: () => switchTab('notifications') } })
      })
      ui.Main({}, (ui: LayoutBuilder) => {
        if (watch([activeTab], () => activeTab.value === 'overview') as Ref<boolean>) {
          ui.Div({}, (ui: LayoutBuilder) => {
            ui.H2({ text: "Dashboard Overview" })
            ui.P({ text: `User:${user.value?.email}` })
            ui.P({ text: watch([settings], () => `Theme:${settings.value.theme}`) as Ref<string> })
          })
        }
        if (watch([activeTab], () => activeTab.value === 'notifications') as Ref<boolean>) {
          ui.Div({}, (ui: LayoutBuilder) => {
            ui.H2({ text: "Notifications" })
            ui.Input({ placeholder: "Search notifications...", value: searchQuery.value })
            ui.Button({ text: "Search", on: { click: (e) => handleSearch() } })
            ui.Div({ className: "notification-list" }, (ui: LayoutBuilder) => {
              filteredNotifications.value.forEach((notification, index) => {
                ui.Div({ text: `notification.message`, className: notification.read ? 'read' : 'unread' })
              })
            })
          })
        }
      })
    })
  })
}
