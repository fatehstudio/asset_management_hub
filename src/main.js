import { render } from 'https://esm.sh/preact';
import { html } from './utils/htm.js';
import { initializeDatabase } from './utils/storage.js';
import App from './App.js';

// Seed database on first load
initializeDatabase();

// Render Preact SPA
render(html`<${App} />`, document.getElementById('app'));
