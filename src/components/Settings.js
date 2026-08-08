import { html, useState, useEffect } from '../utils/htm.js';
import { getDb, saveDb, saveItem, deleteItem, exportBackup, importBackup, resetDatabase, exportToCSV, syncFromGoogleSheets } from '../utils/storage.js?v=20260808-google-sheets-1';
import { PlusIcon, TrashIcon, ArrowBackIcon } from './Icons.js';
import { SUPABASE_SQL_SCHEMA } from '../utils/supabaseSchema.js';

export default function Settings() {
  const [contacts, setContacts] = useState([]);
  const [currency, setCurrency] = useState('RM');
  const [theme, setTheme] = useState('dark');
  
  // UI states
  const [viewContactForm, setViewContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({ id: '', name: '', phone: '', email: '', role: 'Tenant' });
  const [importStatus, setImportStatus] = useState('');
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('');
  const [googleAppsScriptUrl, setGoogleAppsScriptUrl] = useState('');
  const [googleStatus, setGoogleStatus] = useState('');
  const [googleConnecting, setGoogleConnecting] = useState(false);

  // Supabase connection states
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('');
  const [connecting, setConnecting] = useState(false);

  // App Lock PIN states
  const [appLockPin, setAppLockPin] = useState('');
  const [newPin, setNewPin] = useState('');

  useEffect(() => {
    loadSettings();
    window.addEventListener('mms_db_changed', loadSettings);
    return () => window.removeEventListener('mms_db_changed', loadSettings);
  }, []);

  const loadSettings = () => {
    const db = getDb();
    setContacts(db.contacts || []);
    if (db.settings) {
      setCurrency(db.settings.currency || 'RM');
      setTheme(db.settings.theme || 'dark');
      setSupabaseUrl(db.settings.supabaseUrl || '');
      setSupabaseAnonKey(db.settings.supabaseAnonKey || '');
      setGoogleSheetsUrl(db.settings.googleSheetsUrl || '');
      setGoogleAppsScriptUrl(db.settings.googleAppsScriptUrl || '');
      setAppLockPin(db.settings.appLockPin || '');
    }
  };

  const handleGoogleSheetsConnect = async (e) => {
    e.preventDefault();
    if (!googleSheetsUrl) {
      setGoogleStatus('Please enter the Google Sheet URL.');
      return;
    }
    setGoogleConnecting(true);
    setGoogleStatus('Connecting and importing the latest rows...');
    try {
      const db = getDb();
      db.settings = { ...(db.settings || {}), googleSheetsUrl, googleAppsScriptUrl };
      saveDb(db);
      await syncFromGoogleSheets(googleSheetsUrl, googleAppsScriptUrl);
      setGoogleStatus(googleAppsScriptUrl
        ? 'Connected. Automatic reading and write-back are active.'
        : 'Connected for reading. Add the Apps Script Web App URL to enable write-back.');
    } catch (error) {
      setGoogleStatus(`Connection failed: ${error.message}`);
    } finally {
      setGoogleConnecting(false);
    }
  };

  // Contacts Actions
  const handleOpenContactForm = () => {
    setContactForm({ id: '', name: '', phone: '', email: '', role: 'Tenant' });
    setViewContactForm(true);
  };

  const handleSaveContact = (e) => {
    e.preventDefault();
    saveItem('contacts', contactForm);
    setViewContactForm(false);
  };

  const handleDeleteContact = (id) => {
    if (confirm('Are you sure you want to delete this contact?')) {
      deleteItem('contacts', id);
      loadSettings();
    }
  };

  // Settings modification
  const handleCurrencyChange = (e) => {
    const newCurr = e.target.value;
    setCurrency(newCurr);
    const db = getDb();
    db.settings = { ...db.settings, currency: newCurr };
    localStorage.setItem('mms_database', JSON.stringify(db));
    window.dispatchEvent(new Event('mms_db_changed'));
  };

  // Backup file import
  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = importBackup(event.target.result);
      if (result.success) {
        setImportStatus('✅ Database backup restored successfully!');
        setTimeout(() => setImportStatus(''), 4000);
      } else {
        setImportStatus(`❌ Import failed: ${result.error}`);
      }
    };
    reader.readAsText(file);
  };

  const handleSupabaseConnect = async (e) => {
    e.preventDefault();
    if (!supabaseUrl || !supabaseAnonKey) {
      setConnectionStatus('❌ Please enter both the Project URL and Anon Key.');
      return;
    }
    setConnecting(true);
    setConnectionStatus('⏳ Verifying connection to your Supabase tables...');
    
    try {
      const { testSupabaseConnection, resetSupabaseInstance, syncAllFromSupabase, subscribeToRealtimeChanges } = await import('../utils/storage.js?v=20260808-google-sheets-1');
      // Test connection
      await testSupabaseConnection(supabaseUrl, supabaseAnonKey);
      
      // Save credentials in settings local storage
      const db = getDb();
      if (!db.settings) db.settings = {};
      db.settings.supabaseUrl = supabaseUrl;
      db.settings.supabaseAnonKey = supabaseAnonKey;
      saveDb(db);
      
      // Reset instance and trigger startup cloud sync
      resetSupabaseInstance();
      setConnectionStatus('⏳ Connection verified! Importing cloud tables...');
      await syncAllFromSupabase();
      subscribeToRealtimeChanges();
      
      setConnectionStatus('✅ Connected! Your local dashboard is fully synchronized with Supabase in the cloud.');
    } catch (err) {
      setConnectionStatus(`❌ Connection failed: ${err.message}. Ensure your URL, Anon Key, and database tables are set up correctly.`);
    } finally {
      setConnecting(false);
    }
  };

  const handleClearRecords = () => {
    if (confirm('WARNING: This will permanently clear all locally stored records. Your connection preferences will be kept. Continue?')) {
      resetDatabase();
      alert('Local records have been cleared.');
    }
  };

  const handleSavePin = (e) => {
    e.preventDefault();
    if (!newPin || isNaN(newPin) || newPin.length < 4 || newPin.length > 6) {
      alert("Please enter a valid numeric PIN code (between 4 and 6 digits).");
      return;
    }
    const db = getDb();
    if (!db.settings) db.settings = {};
    db.settings.appLockPin = newPin;
    saveDb(db);
    setAppLockPin(newPin);
    setNewPin('');
    alert("✅ App Lock PIN configured successfully!");
  };

  const handleClearPin = () => {
    if (confirm("Are you sure you want to disable App Lock PIN? Seseorang yang meminjam laptop anda akan terus dapat mengakses dashboard ini tanpa PIN.")) {
      const db = getDb();
      if (db.settings) {
        db.settings.appLockPin = "";
        saveDb(db);
      }
      setAppLockPin('');
      alert("✅ App Lock PIN disabled.");
    }
  };

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    alert("✅ SQL Setup Script copied to clipboard! Paste it inside Supabase SQL Editor.");
  };

  return html`
    <div style="display:flex; flex-direction:column; gap:24px;">
      
      <!-- Layout: Settings columns -->
      <div class="content-grid-2">
        
        <!-- Left Pane: Core Preferences & Backup/Restore -->
        <div style="display:flex; flex-direction:column; gap:24px;">
          
          <!-- System Settings -->
          <div class="card">
            <div class="card-title">System Preferences</div>
            <div class="form-group">
              <label>Default Currency Symbol</label>
              <input type="text" class="form-control" style="max-width: 150px;" value=${currency} onInput=${handleCurrencyChange} />
              <p style="font-size:0.75rem; color:var(--text-muted); margin-top:6px;">This symbol will be shown in all P&L records, loan metrics, and ledger views.</p>
            </div>
          </div>

          <!-- Supabase Database Sync -->
          <div class="card">
            <div class="card-title">Google Sheets Connection</div>
            <p style="font-size:0.88rem; color:var(--text-secondary); margin-bottom:16px;">
              The real MMS spreadsheet is used as the dashboard source. The Apps Script Web App URL enables edits made here to be written back to Google Sheets.
            </p>
            <form onSubmit=${handleGoogleSheetsConnect}>
              <div class="form-group">
                <label>Google Sheet URL</label>
                <input type="url" class="form-control" value=${googleSheetsUrl} onInput=${e => setGoogleSheetsUrl(e.target.value)} disabled=${googleConnecting} required />
              </div>
              <div class="form-group" style="margin-top:12px;">
                <label>Apps Script Web App URL (for private read + write-back)</label>
                <input type="url" class="form-control" placeholder="https://script.google.com/macros/s/.../exec" value=${googleAppsScriptUrl} onInput=${e => setGoogleAppsScriptUrl(e.target.value)} disabled=${googleConnecting} />
              </div>
              <button type="submit" class="btn btn-primary" style="margin-top:14px;" disabled=${googleConnecting}>
                ${googleConnecting ? 'Connecting...' : 'Connect & Sync Google Sheets'}
              </button>
            </form>
            ${googleStatus && html`<p style="margin-top:14px; font-weight:700; font-size:0.86rem; color:var(--text-primary);">${googleStatus}</p>`}
          </div>

          <!-- Supabase Database Sync -->
          <div class="card">
            <div class="card-title">Supabase Database Connection</div>
            <p style="font-size:0.88rem; color:var(--text-secondary); margin-bottom:16px;">
              Connect to your private, real-time Supabase cloud database to automatically sync edits made on your mobile phone or tablet instantly.
            </p>
            <form onSubmit=${handleSupabaseConnect}>
              <div class="form-group">
                <label>Supabase Project URL</label>
                <input type="text" class="form-control" placeholder="https://yourproject.supabase.co" value=${supabaseUrl} onInput=${e => setSupabaseUrl(e.target.value)} disabled=${connecting} required />
              </div>
              <div class="form-group" style="margin-top: 12px;">
                <label>Supabase Anon Key</label>
                <input type="password" class="form-control" placeholder="eyJhbGciOi..." value=${supabaseAnonKey} onInput=${e => setSupabaseAnonKey(e.target.value)} disabled=${connecting} required />
              </div>
              <button type="submit" class="btn btn-primary" style="margin-top: 14px;" disabled=${connecting}>
                ${connecting ? 'Connecting...' : 'Verify & Connect to Supabase'}
              </button>
            </form>
            ${connectionStatus && html`
              <p style="margin-top:14px; font-weight:700; font-size:0.9rem; color: ${connectionStatus.startsWith('❌') ? 'hsl(var(--color-danger))' : connectionStatus.startsWith('✅') ? 'var(--color-success)' : 'var(--text-primary)'}">
                ${connectionStatus}
              </p>
            `}
          </div>

          <!-- App Lock PIN Security -->
          <div class="card">
            <div class="card-title">Security PIN Lock</div>
            <p style="font-size:0.88rem; color:var(--text-secondary); margin-bottom:16px;">
              Configure a 4-to-6 digit security PIN code to restrict access to this dashboard when shared or hosted publicly online.
            </p>
            ${appLockPin ? html`
              <div style="display:flex; justify-content:space-between; align-items:center; background: var(--bg-primary); padding: 12px; border-radius: var(--radius-md); border:1px solid var(--border-color);">
                <div>
                  <span style="font-size:0.85rem; font-weight:700; color:var(--text-primary);">PIN Lock Active</span>
                  <p style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">Your app locks automatically on startup.</p>
                </div>
                <button class="btn btn-danger btn-sm" onClick=${handleClearPin}>Disable PIN</button>
              </div>
            ` : html`
              <form onSubmit=${handleSavePin}>
                <div class="form-group" style="display:flex; gap:12px; align-items:end;">
                  <div style="flex:1;">
                    <label>Set Numeric PIN Code</label>
                    <input type="password" maxlength="6" class="form-control" placeholder="Enter 4-6 digits" value=${newPin} onInput=${e => setNewPin(e.target.value.replace(/\D/g, ''))} required />
                  </div>
                  <button type="submit" class="btn btn-secondary">Activate App Lock</button>
                </div>
              </form>
            `}
          </div>

          <!-- Database SQL Setup Script copy card -->
          <div class="card">
            <div class="card-title">Supabase SQL Schema Script</div>
            <p style="font-size:0.88rem; color:var(--text-secondary); margin-bottom:16px;">
              Copy this database setup SQL code. Open the SQL Editor in your Supabase dashboard, paste this script, and click Run.
            </p>
            <button class="btn btn-secondary" onClick=${handleCopySchema}>Copy SQL Setup Code</button>
          </div>

          <!-- Backup & Recovery JSON -->
          <div class="card">
            <div class="card-title">Backup & Restore (JSON)</div>
            <p style="font-size:0.88rem; color:var(--text-secondary); margin-bottom:16px;">
              Keep your local database safe! Export all properties, vehicles, loans, and transaction histories into a single file to back up locally on your computer.
            </p>
            <div style="display:flex; gap:12px; flex-wrap:wrap;">
              <button class="btn btn-primary" onClick=${exportBackup}>Download JSON Backup</button>
              
              <label class="btn btn-secondary" style="position:relative; cursor:pointer;">
                Upload JSON Backup
                <input type="file" accept=".json" onChange=${handleImportFile} style="position:absolute; width:1px; height:1px; opacity:0; overflow:hidden;" />
              </label>
            </div>

            ${importStatus && html`
              <p style="margin-top:14px; font-weight:700; font-size:0.9rem;">${importStatus}</p>
            `}
          </div>

          <!-- CSV Export to Excel / Sheets -->
          <div class="card">
            <div class="card-title">Export Data to Excel / Google Sheets (CSV)</div>
            <p style="font-size:0.88rem; color:var(--text-secondary); margin-bottom:16px;">
              Export individual database tables as standard Comma Separated Values (.csv) files. These can be opened immediately by double-clicking in Microsoft Excel or uploaded into Google Sheets.
            </p>
            
            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap:10px;">
              <button class="btn btn-secondary btn-sm" onClick=${() => exportToCSV('properties')}>Properties (.csv)</button>
              <button class="btn btn-secondary btn-sm" onClick=${() => exportToCSV('tenants')}>Tenants (.csv)</button>
              <button class="btn btn-secondary btn-sm" onClick=${() => exportToCSV('vehicles')}>Vehicles (.csv)</button>
              <button class="btn btn-secondary btn-sm" onClick=${() => exportToCSV('propertyLoans')}>Property Loans (.csv)</button>
              <button class="btn btn-secondary btn-sm" onClick=${() => exportToCSV('vehicleLoans')}>Vehicle Loans (.csv)</button>
              <button class="btn btn-secondary btn-sm" onClick=${() => exportToCSV('personalLoans')}>Personal Lending (.csv)</button>
              <button class="btn btn-secondary btn-sm" onClick=${() => exportToCSV('utilityBills')}>Utility Bills (.csv)</button>
              <button class="btn btn-secondary btn-sm" onClick=${() => exportToCSV('maintenance')}>Maintenance (.csv)</button>
              <button class="btn btn-secondary btn-sm" onClick=${() => exportToCSV('financialTransactions')}>Finance Ledger (.csv)</button>
            </div>
          </div>

          <!-- Danger Area -->
          <div class="card" style="border-color: hsla(var(--color-danger) / 0.3);">
            <div class="card-title" style="color: hsl(var(--color-danger));">Danger Zone</div>
            <p style="font-size:0.88rem; color:var(--text-secondary); margin-bottom:16px;">
              Clear all locally stored records while keeping your application and database connection preferences.
            </p>
            <button class="btn btn-danger" onClick=${handleClearRecords}>Clear Local Records</button>
          </div>

        </div>

        <!-- Right Pane: Contact Book Manager -->
        <div class="card">
          <div class="card-title">
            <span>Contact Book Manager</span>
            <button class="btn btn-primary btn-sm" onClick=${handleOpenContactForm}><${PlusIcon} /> Add Contact</button>
          </div>

          ${viewContactForm && html`
            <div style="background:var(--bg-primary); border:1px solid var(--border-color); padding:16px; border-radius:var(--radius-md); margin-bottom:20px;">
              <form onSubmit=${handleSaveContact}>
                <div class="form-group">
                  <label>Contact Name</label>
                  <input type="text" class="form-control" placeholder="Full Name" value=${contactForm.name} onInput=${e => setContactForm({ ...contactForm, name: e.target.value })} required />
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Role</label>
                    <select class="form-control" value=${contactForm.role} onChange=${e => setContactForm({ ...contactForm, role: e.target.value })}>
                      <option value="Owner">Owner</option>
                      <option value="Tenant">Tenant</option>
                      <option value="Borrower">Borrower</option>
                      <option value="Contractor">Contractor</option>
                      <option value="Workshop">Workshop</option>
                      <option value="Bank">Bank / Lender</option>
                      <option value="Lawyer">Lawyer</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Phone Number</label>
                    <input type="text" class="form-control" placeholder="e.g. 012-345678" value=${contactForm.phone} onInput=${e => setContactForm({ ...contactForm, phone: e.target.value })} required />
                  </div>
                </div>
                <div class="form-group">
                  <label>Email Address</label>
                  <input type="email" class="form-control" placeholder="name@email.com" value=${contactForm.email} onInput=${e => setContactForm({ ...contactForm, email: e.target.value })} />
                </div>
                <div style="display:flex; justify-content:flex-end; gap:8px;">
                  <button type="button" class="btn btn-secondary btn-sm" onClick=${() => setViewContactForm(false)}>Cancel</button>
                  <button type="submit" class="btn btn-primary btn-sm">Save Contact</button>
                </div>
              </form>
            </div>
          `}

          <div style="display:flex; flex-direction:column; gap:12px; max-height: 500px; overflow-y:auto; padding-right:4px;">
            ${contacts.length === 0 ? html`
              <p style="color:var(--text-muted); text-align:center; padding:20px;">No contacts logged.</p>
            ` : contacts.map(c => html`
              <div key=${c.id} style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
                <div>
                  <div style="font-weight:700; font-size:0.95rem;">
                    ${c.name} 
                    <span class="badge badge-info" style="font-size:0.58rem; margin-left:8px; vertical-align:middle;">${c.role}</span>
                  </div>
                  <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">Phone: ${c.phone} • Email: ${c.email || '-'}</div>
                </div>
                <button class="btn btn-danger btn-sm" style="padding:2px 6px;" onClick=${() => handleDeleteContact(c.id)}><${TrashIcon} /></button>
              </div>
            `)}
          </div>
        </div>

      </div>

    </div>
  `;
}
