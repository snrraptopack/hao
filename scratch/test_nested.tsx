function App() {
  let groups = [
    { id: 1, name: 'A', items: [{ id: 10, label: 'x' }] },
  ];

  function addItem() {
    groups[0].items.push({ id: Date.now(), label: 'y' });
  }

  return () => (
    <div>
      {groups.map(g => (
        <section key={g.id}>
          <h2>{g.name}</h2>
          <ul>
            {g.items.map(item => (
              <li key={item.id}>{item.label}</li>
            ))}
          </ul>
        </section>
      ))}
      <button onClick={addItem}>Add</button>
    </div>
  );
}
export default App;
