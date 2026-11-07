import '../../styles/globals.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StudioApp } from '../../app/StudioApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StudioApp />
  </StrictMode>,
);
