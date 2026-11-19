import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app.tsx';

import.meta.glob('./**/*.scss', { eager: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
