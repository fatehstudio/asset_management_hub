import { html, useState, useEffect } from '../utils/htm.js';
import { getItems, saveItem, deleteItem, getDb } from '../utils/storage.js';
import { PlusIcon, EditIcon, TrashIcon, ArrowBackIcon } from './Icons.js';

export default function Loans() {
  const [activeTab, setActiveTab] = useState('asset-loans'); // 'asset-loans', 'personal-lending'
  const [properties, setProperties] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [contacts, setContacts] = useState([]);
  
  // Asset Loans states
  const [propLoans, setPropLoans] = useState([]);
  const [vehLoans, setVehLoans] = useState([]);
  const [selectedAssetLoan, setSelectedAssetLoan] = useState(null); // {type: 'property'/'vehicle', data: {}}
  const [viewAssetForm, setViewAssetForm] = useState(false);
  const [assetForm, setAssetForm] = useState({ id: '', type: 'property', assetId: '', bank: '', originalLoanAmount: 0, startDate: '', tenureYears: 30, interestRate: 4.0, monthlyInstalment: 0, dueDateDay: 1, outstandingBalance: 0, status: 'Active' });

  // Personal Lending states
  const [borrowers, setBorrowers] = useState([]);
  const [personalLoans, setPersonalLoans] = useState([]);
  const [loanPayments, setLoanPayments] = useState([]);
  const [selectedPersonalLoan, setSelectedPersonalLoan] = useState(null);
  const [viewPersonalForm, setViewPersonalForm] = useState(false);
  const [viewRepaymentForm, setViewRepaymentForm] = useState(false);
  
  // Personal Loan Form
  const [personalForm, setPersonalForm] = useState({ id: '', borrowerId: '', amountLent: 0, startDate: '', monthlyInstalment: 100, dueDateDay: 5, notes: '', status: 'Active' });
  
  // Repayment Form
  const [repaymentForm, setRepaymentForm] = useState({ id: '', loanId: '', date: new Date().toISOString().slice(0,10), amount: 0, method: 'Bank Transfer', notes: '', receiptLink: '' });

  useEffect(() => {
    loadData();
    window.addEventListener('mms_db_changed', loadData);
    return () => window.removeEventListener('mms_db_changed', loadData);
  }, []);

  const loadData = () => {
    const db = getDb();
    setProperties(db.properties || []);
    setVehicles(db.vehicles || []);
    setContacts(db.contacts || []);
    setPropLoans(db.propertyLoans || []);
    setVehLoans(db.vehicleLoans || []);
    setBorrowers(db.borrowers || []);
    setPersonalLoans(db.personalLoans || []);
    setLoanPayments(db.loanPayments || []);
  };

  // Calculations for Personal Lending
  const getPersonalLoanMetrics = (loan) => {
    const payments = loanPayments.filter(p => p.loanId === loan.id);
    const actualPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balance = Math.max(0, Number(loan.amountLent) - actualPaid);
    
    // Calculate expected payment to date (months elapsed since start date)
    const start = new Date(loan.startDate);
    const today = new Date();
    
    let monthsElapsed = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
    // If today is past the due date day in this month, count the current month as well
    if (today.getDate() >= Number(loan.dueDateDay)) {
      monthsElapsed += 1;
    }
    
    monthsElapsed = Math.max(0, monthsElapsed);
    
    const expectedPaid = Math.min(Number(loan.amountLent), monthsElapsed * Number(loan.monthlyInstalment));
    const arrears = Math.max(0, expectedPaid - actualPaid);

    return {
      actualPaid,
      balance,
      expectedPaid,
      arrears,
      paymentsCount: payments.length
    };
  };

  const handleOpenAssetForm = (type, loan = null) => {
    if (loan) {
      setAssetForm({
        ...loan,
        type,
        assetId: type === 'property' ? loan.propertyId : loan.vehicleId
      });
    } else {
      setAssetForm({
        id: '',
        type,
        assetId: type === 'property' ? (properties[0]?.id || '') : (vehicles[0]?.id || ''),
        bank: '',
        originalLoanAmount: 0,
        startDate: new Date().toISOString().slice(0, 10),
        tenureYears: type === 'property' ? 30 : 7,
        interestRate: type === 'property' ? 4.15 : 2.85,
        monthlyInstalment: 0,
        dueDateDay: 1,
        outstandingBalance: 0,
        status: 'Active'
      });
    }
    setViewAssetForm(true);
  };

  const handleSaveAssetLoan = (e) => {
    e.preventDefault();
    const isProperty = assetForm.type === 'property';
    const tableName = isProperty ? 'propertyLoans' : 'vehicleLoans';
    
    const record = {
      id: assetForm.id,
      bank: assetForm.bank,
      originalLoanAmount: Number(assetForm.originalLoanAmount),
      startDate: assetForm.startDate,
      tenureYears: Number(assetForm.tenureYears),
      interestRate: Number(assetForm.interestRate),
      monthlyInstalment: Number(assetForm.monthlyInstalment),
      dueDateDay: Number(assetForm.dueDateDay),
      outstandingBalance: Number(assetForm.outstandingBalance),
      status: assetForm.status
    };
    
    if (isProperty) {
      record.propertyId = assetForm.assetId;
    } else {
      record.vehicleId = assetForm.assetId;
    }

    saveItem(tableName, record);
    
    // Automatically log this as an expense in financial ledger on save/update? 
    // Usually bank loans are recurring monthly expenses, but we track manual/auto-debit triggers.
    
    setViewAssetForm(false);
  };

  const handleDeleteAssetLoan = (type, id) => {
    if (confirm('Are you sure you want to delete this loan record?')) {
      const tableName = type === 'property' ? 'propertyLoans' : 'vehicleLoans';
      deleteItem(tableName, id);
      loadData();
    }
  };

  // PERSONAL LOAN SAVE
  const handleOpenPersonalForm = (loan = null) => {
    if (loan) {
      setPersonalForm({ ...loan });
    } else {
      setPersonalForm({
        id: '',
        borrowerId: borrowers[0]?.id || '',
        amountLent: 0,
        startDate: new Date().toISOString().slice(0, 10),
        monthlyInstalment: 100,
        dueDateDay: 5,
        notes: '',
        status: 'Active'
      });
    }
    setViewPersonalForm(true);
  };

  const handleSavePersonalLoan = (e) => {
    e.preventDefault();
    const saved = saveItem('personalLoans', {
      ...personalForm,
      amountLent: Number(personalForm.amountLent),
      monthlyInstalment: Number(personalForm.monthlyInstalment)
    });

    // Register cash flow transaction: Money Lent (Expense)
    if (!personalForm.id) {
      saveItem('financialTransactions', {
        date: saved.startDate,
        type: 'Expense',
        category: 'Personal lending',
        amount: saved.amountLent,
        referenceId: saved.id,
        notes: `Money Lent: To ${borrowers.find(b => b.id === saved.borrowerId)?.name || 'Borrower'}`
      });
    }

    setViewPersonalForm(false);
  };

  const handleDeletePersonalLoan = (id) => {
    if (confirm('Are you sure you want to delete this personal lending file?')) {
      deleteItem('personalLoans', id);
      setSelectedPersonalLoan(null);
      loadData();
    }
  };

  // REPAYMENT SAVE
  const handleOpenRepaymentForm = (loanId) => {
    const loan = personalLoans.find(l => l.id === loanId);
    const metrics = getPersonalLoanMetrics(loan);
    setRepaymentForm({
      id: '',
      loanId,
      date: new Date().toISOString().slice(0, 10),
      amount: Math.min(metrics.balance, loan.monthlyInstalment),
      method: 'Bank Transfer',
      notes: `Instalment Payment`,
      receiptLink: ''
    });
    setViewRepaymentForm(true);
  };

  const handleSaveRepayment = (e) => {
    e.preventDefault();
    const saved = saveItem('loanPayments', {
      ...repaymentForm,
      amount: Number(repaymentForm.amount)
    });

    // Record income transaction in financial ledger
    const loan = personalLoans.find(l => l.id === saved.loanId);
    const borrower = borrowers.find(b => b.id === loan?.borrowerId);
    saveItem('financialTransactions', {
      date: saved.date,
      type: 'Income',
      category: 'Personal loan repayment',
      amount: saved.amount,
      referenceId: saved.id,
      notes: `Repayment Received: From ${borrower ? borrower.name : 'Borrower'} - ${saved.notes}`
    });

    setViewRepaymentForm(false);
    // Refresh detail view
    const db = getDb();
    setLoanPayments(db.loanPayments || []);
  };

  const getBorrowerName = (id) => {
    return borrowers.find(b => b.id === id)?.name || "Unknown Borrower";
  };

  const currency = getDb().settings?.currency || "RM";

  return html`
    <div>
      <div class="tab-header">
        <button class="tab-btn ${activeTab === 'asset-loans' ? 'active' : ''}" onClick=${() => setActiveTab('asset-loans')}>
          Asset Loans (Bank)
        </button>
        <button class="tab-btn ${activeTab === 'personal-lending' ? 'active' : ''}" onClick=${() => setActiveTab('personal-lending')}>
          Personal Lending (Money Lent)
        </button>
      </div>

      <!-- ASSET LOANS TAB -->
      ${activeTab === 'asset-loans' && html`
        <div>
          ${viewAssetForm ? html`
            <div class="card" style="max-width: 600px; margin: 0 auto 30px auto;">
              <div class="modal-header">
                <h2>${assetForm.id ? 'Edit Loan' : 'Link Bank Loan'}</h2>
                <button class="modal-close" onClick=${() => setViewAssetForm(false)}><${ArrowBackIcon} /></button>
              </div>
              <form onSubmit=${handleSaveAssetLoan}>
                <div class="form-row">
                  <div class="form-group">
                    <label>Loan Type</label>
                    <select class="form-control" value=${assetForm.type} onChange=${e => {
                      const newType = e.target.value;
                      setAssetForm({
                        ...assetForm,
                        type: newType,
                        assetId: newType === 'property' ? (properties[0]?.id || '') : (vehicles[0]?.id || '')
                      });
                    }}>
                      <option value="property">Property Loan</option>
                      <option value="vehicle">Vehicle Loan</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Link to Asset</label>
                    <select class="form-control" value=${assetForm.assetId} onChange=${e => setAssetForm({ ...assetForm, assetId: e.target.value })}>
                      ${assetForm.type === 'property' ? 
                        properties.map(p => html`<option key=${p.id} value=${p.id}>${p.name}</option>`) :
                        vehicles.map(v => html`<option key=${v.id} value=${v.id}>${v.registrationNumber} (${v.makeModel})</option>`)
                      }
                    </select>
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label>Bank Name</label>
                    <input type="text" class="form-control" placeholder="e.g. CIMB Bank" value=${assetForm.bank} onInput=${e => setAssetForm({ ...assetForm, bank: e.target.value })} required />
                  </div>
                  <div class="form-group">
                    <label>Original Loan Principal (${currency})</label>
                    <input type="number" class="form-control" value=${assetForm.originalLoanAmount} onInput=${e => setAssetForm({ ...assetForm, originalLoanAmount: e.target.value })} required />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Start Date</label>
                    <input type="date" class="form-control" value=${assetForm.startDate} onInput=${e => setAssetForm({ ...assetForm, startDate: e.target.value })} />
                  </div>
                  <div class="form-group">
                    <label>Tenure (Years)</label>
                    <input type="number" class="form-control" value=${assetForm.tenureYears} onInput=${e => setAssetForm({ ...assetForm, tenureYears: e.target.value })} required />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Interest Rate (% Per Year)</label>
                    <input type="number" step="0.01" class="form-control" value=${assetForm.interestRate} onInput=${e => setAssetForm({ ...assetForm, interestRate: e.target.value })} required />
                  </div>
                  <div class="form-group">
                    <label>Monthly Instalment (${currency})</label>
                    <input type="number" class="form-control" value=${assetForm.monthlyInstalment} onInput=${e => setAssetForm({ ...assetForm, monthlyInstalment: e.target.value })} required />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Instalment Due Day of Month</label>
                    <input type="number" min="1" max="31" class="form-control" placeholder="e.g., 5" value=${assetForm.dueDateDay} onInput=${e => setAssetForm({ ...assetForm, dueDateDay: e.target.value })} required />
                  </div>
                  <div class="form-group">
                    <label>Outstanding Balance (${currency})</label>
                    <input type="number" class="form-control" value=${assetForm.outstandingBalance} onInput=${e => setAssetForm({ ...assetForm, outstandingBalance: e.target.value })} required />
                  </div>
                </div>

                <div class="form-group">
                  <label>Loan Status</label>
                  <select class="form-control" value=${assetForm.status} onChange=${e => setAssetForm({ ...assetForm, status: e.target.value })}>
                    <option value="Active">Active</option>
                    <option value="Settled">Settled / Closed</option>
                  </select>
                </div>

                <div class="modal-actions">
                  <button type="button" class="btn btn-secondary" onClick=${() => setViewAssetForm(false)}>Cancel</button>
                  <button type="submit" class="btn btn-primary">Save Asset Loan</button>
                </div>
              </form>
            </div>
          ` : html`
            <div style="margin-bottom: 20px; display: flex; justify-content: flex-end; gap: 10px;">
              <button class="btn btn-primary" onClick=${() => handleOpenAssetForm('property')}><${PlusIcon} /> Link Property Loan</button>
              <button class="btn btn-secondary" onClick=${() => handleOpenAssetForm('vehicle')}><${PlusIcon} /> Link Vehicle Loan</button>
            </div>
          `}

          <!-- Loans Tables -->
          <div style="display: flex; flex-direction: column; gap: 24px;">
            <!-- Property Loans Card -->
            <div class="card">
              <div class="card-title">Property Loans</div>
              <div class="table-container">
                ${propLoans.length === 0 ? html`<p style="color:var(--text-muted); padding: 10px;">No property loans recorded.</p>` : html`
                  <table class="mms-table">
                    <thead>
                      <tr>
                        <th>Property</th>
                        <th>Lender Bank</th>
                        <th>Principal</th>
                        <th>Tenure</th>
                        <th>Rate</th>
                        <th>Instalment</th>
                        <th>Remaining Balance</th>
                        <th style="text-align: right;">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${propLoans.map(l => {
                        const pName = properties.find(p => p.id === l.propertyId)?.name || 'Unknown Property';
                        return html`
                          <tr key=${l.id}>
                            <td style="font-weight: 700;">${pName}</td>
                            <td>${l.bank}</td>
                            <td>${currency} ${l.originalLoanAmount?.toLocaleString()}</td>
                            <td>${l.tenureYears} yrs</td>
                            <td>${l.interestRate}%</td>
                            <td style="font-weight: 700; color: hsl(var(--color-danger));">${currency} ${l.monthlyInstalment}</td>
                            <td style="font-weight: 700;">${currency} ${l.outstandingBalance?.toLocaleString()}</td>
                            <td style="text-align: right;">
                              <div style="display: inline-flex; gap: 8px;">
                                <button class="btn btn-secondary btn-sm" onClick=${() => handleOpenAssetForm('property', l)}><${EditIcon} /></button>
                                <button class="btn btn-danger btn-sm" onClick=${() => handleDeleteAssetLoan('property', l.id)}><${TrashIcon} /></button>
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

            <!-- Vehicle Loans Card -->
            <div class="card">
              <div class="card-title">Vehicle Loans</div>
              <div class="table-container">
                ${vehLoans.length === 0 ? html`<p style="color:var(--text-muted); padding: 10px;">No vehicle loans recorded.</p>` : html`
                  <table class="mms-table">
                    <thead>
                      <tr>
                        <th>Vehicle Plate</th>
                        <th>Lender Bank</th>
                        <th>Principal</th>
                        <th>Tenure</th>
                        <th>Rate</th>
                        <th>Instalment</th>
                        <th>Remaining Balance</th>
                        <th style="text-align: right;">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${vehLoans.map(l => {
                        const vReg = vehicles.find(v => v.id === l.vehicleId)?.registrationNumber || 'Unknown Vehicle';
                        return html`
                          <tr key=${l.id}>
                            <td style="font-weight: 700;">${vReg}</td>
                            <td>${l.bank}</td>
                            <td>${currency} ${l.originalLoanAmount?.toLocaleString()}</td>
                            <td>${l.tenureYears} yrs</td>
                            <td>${l.interestRate}%</td>
                            <td style="font-weight: 700; color: hsl(var(--color-danger));">${currency} ${l.monthlyInstalment}</td>
                            <td style="font-weight: 700;">${currency} ${l.outstandingBalance?.toLocaleString()}</td>
                            <td style="text-align: right;">
                              <div style="display: inline-flex; gap: 8px;">
                                <button class="btn btn-secondary btn-sm" onClick=${() => handleOpenAssetForm('vehicle', l)}><${EditIcon} /></button>
                                <button class="btn btn-danger btn-sm" onClick=${() => handleDeleteAssetLoan('vehicle', l.id)}><${TrashIcon} /></button>
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
      `}

      <!-- PERSONAL LENDING TAB -->
      ${activeTab === 'personal-lending' && html`
        <div>
          <!-- Personal Form Overlay -->
          ${viewPersonalForm && html`
            <div class="card" style="max-width: 600px; margin: 0 auto 30px auto;">
              <div class="modal-header">
                <h2>${personalForm.id ? 'Edit Personal Lending' : 'Lend Money File'}</h2>
                <button class="modal-close" onClick=${() => setViewPersonalForm(false)}><${ArrowBackIcon} /></button>
              </div>
              <form onSubmit=${handleSavePersonalLoan}>
                <div class="form-row">
                  <div class="form-group">
                    <label>Borrower</label>
                    <select class="form-control" value=${personalForm.borrowerId} onChange=${e => setPersonalForm({ ...personalForm, borrowerId: e.target.value })}>
                      ${contacts.filter(c => c.role === 'Borrower').map(c => html`
                        <option key=${c.id} value=${c.id}>${c.name}</option>
                      `)}
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Total Amount Lent (${currency})</label>
                    <input type="number" class="form-control" value=${personalForm.amountLent} onInput=${e => setPersonalForm({ ...personalForm, amountLent: e.target.value })} required />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Lent Date</label>
                    <input type="date" class="form-control" value=${personalForm.startDate} onInput=${e => setPersonalForm({ ...personalForm, startDate: e.target.value })} required />
                  </div>
                  <div class="form-group">
                    <label>Agreed Monthly Repayment (${currency})</label>
                    <input type="number" class="form-control" value=${personalForm.monthlyInstalment} onInput=${e => setPersonalForm({ ...personalForm, monthlyInstalment: e.target.value })} required />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Instalment Due Day</label>
                    <input type="number" min="1" max="31" class="form-control" value=${personalForm.dueDateDay} onInput=${e => setPersonalForm({ ...personalForm, dueDateDay: e.target.value })} required />
                  </div>
                  <div class="form-group">
                    <label>Status</label>
                    <select class="form-control" value=${personalForm.status} onChange=${e => setPersonalForm({ ...personalForm, status: e.target.value })}>
                      <option value="Active">Active</option>
                      <option value="Settled">Settled / Recovered</option>
                    </select>
                  </div>
                </div>

                <div class="form-group">
                  <label>Notes</label>
                  <textarea class="form-control" rows="2" placeholder="Repayment plans, purpose, etc." value=${personalForm.notes} onInput=${e => setPersonalForm({ ...personalForm, notes: e.target.value })}></textarea>
                </div>

                <div class="modal-actions">
                  <button type="button" class="btn btn-secondary" onClick=${() => setViewPersonalForm(false)}>Cancel</button>
                  <button type="submit" class="btn btn-primary">Save Personal Loan</button>
                </div>
              </form>
            </div>
          `}

          <!-- Repayment Overlay Form -->
          ${viewRepaymentForm && html`
            <div class="card" style="max-width: 600px; margin: 0 auto 30px auto;">
              <div class="modal-header">
                <h2>Record Repayment Receipt</h2>
                <button class="modal-close" onClick=${() => setViewRepaymentForm(false)}><${ArrowBackIcon} /></button>
              </div>
              <form onSubmit=${handleSaveRepayment}>
                <div class="form-row">
                  <div class="form-group">
                    <label>Date Received</label>
                    <input type="date" class="form-control" value=${repaymentForm.date} onInput=${e => setRepaymentForm({ ...repaymentForm, date: e.target.value })} required />
                  </div>
                  <div class="form-group">
                    <label>Amount Received (${currency})</label>
                    <input type="number" class="form-control" value=${repaymentForm.amount} onInput=${e => setRepaymentForm({ ...repaymentForm, amount: e.target.value })} required />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Payment Method</label>
                    <select class="form-control" value=${repaymentForm.method} onChange=${e => setRepaymentForm({ ...repaymentForm, method: e.target.value })}>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Description / Notes</label>
                    <input type="text" class="form-control" placeholder="e.g. July Instalment" value=${repaymentForm.notes} onInput=${e => setRepaymentForm({ ...repaymentForm, notes: e.target.value })} />
                  </div>
                </div>
                <div class="modal-actions">
                  <button type="button" class="btn btn-secondary" onClick=${() => setViewRepaymentForm(false)}>Cancel</button>
                  <button type="submit" class="btn btn-primary">Save Repayment</button>
                </div>
              </form>
            </div>
          `}

          <div style="margin-bottom: 20px; display: flex; justify-content: flex-end;">
            <button class="btn btn-primary" onClick=${() => handleOpenPersonalForm()}><${PlusIcon} /> Register New Money Lent File</button>
          </div>

          <!-- Main Layout for Lending -->
          <div class="content-grid-2">
            <!-- Left Side: Loans list -->
            <div class="card">
              <div class="card-title">Active Borrowers Ledger</div>
              <div class="table-container">
                ${personalLoans.length === 0 ? html`<p style="color:var(--text-muted); padding:10px;">No lending records saved.</p>` : html`
                  <table class="mms-table">
                    <thead>
                      <tr>
                        <th>Borrower</th>
                        <th>Lent Amount</th>
                        <th>Repay Rate</th>
                        <th>Baki (Balance)</th>
                        <th>Tunggakan (Arrears)</th>
                        <th style="text-align: right;">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${personalLoans.map(l => {
                        const m = getPersonalLoanMetrics(l);
                        const isOverdue = m.arrears > 0;
                        return html`
                          <tr key=${l.id} style="cursor: pointer;" onClick=${() => setSelectedPersonalLoan(l)} class=${selectedPersonalLoan?.id === l.id ? 'bg-prop-theme' : ''}>
                            <td style="font-weight: 700; color: var(--accent-color);">${getBorrowerName(l.borrowerId)}</td>
                            <td>${currency} ${Number(l.amountLent).toFixed(2)}</td>
                            <td>${currency} ${l.monthlyInstalment}/mo</td>
                            <td style="font-weight: 700;">${currency} ${m.balance.toFixed(2)}</td>
                            <td style="font-weight: 700; color: ${isOverdue ? 'hsl(var(--color-danger))' : 'var(--text-secondary)'}">
                              ${currency} ${m.arrears.toFixed(2)}
                            </td>
                            <td style="text-align: right;" onClick=${e => e.stopPropagation()}>
                              <div style="display: inline-flex; gap: 8px;">
                                <button class="btn btn-primary btn-sm" style="padding: 2px 6px;" title="Record Repayment" onClick=${() => handleOpenRepaymentForm(l.id)}><${PlusIcon} /></button>
                                <button class="btn btn-secondary btn-sm" style="padding: 2px 6px;" onClick=${() => handleOpenPersonalForm(l)}><${EditIcon} /></button>
                                <button class="btn btn-danger btn-sm" style="padding: 2px 6px;" onClick=${() => handleDeletePersonalLoan(l.id)}><${TrashIcon} /></button>
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

            <!-- Right Side: Details / Payment logs for selected loan -->
            <div class="card">
              <div class="card-title">Borrower Repayment Log</div>
              ${selectedPersonalLoan ? html`
                <div>
                  <div style="margin-bottom: 16px;">
                    <h3 style="font-size: 1.1rem; font-weight:800;">${getBorrowerName(selectedPersonalLoan.borrowerId)}</h3>
                    <p style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">Lent on ${selectedPersonalLoan.startDate}</p>
                  </div>
                  
                  <div style="display:flex; flex-direction:column; gap:10px; margin-bottom: 20px;">
                    <div style="display:flex; justify-content:space-between;">
                      <span style="color:var(--text-secondary);">Original Amount:</span>
                      <span style="font-weight:700;">${currency} ${Number(selectedPersonalLoan.amountLent).toFixed(2)}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                      <span style="color:var(--text-secondary);">Agreed Monthly Installment:</span>
                      <span style="font-weight:700;">${currency} ${selectedPersonalLoan.monthlyInstalment}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                      <span style="color:var(--text-secondary);">Outstanding Balance:</span>
                      <span style="font-weight:700; color:var(--accent-color);">${currency} ${getPersonalLoanMetrics(selectedPersonalLoan).balance.toFixed(2)}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                      <span style="color:var(--text-secondary);">Arrears (Tunggakan):</span>
                      <span style="font-weight:800; color:${getPersonalLoanMetrics(selectedPersonalLoan).arrears > 0 ? 'hsl(var(--color-danger))' : 'hsl(var(--color-success))'}">
                        ${currency} ${getPersonalLoanMetrics(selectedPersonalLoan).arrears.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <h4 style="font-size:0.85rem; text-transform:uppercase; color:var(--text-muted); margin-bottom:12px;">Payments Received</h4>
                  <div style="max-height: 200px; overflow-y:auto; display:flex; flex-direction:column; gap:8px;">
                    ${loanPayments.filter(p => p.loanId === selectedPersonalLoan.id).length === 0 ? html`
                      <p style="color:var(--text-muted); font-size:0.85rem;">No repayments logged yet.</p>
                    ` : loanPayments.filter(p => p.loanId === selectedPersonalLoan.id).map(p => html`
                      <div key=${p.id} style="display:flex; justify-content:space-between; font-size:0.85rem; border-bottom:1px solid var(--border-color); padding-bottom:6px;">
                        <div>
                          <span style="font-weight:700;">${p.date}</span>
                          <div style="font-size:0.75rem; color:var(--text-muted);">${p.notes || p.method}</div>
                        </div>
                        <div style="font-weight:700; color:hsl(var(--color-success));">
                          +${currency} ${Number(p.amount).toFixed(2)}
                        </div>
                      </div>
                    `)}
                  </div>
                </div>
              ` : html`
                <p style="color:var(--text-muted); padding: 20px 0; text-align:center;">Select a borrower from the ledger to view details and payment logs.</p>
              `}
            </div>
          </div>
        </div>
      `}
    </div>
  `;
}
