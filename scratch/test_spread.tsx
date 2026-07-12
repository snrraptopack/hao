function App() {
  let active = false;
  let props = {
    class: active ? 'bg-blue text-white' : 'bg-gray text-black',
    style: { padding: active ? '16px' : '8px' },
  };

  function toggle() {
    active = !active;
    props = {
      class: active ? 'bg-blue text-white' : 'bg-gray text-black',
      style: { padding: active ? '16px' : '8px' },
    };
  }

  return () => (
    <div>
      <span id="box" {...props}>Box</span>
      <button onClick={toggle}>Toggle</button>
    </div>
  );
}
export default App;
