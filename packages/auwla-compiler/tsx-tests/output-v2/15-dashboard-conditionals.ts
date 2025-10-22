import { Component, ref, watch } from 'auwla'
import type { LayoutBuilder, Ref } from 'auwla'

export default function DashboardPage() {
  // Logic that was outside page scope → now inside page scope
  const user = ref({
  name: 'John Doe',
  role: 'admin',
  isActive: true,
  permissions: ['read', 'write', 'admin']
});
  const notifications = ref([{
  id: 1,
  type: 'info',
  message: 'Welcome back!',
  read: false
}, {
  id: 2,
  type: 'warning',
  message: 'Server maintenance scheduled',
  read: true
}, {
  id: 3,
  type: 'error',
  message: 'Failed login attempt',
  read: false
}]);
  const isLoading = ref(false);
  const showSidebar = ref(true);
  const currentView = ref('overview');

  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: "min-h-screen bg-gray-100" }, (ui: LayoutBuilder) => {
      ui.Header({ className: "bg-white shadow" }, (ui: LayoutBuilder) => {
      ui.Div({ className: "flex justify-between items-center p-4" }, (ui: LayoutBuilder) => {
      ui.H1({text: "Dashboard"})
      ui.When(watch([user], () => user.value) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Div({ className: "flex items-center space-x-2" }, (ui: LayoutBuilder) => {
      ui.Span({text: watch([user], () => `${user.value}.name`)})
      ui.When(watch([user], () => user.value.isActive) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Span({ className: "w-2 h-2 bg-green-500 rounded-full" })
      })
      ui.When(watch([user], () => !user.value.isActive) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Span({ className: "w-2 h-2 bg-red-500 rounded-full" })
      })
    })
      })
      ui.When(watch([user], () => $if(user.value && user.value.role === 'admin')) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Span({ className: "px-2 py-1 bg-red-100 text-red-800 rounded" , text: "Admin"})
      })
    })
    })
      ui.Div({ className: "flex" }, (ui: LayoutBuilder) => {
      ui.When(watch([showSidebar], () => showSidebar.value) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Aside({ className: "w-64 bg-white shadow-sm" }, (ui: LayoutBuilder) => {
      ui.Nav({ className: "p-4" }, (ui: LayoutBuilder) => {
      ui.Ul({ className: "space-y-2" }, (ui: LayoutBuilder) => {
      ui.Li({}, (ui: LayoutBuilder) => {
      ui.Button({ className: currentView.value === 'overview' ? 'font-bold' : '', on: { click: () => currentView.value = 'overview' } , text: "Overview"})
    })
      ui.When(watch([user], () => $if(user.value && user.value.permissions.includes('admin'))) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Li({}, (ui: LayoutBuilder) => {
      ui.Button({ className: currentView.value === 'admin' ? 'font-bold' : '', on: { click: () => currentView.value = 'admin' } , text: "Admin Panel"})
    })
      })
      ui.When(watch([user], () => user.value && user.value.permissions.includes('read')) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Li({}, (ui: LayoutBuilder) => {
      ui.Button({ className: currentView.value === 'analytics' ? 'font-bold' : '', on: { click: () => currentView.value = 'analytics' } , text: "Analytics"})
    })
      })
    })
    })
    })
      })
      ui.Main({ className: "flex-1 p-6" }, (ui: LayoutBuilder) => {
      ui.Text({ value: `${isLoading.value ? <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div> : <div>
              {/* Conditional content based on current view */}
              {currentView.value === 'overview' && <div>
                  <h2>Overview</h2>
                  
                  {/* Notification center */}
                  {notifications.value.length > 0 && <div className="mb-6">
                      <h3>Notifications</h3>
                      {notifications.value.map(notification => <div key={notification.id} className={`p-3 mb-2 rounded ${notification.type === 'error' ? 'bg-red-100' : notification.type === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'}`}>
                          <div className="flex justify-between">
                            <span>{notification.message}</span>
                            {!notification.read && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
                          </div>
                        </div>)}
                    </div>}
                  
                  {/* Empty state */}
                  {notifications.value.length === 0 && <div className="text-center py-8 text-gray-500">
                      <p>No notifications</p>
                    </div>}
                </div>}

              {/* Admin panel view */}
              {$if(currentView.value === 'admin') && <div>
                  <h2>Admin Panel</h2>
                  
                  {/* Permission check */}
                  {$if(user.value && user.value.permissions.includes('admin')) ? <div>
                      <p>Admin controls go here</p>
                      
                      {/* Nested conditionals */}
                      {user.value.role === 'admin' && <div className="mt-4">
                          <button className="bg-red-500 text-white px-4 py-2 rounded">
                            Dangerous Action
                          </button>
                        </div>}
                    </div> : <div className="text-red-500">
                      Access denied. Admin permissions required.
                    </div>}
                </div>}

              {/* Analytics view */}
              {currentView.value === 'analytics' && <div>
                  <h2>Analytics</h2>
                  
                  {/* Multiple condition checks */}
                  {$if(user.value && user.value.permissions.includes('read') && user.value.isActive) && <div>
                      <p>Analytics data would go here</p>
                      
                      {/* Chart placeholder with conditional rendering */}
                      {user.value.permissions.includes('admin') ? <div className="h-64 bg-gray-200 rounded flex items-center justify-center">
                          <span>Advanced Analytics Chart</span>
                        </div> : <div className="h-32 bg-gray-100 rounded flex items-center justify-center">
                          <span>Basic Analytics Chart</span>
                        </div>}
                    </div>}
                </div>}
            </div>}` })
    })
    })
    })
  })
}
