import { html, useState, useEffect } from '../utils/htm.js';
import { getItems, saveItem, deleteItem, getDb } from '../utils/storage.js?v=20260808-google-sheets-1';
import { PlusIcon, EditIcon, TrashIcon, ArrowBackIcon, ExternalLinkIcon } from './Icons.js';

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [properties, setProperties] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  
  // UI states
  const [viewForm, setViewForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  
  // Form state
  const [form, setForm] = useState({ id: '', name: '', type: 'Rental Agreement', category: 'Properties', linkedToId: '', link: '', uploadDate: '', expiryDate: '' });

  useEffect(() => {
    loadData();
    window.addEventListener('mms_db_changed', loadData);
    return () => window.removeEventListener('mms_db_changed', loadData);
  }, []);

  const loadData = () => {
    const db = getDb();
    setDocuments(db.documents || []);
    setProperties(db.properties || []);
    setVehicles(db.vehicles || []);
  };

  const handleOpenForm = (doc = null) => {
    if (doc) {
      setForm({ ...doc });
    } else {
      setForm({
        id: '',
        name: '',
        type: 'Rental Agreement',
        category: 'Properties',
        linkedToId: properties[0]?.id || '',
        link: '',
        uploadDate: new Date().toISOString().slice(0, 10),
        expiryDate: ''
      });
    }
    setViewForm(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    saveItem('documents', form);
    setViewForm(false);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this document reference link?')) {
      deleteItem('documents', id);
      loadData();
    }
  };

  const getLinkedAssetName = (doc) => {
    if (doc.category === 'Properties') {
      return properties.find(p => p.id === doc.linkedToId)?.name || 'General Property';
    }
    if (doc.category === 'Vehicles') {
      const v = vehicles.find(x => x.id === doc.linkedToId);
      return v ? `${v.makeModel} (${v.registrationNumber})` : 'General Vehicle';
    }
    return 'General Asset';
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(search.toLowerCase()) || 
                          doc.type.toLowerCase().includes(search.toLowerCase()) ||
                          doc.link.toLowerCase().includes(search.toLowerCase());
    
    if (filterCategory === 'All') return matchesSearch;
    return matchesSearch && doc.category === filterCategory;
  }).sort((a,b) => new Date(b.uploadDate) - new Date(a.uploadDate));

  const docTypes = getDb().settings?.documentTypes || [];

  return html`
    <div>
      <!-- Form overlay -->
      ${viewForm && html`
        <div class="card" style="max-width: 600px; margin: 0 auto 30px auto;">
          <div class="modal-header">
            <h2>${form.id ? 'Edit Document Reference' : 'Log Document Reference'}</h2>
            <button class="modal-close" onClick=${() => setViewForm(false)}><${ArrowBackIcon} /></button>
          </div>
          <form onSubmit=${handleSave}>
            <div class="form-group">
              <label>Document Title</label>
              <input type="text" class="form-control" placeholder="e.g. Tenancy Agreement Block A" value=${form.name} onInput=${e => setForm({ ...form, name: e.target.value })} required />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Document Category</label>
                <select class="form-control" value=${form.category} onChange=${e => {
                  const cat = e.target.value;
                  setForm({
                    ...form,
                    category: cat,
                    linkedToId: cat === 'Properties' ? (properties[0]?.id || '') : cat === 'Vehicles' ? (vehicles[0]?.id || '') : ''
                  });
                }}>
                  <option value="Properties">Properties</option>
                  <option value="Vehicles">Vehicles</option>
                  <option value="Loans">Loans</option>
                  <option value="Receipts">Receipts / Bills</option>
                </select>
              </div>
              
              <div class="form-group">
                <label>Document Type</label>
                <select class="form-control" value=${form.type} onChange=${e => setForm({ ...form, type: e.target.value })}>
                  ${docTypes.map(t => html`<option key=${t} value=${t}>${t}</option>`)}
                  <option value="Other Document">Other Document</option>
                </select>
              </div>
            </div>

            ${['Properties', 'Vehicles'].includes(form.category) && html`
              <div class="form-group">
                <label>Link to Asset</label>
                <select class="form-control" value=${form.linkedToId} onChange=${e => setForm({ ...form, linkedToId: e.target.value })}>
                  ${form.category === 'Properties' ? 
                    properties.map(p => html`<option key=${p.id} value=${p.id}>${p.name}</option>`) :
                    vehicles.map(v => html`<option key=${v.id} value=${v.id}>${v.registrationNumber} (${v.makeModel})</option>`)
                  }
                </select>
              </div>
            `}

            <div class="form-group">
              <label>File Link (Google Drive URL or Local laptop path)</label>
              <input type="text" class="form-control" placeholder="e.g. https://drive.google.com/... or C:/MyDocuments/..." value=${form.link} onInput=${e => setForm({ ...form, link: e.target.value })} required />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Upload Date</label>
                <input type="date" class="form-control" value=${form.uploadDate} onInput=${e => setForm({ ...form, uploadDate: e.target.value })} required />
              </div>
              <div class="form-group">
                <label>Expiry Date (If applicable)</label>
                <input type="date" class="form-control" value=${form.expiryDate} onInput=${e => setForm({ ...form, expiryDate: e.target.value })} />
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" onClick=${() => setViewForm(false)}>Cancel</button>
              <button type="submit" class="btn btn-primary">Save Document Link</button>
            </div>
          </form>
        </div>
      `}

      <!-- Top Search / Action bar -->
      <div class="filter-bar">
        <div style="display:flex; gap:10px; flex-wrap:wrap; flex:1;">
          <input type="text" class="form-control" style="width:260px;" placeholder="Search document name or links..." value=${search} onInput=${e => setSearch(e.target.value)} />
          <select class="form-control" style="width:160px;" value=${filterCategory} onChange=${e => setFilterCategory(e.target.value)}>
            <option value="All">All Categories</option>
            <option value="Properties">Properties</option>
            <option value="Vehicles">Vehicles</option>
            <option value="Loans">Loans</option>
            <option value="Receipts">Receipts / Bills</option>
          </select>
        </div>
        <button class="btn btn-primary" onClick=${() => handleOpenForm()}><${PlusIcon} /> Log Document Link</button>
      </div>

      <!-- Listing panel -->
      <div class="card">
        <div class="table-container">
          ${filteredDocs.length === 0 ? html`
            <p style="color:var(--text-muted); text-align:center; padding:30px;">No document links found.</p>
          ` : html`
            <table class="mms-table">
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Linked Asset</th>
                  <th>File Link</th>
                  <th>Expiry Date</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${filteredDocs.map(doc => html`
                  <tr key=${doc.id}>
                    <td style="font-weight:700;">${doc.name}</td>
                    <td><span class="badge badge-info" style="font-size:0.65rem;">${doc.category}</span></td>
                    <td>${doc.type}</td>
                    <td>${getLinkedAssetName(doc)}</td>
                    <td>
                      <a href="${doc.link}" target="_blank" class="file-link" style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        <${ExternalLinkIcon} /> Open Link
                      </a>
                    </td>
                    <td style="color: ${doc.expiryDate && doc.expiryDate < new Date().toISOString().slice(0,10) ? 'hsl(var(--color-danger))' : 'var(--text-primary)'}; font-weight:600;">
                      ${doc.expiryDate || '-'}
                    </td>
                    <td style="text-align: right;">
                      <div style="display:inline-flex; gap:6px;">
                        <button class="btn btn-secondary btn-sm" onClick=${() => handleOpenForm(doc)}><${EditIcon} /></button>
                        <button class="btn btn-danger btn-sm" onClick=${() => handleDelete(doc.id)}><${TrashIcon} /></button>
                      </div>
                    </td>
                  </tr>
                `)}
              </tbody>
            </table>
          `}
        </div>
      </div>
    </div>
  `;
}
