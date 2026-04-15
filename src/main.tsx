import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { initFirebase } from '@shared';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './lib/AuthContext.tsx';

initFirebase('iurisvision');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
