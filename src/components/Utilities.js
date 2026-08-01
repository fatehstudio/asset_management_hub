import { html, useState, useEffect } from '../utils/htm.js';
import { getItems, saveItem, deleteItem, getDb } from '../utils/storage.js';
import { PlusIcon, EditIcon, TrashIcon, ArrowBackIcon, ExternalLinkIcon } from './Icons.js';

export default function Utilities() {
  const [properties, setProperties] = useState([]);
  const [utilities, setUtilities] = useState([]);
  const [bills, setBills] = useState([]);
  
  // UI states
  const [activePropertyId, setActivePropertyId] = useState('All');
  const [viewAccountForm, setViewAccountForm] = useState(false);
  const [viewBillForm, setViewBillForm] = useState(false);
  
  // Forms states
  const [accountForm, setAccountForm] = useState({ id: '', propertyId: '', type: 'TNB (Electricity)', accountNumber: '', responsibleParty: 'Tenant' });
  const [billForm, setBillForm] = useState({ id: '', utilityId: '', billingMonth: '', dueDate: '', amount: 0, paidDate: '', paidAmount: 0, method: 'Online Banking', receiptLink: '', status: 'Pending' });

  useEffect(() => {
    loadData();
    window.addEventListener('mms_db_changed', loadData);
    return () => window.removeEventListener('mms_db_changed', loadData);
  }, []);

  const loadData = () => {
    const db = getDb();
    setProperties(db.properties || []);
    setUtilities(db.utilities || []);
    setBills(db.utilityBills || []);
  };

  const handleOpenAccountForm = (acc = null) => {
    if (acc) {
      setAccountForm({ ...acc });
    } else {
      setAccountForm({
        id: '',
        propertyId: properties[0]?.id || '',
        type: 'TNB (Electricity)',
        accountNumber: '',
        responsibleParty: 'Tenant'
      });
    }
    setViewAccountForm(true);
  };

  const handleSaveAccount = (e) => {
    e.preventDefault();
    saveItem('utilities', accountForm);
    setViewAccountForm(false);
  };

  const handleDeleteAccount = (id) => {
    if (confirm('Are you sure you want to delete this utility account and all its bills?')) {
      deleteItem('utilities', id);
      // Delete associated bills too
      const db = getDb();
      db.utilityBills = (db.utilityBills || []).filter(b => b.utilityId !== id);
      localStorage.setItem('mms_database', JSON.stringify(db));
      window.dispatchEvent(new Event('mms_db_changed'));
    }
  };

  const handleOpenBillForm = (utilityId, bill = null) => {
    if (bill) {
      setBillForm({ ...bill });
    } else {
      setBillForm({
        id: '',
        utilityId,
        billingMonth: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
        dueDate: new Date().toISOString().slice(0, 10),
        amount: 0,
        paidDate: '',
        paidAmount: 0,
        method: 'Online Banking',
        receiptLink: '',
        status: 'Pending'
      });
    }
    setViewBillForm(true);
  };

  const handleSaveBill = (e) => {
    e.preventDefault();
    const isNew = !billForm.id;
    const paidAmt = billForm.status === 'Paid' ? Number(billForm.amount) : 0;
    
    const record = {
      ...billForm,
      amount: Number(billForm.amount),
      paidAmount: paidAmt,
      paidDate: billForm.status === 'Paid' ? (billForm.paidDate || new Date().toISOString().slice(0, 10)) : ''
    };

    const saved = saveItem('utilityBills', record);

    // Automatically log expense in Financial transactions if marked as Paid
    if (saved.status === 'Paid') {
      const ut = utilities.find(u => u.id === saved.utilityId);
      const prop = properties.find(p => p.id === ut?.propertyId);
      // Ensure we only record this expense if it represents a bill the Owner has paid.
      // (If the Tenant is responsible, it usually doesn't affect the Owner's financial statements unless Owner pays and re-claims).
      // We will log all paid bills but prefix with Tenant or Owner responsible.
      const label = ut?.responsibleParty === 'Tenant' ? `[Tenant Resp] Utilities` : `Utilities`;
      
      saveItem('financialTransactions', {
        date: saved.paidDate,
        type: 'Expense',
        category: 'Utilities',
        amount: saved.amount,
        referenceId: saved.id,
        notes: `${label}: ${prop ? prop.name : 'Property'} - ${ut?.type || 'Utility'} (${saved.billingMonth})`
      });
    }

    setViewBillForm(false);
  };

  const handleDeleteBill = (id) => {
    if (confirm('Are you sure you want to delete this bill record?')) {
      deleteItem('utilityBills', id);
      loadData();
    }
  };

  const getPropertyName = (id) => {
    return properties.find(p => p.id === id)?.name || "Unknown Property";
  };

  const getUtilityDetails = (bill) => {
    const ut = utilities.find(u => u.id === bill.utilityId);
    return {
      type: ut?.type || 'Unknown Utility',
      account: ut?.accountNumber || '-',
      responsible: ut?.responsibleParty || 'Tenant',
      property: getPropertyName(ut?.propertyId)
    };
  };

  const currency = getDb().settings?.currency || "RM";

  // Filter bills
  const filteredBills = bills.filter(bill => {
    const ut = utilities.find(u => u.id === bill.utilityId);
    if (activePropertyId !== 'All' && ut?.propertyId !== activePropertyId) {
      return false;
    }
    return true;
  }).sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));

  const utilityTypes = getDb().settings?.utilityTypes || [];

  return html`
    <div>
      <!-- Overlays -->
      ${viewAccountForm && html`
        <div class="card" style="max-width: 600px; margin: 0 auto 30px auto;">
          <div class="modal-header">
            <h2>${accountForm.id ? 'Edit Utility Link' : 'Link Utility Account'}</h2>
            <button class="modal-close" onClick=${() => setViewAccountForm(false)}><${ArrowBackIcon} /></button>
          </div>
          <form onSubmit=${handleSaveAccount}>
            <div class="form-group">
              <label>Property</label>
              <select class="form-control" value=${accountForm.propertyId} onChange=${e => setAccountForm({ ...accountForm, propertyId: e.target.value })}>
                ${properties.map(p => html`
                  <option key=${p.id} value=${p.id}>${p.name}</option>
                `)}
              </select>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Utility Type</label>
                <select class="form-control" value=${accountForm.type} onChange=${e => setAccountForm({ ...accountForm, type: e.target.value })}>
                  ${utilityTypes.map(t => html`<option key=${t} value=${t}>${t}</option>`)}
                </select>
              </div>
              <div class="form-group">
                <label>Responsible Party (Pays the bill)</label>
                <select class="form-control" value=${accountForm.responsibleParty} onChange=${e => setAccountForm({ ...accountForm, responsibleParty: e.target.value })}>
                  <option value="Tenant">Tenant</option>
                  <option value="Owner">Owner</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Account Number</label>
              <input type="text" class="form-control" placeholder="e.g. 2201920193" value=${accountForm.accountNumber} onInput=${e => setAccountForm({ ...accountForm, accountNumber: e.target.value })} required />
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" onClick=${() => setViewAccountForm(false)}>Cancel</button>
              <button type="submit" class="btn btn-primary">Save Account Link</button>
            </div>
          </form>
        </div>
      `}

      ${viewBillForm && html`
        <div class="card" style="max-width: 600px; margin: 0 auto 30px auto;">
          <div class="modal-header">
            <h2>Record Bill Entry</h2>
            <button class="modal-close" onClick=${() => setViewBillForm(false)}><${ArrowBackIcon} /></button>
          </div>
          <form onSubmit=${handleSaveBill}>
            <div class="form-row">
              <div class="form-group">
                <label>Billing Month</label>
                <input type="text" class="form-control" placeholder="e.g. August 2026" value=${billForm.billingMonth} onInput=${e => setBillForm({ ...billForm, billingMonth: e.target.value })} required />
              </div>
              <div class="form-group">
                <label>Due Date</label>
                <input type="date" class="form-control" value=${billForm.dueDate} onInput=${e => setBillForm({ ...billForm, dueDate: e.target.value })} required />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Bill Amount (${currency})</label>
                <input type="number" step="0.01" class="form-control" value=${billForm.amount} onInput=${e => setBillForm({ ...billForm, amount: e.target.value })} required />
              </div>
              <div class="form-group">
                <label>Status</label>
                <select class="form-control" value=${billForm.status} onChange=${e => setBillForm({ ...billForm, status: e.target.value })}>
                  <option value="Pending">Pending / Unpaid</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
            </div>

            ${billForm.status === 'Paid' && html`
              <div class="form-row" style="background: hsla(var(--color-success) / 0.05); padding: 12px; border-radius: var(--radius-md); margin-bottom: 16px;">
                <div class="form-group" style="margin-bottom:0;">
                  <label>Date Paid</label>
                  <input type="date" class="form-control" value=${billForm.paidDate} onInput=${e => setBillForm({ ...billForm, paidDate: e.target.value })} />
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label>Payment Method</label>
                  <select class="form-control" value=${billForm.method} onChange=${e => setBillForm({ ...billForm, method: e.target.value })}>
                    <option value="Online Banking">Online Banking</option>
                    <option value="Auto-debit">Auto-debit</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>
            `}

            <div class="form-group">
              <label>Receipt Link (URL / Local Path)</label>
              <input type="text" class="form-control" placeholder="C:/receipts/..." value=${billForm.receiptLink} onInput=${e => setBillForm({ ...billForm, receiptLink: e.target.value })} />
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" onClick=${() => setViewBillForm(false)}>Cancel</button>
              <button type="submit" class="btn btn-primary">Save Bill</button>
            </div>
          </form>
        </div>
      `}

      <!-- Top Action bar -->
      <div class="filter-bar">
        <div style="display:flex; gap:10px;">
          <select class="form-control" style="width: 250px;" value=${activePropertyId} onChange=${e => setActivePropertyId(e.target.value)}>
            <option value="All">All Properties</option>
            ${properties.map(p => html`
              <option key=${p.id} value=${p.id}>${p.name}</option>
            `)}
          </select>
        </div>
        <div style="display:inline-flex; gap:8px;">
          <button class="btn btn-primary" onClick=${() => handleOpenAccountForm()}><${PlusIcon} /> Link Utility Account</button>
        </div>
      </div>

      <!-- Main Layout: Split accounts on left, bills list on right -->
      <div class="content-grid-2">
        <!-- Accounts Panel -->
        <div class="card">
          <div class="card-title">Linked Accounts</div>
          <div style="display:flex; flex-direction:column; gap:16px;">
            ${utilities.length === 0 ? html`
              <p style="color:var(--text-muted); font-size:0.88rem; padding:10px 0;">No active utility accounts registered.</p>
            ` : utilities.filter(u => activePropertyId === 'All' || u.propertyId === activePropertyId).map(u => html`
              <div key=${u.id} style="background:var(--bg-secondary); border:1px solid var(--border-color); padding:14px; border-radius:var(--radius-md);">
                <div style="display:flex; justify-content:space-between; align-items:start;">
                  <div>
                    <div style="font-weight:700; font-size:0.95rem;">${u.type}</div>
                    <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">Account: ${u.accountNumber}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:6px;">${getPropertyName(u.propertyId)}</div>
                  </div>
                  <div>
                    <span class="badge ${u.responsibleParty === 'Tenant' ? 'badge-info' : 'badge-warning'}">
                      Pays: ${u.responsibleParty}
                    </span>
                  </div>
                </div>
                
                <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:14px; border-top:1px solid var(--border-color); padding-top:10px;">
                  <button class="btn btn-primary btn-sm" onClick=${() => handleOpenBillForm(u.id)}><${PlusIcon} /> Log Bill</button>
                  <button class="btn btn-secondary btn-sm" style="padding:4px 8px;" onClick=${() => handleOpenAccountForm(u)}><${EditIcon} /></button>
                  <button class="btn btn-danger btn-sm" style="padding:4px 8px;" onClick=${() => handleDeleteAccount(u.id)}><${TrashIcon} /></button>
                </div>
              </div>
            `)}
          </div>
        </div>

        <!-- Bills List Panel -->
        <div class="card">
          <div class="card-title">Utility Bills Ledger</div>
          <div class="table-container">
            ${filteredBills.length === 0 ? html`
              <p style="color:var(--text-muted); text-align:center; padding:30px;">No bill statements registered.</p>
            ` : html`
              <table class="mms-table">
                <thead>
                  <tr>
                    <th>Utility & Property</th>
                    <th>Month</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th style="text-align: right;">Amount</th>
                    <th style="text-align: right;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredBills.map(b => {
                    const details = getUtilityDetails(b);
                    return html`
                      <tr key=${b.id}>
                        <td>
                          <div style="font-weight: 700;">${details.type}</div>
                          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top:2px;">${details.property}</div>
                        </td>
                        <td>${b.billingMonth}</td>
                        <td style="color: ${b.status === 'Pending' && b.dueDate < new Date().toISOString().slice(0,10) ? 'hsl(var(--color-danger))' : 'var(--text-primary)'}; font-weight: 600;">
                          ${b.dueDate}
                        </td>
                        <td>
                          <span class="badge ${b.status === 'Paid' ? 'badge-success' : 'badge-warning'}">
                            ${b.status}
                          </span>
                        </td>
                        <td style="text-align: right; font-weight:700;">${currency} ${Number(b.amount).toFixed(2)}</td>
                        <td style="text-align: right;">
                          <div style="display:inline-flex; gap:6px;">
                            <button class="btn btn-secondary btn-sm" style="padding:2px 6px;" onClick=${() => handleOpenBillForm(b.utilityId, b)}><${EditIcon} /></button>
                            <button class="btn btn-danger btn-sm" style="padding:2px 6px;" onClick=${() => handleDeleteBill(b.id)}><${TrashIcon} /></button>
                          </div>
                        </td>
                      </tr>
                    `;
                  })}
                </tbody>
              </table>
            `}
          </div>
        </div>
      </div>
    </div>
  `;
}
