import { html, useState, useEffect } from '../utils/htm.js';
import { getDb, saveDb, saveItem, deleteItem, exportBackup, importBackup, resetDatabase, exportToCSV, syncFromGoogleSheets } from '../utils/storage.js';
import { PlusIcon, TrashIcon, ArrowBackIcon } from './Icons.js';

export default function Settings() {
  const [contacts, setContacts] = useState([]);
  const [currency, setCurrency] = useState('RM');
  const [theme, setTheme] = useState('dark');
  
  // UI states
  const [viewContactForm, setViewContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({ id: '', name: '', phone: '', email: '', role: 'Tenant' });
  const [importStatus, setImportStatus] = useState('');

  // Sheets sync states
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('');
  const [googleSheetsWriteUrl, setGoogleSheetsWriteUrl] = useState('');
  const [syncStatus, setSyncStatus] = useState('');
  const [syncing, setSyncing] = useState(false);

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
      setGoogleSheetsUrl(db.settings.googleSheetsUrl || localStorage.getItem('mms_google_sheets_url') || '');
      setGoogleSheetsWriteUrl(db.settings.googleSheetsWriteUrl || localStorage.getItem('mms_google_sheets_write_url') || '');
    } else {
      setGoogleSheetsUrl(localStorage.getItem('mms_google_sheets_url') || '');
      setGoogleSheetsWriteUrl(localStorage.getItem('mms_google_sheets_write_url') || '');
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

  const handleReset = () => {
    if (confirm('⚠️ WARNING: This will delete all your current logs and overwrite them with mock seeding data. Are you sure you want to proceed?')) {
      resetDatabase();
      alert('Database reset to defaults.');
    }
  };

  const handleSheetsSync = async (e) => {
    e.preventDefault();
    if (!googleSheetsUrl) {
      setSyncStatus('❌ Please enter your Google Sheets Share Link first.');
      return;
    }
    setSyncing(true);
    setSyncStatus('⏳ Syncing all 26 sheets from Google Drive... Please wait.');
    try {
      localStorage.setItem('mms_google_sheets_url', googleSheetsUrl);
      
      const db = getDb();
      if (!db.settings) db.settings = {};
      db.settings.googleSheetsUrl = googleSheetsUrl;
      saveDb(db);

      await syncFromGoogleSheets(googleSheetsUrl);
      setSyncStatus('✅ Sync complete! Your laptop dashboard is now updated with your live AppSheet data.');
    } catch (err) {
      setSyncStatus(`❌ Sync failed: ${err.message}. Make sure your Google Sheet is shared as "Anyone with link can view".`);
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveWriteUrl = (e) => {
    e.preventDefault();
    const db = getDb();
    if (!db.settings) db.settings = {};
    db.settings.googleSheetsWriteUrl = googleSheetsWriteUrl;
    localStorage.setItem('mms_google_sheets_write_url', googleSheetsWriteUrl);
    saveDb(db);
    alert('✅ Google Sheets Write URL saved! Edits made on this laptop dashboard will now automatically sync back to Google Sheets.');
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

          <!-- Google Sheets & AppSheet Sync -->
          <div class="card">
            <div class="card-title">Google Sheets / AppSheet Live Sync</div>
            <p style="font-size:0.88rem; color:var(--text-secondary); margin-bottom:16px;">
              Sync data in real-time from your phone! Paste your Google Sheets share link below to load the live entries you added via AppSheet on your phone.
            </p>
            <form onSubmit=${handleSheetsSync}>
              <div class="form-group">
                <input type="text" class="form-control" placeholder="https://docs.google.com/spreadsheets/d/..." value=${googleSheetsUrl} onInput=${e => setGoogleSheetsUrl(e.target.value)} disabled=${syncing} required />
                <p style="font-size:0.75rem; color:var(--text-muted); margin-top:6px;">
                  ⚠️ **Requirement**: Click **Share** inside your Google Sheet, and change General Access to **"Anyone with the link can view"** so this browser can fetch it.
                </p>
              </div>
              <button type="submit" class="btn btn-primary" disabled=${syncing}>
                ${syncing ? 'Syncing...' : 'Sync Live Data Now'}
              </button>
            </form>
            ${syncStatus && html`
              <p style="margin-top:14px; font-weight:700; font-size:0.9rem; color: ${syncStatus.startsWith('❌') ? 'hsl(var(--color-danger))' : syncStatus.startsWith('✅') ? 'hsl(var(--color-success))' : 'var(--text-primary)'}">
                ${syncStatus}
              </p>
            `}
          </div>

          <!-- Link Local Dashboard to Google Sheets (Write-back) -->
          <div class="card">
            <div class="card-title">Google Sheets Two-Way Write Sync (Optional)</div>
            <p style="font-size:0.88rem; color:var(--text-secondary); margin-bottom:16px;">
              Want to write data back to Google Sheets when you edit details on this laptop dashboard? Paste your Google Apps Script Web App URL below:
            </p>
            <form onSubmit=${handleSaveWriteUrl}>
              <div class="form-group">
                <input type="text" class="form-control" placeholder="https://script.google.com/macros/s/.../exec" value=${googleSheetsWriteUrl} onInput=${e => setGoogleSheetsWriteUrl(e.target.value)} />
                <p style="font-size:0.75rem; color:var(--text-muted); margin-top:6px;">
                  💡 **Setup Instructions**:
                  <br />1. In your Google Sheet, click **Extensions** → **Apps Script**.
                  <br />2. Paste the provided sync script, click **Deploy** → **New Deployment**.
                  <br />3. Select **Web App**, set *Execute as* to **"Me"**, and *Who has access* to **"Anyone"**.
                  <br />4. Deploy, copy the Web App URL, and paste it above!
                </p>
              </div>
              <button type="submit" class="btn btn-secondary">Save Web App Write URL</button>
            </form>
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
              Resetting will clear all your active changes and reload the default demonstration database.
            </p>
            <button class="btn btn-danger" onClick=${handleReset}>Reset to Seeding Data</button>
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
