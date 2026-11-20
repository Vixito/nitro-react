import { initClientShield } from './utils/clientShield';

initClientShield();

import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './common';
import './index.scss';

createRoot(document.getElementById('root')).render(
    <ErrorBoundary fallbackTitle="Error crítico en el cliente Habbten">
        <App />
    </ErrorBoundary>
);
