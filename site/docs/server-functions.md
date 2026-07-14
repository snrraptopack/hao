# Server Functions

Auwla allows you to write backend code directly alongside your frontend views. By co-locating `.server.ts` files with your page templates, you can call database queries or external APIs securely without writing REST endpoints or manual fetch requests.

---

## Co-Located Server Files

Any `.tsx` page file inside your `src/pages` directory can have a co-located `.server.ts` file:

```
src/pages/
  posts/
    [id].tsx          ← Client-side page component
    [id].server.ts    ← Co-located server functions
```

---

## The Remote-Only Rule

Server files (`*.server.ts`) compile into secure endpoints. To prevent accidental leaks of sensitive backend code or server credentials to the client, **server files must only export remote functions**. 

You declare remote functions using the `remote` builder. Exporting any standard non-remote function in a `.server.ts` file will throw a compile-time error:

```typescript
// src/pages/posts/[id].server.ts
import { remote } from 'auwla/server';
import { db } from '../../db';

// ✅ Valid: Exporting a remote function
export const getPost = remote.get(async (ctx) => {
  const { id } = ctx.params;
  return await db.posts.findUnique({ where: { id } });
});

// ❌ COMPILE ERROR: Cannot export normal functions
export function formatTitle(title: string) {
  return title.toUpperCase();
}
```

---

## Declaring Remote Endpoints

Auwla supports two types of remote actions:

### 1. `remote.get`
Used for read-only database fetches or API queries. These actions are idempotent and support browser-side caching:

```ts
export const getProfile = remote.get(async (ctx) => {
  return await db.users.findUnique({ where: { id: ctx.userId } });
});
```

### 2. `remote.post`
Used for mutations, form submissions, or write operations (database updates, file deletions):

```ts
export const createComment = remote.post(async (ctx) => {
  const body = await ctx.request.json();
  return await db.comments.create({ data: body });
});
```

---

## Client Consumption: Direct Imports vs. String Keys

Auwla provides three client-side primitives under the `track` namespace to consume remote server functions: `track.get`, `track.post`, and `track.form`. 

For any of these primitives, you can reference the remote endpoint in two ways. Compare the direct import syntax with the string key syntax below:

=<Tabs>
  =<Tab title="Direct Import Reference">
In this approach, you import the remote function reference directly from the co-located `.server.ts` file. This is best for page-specific actions where files are placed right next to each other.

```tsx [src/pages/posts/[id].tsx]
import { track } from 'auwla/track';
import { getPost } from './[id].server'; // Import from server file

function PostView() {
  // Execute using direct reference
  const query = track.get(getPost);

  if (query.pending) return <p>Loading...</p>;
  return <h1>{query.value?.title}</h1>;
}
```
  =</Tab>

  =<Tab title="String Key Identifier">
In this approach, you reference the server function using a string path identifier matching the file path and function name (e.g. `'posts.getPost'`). **No client-side import of the server file is needed**. 

This keeps code extremely clean, reduces import blocks, and is the recommended pattern for centralized backend code (e.g. `src/server/`) because the build tool guarantees full type safety against your generated manifest declarations.

```tsx [src/pages/posts/[id].tsx]
import { track } from 'auwla/track';

function PostView() {
  // Execute using type-safe string key (resolves automatically)
  const query = track.get('posts.getPost');

  if (query.pending) return <p>Loading...</p>;
  return <h1>{query.value?.title}</h1>;
}
```
  =</Tab>
=</Tabs>

---

### 1. Remote Queries (`track.get`)

Use `track.get` to execute and bind the results of a `remote.get` server function. While they can be called inside components, a common pattern is running them **inside the `routed` loader function** to block or defer route changes until the data resolves:

=<Tabs>
  =<Tab title="Direct Import">
```tsx [src/pages/posts/[id].tsx]
import { getRouted, type RouteContext } from 'auwla/router';
import { track } from 'auwla/track';
import { getPost } from './[id].server';

// Fetch data in the router loader using imported function reference
export const routed = async (ctx: RouteContext<'/posts/:id'>, signal: AbortSignal) => {
  return await track.get(getPost, { signal });
};

export default function PostView() {
  const query = getRouted(routed);

  if (query?.pending) return <p>Fetching post...</p>;
  return (
    <article>
      <h1>{query?.value?.title}</h1>
      <p>{query?.value?.content}</p>
    </article>
  );
}
```
  =</Tab>

  =<Tab title="String Key">
```tsx [src/pages/posts/[id].tsx]
import { getRouted, type RouteContext } from 'auwla/router';
import { track } from 'auwla/track';

// Fetch data in the router loader using string identifiers
export const routed = async (ctx: RouteContext<'/posts/:id'>, signal: AbortSignal) => {
  return await track.get('posts.getPost', { signal });
};

export default function PostView() {
  const query = getRouted(routed);

  if (query?.pending) return <p>Fetching post...</p>;
  return (
    <article>
      <h1>{query?.value?.title}</h1>
      <p>{query?.value?.content}</p>
    </article>
  );
}
```
  =</Tab>
=</Tabs>

---

### 2. Remote Mutations (`track.post`)

Use `track.post` to bind lazy mutation handles to `remote.post` server functions. Mutations do not execute automatically on mount; you trigger them by calling `.run(...args)` in event handlers:

=<Tabs>
  =<Tab title="Direct Import">
```tsx [src/pages/posts/[id].tsx]
import { track } from 'auwla/track';
import { createComment } from './[id].server';

export default function CommentBox() {
  // Bind the lazy mutation using imported reference
  const mutation = track.post(createComment);

  const handleSubmit = async () => {
    await mutation.run({ text: 'Excellent post!' });
    alert('Comment added!');
  };

  return (
    <div>
      <button onClick={handleSubmit} disabled={mutation.pending}>
        {mutation.pending ? 'Saving...' : 'Submit Comment'}
      </button>
    </div>
  );
}
```
  =</Tab>

  =<Tab title="String Key">
```tsx [src/pages/posts/[id].tsx]
import { track } from 'auwla/track';

export default function CommentBox() {
  // Bind the lazy mutation using string identifier
  const mutation = track.post('comments.createComment');

  const handleSubmit = async () => {
    await mutation.run({ text: 'Excellent post!' });
    alert('Comment added!');
  };

  return (
    <div>
      <button onClick={handleSubmit} disabled={mutation.pending}>
        {mutation.pending ? 'Saving...' : 'Submit Comment'}
      </button>
    </div>
  );
}
```
  =</Tab>
=</Tabs>

---

### 3. Progressive Forms (`track.form`)

Use `track.form` to bind form submission states, progressive enhancements, and validations to a server function.

#### Form Handle API
The returned form handle exposes powerful reactive states:
* **`form.submit`**: Manual submit executor.
* **`form.onSubmit(event)`**: standard DOM submit listener that calls `e.preventDefault()`, extracts input values using `FormData`, and submits them.
* **`form.pending`**: `true` if submission is in-flight.
* **`form.error`**: The error thrown during validation or execution. If a validation error is returned, it is an instance of `ValidationError` and exposes `form.error.issues` containing validation issues.
* **`form.props`**: An object containing `{ action, method, onSubmit }`. Spreading this onto the form element (`<form {...form.props}>`) attaches these properties automatically, enabling progressive enhancement so that forms work even before client-side JS is loaded.

#### Form Validation Example:
Here is a complete example displaying validation schemas, error filtration, and spread operators:

=<Tabs>
  =<Tab title="Direct Import">
```tsx [src/pages/contact.tsx]
import { track } from 'auwla/track';
import { ValidationError } from 'auwla/shared/validation-error';
import { submitContactForm } from './contact.server';
import { z } from 'zod';

// Define the Zod validation schema directly
const contactSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  message: z.string().min(10, { message: "Message must be at least 10 characters" })
});

export default function ContactPage() {
  // Initialize form handler with imported reference
  const form = track.form(submitContactForm, {
    schema: contactSchema,
    onSuccess: (data) => {
      alert('Message sent successfully!');
    }
  });

  const getFieldError = (name: string) => {
    if (form.error instanceof ValidationError) {
      return form.error.issues.find(issue => issue.path?.includes(name))?.message;
    }
    return null;
  };

  return (
    <form {...form.props}>
      <div>
        <label>Email:</label>
        <input name="email" />
        {getFieldError('email') && <span class="error">{getFieldError('email')}</span>}
      </div>

      <div>
        <label>Message:</label>
        <textarea name="message"></textarea>
        {getFieldError('message') && <span class="error">{getFieldError('message')}</span>}
      </div>

      <button type="submit" disabled={form.pending}>
        {form.pending ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}
```
  =</Tab>

  =<Tab title="String Key">
```tsx [src/pages/contact.tsx]
import { track } from 'auwla/track';
import { ValidationError } from 'auwla/shared/validation-error';
import { z } from 'zod';

// Define the Zod validation schema directly
const contactSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  message: z.string().min(10, { message: "Message must be at least 10 characters" })
});

export default function ContactPage() {
  // Initialize form handler with string key
  const form = track.form('contacts.submitForm', {
    schema: contactSchema,
    onSuccess: (data) => {
      alert('Message sent successfully!');
    }
  });

  const getFieldError = (name: string) => {
    if (form.error instanceof ValidationError) {
      return form.error.issues.find(issue => issue.path?.includes(name))?.message;
    }
    return null;
  };

  return (
    <form {...form.props}>
      <div>
        <label>Email:</label>
        <input name="email" />
        {getFieldError('email') && <span class="error">{getFieldError('email')}</span>}
      </div>

      <div>
        <label>Message:</label>
        <textarea name="message"></textarea>
        {getFieldError('message') && <span class="error">{getFieldError('message')}</span>}
      </div>

      <button type="submit" disabled={form.pending}>
        {form.pending ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}
```
  =</Tab>
=</Tabs>
