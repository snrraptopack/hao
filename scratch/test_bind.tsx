function App() {
  let items = [
    { id: 1, text: 'a' },
    { id: 2, text: 'b' },
  ];

  return () => (
    <ul>
      {items.map(item => (
        <li key={item.id}>
          <input id={'input-' + item.id} bind={item.text} />
          <span>{item.text}</span>
        </li>
      ))}
    </ul>
  );
}
export default App;
