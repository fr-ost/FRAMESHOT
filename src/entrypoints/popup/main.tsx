import '../../styles/globals.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installFx } from '../../ui/fx';
import { PopupApp } from '../../popup/PopupApp';

installFx();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PopupApp />
  </StrictMode>,
);
