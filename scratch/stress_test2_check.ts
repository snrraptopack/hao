import { compileAuwla } from '../src/compiler';

const source = `
export default function StressTest2() {
  // 1. Chained computed
  const categories = new Map([[1, 'Health'], [2, 'Learning']]);
  let categoryCounts = [...new Set(categories.values())].map(cat => ({
    name: cat,
    count: [...categories.values()].filter(c => c === cat).length
  }));
  let mostCommon = categoryCounts.reduce(
    (a, b) => (b.count > a.count ? b : a),
    { name: 'none', count: 0 }
  ).name;
  function addToHealth() {
    categories.set(Date.now(), 'Health');
  }

  // 2. Batching
  let renderCount = 0;
  let a = 0, b = 0, c = 0;
  function bumpAllThree() {
    a++; b++; c++;
  }

  // 3. Array mutation
  let items = [
    { id: 1, v: 3 },
    { id: 2, v: 1 },
    { id: 3, v: 2 }
  ];
  function sortItems() { items.sort((x, y) => x.v - y.v); }
  function spliceMiddle() { items.splice(1, 1, { id: 99, v: 100 }); }
  function reverseItems() { items.reverse(); }

  // 4. setTimeout
  let seconds = 0;
  setTimeout(() => { seconds = 1; }, 1000);

  // 5. Object identity Map key
  const userA = { id: 'a' };
  const userB = { id: 'b' };
  const scores = new Map([[userA, 10], [userB, 20]]);
  let total = [...scores.values()].reduce((s, v) => s + v, 0);
  function bumpA() {
    scores.set(userA, (scores.get(userA) ?? 0) + 5);
  }

  return () => (
    <div>
      <header>
        <h1>Stress Test 2</h1>
        <p>Render count: <span>{renderCount}</span></p>
      </header>

      <section>
        <h2>1 · Chained Computed</h2>
        <span>Most common: {mostCommon}</span>
        <button onClick={addToHealth}>Add Health entry</button>
      </section>

      <section>
        <h2>2 · Batching Check</h2>
        <span>a:{a} b:{b} c:{c}</span>
        <button onClick={bumpAllThree}>Bump all three</button>
      </section>

      <section>
        <h2>3 · In-place Array Structural Ops</h2>
        <ul>
          {items.map(i => <li key={i.id}>{i.v}</li>)}
        </ul>
        <button onClick={sortItems}>Sort</button>
        <button onClick={spliceMiddle}>Splice</button>
        <button onClick={reverseItems}>Reverse</button>
      </section>

      <section>
        <h2>4 · Raw setTimeout</h2>
        <p>Seconds: {seconds}</p>
      </section>

      <section>
        <h2>5 · Object-Identity Map Key</h2>
        <span>Total: {total}</span>
        <button onClick={bumpA}>+5 to userA</button>
      </section>
    </div>
  );
}
`;

console.log(compileAuwla(source));
