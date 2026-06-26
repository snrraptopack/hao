import { getRouted, RouteContext } from 'auwla/router';
import { track } from 'auwla/track';
import { getServerTime } from './index.server';

export const routed = async (_ctx: RouteContext<"/">, signal: AbortSignal) => {
  return await track.get(getServerTime, { signal });
};

export default function Home() {
  let count = 0;
  const timeHandle = getRouted(routed);

  return () => (
    <div style="font-family: sans-serif; padding: 2rem;">
      <h1>Auwla SSR Bun Example</h1>
      {timeHandle?.pending && <p>Loading server time...</p>}
      {timeHandle?.resolved && (
        <p>This page was rendered on the server at: <strong>{timeHandle.value as string}</strong></p>
      )}
      {timeHandle?.rejected && (
        <p>Error loading time: {String(timeHandle.reason)}</p>
      )}

      <div style="margin-top: 2rem; padding: 1rem; border: 1px solid #ccc; border-radius: 8px;">
        <h2>Interactive Counter</h2>
        <p>If hydration works, this button will increment:</p>
        <p>Count: {count}</p>
        <button onClick={() => count++}>
          Increment
        </button>
      </div>
    </div>
  );
}
