import React from 'react';

// Restore deep links after static hosts serve the SPA fallback through public/404.html.
const spaRedirect = sessionStorage.getItem('spa-redirect');
if (spaRedirect) {
  sessionStorage.removeItem('spa-redirect');
  window.history.replaceState(null, '', spaRedirect);
}
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import './institutional-redesign.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter><App /></BrowserRouter></React.StrictMode>);