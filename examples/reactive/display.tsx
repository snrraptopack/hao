import { reactiveTheme, plainTheme,store } from './store';

export function Display() {
  console.log('Display component setup run (only once)');
  return () => {
    console.log('Display component rendered');
    return (
      <div style={{
        marginTop: '20px',
        padding: '16px',
        border: '1px solid #ccc',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9'
      }}>
        <h4>First Display Component</h4>
        <p>Reactive Theme: <span style={{ color: 'green', fontWeight: 'bold' }}>{reactiveTheme.get()}</span></p>
        <p>Plain Theme: <span style={{ color: 'red', fontWeight: 'bold' }}>{plainTheme}</span></p>
        <p>Class Theme <span style={{ color: 'red', fontWeight: 'bold' }}>{store.theme}</span></p>
      </div>
    );
  };
}

export function SiblingDisplay() {
  console.log('SiblingDisplay component setup run (only once)');

  return () => {
    console.log('SiblingDisplay component rendered');
    return (
      <div style={{
        marginTop: '20px',
        padding: '16px',
        border: '1px solid #007bff',
        borderRadius: '8px',
        backgroundColor: '#f0f8ff'
      }}>
        <h4>Sibling Display Component (Isolated)</h4>
        <p>Reactive Theme: <span style={{ color: 'green', fontWeight: 'bold' }}>{reactiveTheme.get()}</span></p>
        <p>Plain Theme: <span style={{ color: 'red', fontWeight: 'bold' }}>{plainTheme}</span></p>
         <p>Class Theme: <span style={{ color: 'red', fontWeight: 'bold' }}>{store.theme}</span></p>
      </div>
    );
  };
}
