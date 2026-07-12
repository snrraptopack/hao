function App() {
  let a = new Set([1, 2]);
  let b = new Set([2, 3]);
  let union = new Set([...a, ...b]);
  let count = union.size;

  function addToA() {
    a.add(4);
    union = new Set([...a, ...b]);
  }

  return () => (
    <div>
      <span id="count">{count}</span>
      <button onClick={addToA}>Add</button>
    </div>
  );
}
export default App;
