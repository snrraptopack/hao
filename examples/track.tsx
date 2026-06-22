import { track, pending } from 'auwla/track';
import { event } from "auwla/events"

interface User {
  id: number;
  name: string;
  email: string;
}

function TrackDemo() {
  // --- Track 1: Promise-based fetch (starts immediately) ---
  let users: User[] = [];

  const loadUsers = track(
    'users',
    fetch('https://jsonplaceholder.typicode.com/users?_limit=5').then((r) => r.json()),
  );

  loadUsers.then((data) => {
    users = data as User[];
  });

  // --- Track 2: Async function (starts immediately, auto-cancels on re-track) ---
  let posts: { id: number; title: string }[] = [];
  let postQuery = '';

  const searchPosts = () => {
    track('posts', async (signal) => {
      const res = await fetch(
        `https://jsonplaceholder.typicode.com/posts?_limit=5&q=${encodeURIComponent(postQuery)}`,
        { signal },
      );
      posts = await res.json();
    });
  };

  // Start initial post search
  searchPosts();

  // --- Track 3: Long-running cancellable operation ---
  const upload = track('upload', async (signal) => {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    if (signal.aborted) return;
  });

  const uploadLabel: Record<string, string> = {
    idle: 'idle',
    pending: 'uploading',
    resolved: 'done',
    rejected: 'failed',
  };


  return () => (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '700px', margin: '40px auto' }}>
      <h1>event.track() Demo</h1>

      {/* Users — promise track */}
      <section style={{ padding: '16px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '16px' }}>
        <h3>Users (Promise Track)</h3>
        {loadUsers.pending && <p style={{ color: '#ff9900' }}>Loading users...</p>}
        {loadUsers.rejected && <p style={{ color: 'red' }}>Error: {String(loadUsers.reason)}</p>}
        {loadUsers.resolved && (
          <ul>
            {users.map((user) => (
              <li key={user.id}>
                {user.name} ({user.email})
              </li>
            ))}
          </ul>
        )}
        <small>Status: {loadUsers.status}</small>
      </section>

      {/* Posts — async function track with re-trigger */}
      <section style={{ padding: '16px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '16px' }}>
        <h3>Posts (Async Function Track)</h3>
        <input
          type="text"
          value={postQuery}
          placeholder="Filter posts..."
          onInput={event.debounce(500).handler((e) => {
            postQuery = (e.target as HTMLInputElement).value;
            searchPosts();
          })}
          style={{ padding: '8px', width: '100%', marginBottom: '8px' }}
        />
        {pending('posts') && <p style={{ color: '#ff9900' }}>Searching posts...</p>}
        {posts.length > 0 && (
          <ul>
            {posts.map((post) => (
              <li key={post.id}>{post.title}</li>
            ))}
          </ul>
        )}
        <small>Type to trigger a new search. Previous searches auto-cancel.</small>
      </section>

      {/* Upload — cancellable long-running track */}
      <section style={{ padding: '16px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3>Upload (Cancellable Track)</h3>
        <p>Status: <strong>{uploadLabel[upload.status] ?? upload.status}</strong></p>
        {upload.pending && (
          <button
            onClick={() => upload.cancel()}
            style={{ padding: '8px 16px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Cancel Upload
          </button>
        )}
        {upload.resolved && (
          <p style={{ color: 'green' }}>Upload complete!</p>
        )}
        {!upload.pending && !upload.resolved && (
          <p style={{ color: '#666' }}>Ready to upload.</p>
        )}
      </section>
    </div>
  );
}

export function TrackExample() {
  return () => <TrackDemo />;
}
