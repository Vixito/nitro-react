import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.scss';

const nitroCfg = (window as unknown as { NitroConfig?: Record<string, unknown> }).NitroConfig;
if (nitroCfg) (globalThis as unknown as { NitroConfig: typeof nitroCfg }).NitroConfig = nitroCfg;

createRoot(document.getElementById('root')).render(<App />);
