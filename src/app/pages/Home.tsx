
export function HomePage(){
  return (
    <div class="space-y-4">
      <h2 class="text-2xl font-bold">Welcome</h2>
      <p class="text-gray-700">This app demonstrates route splitting, composition, layouts, guards, and data fetching.</p>
      <ul class="list-disc pl-6 text-gray-700 space-y-1">
        <li>Modular routes under <code>/app/*</code></li>
        <li>Admin area protected by a guard</li>
        <li>Users and Posts fetched from JSONPlaceholder</li>
        <li>Search page reacts to query parameters</li>
        <li>Layout wrapping with shared navigation</li>
      </ul>
    </div>
  )
}