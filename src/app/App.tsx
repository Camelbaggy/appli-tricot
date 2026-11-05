import { HashRouter, useRoutes } from 'react-router-dom';
import { appRoutes } from './router';

function AppRoutes() {
  return useRoutes(appRoutes);
}

export function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}
