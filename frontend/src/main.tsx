import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';

import App from './App';

// Patch third-party 'unload' listeners to avoid Chrome Permission Policy Violations
const originalAddEventListener = window.addEventListener;
window.addEventListener = function(type, listener, options) {
  if (type === 'unload') {
    type = 'pagehide';
  }
  return originalAddEventListener.call(window, type, listener, options);
};

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
