import { render } from 'https://esm.sh/preact';
import { html } from './utils/htm.js';
import { initializeDatabase } from './utils/storage.js?v=20260808-google-sheets-1';
import App from './App.js?v=20260808-google-sheets-1';

// Initialize a clean local cache; live data is entered by the user or synced from Supabase.
initializeDatabase();

// Render Preact SPA
render(html`<${App} />`, document.getElementById('app'));
