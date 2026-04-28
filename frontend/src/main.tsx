import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';

// console.log('main.tsx: Script is executing!');

const rootElement = document.getElementById('root');
// console.log('main.tsx: Root element found in DOM?', !!rootElement);

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
