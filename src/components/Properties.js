import { html, useState, useEffect } from '../utils/htm.js';
import { getItems, saveItem, deleteItem, getDb } from '../utils/storage.js';
import { PlusIcon, EditIcon, TrashIcon, ArrowBackIcon, ExternalLinkIcon } from './Icons.js';

export default function Properties({ selectedPropertyId, setSelectedPropertyId, navigateToTab }) {
  const [properties, setProperties] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [owners, setOwners] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [rentalAgreements, setRentalAgreements] = useState([]);
  const [rentPayments, setRentPayments] = useState([]);
  const [loans, setLoans] = useState([]);
  const [utilities, setUtilities] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  
  // UI states
  const [view, setView] = useState('list'); // 'list', 'detail', 'form-property', 'form-tenant', 'form-payment'
  const [search, setSearch] = useState('');
  const [filterOwner, setFilterOwner] = useState('All'); // 'All', 'Own', 'Client'
  const [activeProperty, setActiveProperty] = useState(null);
  
  // Property Form fields
  const [propForm, setPropForm] = useState({ id: '', name: '', address: '', type: 'Condominium', ownerId: 'con-1', status: 'Vacant', monthlyRent: 0, depositCollected: 0, startDate: '' });
  
  // Tenant Form fields
  const [tenantForm, setTenantForm] = useState({ id: '', propertyId: '', name: '', icPassport: '', phone: '', emergencyContact: '', startDate: '', endDate: '', status: 'Active' });
  
  // Rent Payment Form fields
  const [paymentForm, setPaymentForm] = useState({ id: '', propertyId: '', date: new Date().toISOString().slice(0,10), billingMonth: '', amount: 0, method: 'Bank Transfer', status: 'Paid', receiptLink: '' });

  useEffect(() => {
    loadData();
    window.addEventListener('mms_db_changed', loadData);
    return () => window.removeEventListener('mms_db_changed', loadData);
  }, []);

  useEffect(() => {
    if (selectedPropertyId) {
      const db = getDb();
      const prop = (db.properties || []).find(p => p.id === selectedPropertyId);
      if (prop) {
        setActiveProperty(prop);
        setView('detail');
      }
    }
  }, [selectedPropertyId, properties]);

  const loadData = () => {
    const db = getDb();
    setProperties(db.properties || []);
    setContacts(db.contacts || []);
    setOwners(db.owners || []);
    setTenants(db.tenants || []);
    setRentalAgreements(db.rentalAgreements || []);
    setRentPayments(db.rentPayments || []);
    setLoans(db.propertyLoans || []);
    setUtilities(db.utilities || []);
    setMaintenance(db.maintenance || []);
  };

  const handleBack = () => {
    setSelectedPropertyId(null);
    setActiveProperty(null);
    setView('list');
  };

  const handleOpenFormProperty = (prop = null) => {
    if (prop) {
      setPropForm({ ...prop });
    } else {
      setPropForm({ id: '', name: '', address: '', type: 'Condominium', ownerId: 'con-1', status: 'Vacant', monthlyRent: 0, depositCollected: 0, startDate: '' });
    }
    setView('form-property');
  };

  const handleSaveProperty = (e) => {
    e.preventDefault();
    const saved = saveItem('properties', {
      ...propForm,
      monthlyRent: Number(propForm.monthlyRent),
      depositCollected: Number(propForm.depositCollected)
    });
    
    // Update active property if we were editing it
    if (activeProperty && activeProperty.id === saved.id) {
      setActiveProperty(saved);
      setView('detail');
    } else {
      setView('list');
    }
  };

  const handleDeleteProperty = (id) => {
    if (confirm('Are you sure you want to delete this property and all its links?')) {
      deleteItem('properties', id);
      handleBack();
    }
  };

  const handleOpenFormTenant = (propId, tenant = null) => {
    if (tenant) {
      setTenantForm({ ...tenant });
    } else {
      setTenantForm({ id: '', propertyId: propId, name: '', icPassport: '', phone: '', emergencyContact: '', startDate: '', endDate: '', status: 'Active' });
    }
    setView('form-tenant');
  };

  const handleSaveTenant = (e) => {
    e.preventDefault();
    const saved = saveItem('tenants', tenantForm);
    
    // Update the property status to Rented if a new tenant is added
    const db = getDb();
    const prop = (db.properties || []).find(p => p.id === tenantForm.propertyId);
    if (prop && prop.status !== 'Rented') {
      prop.status = 'Rented';
      saveItem('properties', prop);
    }

    // Automatically create or update the Rental Agreement
    const activeRA = rentalAgreements.find(ra => ra.propertyId === tenantForm.propertyId && ra.status === 'Active') || {};
    saveItem('rentalAgreements', {
      ...activeRA,
      propertyId: tenantForm.propertyId,
      tenantId: saved.id,
      startDate: tenantForm.startDate,
      endDate: tenantForm.endDate,
      monthlyRent: prop ? prop.monthlyRent : 0,
      depositAmount: prop ? prop.depositCollected : 0,
      dueDateDay: 5,
      status: 'Active'
    });

    // Automatically add the tenant to Contacts if they do not exist
    const contactExists = contacts.some(c => c.name.toLowerCase() === tenantForm.name.toLowerCase() && c.role === 'Tenant');
    if (!contactExists) {
      saveItem('contacts', {
        name: tenantForm.name,
        phone: tenantForm.phone,
        email: '',
        role: 'Tenant'
      });
    }

    // Reload active property info
    const updatedDb = getDb();
    const p = (updatedDb.properties || []).find(x => x.id === tenantForm.propertyId);
    setActiveProperty(p);
    setView('detail');
  };

  const handleOpenFormPayment = (propId) => {
    const prop = properties.find(p => p.id === propId);
    // Find last unpaid rent, or create a default month name
    const unpaid = rentPayments.find(rp => rp.propertyId === propId && rp.status === 'Pending');
    
    setPaymentForm({
      id: unpaid ? unpaid.id : '',
      propertyId: propId,
      date: new Date().toISOString().slice(0, 10),
      billingMonth: unpaid ? unpaid.billingMonth : new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      amount: unpaid ? unpaid.amount : (prop ? prop.monthlyRent : 0),
      method: 'Bank Transfer',
      status: 'Paid',
      receiptLink: ''
    });
    setView('form-payment');
  };

  const handleSavePayment = (e) => {
    e.preventDefault();
    const saved = saveItem('rentPayments', {
      ...paymentForm,
      amount: Number(paymentForm.amount)
    });

    // If payment is paid, log it in Financial Transactions
    if (saved.status === 'Paid') {
      const prop = properties.find(p => p.id === saved.propertyId);
      saveItem('financialTransactions', {
        date: saved.date,
        type: 'Income',
        category: 'Rent',
        amount: saved.amount,
        referenceId: saved.id,
        notes: `Rent Received: ${prop ? prop.name : 'Property'} - ${saved.billingMonth}`
      });
    }

    setView('detail');
  };

  const currency = getDb().settings?.currency || "RM";

  const getOwnerName = (ownerId) => {
    const owner = contacts.find(c => c.id === ownerId) || owners.find(o => o.id === ownerId);
    return owner?.name || "Unknown";
  };

  // Filter properties
  const filteredProperties = properties.filter(prop => {
    const matchesSearch = prop.name.toLowerCase().includes(search.toLowerCase()) || 
                          prop.address.toLowerCase().includes(search.toLowerCase());
    
    const ownerName = getOwnerName(prop.ownerId);
    const isOwn = prop.ownerId === "con-1" || ownerName.toLowerCase().includes("self") || ownerName.toLowerCase().includes("ahmad");
    
    if (filterOwner === 'Own') return matchesSearch && isOwn;
    if (filterOwner === 'Client') return matchesSearch && !isOwn;
    return matchesSearch;
  });

  if (view === 'form-property') {
    return html`
      <div class="card" style="max-width: 700px; margin: 0 auto;">
        <div class="modal-header">
          <h2>${propForm.id ? 'Edit Property' : 'Add Property'}</h2>
          <button class="modal-close" onClick=${() => setView(activeProperty ? 'detail' : 'list')}><${ArrowBackIcon} /></button>
        </div>
        <form onSubmit=${handleSaveProperty}>
          <div class="form-group">
            <label>Property Name / Label</label>
            <input type="text" class="form-control" placeholder="e.g. Kondominium Heights A-12-03" value=${propForm.name} onInput=${e => setPropForm({ ...propForm, name: e.target.value })} required />
          </div>
          <div class="form-group">
            <label>Full Address</label>
            <textarea class="form-control" rows="3" placeholder="Address..." value=${propForm.address} onInput=${e => setPropForm({ ...propForm, address: e.target.value })} required></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Property Type</label>
              <select class="form-control" value=${propForm.type} onChange=${e => setPropForm({ ...propForm, type: e.target.value })}>
                <option value="Condominium">Condominium</option>
                <option value="Apartment">Apartment</option>
                <option value="Terrace House">Terrace House</option>
                <option value="Semi-Detached">Semi-Detached</option>
                <option value="Shop Lot">Shop Lot</option>
                <option value="Paddy Field / Land">Paddy Field / Land</option>
                <option value="Agricultural Land">Agricultural Land</option>
              </select>
            </div>
            <div class="form-group">
              <label>Property Owner</label>
              <select class="form-control" value=${propForm.ownerId} onChange=${e => setPropForm({ ...propForm, ownerId: e.target.value })}>
                ${(contacts.filter(c => c.role === 'Owner').length > 0 ? contacts.filter(c => c.role === 'Owner') : owners).map(c => html`
                  <option key=${c.id} value=${c.id}>${c.name}</option>
                `)}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Monthly Rent (${currency})</label>
              <input type="number" class="form-control" value=${propForm.monthlyRent} onInput=${e => setPropForm({ ...propForm, monthlyRent: e.target.value })} required />
            </div>
            <div class="form-group">
              <label>Security Deposit Collected (${currency})</label>
              <input type="number" class="form-control" value=${propForm.depositCollected} onInput=${e => setPropForm({ ...propForm, depositCollected: e.target.value })} />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Tenancy Start Date</label>
              <input type="date" class="form-control" value=${propForm.startDate} onInput=${e => setPropForm({ ...propForm, startDate: e.target.value })} />
            </div>
            <div class="form-group">
              <label>Status</label>
              <select class="form-control" value=${propForm.status} onChange=${e => setPropForm({ ...propForm, status: e.target.value })}>
                <option value="Vacant">Vacant</option>
                <option value="Rented">Rented</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onClick=${() => setView(activeProperty ? 'detail' : 'list')}>Cancel</button>
            <button type="submit" class="btn btn-primary">Save Property</button>
          </div>
        </form>
      </div>
    `;
  }

  if (view === 'form-tenant') {
    return html`
      <div class="card" style="max-width: 600px; margin: 0 auto;">
        <div class="modal-header">
          <h2>Tenant Information</h2>
          <button class="modal-close" onClick=${() => setView('detail')}><${ArrowBackIcon} /></button>
        </div>
        <form onSubmit=${handleSaveTenant}>
          <div class="form-group">
            <label>Tenant Name</label>
            <input type="text" class="form-control" placeholder="Full Name" value=${tenantForm.name} onInput=${e => setTenantForm({ ...tenantForm, name: e.target.value })} required />
          </div>
          <div class="form-group">
            <label>IC Number / Passport</label>
            <input type="text" class="form-control" placeholder="e.g. 950212-14-1234" value=${tenantForm.icPassport} onInput=${e => setTenantForm({ ...tenantForm, icPassport: e.target.value })} required />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Phone Number</label>
              <input type="text" class="form-control" placeholder="e.g. 012-3456789" value=${tenantForm.phone} onInput=${e => setTenantForm({ ...tenantForm, phone: e.target.value })} required />
            </div>
            <div class="form-group">
              <label>Emergency Contact</label>
              <input type="text" class="form-control" placeholder="e.g. Spouse name & phone" value=${tenantForm.emergencyContact} onInput=${e => setTenantForm({ ...tenantForm, emergencyContact: e.target.value })} />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Tenancy Start Date</label>
              <input type="date" class="form-control" value=${tenantForm.startDate} onInput=${e => setTenantForm({ ...tenantForm, startDate: e.target.value })} required />
            </div>
            <div class="form-group">
              <label>Tenancy Expiry Date</label>
              <input type="date" class="form-control" value=${tenantForm.endDate} onInput=${e => setTenantForm({ ...tenantForm, endDate: e.target.value })} required />
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onClick=${() => setView('detail')}>Cancel</button>
            <button type="submit" class="btn btn-primary">Save Tenant & Active Agreement</button>
          </div>
        </form>
      </div>
    `;
  }

  if (view === 'form-payment') {
    return html`
      <div class="card" style="max-width: 600px; margin: 0 auto;">
        <div class="modal-header">
          <h2>Record Rental Payment</h2>
          <button class="modal-close" onClick=${() => setView('detail')}><${ArrowBackIcon} /></button>
        </div>
        <form onSubmit=${handleSavePayment}>
          <div class="form-row">
            <div class="form-group">
              <label>Payment Date</label>
              <input type="date" class="form-control" value=${paymentForm.date} onInput=${e => setPaymentForm({ ...paymentForm, date: e.target.value })} required />
            </div>
            <div class="form-group">
              <label>Rental Month</label>
              <input type="text" class="form-control" placeholder="e.g. August 2026" value=${paymentForm.billingMonth} onInput=${e => setPaymentForm({ ...paymentForm, billingMonth: e.target.value })} required />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Amount Received (${currency})</label>
              <input type="number" class="form-control" value=${paymentForm.amount} onInput=${e => setPaymentForm({ ...paymentForm, amount: e.target.value })} required />
            </div>
            <div class="form-group">
              <label>Payment Method</label>
              <select class="form-control" value=${paymentForm.method} onChange=${e => setPaymentForm({ ...paymentForm, method: e.target.value })}>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Link to Receipt Document (URL or Local path)</label>
            <input type="text" class="form-control" placeholder="C:/receipts/..." value=${paymentForm.receiptLink} onInput=${e => setPaymentForm({ ...paymentForm, receiptLink: e.target.value })} />
          </div>
          <div class="form-group">
            <label>Payment Status</label>
            <select class="form-control" value=${paymentForm.status} onChange=${e => setPaymentForm({ ...paymentForm, status: e.target.value })}>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending / Unpaid</option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onClick=${() => setView('detail')}>Cancel</button>
            <button type="submit" class="btn btn-primary">Save Rent Payment</button>
          </div>
        </form>
      </div>
    `;
  }

  if (view === 'detail' && activeProperty) {
    const propTenant = tenants.find(t => t.propertyId === activeProperty.id && t.status === 'Active');
    const propAgreement = rentalAgreements.find(ra => ra.propertyId === activeProperty.id && ra.status === 'Active');
    const propLoan = loans.find(l => l.propertyId === activeProperty.id);
    const propUtilities = utilities.filter(u => u.propertyId === activeProperty.id);
    const propMaint = maintenance.filter(m => m.propertyId === activeProperty.id);
    const propPayments = rentPayments.filter(rp => rp.propertyId === activeProperty.id);

    return html`
      <div>
        <div class="detail-header">
          <button class="btn btn-secondary" onClick=${handleBack}><${ArrowBackIcon} /> Back</button>
          <h2>${activeProperty.name}</h2>
          <span class="badge ${activeProperty.status === 'Rented' ? 'badge-success' : activeProperty.status === 'Vacant' ? 'badge-warning' : 'badge-danger'}">
            ${activeProperty.status}
          </span>
          <div style="margin-left: auto; display: flex; gap: 8px;">
            <button class="btn btn-secondary btn-sm" onClick=${() => handleOpenFormProperty(activeProperty)}><${EditIcon} /> Edit</button>
            <button class="btn btn-danger btn-sm" onClick=${() => handleDeleteProperty(activeProperty.id)}><${TrashIcon} /> Delete</button>
          </div>
        </div>

        <div class="detail-grid">
          <div class="detail-cell">
            <div class="detail-cell-label">Property Type</div>
            <div class="detail-cell-value">${activeProperty.type}</div>
          </div>
          <div class="detail-cell">
            <div class="detail-cell-label">Owner</div>
            <div class="detail-cell-value">${getOwnerName(activeProperty.ownerId)}</div>
          </div>
          <div class="detail-cell">
            <div class="detail-cell-label">Expected Rent</div>
            <div class="detail-cell-value">${currency} ${Number(activeProperty.monthlyRent).toFixed(2)}</div>
          </div>
          <div class="detail-cell">
            <div class="detail-cell-label">Deposit Held</div>
            <div class="detail-cell-value">${currency} ${Number(activeProperty.depositCollected).toFixed(2)}</div>
          </div>
        </div>

        <!-- Two Column Details -->
        <div class="content-grid-2">
          <!-- Left Main Pane -->
          <div style="display: flex; flex-direction: column; gap: 24px;">
            <!-- Tenant section -->
            <div class="card">
              <div class="card-title">
                <span>Tenant & Tenancy Agreement</span>
                ${!propTenant && html`
                  <button class="btn btn-primary btn-sm" onClick=${() => handleOpenFormTenant(activeProperty.id)}><${PlusIcon} /> Assign Tenant</button>
                `}
              </div>
              
              ${propTenant ? html`
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                  <div>
                    <p style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">NAME</p>
                    <p style="font-weight: 700; font-size: 1.05rem; margin-top: 4px;">${propTenant.name}</p>
                    <p style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600; margin-top: 14px;">PHONE</p>
                    <p style="font-weight: 600; margin-top: 4px;">${propTenant.phone}</p>
                    <p style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600; margin-top: 14px;">IC / PASSPORT</p>
                    <p style="font-weight: 600; margin-top: 4px;">${propTenant.icPassport}</p>
                  </div>
                  <div>
                    <p style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">AGREEMENT PERIOD</p>
                    <p style="font-weight: 700; margin-top: 4px;">${propTenant.startDate} to ${propTenant.endDate}</p>
                    <p style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600; margin-top: 14px;">EMERGENCY CONTACT</p>
                    <p style="font-weight: 500; margin-top: 4px;">${propTenant.emergencyContact || 'None'}</p>
                    ${propAgreement?.documentLink && html`
                      <p style="margin-top: 20px;">
                        <a href="${propAgreement.documentLink}" target="_blank" class="file-link">
                          <${ExternalLinkIcon} /> View Tenancy Agreement Link
                        </a>
                      </p>
                    `}
                  </div>
                </div>
              ` : html`
                <p style="color: var(--text-muted); padding: 10px 0;">This property is currently vacant. Click "Assign Tenant" to log a tenant and activate rental contract calculations.</p>
              `}
            </div>

            <!-- Rent Payment Ledger -->
            <div class="card">
              <div class="card-title">
                <span>Rental Payment History</span>
                <button class="btn btn-secondary btn-sm" onClick=${() => handleOpenFormPayment(activeProperty.id)}><${PlusIcon} /> Record Payment</button>
              </div>
              <div class="table-container">
                ${propPayments.length === 0 ? html`
                  <p style="color: var(--text-muted); text-align: center; padding: 20px;">No rental records saved.</p>
                ` : html`
                  <table class="mms-table">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Date Paid</th>
                        <th>Method</th>
                        <th>Status</th>
                        <th style="text-align: right;">Amount</th>
                        <th style="text-align: right;">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${propPayments.map(rp => html`
                        <tr key=${rp.id}>
                          <td>${rp.billingMonth}</td>
                          <td>${rp.date || '-'}</td>
                          <td>${rp.method || '-'}</td>
                          <td>
                            <span class="badge ${rp.status === 'Paid' ? 'badge-success' : 'badge-warning'}">${rp.status}</span>
                          </td>
                          <td style="text-align: right; font-weight: 700;">${currency} ${Number(rp.amount).toFixed(2)}</td>
                          <td style="text-align: right;">
                            <button class="btn btn-secondary btn-sm" style="padding: 2px 6px;" onClick=${() => {
                              setPaymentForm({ ...rp });
                              setView('form-payment');
                            }}><${EditIcon} /></button>
                          </td>
                        </tr>
                      `)}
                    </tbody>
                  </table>
                `}
              </div>
            </div>
          </div>

          <!-- Right Sidebar Pane -->
          <div style="display: flex; flex-direction: column; gap: 24px;">
            <!-- Bank Loan details -->
            <div class="card">
              <div class="card-title">Property Bank Loan</div>
              ${propLoan ? html`
                <div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span style="color: var(--text-secondary); font-weight: 500;">Bank:</span>
                    <span style="font-weight: 700;">${propLoan.bank}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span style="color: var(--text-secondary); font-weight: 500;">Monthly Instalment:</span>
                    <span style="font-weight: 700;">${currency} ${Number(propLoan.monthlyInstalment).toFixed(2)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span style="color: var(--text-secondary); font-weight: 500;">Interest Rate:</span>
                    <span style="font-weight: 700;">${propLoan.interestRate}%</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
                    <span style="color: var(--text-secondary); font-weight: 500;">Outstanding:</span>
                    <span style="font-weight: 700;">${currency} ${Number(propLoan.outstandingBalance).toLocaleString()}</span>
                  </div>
                  
                  <div style="margin-top: 10px;">
                    <button class="btn btn-secondary btn-sm" style="width: 100%; justify-content: center;" onClick=${() => navigateToTab('loans')}>
                      Manage Loans
                    </button>
                  </div>
                </div>
              ` : html`
                <p style="color: var(--text-muted); font-size: 0.88rem; padding-bottom: 10px;">No bank loan registered for this property.</p>
                <button class="btn btn-secondary btn-sm" style="width: 100%; justify-content: center;" onClick=${() => navigateToTab('loans')}>
                  Add Loan
                </button>
              `}
            </div>

            <!-- Utilities list -->
            <div class="card">
              <div class="card-title">Linked Utilities</div>
              ${propUtilities.length === 0 ? html`
                <p style="color: var(--text-muted); font-size: 0.88rem; padding-bottom: 10px;">No utilities linked to this property.</p>
              ` : html`
                <div style="display: flex; flex-direction: column; gap: 12px;">
                  ${propUtilities.map(u => html`
                    <div key=${u.id} style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                      <div>
                        <div style="font-weight: 700; font-size: 0.9rem;">${u.type}</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">Acc: ${u.accountNumber}</div>
                      </div>
                      <div style="text-align: right;">
                        <span class="badge ${u.responsibleParty === 'Tenant' ? 'badge-info' : 'badge-warning'}" style="font-size: 0.65rem;">
                          ${u.responsibleParty}
                        </span>
                      </div>
                    </div>
                  `)}
                </div>
              `}
              <button class="btn btn-secondary btn-sm" style="width: 100%; justify-content: center; margin-top: 14px;" onClick=${() => navigateToTab('utilities')}>
                Manage Utilities & Bills
              </button>
            </div>

            <!-- Maintenance requests -->
            <div class="card">
              <div class="card-title">Maintenance Tickets</div>
              ${propMaint.length === 0 ? html`
                <p style="color: var(--text-muted); font-size: 0.88rem; padding-bottom: 10px;">No maintenance requests filed.</p>
              ` : html`
                <div style="display: flex; flex-direction: column; gap: 12px;">
                  ${propMaint.map(m => html`
                    <div key=${m.id} style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                      <div>
                        <div style="font-weight: 700; font-size: 0.88rem;">${m.issue}</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">${m.reportedDate}</div>
                      </div>
                      <div style="text-align: right;">
                        <span class="badge ${m.status === 'Completed' ? 'badge-success' : 'badge-warning'}" style="font-size: 0.65rem;">
                          ${m.status}
                        </span>
                      </div>
                    </div>
                  `)}
                </div>
              `}
              <button class="btn btn-secondary btn-sm" style="width: 100%; justify-content: center; margin-top: 14px;" onClick=${() => navigateToTab('maintenance')}>
                Manage Maintenance
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  return html`
    <div>
      <!-- Filter Bar -->
      <div class="filter-bar">
        <div class="search-input-wrapper">
          <input type="text" class="form-control" placeholder="Search property name or address..." value=${search} onInput=${e => setSearch(e.target.value)} />
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <select class="form-control" style="width: 150px; padding: 10px;" value=${filterOwner} onChange=${e => setFilterOwner(e.target.value)}>
            <option value="All">All Owners</option>
            <option value="Own">Own Properties</option>
            <option value="Client">Managed (Client)</option>
          </select>
          <button class="btn btn-primary" onClick=${() => handleOpenFormProperty()}><${PlusIcon} /> Add Property</button>
        </div>
      </div>

      <!-- Properties list table -->
      <div class="card">
        <div class="table-container">
          ${filteredProperties.length === 0 ? html`
            <p style="color: var(--text-muted); text-align: center; padding: 30px;">No properties match your filters.</p>
          ` : html`
            <table class="mms-table">
              <thead>
                <tr>
                  <th>Property Name</th>
                  <th>Type</th>
                  <th>Owner</th>
                  <th>Tenant</th>
                  <th>Rent</th>
                  <th>Status</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${filteredProperties.map(prop => {
                  const activeTenant = tenants.find(t => t.propertyId === prop.id && t.status === 'Active');
                  return html`
                    <tr key=${prop.id}>
                      <td>
                        <div style="font-weight: 700; cursor: pointer; color: var(--accent-color);" onClick=${() => {
                          setSelectedPropertyId(prop.id);
                          setActiveProperty(prop);
                          setView('detail');
                        }}>
                          ${prop.name}
                        </div>
                        <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                          ${prop.address}
                        </div>
                      </td>
                      <td>${prop.type}</td>
                      <td>${getOwnerName(prop.ownerId)}</td>
                      <td style="color: ${activeTenant ? 'var(--text-primary)' : 'var(--text-muted)'}">
                        ${activeTenant ? activeTenant.name : 'Vacant'}
                      </td>
                      <td style="font-weight: 700;">${currency} ${Number(prop.monthlyRent).toFixed(2)}</td>
                      <td>
                        <span class="badge ${prop.status === 'Rented' ? 'badge-success' : prop.status === 'Vacant' ? 'badge-warning' : 'badge-danger'}">
                          ${prop.status}
                        </span>
                      </td>
                      <td style="text-align: right;">
                        <div style="display: inline-flex; gap: 8px;">
                          <button class="btn btn-secondary btn-sm" onClick=${() => handleOpenFormProperty(prop)}><${EditIcon} /></button>
                          <button class="btn btn-danger btn-sm" onClick=${() => handleDeleteProperty(prop.id)}><${TrashIcon} /></button>
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
  `;
}
