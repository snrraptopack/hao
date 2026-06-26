import { Router } from 'auwla/router';
import { createMemoApp } from "auwla"

// @ts-ignore
import routes from 'auwla:routes';

const App = () => {
  return <Router routes={routes} suspend={true} />;
};

let app = document.getElementById('app')!;
createMemoApp(app, <App />)
