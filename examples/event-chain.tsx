import { createMemoApp, component } from 'auwla';
import { event } from 'auwla/events';
import type {} from 'auwla/jsx-runtime';

type SavedPayload = {
  query: string;
  count: number;
  at: string;
};

function SearchPanel() {
  const self = component();
  let query = '';
  let submitted = '';
  let pointer = '0, 0';
  let saves = 0;

  return () => (
    <section class="panel">
      <form
        class="search"
        onSubmit={event.prevent.handler(() => {
          submitted = query || 'empty';
        })}
        onKeyDown={event.mod.key('k').prevent.handler(() => {
          query = '';
          submitted = '';
        })}
      >
        <input
          value={query}
          placeholder="Search"
          onInput={event.input.debounce(250).handler((inputEvent) => {
            query = (inputEvent.target as HTMLInputElement).value;
          })}
        />
        <button type="submit">Submit</button>
      </form>

      <div
        class="tracker"
        onPointerMove={event.pointerMove.throttle(80).handler((pointerEvent) => {
          pointer = `${Math.round(pointerEvent.offsetX)}, ${Math.round(pointerEvent.offsetY)}`;
        })}
      >
        <span>{pointer}</span>
      </div>

      <button
        class="save"
        onClick={event.click.cooldown(1000).handler(() => {
          saves++;
          event.emit(self, 'saved', {
            query,
            count: saves,
            at: new Date().toLocaleTimeString(),
          } satisfies SavedPayload);
        })}
      >
        Save ({saves})
      </button>

      <p class="status">Query: {query || '-'} / Submitted: {submitted || '-'}</p>
    </section>
  );
}

function EventChainExample() {
  const saved: SavedPayload[] = [];

  return () => (
    <main
      class="shell"
      emit:saved={(payload: SavedPayload) => {
        saved.unshift(payload);
      }}
    >
      <SearchPanel />

      <aside class="activity">
        <h2>Activity</h2>
        {saved.length === 0 ? (
          <p class="empty">No saves yet</p>
        ) : (
          saved.map((item) => (
            <div class="entry" key={`${item.count}-${item.at}`}>
              <strong>{item.query || 'empty'}</strong>
              <span>#{item.count} at {item.at}</span>
            </div>
          ))
        )}
      </aside>
    </main>
  );
}

const root = document.getElementById('app');
if (root) {
  createMemoApp(root, <EventChainExample />);
}
