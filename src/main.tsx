import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './lib/i18n';
import { IPAMProvider } from './store/IPAMContext';
import { ThemeProvider } from './store/ThemeContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <IPAMProvider>
        <App />
      </IPAMProvider>
    </ThemeProvider>
  </StrictMode>,
);
