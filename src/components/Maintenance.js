import { html, useState, useEffect } from '../utils/htm.js';
import { getItems, saveItem, deleteItem, getDb } from '../utils/storage.js?v=20260808-google-sheets-1';
import { PlusIcon, EditIcon, TrashIcon, ArrowBackIcon, ExternalLinkIcon } from './Icons.js';

export default function Maintenance() {
  const [properties, setProperties] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  
  // UI states
  const [viewForm, setViewForm] = useState(false);
  const [filterPropertyId, setFilterPropertyId] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch] = useState('');
  
  // Form state
  const [form, setForm] = useState({ id: '', propertyId: '', issue: '', reportedDate: '', category: 'Plumbing', contractorId: '', quotedCost: 0, actualCost: 0, status: 'Quoted', completedDate: '', notes: '', receiptLink: '' });

  useEffect(() => {
    loadData();
    window.addEventListener('mms_db_changed', loadData);
    return () => window.removeEventListener('mms_db_changed', loadData);
  }, []);

  const loadData = () => {
    const db = getDb();
    setProperties(db.properties || []);
    setContacts(db.contacts || []);
    setMaintenance(db.maintenance || []);
  };

  const handleOpenForm = (maint = null) => {
    if (maint) {
      setForm({ ...maint });
    } else {
      setForm({
        id: '',
        propertyId: properties[0]?.id || '',
        issue: '',
        reportedDate: new Date().toISOString().slice(0, 10),
        category: 'Plumbing',
        contractorId: contacts.find(c => c.role === 'Contractor')?.id || '',
        quotedCost: 0,
        actualCost: 0,
        status: 'Quoted',
        completedDate: '',
        notes: '',
        receiptLink: ''
      });
    }
    setViewForm(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const isNew = !form.id;
    
    const record = {
      ...form,
      quotedCost: Number(form.quotedCost),
      actualCost: Number(form.actualCost),
      completedDate: form.status === 'Completed' ? (form.completedDate || new Date().toISOString().slice(0, 10)) : ''
    };

    const saved = saveItem('maintenance', record);

    // If status is Completed, log it as an Expense in the Financial ledger
    if (saved.status === 'Completed') {
      const prop = properties.find(p => p.id === saved.propertyId);
      // Double check if there is an existing transaction for this maintenance to prevent double-logging
      const db = getDb();
      const existingTx = (db.financialTransactions || []).find(t => t.referenceId === saved.id);
      
      if (!existingTx) {
        saveItem('financialTransactions', {
          date: saved.completedDate,
          type: 'Expense',
          category: 'Maintenance',
          amount: saved.actualCost,
          referenceId: saved.id,
          notes: `Maintenance Completed: ${prop ? prop.name : 'Property'} - ${saved.issue} (${saved.category})`
        });
      }
    }

    setViewForm(false);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this maintenance ticket?')) {
      deleteItem('maintenance', id);
      loadData();
    }
  };

  const getPropertyName = (id) => {
    return properties.find(p => p.id === id)?.name || "Unknown Property";
  };

  const getContractorName = (id) => {
    return contacts.find(c => c.id === id)?.name || "No Contractor Assigned";
  };

  const currency = getDb().settings?.currency || "RM";

  // Filter lists
  const filteredMaint = maintenance.filter(m => {
    const matchesProp = filterPropertyId === 'All' || m.propertyId === filterPropertyId;
    const matchesStatus = filterStatus === 'All' || m.status === filterStatus;
    const matchesSearch = m.issue.toLowerCase().includes(search.toLowerCase()) || 
                          m.category.toLowerCase().includes(search.toLowerCase()) ||
                          getContractorName(m.contractorId).toLowerCase().includes(search.toLowerCase());
    return matchesProp && matchesStatus && matchesSearch;
  }).sort((a, b) => new Date(b.reportedDate) - new Date(a.reportedDate));

  return html`
    <div>
      <!-- Overlay form -->
      ${viewForm && html`
        <div class="card" style="max-width: 650px; margin: 0 auto 30px auto;">
          <div class="modal-header">
            <h2>${form.id ? 'Edit Ticket' : 'File Maintenance Aduan'}</h2>
            <button class="modal-close" onClick=${() => setViewForm(false)}><${ArrowBackIcon} /></button>
          </div>
          <form onSubmit=${handleSave}>
            <div class="form-group">
              <label>Property</label>
              <select class="form-control" value=${form.propertyId} onChange=${e => setForm({ ...form, propertyId: e.target.value })} required>
                ${properties.map(p => html`<option key=${p.id} value=${p.id}>${p.name}</option>`)}
              </select>
            </div>
            
            <div class="form-group">
              <label>Issue Description (Aduan)</label>
              <input type="text" class="form-control" placeholder="e.g. Toilet leak, broken ceiling fan..." value=${form.issue} onInput=${e => setForm({ ...form, issue: e.target.value })} required />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Category</label>
                <select class="form-control" value=${form.category} onChange=${e => setForm({ ...form, category: e.target.value })}>
                  <option value="Plumbing">Plumbing</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Roofing">Roofing</option>
                  <option value="Painting">Painting</option>
                  <option value="Appliances">Appliances</option>
                  <option value="Structural">Structural</option>
                  <option value="Aircond">Aircond</option>
                </select>
              </div>
              <div class="form-group">
                <label>Assigned Contractor</label>
                <select class="form-control" value=${form.contractorId} onChange=${e => setForm({ ...form, contractorId: e.target.value })}>
                  <option value="">No Contractor Assigned</option>
                  ${contacts.filter(c => c.role === 'Contractor').map(c => html`
                    <option key=${c.id} value=${c.id}>${c.name}</option>
                  `)}
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Reported Date</label>
                <input type="date" class="form-control" value=${form.reportedDate} onInput=${e => setForm({ ...form, reportedDate: e.target.value })} required />
              </div>
              <div class="form-group">
                <label>Ticket Status</label>
                <select class="form-control" value=${form.status} onChange=${e => setForm({ ...form, status: e.target.value })}>
                  <option value="Aduan / Reported">Aduan / Reported</option>
                  <option value="Quoted">Quoted / Pending Approval</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Quoted Estimate (${currency})</label>
                <input type="number" class="form-control" value=${form.quotedCost} onInput=${e => setForm({ ...form, quotedCost: e.target.value })} />
              </div>
              <div class="form-group">
                <label>Actual Cost (${currency})</label>
                <input type="number" class="form-control" value=${form.actualCost} onInput=${e => setForm({ ...form, actualCost: e.target.value })} />
              </div>
            </div>

            ${form.status === 'Completed' && html`
              <div class="form-row" style="background: hsla(var(--color-success) / 0.05); padding: 12px; border-radius: var(--radius-md); margin-bottom: 16px;">
                <div class="form-group" style="margin-bottom:0;">
                  <label>Completed Date</label>
                  <input type="date" class="form-control" value=${form.completedDate} onInput=${e => setForm({ ...form, completedDate: e.target.value })} />
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label>Work Receipt Link</label>
                  <input type="text" class="form-control" placeholder="C:/receipts/..." value=${form.receiptLink} onInput=${e => setForm({ ...form, receiptLink: e.target.value })} />
                </div>
              </div>
            `}

            <div class="form-group">
              <label>Work Details & Notes</label>
              <textarea class="form-control" rows="3" placeholder="Contractor notes, feedback, materials used..." value=${form.notes} onInput=${e => setForm({ ...form, notes: e.target.value })}></textarea>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" onClick=${() => setViewForm(false)}>Cancel</button>
              <button type="submit" class="btn btn-primary">Save Ticket</button>
            </div>
          </form>
        </div>
      `}

      <!-- Filter Controls -->
      <div class="filter-bar">
        <div style="display:flex; gap:10px; flex-wrap:wrap; flex:1;">
          <input type="text" class="form-control" style="width:250px;" placeholder="Search issue or contractor..." value=${search} onInput=${e => setSearch(e.target.value)} />
          <select class="form-control" style="width:180px;" value=${filterPropertyId} onChange=${e => setFilterPropertyId(e.target.value)}>
            <option value="All">All Properties</option>
            ${properties.map(p => html`<option key=${p.id} value=${p.id}>${p.name}</option>`)}
          </select>
          <select class="form-control" style="width:160px;" value=${filterStatus} onChange=${e => setFilterStatus(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="Aduan / Reported">Aduan / Reported</option>
            <option value="Quoted">Quoted / Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
        <button class="btn btn-primary" onClick=${() => handleOpenForm()}><${PlusIcon} /> File Aduan</button>
      </div>

      <!-- Tickets Grid list -->
      <div class="card">
        <div class="table-container">
          ${filteredMaint.length === 0 ? html`
            <p style="color:var(--text-muted); text-align:center; padding:30px;">No maintenance tickets found matching filters.</p>
          ` : html`
            <table class="mms-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Issue Details</th>
                  <th>Date Logged</th>
                  <th>Contractor</th>
                  <th>Cost Quoted/Actual</th>
                  <th>Status</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${filteredMaint.map(m => html`
                  <tr key=${m.id}>
                    <td style="font-weight:700;">${getPropertyName(m.propertyId)}</td>
                    <td>
                      <div style="font-weight:700;">${m.issue}</div>
                      <span class="badge badge-info" style="font-size:0.65rem; margin-top:4px;">${m.category}</span>
                    </td>
                    <td>${m.reportedDate}</td>
                    <td>${getContractorName(m.contractorId)}</td>
                    <td>
                      <div style="font-size:0.75rem; color:var(--text-muted);">Est: ${currency} ${Number(m.quotedCost).toFixed(2)}</div>
                      <div style="font-weight:700; margin-top:2px;">Actual: ${currency} ${Number(m.actualCost).toFixed(2)}</div>
                    </td>
                    <td>
                      <span class="badge ${m.status === 'Completed' ? 'badge-success' : m.status === 'In Progress' ? 'badge-warning' : 'badge-danger'}">
                        ${m.status}
                      </span>
                    </td>
                    <td style="text-align: right;">
                      <div style="display:inline-flex; gap:6px;">
                        <button class="btn btn-secondary btn-sm" onClick=${() => handleOpenForm(m)}><${EditIcon} /></button>
                        <button class="btn btn-danger btn-sm" onClick=${() => handleDelete(m.id)}><${TrashIcon} /></button>
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
