import { html, useState, useEffect } from '../utils/htm.js';
import { getItems, saveItem, deleteItem, getDb, exportPropertyLedgerToCSV } from '../utils/storage.js?v=20260808-google-sheets-1';
import { PlusIcon, EditIcon, TrashIcon, ArrowBackIcon } from './Icons.js';

export default function FinancialHub() {
  const [activeTab, setActiveTab] = useState('summary'); // 'summary', 'ledger', 'property-pl', 'vehicle-costs'
  const [transactions, setTransactions] = useState([]);
  const [properties, setProperties] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  
  // UI states
  const [viewForm, setViewForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All'); // 'All', 'Income', 'Expense'
  
  // Form state
  const [form, setForm] = useState({ id: '', date: new Date().toISOString().slice(0,10), type: 'Expense', category: 'Utilities', amount: 0, notes: '' });

  useEffect(() => {
    loadData();
    window.addEventListener('mms_db_changed', loadData);
    return () => window.removeEventListener('mms_db_changed', loadData);
  }, []);

  const loadData = () => {
    const db = getDb();
    setTransactions(db.financialTransactions || []);
    setProperties(db.properties || []);
    setVehicles(db.vehicles || []);
  };

  const handleOpenForm = (tx = null) => {
    if (tx) {
      setForm({ ...tx });
    } else {
      setForm({
        id: '',
        date: new Date().toISOString().slice(0, 10),
        type: 'Expense',
        category: 'Utilities',
        amount: 0,
        notes: ''
      });
    }
    setViewForm(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    saveItem('financialTransactions', {
      ...form,
      amount: Number(form.amount)
    });
    setViewForm(false);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this transaction from the ledger?')) {
      deleteItem('financialTransactions', id);
      loadData();
    }
  };

  // Property P&L calculations
  const getPropertyPL = (prop) => {
    const db = getDb();
    const rentalIncome = (db.rentPayments || [])
      .filter(rp => rp.propertyId === prop.id && rp.status === 'Paid')
      .reduce((sum, rp) => sum + Number(rp.amount), 0);

    const loanExpenses = (db.propertyLoans || [])
      .filter(l => l.propertyId === prop.id)
      // Estimate total instalments paid so far (for simplicity: sum of months since start date or active loan status)
      // To keep it linked to actual transactions, we query the transactions logged under 'Property loan' referencing this property
      .map(l => (db.financialTransactions || []).filter(tx => tx.category === 'Property loan' && tx.notes.includes(prop.name)).reduce((sum, tx) => sum + Number(tx.amount), 0))
      .reduce((sum, amt) => sum + amt, 0);

    const utilityExpenses = (db.utilities || [])
      .filter(u => u.propertyId === prop.id)
      .map(u => (db.utilityBills || []).filter(b => b.utilityId === u.id && b.status === 'Paid').reduce((sum, b) => sum + Number(b.amount), 0))
      .reduce((sum, amt) => sum + amt, 0);

    const maintExpenses = (db.maintenance || [])
      .filter(m => m.propertyId === prop.id && m.status === 'Completed')
      .reduce((sum, m) => sum + Number(m.actualCost), 0);

    const otherExpenses = (db.financialTransactions || [])
      .filter(tx => tx.type === 'Expense' && tx.notes.includes(prop.name) && !['Property loan', 'Utilities', 'Maintenance'].includes(tx.category))
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const totalExpense = loanExpenses + utilityExpenses + maintExpenses + otherExpenses;

    return {
      rentalIncome,
      loanExpenses,
      utilityExpenses,
      maintExpenses,
      otherExpenses,
      totalExpense,
      netFlow: rentalIncome - totalExpense
    };
  };

  // Vehicle Costs calculations
  const getVehicleCosts = (veh) => {
    const db = getDb();
    
    // Loan payments
    const loanCosts = (db.financialTransactions || [])
      .filter(t => t.category === 'Vehicle loan' && t.notes.includes(veh.registrationNumber))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Insurance premium
    const insuranceCosts = (db.financialTransactions || [])
      .filter(t => t.category === 'Insurance' && t.notes.includes(veh.registrationNumber))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Road tax
    const roadTaxCosts = (db.financialTransactions || [])
      .filter(t => t.category === 'Road tax' && t.notes.includes(veh.registrationNumber))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Services
    const serviceCosts = (db.financialTransactions || [])
      .filter(t => t.category === 'Service' && t.notes.includes(veh.registrationNumber))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Other costs
    const otherCosts = (db.financialTransactions || [])
      .filter(t => t.type === 'Expense' && t.notes.includes(veh.registrationNumber) && !['Vehicle loan', 'Insurance', 'Road tax', 'Service'].includes(t.category))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const total = loanCosts + insuranceCosts + roadTaxCosts + serviceCosts + otherCosts;

    return {
      loanCosts,
      insuranceCosts,
      roadTaxCosts,
      serviceCosts,
      otherCosts,
      total,
      monthlyAvg: total > 0 ? (total / 12) : 0 // Yearly/monthly average approximation
    };
  };

  const currency = getDb().settings?.currency || "RM";

  const getPortfolioSummary = () => {
    const db = getDb();
    
    // Properties Calculations
    let propRentIncome = 0;
    let propExpenses = 0;
    
    (properties || []).forEach(p => {
      const pl = getPropertyPL(p);
      propRentIncome += pl.rentalIncome;
      propExpenses += pl.totalExpense;
    });

    // Vehicles Calculations
    let vehExpenses = 0;
    (vehicles || []).forEach(v => {
      const vc = getVehicleCosts(v);
      vehExpenses += vc.total;
    });

    // Personal Loans Calculations
    let totalLent = 0;
    let totalRepaid = 0;
    
    (db.personalLoans || []).forEach(pl => {
      totalLent += Number(pl.amountLent || 0);
      const payments = (db.loanPayments || []).filter(pm => pm.loanId === pl.id);
      totalRepaid += payments.reduce((sum, pm) => sum + Number(pm.amount || 0), 0);
    });

    const outstandingLending = totalLent - totalRepaid;
    const lendingRecoveryRate = totalLent > 0 ? (totalRepaid / totalLent) * 100 : 0;

    // Combined Cash Flow calculations
    const netPropertyYield = propRentIncome - propExpenses;
    const netCashFlow = netPropertyYield - vehExpenses + totalRepaid;

    return {
      propRentIncome,
      propExpenses,
      netPropertyYield,
      vehExpenses,
      totalLent,
      totalRepaid,
      outstandingLending,
      lendingRecoveryRate,
      netCashFlow
    };
  };

  const filteredTx = transactions.filter(tx => {
    const matchesSearch = tx.category.toLowerCase().includes(search.toLowerCase()) || 
                          (tx.notes || '').toLowerCase().includes(search.toLowerCase());
    
    if (filterType === 'Income') return matchesSearch && tx.type === 'Income';
    if (filterType === 'Expense') return matchesSearch && tx.type === 'Expense';
    return matchesSearch;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  return html`
    <div>
      <div class="tab-header">
        <button class="tab-btn ${activeTab === 'summary' ? 'active' : ''}" onClick=${() => setActiveTab('summary')}>
          Portfolio Summary
        </button>
        <button class="tab-btn ${activeTab === 'ledger' ? 'active' : ''}" onClick=${() => setActiveTab('ledger')}>
          Ledger Transactions
        </button>
        <button class="tab-btn ${activeTab === 'property-pl' ? 'active' : ''}" onClick=${() => setActiveTab('property-pl')}>
          Property Profit & Loss
        </button>
        <button class="tab-btn ${activeTab === 'vehicle-costs' ? 'active' : ''}" onClick=${() => setActiveTab('vehicle-costs')}>
          Vehicle Cost Analysis
        </button>
      </div>

      <!-- PORTFOLIO SUMMARY VIEW -->
      ${activeTab === 'summary' && (() => {
        const summary = getPortfolioSummary();
        return html`
          <div style="display:flex; flex-direction:column; gap:24px;">
            <!-- Net Cash Flow Header Summary -->
            <div class="card" style="background: linear-gradient(135deg, var(--accent-color) 0%, hsl(var(--color-primary-dark)) 100%); color: white; display: flex; justify-content: space-between; align-items: center; padding: 24px; border: none;">
              <div>
                <p style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.9; font-weight: 600;">Net Portfolio Cash Flow (Combined)</p>
                <h1 style="font-size: 2.2rem; font-weight: 800; margin-top: 6px;">
                  ${currency} ${summary.netCashFlow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h1>
                <p style="font-size: 0.82rem; opacity: 0.85; margin-top: 8px;">
                  Calculated from Property Net Yields, Vehicle Expenses, and Loan Repayments.
                </p>
              </div>
              <div style="background: rgba(255,255,255,0.15); width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.8rem;">
                💰
              </div>
            </div>

            <!-- Detailed Breakdowns -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
              <!-- Property yield summary card -->
              <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 14px;">
                    <h3 style="font-size: 1.1rem; font-weight: 700;">🏠 Property Portfolio Yield</h3>
                  </div>
                  <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: var(--text-muted); font-size: 0.88rem;">Rent Collected:</span>
                      <span style="font-weight: 600; color: var(--color-success);">${currency} ${summary.propRentIncome.toLocaleString()}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: var(--text-muted); font-size: 0.88rem;">Expenses (Loans/Bills):</span>
                      <span style="font-weight: 600; color: hsl(var(--color-danger));">${currency} ${summary.propExpenses.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div style="border-top: 1px solid var(--border-color); padding-top: 14px; display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-weight: 600; font-size: 0.88rem;">Net Property Yield:</span>
                  <span style="font-size: 1.2rem; font-weight: 800; color: ${summary.netPropertyYield >= 0 ? 'var(--color-success)' : 'hsl(var(--color-danger))'};">
                    ${currency} ${summary.netPropertyYield.toLocaleString()}
                  </span>
                </div>
              </div>

              <!-- Vehicle Cost Summary Card -->
              <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 14px;">
                    <h3 style="font-size: 1.1rem; font-weight: 700;">🚗 Fleet Maintenance Cost</h3>
                  </div>
                  <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
                    <p style="font-size: 0.82rem; color: var(--text-secondary);">
                      Accumulated costs for loans, insurance policies, road tax renewals, safety inspections, and servicing tasks.
                    </p>
                  </div>
                </div>
                <div style="border-top: 1px solid var(--border-color); padding-top: 14px; display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-weight: 600; font-size: 0.88rem;">Total Spent:</span>
                  <span style="font-size: 1.2rem; font-weight: 800; color: hsl(var(--color-danger));">
                    ${currency} ${summary.vehExpenses.toLocaleString()}
                  </span>
                </div>
              </div>

              <!-- Personal Loans Summary Card -->
              <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 14px;">
                    <h3 style="font-size: 1.1rem; font-weight: 700;">🤝 Personal Loans Lent</h3>
                  </div>
                  <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: var(--text-muted); font-size: 0.88rem;">Total Lent:</span>
                      <span style="font-weight: 600;">${currency} ${summary.totalLent.toLocaleString()}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: var(--text-muted); font-size: 0.88rem;">Total Repaid:</span>
                      <span style="font-weight: 600; color: var(--color-success);">${currency} ${summary.totalRepaid.toLocaleString()}</span>
                    </div>
                  </div>
                  <!-- Progress bar for recovery rate -->
                  <div style="margin-bottom: 16px;">
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted); margin-bottom:4px;">
                      <span>Recovery Progress</span>
                      <span>${summary.lendingRecoveryRate.toFixed(1)}%</span>
                    </div>
                    <div style="width: 100%; height: 6px; background: var(--border-color); border-radius: 3px; overflow: hidden;">
                      <div style="width: ${summary.lendingRecoveryRate}%; height: 100%; background: var(--color-success);"></div>
                    </div>
                  </div>
                </div>
                <div style="border-top: 1px solid var(--border-color); padding-top: 14px; display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-weight: 600; font-size: 0.88rem;">Outstanding Debt:</span>
                  <span style="font-size: 1.2rem; font-weight: 800; color: var(--text-primary);">
                    ${currency} ${summary.outstandingLending.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        `;
      })()}

      <!-- LEDGER VIEW -->
      ${activeTab === 'ledger' && html`
        <div>
          ${viewForm && html`
            <div class="card" style="max-width: 550px; margin: 0 auto 30px auto;">
              <div class="modal-header">
                <h2>${form.id ? 'Edit Transaction' : 'Record Transaction'}</h2>
                <button class="modal-close" onClick=${() => setViewForm(false)}><${ArrowBackIcon} /></button>
              </div>
              <form onSubmit=${handleSave}>
                <div class="form-row">
                  <div class="form-group">
                    <label>Transaction Date</label>
                    <input type="date" class="form-control" value=${form.date} onInput=${e => setForm({ ...form, date: e.target.value })} required />
                  </div>
                  <div class="form-group">
                    <label>Type</label>
                    <select class="form-control" value=${form.type} onChange=${e => {
                      const type = e.target.value;
                      setForm({
                        ...form,
                        type,
                        category: type === 'Income' ? 'Rent' : 'Utilities'
                      });
                    }}>
                      <option value="Income">Income</option>
                      <option value="Expense">Expense</option>
                    </select>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Category</label>
                    <select class="form-control" value=${form.category} onChange=${e => setForm({ ...form, category: e.target.value })}>
                      ${form.type === 'Income' ? html`
                        <option value="Rent">Rent</option>
                        <option value="Deposit">Deposit</option>
                        <option value="Personal loan repayment">Personal Loan Repayment</option>
                        <option value="Other income">Other Income</option>
                      ` : html`
                        <option value="Property loan">Property Loan</option>
                        <option value="Vehicle loan">Vehicle Loan</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Renovation">Renovation</option>
                        <option value="Insurance">Insurance</option>
                        <option value="Road tax">Road Tax</option>
                        <option value="Tax">Tax</option>
                        <option value="Personal lending">Personal Lending</option>
                        <option value="Other expenses">Other Expenses</option>
                      `}
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Amount (${currency})</label>
                    <input type="number" step="0.01" class="form-control" value=${form.amount} onInput=${e => setForm({ ...form, amount: e.target.value })} required />
                  </div>
                </div>

                <div class="form-group">
                  <label>Notes / Description</label>
                  <input type="text" class="form-control" placeholder="Details (e.g. TNB Bill July, Plumber Tan)" value=${form.notes} onInput=${e => setForm({ ...form, notes: e.target.value })} />
                </div>

                <div class="modal-actions">
                  <button type="button" class="btn btn-secondary" onClick=${() => setViewForm(false)}>Cancel</button>
                  <button type="submit" class="btn btn-primary">Save Transaction</button>
                </div>
              </form>
            </div>
          `}

          <div class="filter-bar">
            <div style="display:flex; gap:10px; flex-wrap:wrap; flex:1;">
              <input type="text" class="form-control" style="width:250px;" placeholder="Search notes/categories..." value=${search} onInput=${e => setSearch(e.target.value)} />
              <select class="form-control" style="width:160px;" value=${filterType} onChange=${e => setFilterType(e.target.value)}>
                <option value="All">All Types</option>
                <option value="Income">Income (+)</option>
                <option value="Expense">Expense (-)</option>
              </select>
            </div>
            <button class="btn btn-primary" onClick=${() => handleOpenForm()}><${PlusIcon} /> Record Transaction</button>
          </div>

          <div class="card">
            <div class="table-container">
              ${filteredTx.length === 0 ? html`
                <p style="color:var(--text-muted); text-align:center; padding:30px;">No cash ledger transactions registered.</p>
              ` : html`
                <table class="mms-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Category</th>
                      <th>Notes</th>
                      <th style="text-align: right;">Amount</th>
                      <th style="text-align: right;">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${filteredTx.map(tx => html`
                      <tr key=${tx.id}>
                        <td>${tx.date}</td>
                        <td>
                          <span class="badge ${tx.type === 'Income' ? 'badge-success' : 'badge-danger'}">
                            ${tx.type}
                          </span>
                        </td>
                        <td style="font-weight: 700;">${tx.category}</td>
                        <td>${tx.notes || '-'}</td>
                        <td style="text-align: right; font-weight:700;" class=${tx.type === 'Income' ? 'text-success' : 'text-danger'}>
                          ${tx.type === 'Income' ? '+' : '-'}${currency} ${Number(tx.amount).toFixed(2)}
                        </td>
                        <td style="text-align: right;">
                          <div style="display:inline-flex; gap:6px;">
                            <button class="btn btn-secondary btn-sm" style="padding:2px 6px;" onClick=${() => handleOpenForm(tx)}><${EditIcon} /></button>
                            <button class="btn btn-danger btn-sm" style="padding:2px 6px;" onClick=${() => handleDelete(tx.id)}><${TrashIcon} /></button>
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
      `}

      <!-- PROPERTY P&L VIEW -->
      ${activeTab === 'property-pl' && html`
        <div style="display:flex; flex-direction:column; gap:24px;">
          ${properties.map(p => {
            const pl = getPropertyPL(p);
            const isProfit = pl.netFlow >= 0;
            return html`
              <div key=${p.id} class="card">
                <div style="display:flex; justify-content:space-between; align-items:start; border-bottom:1px solid var(--border-color); padding-bottom:14px; margin-bottom:16px;">
                  <div>
                    <h3 style="font-size:1.15rem; font-weight:800; color:var(--text-primary);">${p.name}</h3>
                    <div style="display:flex; align-items:center; gap:12px; margin-top:6px; flex-wrap:wrap;">
                      <span style="font-size:0.8rem; color:var(--text-muted);">Type: ${p.type} • Status: ${p.status}</span>
                      <button class="btn btn-secondary btn-sm" style="padding: 2px 6px; font-size: 0.72rem; font-weight:600;" onClick=${() => exportPropertyLedgerToCSV(p.id, p.name)}>Export Ledger (.csv)</button>
                    </div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Net Cash Flow</div>
                    <div style="font-size:1.35rem; font-weight:800; margin-top:4px;" class=${isProfit ? 'text-success' : 'text-danger'}>
                      ${isProfit ? '+' : ''}${currency} ${pl.netFlow.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:16px;">
                  <!-- Income block -->
                  <div style="background:var(--bg-primary); border:1px solid var(--border-color); padding:14px; border-radius:var(--radius-md);">
                    <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Rent Income (+)</div>
                    <div style="font-size:1.15rem; font-weight:700; color:hsl(var(--color-success)); margin-top:6px;">
                      ${currency} ${pl.rentalIncome.toFixed(2)}
                    </div>
                  </div>

                  <!-- Expenses blocks -->
                  <div style="background:var(--bg-primary); border:1px solid var(--border-color); padding:14px; border-radius:var(--radius-md);">
                    <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Loan Instalments (-)</div>
                    <div style="font-size:1.15rem; font-weight:700; color:hsl(var(--color-danger)); margin-top:6px;">
                      ${currency} ${pl.loanExpenses.toFixed(2)}
                    </div>
                  </div>

                  <div style="background:var(--bg-primary); border:1px solid var(--border-color); padding:14px; border-radius:var(--radius-md);">
                    <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Utilities Paid (-)</div>
                    <div style="font-size:1.15rem; font-weight:700; color:hsl(var(--color-danger)); margin-top:6px;">
                      ${currency} ${pl.utilityExpenses.toFixed(2)}
                    </div>
                  </div>

                  <div style="background:var(--bg-primary); border:1px solid var(--border-color); padding:14px; border-radius:var(--radius-md);">
                    <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Maintenance Costs (-)</div>
                    <div style="font-size:1.15rem; font-weight:700; color:hsl(var(--color-danger)); margin-top:6px;">
                      ${currency} ${pl.maintExpenses.toFixed(2)}
                    </div>
                  </div>

                  <div style="background:var(--bg-primary); border:1px solid var(--border-color); padding:14px; border-radius:var(--radius-md);">
                    <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Other Expenses (-)</div>
                    <div style="font-size:1.15rem; font-weight:700; color:hsl(var(--color-danger)); margin-top:6px;">
                      ${currency} ${pl.otherExpenses.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            `;
          })}
        </div>
      `}

      <!-- VEHICLE COST ANALYSIS VIEW -->
      ${activeTab === 'vehicle-costs' && html`
        <div style="display:flex; flex-direction:column; gap:24px;">
          ${vehicles.map(v => {
            const vc = getVehicleCosts(v);
            return html`
              <div key=${v.id} class="card">
                <div style="display:flex; justify-content:space-between; align-items:start; border-bottom:1px solid var(--border-color); padding-bottom:14px; margin-bottom:16px;">
                  <div>
                    <h3 style="font-size:1.15rem; font-weight:800; color:var(--text-primary);">${v.makeModel} (${v.registrationNumber})</h3>
                    <p style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">Mileage: ${Number(v.currentMileage).toLocaleString()} km • Purchased on ${v.purchaseDate}</p>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Average Monthly Cost</div>
                    <div style="font-size:1.35rem; font-weight:800; color:var(--text-primary); margin-top:4px;">
                      ${currency} ${vc.monthlyAvg.toFixed(2)}
                    </div>
                    <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">Total Accumulated: ${currency} ${vc.total.toLocaleString()}</div>
                  </div>
                </div>

                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:16px;">
                  <div style="background:var(--bg-primary); border:1px solid var(--border-color); padding:14px; border-radius:var(--radius-md);">
                    <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Loan Instalments</div>
                    <div style="font-size:1.1rem; font-weight:700; color:var(--text-primary); margin-top:6px;">
                      ${currency} ${vc.loanCosts.toFixed(2)}
                    </div>
                  </div>

                  <div style="background:var(--bg-primary); border:1px solid var(--border-color); padding:14px; border-radius:var(--radius-md);">
                    <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Insurance Paid</div>
                    <div style="font-size:1.1rem; font-weight:700; color:var(--text-primary); margin-top:6px;">
                      ${currency} ${vc.insuranceCosts.toFixed(2)}
                    </div>
                  </div>

                  <div style="background:var(--bg-primary); border:1px solid var(--border-color); padding:14px; border-radius:var(--radius-md);">
                    <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Road Tax Paid</div>
                    <div style="font-size:1.1rem; font-weight:700; color:var(--text-primary); margin-top:6px;">
                      ${currency} ${vc.roadTaxCosts.toFixed(2)}
                    </div>
                  </div>

                  <div style="background:var(--bg-primary); border:1px solid var(--border-color); padding:14px; border-radius:var(--radius-md);">
                    <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Service & Repairs</div>
                    <div style="font-size:1.1rem; font-weight:700; color:var(--text-primary); margin-top:6px;">
                      ${currency} ${vc.serviceCosts.toFixed(2)}
                    </div>
                  </div>

                  <div style="background:var(--bg-primary); border:1px solid var(--border-color); padding:14px; border-radius:var(--radius-md);">
                    <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Other Costs</div>
                    <div style="font-size:1.1rem; font-weight:700; color:var(--text-primary); margin-top:6px;">
                      ${currency} ${vc.otherCosts.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            `;
          })}
        </div>
      `}
    </div>
  `;
}
