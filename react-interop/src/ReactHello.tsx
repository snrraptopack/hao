/** @jsxImportSource react */

export default function ReactHello(props: {
  title: string;
  count: number;
  onIncrement: () => void;
}) {
  return (
    <div>
      <p>Title (from AUWLA): {props.title}</p>
      <p>Count (from AUWLA): {props.count}</p>
      <button onClick={props.onIncrement}>Increment in React</button>
    </div>
  );
}