import { BrowserRouter, useRoutes } from 'react-router-dom';
import { routes } from './routes';
import './App.css';

function AppRouter() {
  const element = useRoutes(routes);
  return element;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}
