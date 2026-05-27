import { createMemoApp,commit,component } from 'auwla';

interface User {
  id: number;
  name: string;
  email: string;
}


function FetchOnLoad() {
  // 1. Setup Phase: Plain JS variables.
  let users: User[] = [];
  let loading = true;
  let error = ""

  // 2. Fetch on Load inside Setup (starts asynchronously, but won't trigger re-render)
  fetch('https://jsonplaceholder.typicode.com/users?_limit=5')
    .then(res => res.json())
    .then(data => {
      users = data;
      console.log('Data fetched in background:', users);
      // We mutate variables, but there is no event or state wrapper, so the UI won't update!
      // if we dont bring the commit()
    }).catch(err => {
      error = err.message
    }).finally(() => {
      loading = false
      commit();
    });

  // 3. Render Phase
  return () => (
    <div
      style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: '40px auto' }}>
      <h1>Auwla Data Fetching Test</h1>

      <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h3>Fetch on Load (No State, No Invalidation)</h3>
        <p style={{ color: '#666' }}>
          This component triggers a fetch inside its setup phase. Check the console—you'll see the logs,
          but the UI will remain stuck in "Loading..." forever because no re-render is triggered.
        </p>

        {loading ? (
          <div style={{ color: '#ff9900', fontWeight: 'bold' }}>Loading users...</div>
        ) : error ? (
            <p>{error}</p>
        ): (
          <ul>
            {users.map(user => (
              <li key={user.id}>{user.name} ({user.email})</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Bootstrap the app
const root = document.getElementById('app');
if (root) {
  createMemoApp(root, <FetchOnLoad />);
}
