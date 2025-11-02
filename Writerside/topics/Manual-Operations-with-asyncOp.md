# Manual Operations: Forms, Buttons, and User Actions

In the previous guide, we learned about automatic data fetching with the `fetch()` helper. But not all operations should run automatically on mount—some should only run when the user takes an action, like submitting a form or clicking a button.

This guide covers **manual async operations** that you trigger on-demand, not automatically on mount.

> **What You'll Learn**
>
> - Understanding the difference between automatic and manual operations
> - Building manual operations from scratch with `ref`
> - Using Auwla's `asyncOp()` helper for forms and buttons
> - Handling form submissions with proper error states
> - Preventing double submissions and race conditions
> - Optimistic UI updates and success feedback
{style="note"}

## Automatic vs Manual Operations

Let's clarify the difference:

<tabs>
<tab title="Automatic Operations">

**Automatic operations** run on component mount and typically fetch/load data:

```TypeScriptJSX
import { fetch as createFetch } from 'auwla';

// ✅ Runs automatically when component mounts
const { data, loading, error } = createFetch<User[]>('/api/users');
```

**Use cases:**
- Loading data for display
- Fetching user profiles
- Loading product lists
- Getting initial application state

**Characteristics:**
- Runs immediately on mount
- Triggered by navigation or component creation
- Usually GET requests
- Data is displayed, not submitted

</tab>
<tab title="Manual Operations">

**Manual operations** run only when the user triggers them:

```TypeScriptJSX
import { asyncOp } from 'auwla';

// ❌ Does NOT run on mount
const { data, loading, error, refetch: submit } = asyncOp(async () => {
  const response = await window.fetch('/api/submit', {
    method: 'POST',
    body: JSON.stringify(formData)
  });
  return response.json();
});

// ✅ Only runs when user clicks button
<button onClick={() => submit()}>Submit Form</button>
```

**Use cases:**
- Form submissions
- Creating/updating/deleting data
- User actions (like, follow, purchase)
- Any POST/PUT/DELETE operations

**Characteristics:**
- Runs only when explicitly called
- Triggered by user actions (click, submit)
- Usually POST/PUT/DELETE requests
- Data is submitted, not just fetched

</tab>
</tabs>

**Key difference**: `fetch()` runs automatically on mount. `asyncOp()` only runs when you call it.

## The Manual Approach: Building Your Own

Let's start by building a form submission manually to understand what's involved:

```TypeScriptJSX
import { h, ref } from 'auwla';
import { When } from 'auwla';

type FormData = {
  name: string;
  email: string;
  message: string;
};

type SubmitResponse = {
  success: boolean;
  message: string;
};

export function ContactForm() {
  // Form fields
  const name = ref('');
  const email = ref('');
  const message = ref('');

  // Operation state
  const loading = ref(false);
  const error = ref<string | null>(null);
  const success = ref(false);
  const response = ref<SubmitResponse | null>(null);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    
    // Reset state
    loading.value = true;
    error.value = null;
    success.value = false;

    try {
      const res = await window.fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.value,
          email: email.value,
          message: message.value
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      response.value = data;
      success.value = true;

      // Clear form on success
      name.value = '';
      email.value = '';
      message.value = '';
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Contact Us</h2>

      <div>
        <label>Name:</label>
        <input
          type="text"
          value={name.value}
          onInput={(e) => name.value = (e.target as HTMLInputElement).value}
          required
        />
      </div>

      <div>
        <label>Email:</label>
        <input
          type="email"
          value={email.value}
          onInput={(e) => email.value = (e.target as HTMLInputElement).value}
          required
        />
      </div>

      <div>
        <label>Message:</label>
        <textarea
          value={message.value}
          onInput={(e) => message.value = (e.target as HTMLTextAreaElement).value}
          required
        />
      </div>

      <When>
        {error}
        {() => <div class="error">❌ Error: {error.value}</div>}
      </When>

      <When>
        {success}
        {() => <div class="success">✅ Message sent successfully!</div>}
      </When>

      <button type="submit" disabled={loading.value}>
        {loading.value ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}
```

**What's happening:**
1. Create `ref`s for form fields and operation state
2. Define `handleSubmit` function that runs on form submit
3. Manually manage `loading`, `error`, and `success` states
4. Make POST request with form data
5. Handle success/error states and update UI
6. Disable button while loading to prevent double submission

This works, but notice the boilerplate!

## Introducing Auwla's `asyncOp()` Helper

Auwla provides an `asyncOp()` helper that handles manual operation state automatically:

```TypeScriptJSX
import { h, ref } from 'auwla';
import { asyncOp } from 'auwla';
import { When } from 'auwla';

type FormData = {
  name: string;
  email: string;
  message: string;
};

type SubmitResponse = {
  success: boolean;
  message: string;
};

export function ContactForm() {
  // Form fields
  const name = ref('');
  const email = ref('');
  const message = ref('');

  // Manual operation - does NOT run on mount!
  const { data, loading, error, refetch: submit } = asyncOp<SubmitResponse>(async () => {
    const res = await window.fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.value,
        email: email.value,
        message: message.value
      })
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    return res.json();
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    await submit();

    // Clear form on success
    if (!error.value) {
      name.value = '';
      email.value = '';
      message.value = '';
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Contact Us</h2>

      <div>
        <label>Name:</label>
        <input
          type="text"
          value={name.value}
          onInput={(e) => name.value = (e.target as HTMLInputElement).value}
          required
        />
      </div>

      <div>
        <label>Email:</label>
        <input
          type="email"
          value={email.value}
          onInput={(e) => email.value = (e.target as HTMLInputElement).value}
          required
        />
      </div>

      <div>
        <label>Message:</label>
        <textarea
          value={message.value}
          onInput={(e) => message.value = (e.target as HTMLTextAreaElement).value}
          required
        />
      </div>

      <When>
        {error}
        {() => <div class="error">❌ Error: {error.value}</div>}
      </When>

      <When>
        {data}
        {() => <div class="success">✅ {data.value?.message}</div>}
      </When>

      <button type="submit" disabled={loading.value}>
        {loading.value ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}
```

**What you get automatically:**
- ✅ Reactive `data`, `loading`, `error` refs
- ✅ **Does NOT run on mount** (only when you call `submit()`)
- ✅ Automatic state management
- ✅ Built-in error handling
- ✅ Returns a `refetch` function (renamed to `submit` here for clarity)

**Compare to manual approach:**
- ❌ Manual state management → ✅ Automatic
- ❌ Manual try/catch → ✅ Built-in
- ❌ Manual loading flags → ✅ Automatic

## Understanding `asyncOp()` vs `fetch()`

Here's the key difference:

<tabs>
<tab title="fetch() - Automatic">

```TypeScriptJSX
import { fetch as createFetch } from 'auwla';

// ✅ Runs IMMEDIATELY on component mount
const { data, loading, error, refetch } = createFetch<User[]>('/api/users');

// Data starts loading right away
// Used for displaying data
```

**When to use:**
- Loading data for display
- GET requests that should run immediately
- Data that's needed as soon as the component renders

</tab>
<tab title="asyncOp() - Manual">

```TypeScriptJSX
import { asyncOp } from 'auwla';

// ❌ Does NOT run on mount
const { data, loading, error, refetch: execute } = asyncOp<Result>(async () => {
  // Your async operation here
  return await someOperation();
});

// Only runs when you call execute()
<button onClick={() => execute()}>Run Operation</button>
```

**When to use:**
- Form submissions
- Button click actions
- POST/PUT/DELETE operations
- User-triggered operations

</tab>
</tabs>

**Memory trick**: 
- `fetch()` = **F**etch **E**verything **T**riggers **C**reation **H**euristic (runs on mount)
- `asyncOp()` = **Op**eration (manual, on-demand)

## Preventing Double Submissions

One critical feature: `asyncOp()` automatically prevents double submissions by providing a reactive `loading` ref:

```TypeScriptJSX
import { asyncOp } from 'auwla';

export function DeleteButton({ userId }: { userId: number }) {
  const { loading, error, refetch: deleteUser } = asyncOp(async () => {
    const res = await window.fetch(`/api/users/${userId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    return res.json();
  });

  return (
    <div>
      <button 
        onClick={() => deleteUser()} 
        disabled={loading.value}  // ← Prevents double clicks!
      >
        {loading.value ? 'Deleting...' : 'Delete User'}
      </button>

      {error.value && <div class="error">{error.value}</div>}
    </div>
  );
}
```

**What happens:**
1. User clicks "Delete User"
2. `loading` becomes `true` immediately
3. Button becomes disabled (can't click again)
4. Request processes
5. `loading` becomes `false` when done
6. Button re-enables

**Without this**: User could click multiple times and trigger multiple delete requests! 💥

## Real-World Example: User Registration Form

Let's build a complete registration form with validation and error handling:

```TypeScriptJSX
import { h, ref, derive } from 'auwla';
import { asyncOp } from 'auwla';
import { When } from 'auwla';

type RegisterData = {
  username: string;
  email: string;
  password: string;
};

type RegisterResponse = {
  success: boolean;
  message: string;
  userId?: number;
};

export function RegistrationForm() {
  // Form fields
  const username = ref('');
  const email = ref('');
  const password = ref('');
  const confirmPassword = ref('');

  // Client-side validation
  const passwordsMatch = derive(
    [password, confirmPassword],
    ([pwd, confirm]) => pwd === confirm || confirm === ''
  );

  const isFormValid = derive(
    [username, email, password, confirmPassword, passwordsMatch],
    ([user, mail, pwd, confirm, match]) =>
      user.length >= 3 &&
      mail.includes('@') &&
      pwd.length >= 8 &&
      confirm.length > 0 &&
      match
  );

  // Registration operation
  const { data, loading, error, refetch: register } = asyncOp<RegisterResponse>(async () => {
    const res = await window.fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value,
        email: email.value,
        password: password.value
      })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Registration failed');
    }

    return res.json();
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    
    if (!isFormValid.value) {
      return;
    }

    await register();

    // Clear form on success
    if (!error.value && data.value?.success) {
      username.value = '';
      email.value = '';
      password.value = '';
      confirmPassword.value = '';
    }
  };

  return (
    <div class="registration-form">
      <h2>Create Account</h2>

      <form onSubmit={handleSubmit}>
        <div class="form-group">
          <label>Username:</label>
          <input
            type="text"
            value={username.value}
            onInput={(e) => username.value = (e.target as HTMLInputElement).value}
            placeholder="At least 3 characters"
            required
          />
          {username.value.length > 0 && username.value.length < 3 && (
            <span class="validation-error">Username too short</span>
          )}
        </div>

        <div class="form-group">
          <label>Email:</label>
          <input
            type="email"
            value={email.value}
            onInput={(e) => email.value = (e.target as HTMLInputElement).value}
            required
          />
        </div>

        <div class="form-group">
          <label>Password:</label>
          <input
            type="password"
            value={password.value}
            onInput={(e) => password.value = (e.target as HTMLInputElement).value}
            placeholder="At least 8 characters"
            required
          />
          {password.value.length > 0 && password.value.length < 8 && (
            <span class="validation-error">Password too short</span>
          )}
        </div>

        <div class="form-group">
          <label>Confirm Password:</label>
          <input
            type="password"
            value={confirmPassword.value}
            onInput={(e) => confirmPassword.value = (e.target as HTMLInputElement).value}
            required
          />
          {!passwordsMatch.value && confirmPassword.value.length > 0 && (
            <span class="validation-error">Passwords don't match</span>
          )}
        </div>

        <When>
          {error}
          {() => (
            <div class="error-message">
              <strong>❌ Registration Error:</strong>
              <p>{error.value}</p>
            </div>
          )}
        </When>

        <When>
          {() => data.value?.success}
          {() => (
            <div class="success-message">
              <strong>✅ Success!</strong>
              <p>{data.value?.message}</p>
              <p>Redirecting to login...</p>
            </div>
          )}
        </When>

        <button
          type="submit"
          disabled={!isFormValid.value || loading.value}
          class="submit-button"
        >
          {loading.value ? '⏳ Creating Account...' : '🚀 Create Account'}
        </button>

        <p class="form-hint">
          Already have an account? <a href="/login">Sign in</a>
        </p>
      </form>
    </div>
  );
}
```

**Features:**
- ✅ Real-time validation with `derive`
- ✅ Password matching check
- ✅ Disabled button until form is valid
- ✅ Prevents double submission
- ✅ Clear error/success messages
- ✅ Form clears on successful registration
- ✅ Loading state with visual feedback

## Optimistic UI Updates

Sometimes you want to update the UI immediately before the server responds, then rollback if it fails:

```TypeScriptJSX
import { h, ref } from 'auwla';
import { asyncOp } from 'auwla';

type Post = {
  id: number;
  title: string;
  likes: number;
  liked: boolean;
};

export function LikeButton({ post }: { post: Post }) {
  const localPost = ref<Post>(post);

  const { loading, error, refetch: toggleLike } = asyncOp(async () => {
    // Save the previous state for rollback
    const previousState = { ...localPost.value };

    // Optimistic update - happens immediately!
    localPost.value = {
      ...localPost.value,
      liked: !localPost.value.liked,
      likes: localPost.value.liked 
        ? localPost.value.likes - 1 
        : localPost.value.likes + 1
    };

    try {
      const res = await window.fetch(`/api/posts/${post.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liked: localPost.value.liked })
      });

      if (!res.ok) {
        throw new Error('Failed to update like');
      }

      return res.json();
    } catch (err) {
      // Rollback on error!
      localPost.value = previousState;
      throw err;
    }
  });

  return (
    <button
      onClick={() => toggleLike()}
      class={localPost.value.liked ? 'liked' : 'not-liked'}
      disabled={loading.value}
    >
      {localPost.value.liked ? '❤️' : '🤍'} {localPost.value.likes}
    </button>
  );
}
```

**What happens:**
1. User clicks → UI updates **immediately** (optimistic)
2. Request goes to server in the background
3. If successful → UI stays updated ✅
4. If fails → UI **rolls back** to previous state ❌

**Result**: The app feels instant and responsive!

## Combining `fetch()` and `asyncOp()`

Often you need both: fetch data automatically, then allow manual operations:

```TypeScriptJSX
import { h, ref } from 'auwla';
import { fetch as createFetch, asyncOp } from 'auwla';
import { When, For } from 'auwla';

type Todo = {
  id: number;
  title: string;
  completed: boolean;
};

export function TodoList() {
  const newTodoTitle = ref('');

  // Automatic: Load todos on mount
  const { data: todos, loading: loadingTodos, refetch: refetchTodos } = 
    createFetch<Todo[]>('/api/todos');

  // Manual: Add new todo (only on button click)
  const { loading: addingTodo, error: addError, refetch: addTodo } = 
    asyncOp<Todo>(async () => {
      const res = await window.fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTodoTitle.value })
      });

      if (!res.ok) throw new Error('Failed to add todo');

      const newTodo = await res.json();
      
      // Refresh the list after adding
      await refetchTodos();
      
      // Clear input
      newTodoTitle.value = '';

      return newTodo;
    });

  // Manual: Delete todo (only on button click)
  const { loading: deletingTodo, refetch: deleteTodo } = 
    asyncOp<void>(async (todoId: number) => {
      const res = await window.fetch(`/api/todos/${todoId}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Failed to delete todo');

      // Refresh the list after deleting
      await refetchTodos();
    });

  const handleAddTodo = async (e: Event) => {
    e.preventDefault();
    if (newTodoTitle.value.trim()) {
      await addTodo();
    }
  };

  return (
    <div class="todo-list">
      <h2>My Todos</h2>

      {/* Add Todo Form */}
      <form onSubmit={handleAddTodo}>
        <input
          type="text"
          value={newTodoTitle.value}
          onInput={(e) => newTodoTitle.value = (e.target as HTMLInputElement).value}
          placeholder="What needs to be done?"
        />
        <button type="submit" disabled={addingTodo.value}>
          {addingTodo.value ? 'Adding...' : 'Add Todo'}
        </button>
      </form>

      {addError.value && (
        <div class="error">Error: {addError.value}</div>
      )}

      {/* Todo List */}
      <When>
        {loadingTodos}
        {() => <div class="loading">Loading todos...</div>}
        
        {() => (
          <ul>
            <For each={todos}>
              {(todo) => (
                <li class={todo.completed ? 'completed' : ''}>
                  <span>{todo.title}</span>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    disabled={deletingTodo.value}
                  >
                    🗑️
                  </button>
                </li>
              )}
            </For>
          </ul>
        )}
      </When>
    </div>
  );
}
```

**Pattern breakdown:**
1. **`createFetch()`** loads todos automatically on mount
2. **`asyncOp()`** for adding todos (only on form submit)
3. **`asyncOp()`** for deleting todos (only on button click)
4. Both manual operations call `refetchTodos()` to refresh the list

This is a common and powerful pattern!

## Handling File Uploads

`asyncOp()` works great for file uploads too:

```TypeScriptJSX
import { h, ref } from 'auwla';
import { asyncOp } from 'auwla';
import { When } from 'auwla';

type UploadResponse = {
  url: string;
  filename: string;
};

export function FileUpload() {
  const selectedFile = ref<File | null>(null);

  const { data, loading, error, refetch: uploadFile } = asyncOp<UploadResponse>(async () => {
    if (!selectedFile.value) {
      throw new Error('No file selected');
    }

    const formData = new FormData();
    formData.append('file', selectedFile.value);

    const res = await window.fetch('/api/upload', {
      method: 'POST',
      body: formData // Don't set Content-Type, browser sets it with boundary
    });

    if (!res.ok) {
      throw new Error(`Upload failed: ${res.statusText}`);
    }

    return res.json();
  });

  const handleFileChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      selectedFile.value = input.files[0];
    }
  };

  return (
    <div class="file-upload">
      <h3>Upload File</h3>

      <input
        type="file"
        onChange={handleFileChange}
        disabled={loading.value}
      />

      {selectedFile.value && (
        <div class="file-info">
          Selected: <strong>{selectedFile.value.name}</strong>
          ({(selectedFile.value.size / 1024).toFixed(2)} KB)
        </div>
      )}

      <button
        onClick={() => uploadFile()}
        disabled={!selectedFile.value || loading.value}
      >
        {loading.value ? '📤 Uploading...' : '📤 Upload'}
      </button>

      <When>
        {error}
        {() => <div class="error">❌ {error.value}</div>}
      </When>

      <When>
        {data}
        {() => (
          <div class="success">
            ✅ File uploaded successfully!
            <br />
            <a href={data.value?.url} target="_blank">View file</a>
          </div>
        )}
      </When>
    </div>
  );
}
```

**Features:**
- File selection with info display
- Disabled button until file is selected
- Upload progress indication
- Success message with download link
- Error handling

## Key Takeaways

**Understanding the difference is critical**:
- **`fetch()`**: Runs automatically on mount, for loading/displaying data
- **`asyncOp()`**: Runs manually on user action, for submitting/mutating data

**Manual operations pattern**:
- Use `asyncOp()` for forms, buttons, and user actions
- Returns `{ data, loading, error, refetch }`
- The `refetch` function is what you call to execute the operation
- Does NOT run on component mount

**Best practices**:
- Always disable buttons during `loading` to prevent double submission
- Clear form fields on success
- Show clear error/success messages
- Use optimistic updates for instant feedback
- Combine `fetch()` and `asyncOp()` for complete CRUD operations

**Next steps**: We've covered basic data fetching and manual operations. In the next guide, we'll dive deep into `createResource()` for advanced caching, invalidation, and cross-component data sharing.

> **What We've Learned**
>
> You now understand the difference between automatic fetching with `fetch()` and manual operations with `asyncOp()`. You've seen how to build forms from scratch, then use `asyncOp()` to eliminate boilerplate while maintaining full control over when operations run. You've learned patterns for preventing double submissions, handling errors gracefully, and implementing optimistic UI updates for a responsive user experience.
{style="note"}

