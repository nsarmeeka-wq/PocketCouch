import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App';
import { AuthProvider } from '@/store/AuthStore';
import { AppStoreProvider } from '@/store/AppStore';
import '@/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Auth sits above the store: the store reads the session to decide which
        athlete's training data it is allowed to load. */}
    <AuthProvider>
      <AppStoreProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AppStoreProvider>
    </AuthProvider>
  </React.StrictMode>,
);
