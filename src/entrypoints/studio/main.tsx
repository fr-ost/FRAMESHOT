import '../../styles/globals.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installFx } from '../../ui/fx';
import { StudioApp } from '../../app/StudioApp';

installFx();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StudioApp />
  </StrictMode>,
);
