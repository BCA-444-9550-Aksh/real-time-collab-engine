import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
// Google Fonts
const link = document.createElement('link');
link.rel = 'preconnect';
link.href = 'https://fonts.googleapis.com';
document.head.appendChild(link);
const link2 = document.createElement('link');
link2.rel = 'stylesheet';
link2.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@400;500&display=swap';
document.head.appendChild(link2);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
