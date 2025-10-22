import { Component, ref, watch } from 'auwla'
import type { LayoutBuilder, Ref } from 'auwla'

export default function NestedConditionalsPage() {
  // Logic that was outside page scope → now inside page scope
  const user = ref({
  id: 1,
  name: 'John Doe',
  role: 'user',
  // 'admin', 'moderator', 'user', 'guest'
  subscription: 'premium',
  // 'free', 'premium', 'enterprise'
  permissions: ['read', 'write'],
  profile: {
    isComplete: true,
    hasAvatar: false,
    isVerified: true
  },
  settings: {
    notifications: true,
    darkMode: false,
    language: 'en'
  }
});
  const features = ref({
  betaFeatures: true,
  advancedAnalytics: false,
  customThemes: true,
  apiAccess: false
});
  const currentPage = ref('dashboard');
  const isLoading = ref(false);
  const hasError = ref(false);
  const errorMessage = ref('');

  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: "min-h-screen bg-gray-50" }, (ui: LayoutBuilder) => {
      ui.Nav({ className: "bg-white shadow" }, (ui: LayoutBuilder) => {
      ui.Div({ className: "max-w-7xl mx-auto px-4" }, (ui: LayoutBuilder) => {
      ui.Div({ className: "flex justify-between h-16" }, (ui: LayoutBuilder) => {
      ui.Div({ className: "flex items-center space-x-8" }, (ui: LayoutBuilder) => {
      ui.H1({ className: "text-xl font-bold" , text: "App"})
      ui.Div({ className: "flex space-x-4" }, (ui: LayoutBuilder) => {
      ui.A({ href: "/dashboard", className: "text-gray-700" , text: "Dashboard"})
      ui.When(watch([user], () => user.value.role !== 'guest') as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.A({ href: "/profile", className: "text-gray-700" , text: "Profile"})
      })
      ui.When(watch([user], () => $if(user.value.subscription === 'premium' || user.value.subscription === 'enterprise')) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.A({ href: "/analytics", className: "text-gray-700" , text: "Analytics"})
      })
      ui.When(watch([user], () => user.value.role === 'admin') as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Div({ className: "flex space-x-4" }, (ui: LayoutBuilder) => {
      ui.A({ href: "/admin", className: "text-red-600" , text: "Admin Panel"})
      ui.When(watch([user], () => user.value.permissions.includes('write')) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.A({ href: "/admin/users", className: "text-red-600" , text: "User Management"})
      })
    })
      })
      ui.When(watch([user], () => $if(user.value.role === 'moderator' || user.value.role === 'admin')) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.A({ href: "/moderation", className: "text-orange-600" , text: "Moderation"})
      })
    })
    })
      ui.Div({ className: "flex items-center space-x-4" }, (ui: LayoutBuilder) => {
      ui.When(watch([user], () => user.value.settings.notifications) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Button({ className: "relative" }, (ui: LayoutBuilder) => {
      ui.Text({ text: "🔔" })
      ui.When(watch([user], () => user.value.subscription !== 'free') as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Span({ className: "absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center" , text: "3"})
      })
    })
      })
      ui.Div({ className: "relative" }, (ui: LayoutBuilder) => {
      ui.Text({ value: `${user.value.profile.hasAvatar ? <img src="/avatar.jpg" alt="Avatar" className="w-8 h-8 rounded-full" /> : <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                                        {user.value.name.charAt(0)}
                                    </div>}` })
      ui.When(watch([user], () => user.value.profile.isVerified) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Span({ className: "absolute -bottom-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center" , text: "✓"})
      })
    })
    })
    })
    })
    })
      ui.Main({ className: "max-w-7xl mx-auto py-6 px-4" }, (ui: LayoutBuilder) => {
      ui.Text({ value: `${hasError.value ? <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <h3 className="text-red-800 font-medium">Error</h3>
                        <p className="text-red-600">{errorMessage.value}</p>

                        {/* Admin users see more error details */}
                        {user.value.role === 'admin' && <details className="mt-2">
                                <summary className="text-red-700 cursor-pointer">Technical Details</summary>
                                <pre className="mt-2 text-xs bg-red-100 p-2 rounded">
                                    Stack trace would go here...
                                </pre>
                            </details>}
                    </div> : isLoading.value ? <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading...</p>
                    </div> : <div className="space-y-6">
                        {/* Welcome section with personalization */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-2xl font-bold mb-4">
                                Welcome back, {user.value.name}!
                            </h2>

                            {/* Profile completion prompts */}
                            {!user.value.profile.isComplete && <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                                    <h3 className="text-yellow-800 font-medium">Complete Your Profile</h3>
                                    <div className="mt-2 space-y-2">
                                        {!user.value.profile.hasAvatar && <p className="text-yellow-700">• Add a profile picture</p>}
                                        {!user.value.profile.isVerified && <p className="text-yellow-700">• Verify your email address</p>}
                                    </div>
                                </div>}

                            {/* Subscription-based content */}
                            {user.value.subscription === 'free' ? <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <h3 className="text-blue-800 font-medium">Upgrade to Premium</h3>
                                    <p className="text-blue-700 mt-1">
                                        Unlock advanced features and remove limitations
                                    </p>
                                    <button className="mt-3 bg-blue-500 text-white px-4 py-2 rounded">
                                        Upgrade Now
                                    </button>
                                </div> : user.value.subscription === 'premium' ? <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                    <h3 className="text-purple-800 font-medium">Premium Member</h3>
                                    <p className="text-purple-700 mt-1">
                                        You have access to all premium features
                                    </p>

                                    {/* Enterprise upsell for premium users */}
                                    {user.value.role === 'admin' && <div className="mt-3">
                                            <p className="text-sm text-purple-600">
                                                Need team features? Consider upgrading to Enterprise
                                            </p>
                                            <button className="mt-2 text-purple-600 text-sm underline">
                                                Learn More
                                            </button>
                                        </div>}
                                </div> : <div className="bg-gold-50 border border-gold-200 rounded-lg p-4">
                                    <h3 className="text-gold-800 font-medium">Enterprise Member</h3>
                                    <p className="text-gold-700 mt-1">
                                        You have access to all features including team management
                                    </p>
                                </div>}
                        </div>

                        {/* Feature grid with conditional access */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Basic features - available to all */}
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="font-medium mb-2">Dashboard</h3>
                                <p className="text-gray-600 text-sm mb-4">View your basic statistics</p>
                                <button className="w-full bg-blue-500 text-white py-2 rounded">
                                    Open Dashboard
                                </button>
                            </div>

                            {/* Premium features */}
                            {user.value.subscription !== 'free' ? <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="font-medium mb-2">Advanced Analytics</h3>
                                    <p className="text-gray-600 text-sm mb-4">Detailed insights and reports</p>

                                    {features.value.advancedAnalytics ? <button className="w-full bg-green-500 text-white py-2 rounded">
                                            View Analytics
                                        </button> : <button className="w-full bg-gray-300 text-gray-500 py-2 rounded cursor-not-allowed">
                                            Coming Soon
                                        </button>}
                                </div> : <div className="bg-gray-50 rounded-lg shadow p-6 opacity-75">
                                    <h3 className="font-medium mb-2">Advanced Analytics</h3>
                                    <p className="text-gray-600 text-sm mb-4">Detailed insights and reports</p>
                                    <div className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded mb-2">
                                        Premium Feature
                                    </div>
                                    <button className="w-full bg-gray-300 text-gray-500 py-2 rounded cursor-not-allowed">
                                        Upgrade Required
                                    </button>
                                </div>}

                            {/* Admin-only features */}
                            {user.value.role === 'admin' ? <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="font-medium mb-2">User Management</h3>
                                    <p className="text-gray-600 text-sm mb-4">Manage users and permissions</p>

                                    {user.value.permissions.includes('write') ? <button className="w-full bg-red-500 text-white py-2 rounded">
                                            Manage Users
                                        </button> : <div>
                                            <div className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded mb-2">
                                                Write Permission Required
                                            </div>
                                            <button className="w-full bg-gray-300 text-gray-500 py-2 rounded cursor-not-allowed">
                                                Access Denied
                                            </button>
                                        </div>}
                                </div> : user.value.role === 'moderator' ? <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="font-medium mb-2">Content Moderation</h3>
                                    <p className="text-gray-600 text-sm mb-4">Review and moderate content</p>
                                    <button className="w-full bg-orange-500 text-white py-2 rounded">
                                        Open Moderation
                                    </button>
                                </div> : <div className="bg-gray-50 rounded-lg shadow p-6 opacity-75">
                                    <h3 className="font-medium mb-2">Admin Features</h3>
                                    <p className="text-gray-600 text-sm mb-4">Administrative tools</p>
                                    <div className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded mb-2">
                                        Admin Access Required
                                    </div>
                                    <button className="w-full bg-gray-300 text-gray-500 py-2 rounded cursor-not-allowed">
                                        Access Denied
                                    </button>
                                </div>}

                            {/* Beta features */}
                            {features.value.betaFeatures && <div className="bg-white rounded-lg shadow p-6 border-2 border-dashed border-blue-300">
                                    <div className="flex items-center mb-2">
                                        <h3 className="font-medium">Beta Features</h3>
                                        <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                            BETA
                                        </span>
                                    </div>
                                    <p className="text-gray-600 text-sm mb-4">Try our latest experimental features</p>

                                    {/* Only show to premium+ users */}
                                    {$if(user.value.subscription === 'premium' || user.value.subscription === 'enterprise') ? <button className="w-full bg-blue-500 text-white py-2 rounded">
                                            Try Beta Features
                                        </button> : <div>
                                            <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mb-2">
                                                Premium Required
                                            </div>
                                            <button className="w-full bg-gray-300 text-gray-500 py-2 rounded cursor-not-allowed">
                                                Upgrade to Access
                                            </button>
                                        </div>}
                                </div>}

                            {/* API Access */}
                            {user.value.subscription === 'enterprise' && <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="font-medium mb-2">API Access</h3>
                                    <p className="text-gray-600 text-sm mb-4">Integrate with our API</p>

                                    {features.value.apiAccess ? <div>
                                            <button className="w-full bg-green-500 text-white py-2 rounded mb-2">
                                                View API Docs
                                            </button>
                                            <p className="text-xs text-gray-500">Rate limit: 10,000 requests/hour</p>
                                        </div> : <div>
                                            <button className="w-full bg-yellow-500 text-white py-2 rounded mb-2">
                                                Request API Access
                                            </button>
                                            <p className="text-xs text-gray-500">Approval required</p>
                                        </div>}
                                </div>}
                        </div>

                        {/* Settings section with nested conditionals */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-medium mb-4">Quick Settings</h3>

                            <div className="space-y-4">
                                {/* Theme settings */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="font-medium">Dark Mode</span>
                                        {features.value.customThemes && user.value.subscription !== 'free' && <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                                Premium
                                            </span>}
                                    </div>

                                    {features.value.customThemes && user.value.subscription !== 'free' ? <input type="checkbox" checked={user.value.settings.darkMode} onChange={e => user.value.settings.darkMode = e.target.checked} /> : <div className="text-sm text-gray-500">Premium Feature</div>}
                                </div>

                                {/* Notification settings */}
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">Notifications</span>
                                    <input type="checkbox" checked={user.value.settings.notifications} onChange={e => user.value.settings.notifications = e.target.checked} />
                                </div>

                                {/* Language settings - only for verified users */}
                                {user.value.profile.isVerified && <div className="flex items-center justify-between">
                                        <span className="font-medium">Language</span>
                                        <select value={user.value.settings.language} onChange={e => user.value.settings.language = e.target.value} className="border rounded px-2 py-1">
                                            <option value="en">English</option>
                                            <option value="es">Spanish</option>
                                            <option value="fr">French</option>
                                        </select>
                                    </div>}
                            </div>
                        </div>
                    </div>}` })
    })
    })
  })
}
