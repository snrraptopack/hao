import { createMemoApp, component } from 'auwla';
import { event } from 'auwla/events';
import type {} from 'auwla/jsx-runtime';
import './styles/event-chain.css';

type SavedPayload = {
  query: string;
  count: number;
  at: string;
};

type Action = {
  id: string;
  label: string;
};

const actions: Action[] = [
  { id: 'archive', label: 'Archive' },
  { id: 'flag', label: 'Flag' },
  { id: 'delete', label: 'Delete' },
];

function SearchPanel() {
  const self = component();
  let query = '';
  let submitted = '';
  let pointer = '0, 0';
  let saves = 0;
  let shortcut = 'None';
  let delegated = 'No action yet';
  let selfClicks = 0;
  let childClicks = 0;
  let primaryClicks = 0;
  let secondaryClicks = 0;
  let onceMessage = 'Not clicked';
  let cooldownMessage = 'Ready';

  const status = () => `Query: ${query || '-'} / Submitted: ${submitted || '-'}`;

  return () => (
    <section class="panel reference">
      <form
        class="search"
        onSubmit={event.prevent.if(() => query.trim() !== '' && query !== 'wow').handler(() => {
          submitted = query;
        })}
        onKeyDown={event.mod.key('k').prevent.handler(() => {
          query = '';
          submitted = '';
          shortcut = 'Mod+K cleared the form';
        })}
      >
        <input
          value={query}
          placeholder='Type anything except "wow"'
          onInput={event.input.debounce(250).handler((inputEvent) => {
            query = (inputEvent.target as HTMLInputElement).value;
          })}
        />
        <button type="submit">Submit</button>
      </form>

      <p class="status">{status()}</p>
      <p class="note">`prevent.if(() =&gt; ...)` blocks empty and "wow" submissions. `mod.key('k')` clears the form.</p>

      <div
        class="tracker"
        onPointerMove={event.pointerMove.throttle(80).handler((pointerEvent) => {
          pointer = `${Math.round(pointerEvent.offsetX)}, ${Math.round(pointerEvent.offsetY)}`;
        })}
      >
        <span>{pointer}</span>
      </div>

      <div class="reference-grid">
        <article class="tile">
          <h2>Delegated Target</h2>
          <div
            class="toolbar"
            onClick={event.target((target) => target instanceof HTMLButtonElement && !!target.dataset.action).stop.handler((clickEvent) => {
              const button = clickEvent.target as HTMLButtonElement;
              delegated = `Selected ${button.dataset.action}`;
            })}
          >
            {actions.map((action) => (
              <button type="button" class="secondary" data-action={action.id} key={action.id}>
                {action.label}
              </button>
            ))}
          </div>
          <p>{delegated}</p>
        </article>

        <article class="tile">
          <h2>Self Filter</h2>
          <div
            class="self-box"
            onClick={event.self.handler(() => {
              selfClicks++;
            })}
          >
            <button
              type="button"
              class="secondary"
              onClick={event.stop.handler(() => {
                childClicks++;
              })}
            >
              Child Button
            </button>
          </div>
          <p>Box: {selfClicks} / Child: {childClicks}</p>
        </article>

        <article class="tile">
          <h2>Mouse Buttons</h2>
          <button
            type="button"
            class="wide secondary"
            onMouseDown={event.left.handler(() => {
              primaryClicks++;
            })}
          >
            Primary: {primaryClicks}
          </button>
          <button
            type="button"
            class="wide secondary"
            onMouseDown={event.right.handler(() => {
              secondaryClicks++;
            })}
          >
            Secondary: {secondaryClicks}
          </button>
        </article>

        <article class="tile">
          <h2>Once And Cooldown</h2>
          <button
            type="button"
            class="secondary"
            onClick={event.once.handler(() => {
              onceMessage = 'Clicked once';
            })}
          >
            Once
          </button>
          <button
            type="button"
            onClick={event.cooldown(1000).handler(() => {
              cooldownMessage = `Saved at ${new Date().toLocaleTimeString()}`;
              saves++;
              event.emit(self, 'saved', {
                query,
                count: saves,
                at: new Date().toLocaleTimeString(),
              } satisfies SavedPayload);
            })}
          >
            Save
          </button>
          <p>{onceMessage} / {cooldownMessage}</p>
        </article>
      </div>

      <div
        class="keyboard"
        tabIndex={0}
        onKeyDown={event.key(['Enter', 'NumpadEnter']).prevent.handler((keyboardEvent) => {
          shortcut = `Handled ${keyboardEvent.key}`;
        })}
      >
        Focus this box and press Enter.
      </div>
      <p class="status">Shortcut: {shortcut}</p>
    </section>
  );
}

function EventChainExample() {
  const saved: SavedPayload[] = [];

  return () => (
    <main
      class="shell event-chain-example"
      emit:saved={(payload: SavedPayload) => {
        saved.unshift(payload);
      }}
    >
      <SearchPanel />

      <aside class="activity">
        <h2>Emitted Saves</h2>
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

export function EventChainExampleApp() {
  return () => <EventChainExample />;
}
