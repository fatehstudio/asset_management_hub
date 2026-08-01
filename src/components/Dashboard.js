import { html, useState, useEffect } from '../utils/htm.js';
import { getItems, getDb } from '../utils/storage.js';
import { PropertyIcon, VehicleIcon, LoanIcon, FinancialIcon, ClockIcon } from './Icons.js';

export default function Dashboard({ navigateToTab }) {
  const [metrics, setMetrics] = useState({
    totalProperties: 0,
    ownProperties: 0,
    clientProperties: 0,
    activeVehicles: 0,
    outstandingLoans: 0,
    monthlyCashFlow: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
    overdueCount: 0
  });

  const [recentTransactions, setRecentTransactions] = useState([]);
  const [urgentReminders, setUrgentReminders] = useState([]);

  useEffect(() => {
    loadDashboardData();
    window.addEventListener('mms_db_changed', loadDashboardData);
    return () => window.removeEventListener('mms_db_changed', loadDashboardData);
  }, []);

  const loadDashboardData = () => {
    const db = getDb();
    const properties = db.properties || [];
    const vehicles = db.vehicles || [];
    const propLoans = db.propertyLoans || [];
    const vehLoans = db.vehicleLoans || [];
    const personalLoans = db.personalLoans || [];
    const loanPayments = db.loanPayments || [];
    const transactions = db.financialTransactions || [];
    const settings = db.settings || {};
    const currency = settings.currency || "RM";

    // 1. Properties
    const ownProp = properties.filter(p => p.ownerId === "con-1").length;
    const clientProp = properties.length - ownProp;

    // 2. Loans Outstanding
    let loanTotal = 0;
    propLoans.forEach(l => { if (l.status === 'Active') loanTotal += Number(l.outstandingBalance || 0); });
    vehLoans.forEach(l => { if (l.status === 'Active') loanTotal += Number(l.outstandingBalance || 0); });
    
    // Personal loans outstanding = amountLent - sum of payments
    personalLoans.forEach(l => {
      if (l.status === 'Active') {
        const payments = loanPayments.filter(p => p.loanId === l.id).reduce((sum, p) => sum + Number(p.amount), 0);
        loanTotal += Math.max(0, Number(l.amountLent) - payments);
      }
    });

    // 3. Current Month Cashflow (based on July 2026 for mock data, or current calendar month)
    // We will compute for the current calendar month of the log, let's take the most recent month from transactions
    // or just calculate the total sums of 'Income' vs 'Expense' in the database
    let totalIncome = 0;
    let totalExpense = 0;
    transactions.forEach(t => {
      if (t.type === 'Income') totalIncome += Number(t.amount || 0);
      else if (t.type === 'Expense') totalExpense += Number(t.amount || 0);
    });

    // 4. Overdue Alerts Count
    let overdue = 0;
    const todayStr = new Date().toISOString().slice(0, 10);
    
    // Check pending rent payments
    (db.rentPayments || []).forEach(rp => {
      if (rp.status === 'Pending' && rp.dueBy && rp.dueBy < todayStr) overdue++;
    });
    // Check pending utility bills
    (db.utilityBills || []).forEach(ub => {
      if (ub.status === 'Pending' && ub.dueDate && ub.dueDate < todayStr) overdue++;
    });
    // Check vehicle inspections
    (db.vehicleInspections || []).forEach(vi => {
      if (vi.nextDueDate && vi.nextDueDate < todayStr) overdue++;
    });
    // Check vehicle road tax expiry
    (db.vehicleRoadTax || []).forEach(vrt => {
      if (vrt.expiryDate && vrt.expiryDate < todayStr) overdue++;
    });
    // Check vehicle insurance expiry
    (db.vehicleInsurance || []).forEach(vins => {
      if (vins.expiryDate && vins.expiryDate < todayStr) overdue++;
    });

    setMetrics({
      totalProperties: properties.length,
      ownProperties: ownProp,
      clientProperties: clientProp,
      activeVehicles: vehicles.length,
      outstandingLoans: loanTotal,
      monthlyCashFlow: totalIncome - totalExpense,
      monthlyIncome: totalIncome,
      monthlyExpense: totalExpense,
      overdueCount: overdue
    });

    // Recent 5 transactions
    const sortedTx = [...transactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
    setRecentTransactions(sortedTx);

    // Urgent Reminders (overdue or due in next 7 days)
    const urgent = [];
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() + 7);
    const limitDateStr = limitDate.toISOString().slice(0, 10);

    // Rent
    (db.rentPayments || []).forEach(rp => {
      if (rp.status === 'Pending' && rp.dueBy) {
        const propName = properties.find(p => p.id === rp.propertyId)?.name || 'Property';
        const isOverdue = rp.dueBy < todayStr;
        const isDueSoon = rp.dueBy >= todayStr && rp.dueBy <= limitDateStr;
        if (isOverdue || isDueSoon) {
          urgent.push({
            id: `rent-${rp.id}`,
            title: `Rent Due: ${propName}`,
            subtitle: `${rp.billingMonth} - RM ${rp.amount}`,
            date: rp.dueBy,
            type: isOverdue ? 'overdue' : 'due-soon'
          });
        }
      }
    });

    // Utilities
    (db.utilityBills || []).forEach(ub => {
      if (ub.status === 'Pending' && ub.dueDate) {
        const utility = db.utilities?.find(u => u.id === ub.utilityId);
        const propName = properties.find(p => p.id === utility?.propertyId)?.name || 'Property';
        const isOverdue = ub.dueDate < todayStr;
        const isDueSoon = ub.dueDate >= todayStr && ub.dueDate <= limitDateStr;
        if (isOverdue || isDueSoon) {
          urgent.push({
            id: `util-${ub.id}`,
            title: `${utility?.type || 'Utility'} Due: ${propName}`,
            subtitle: `${ub.billingMonth} - RM ${ub.amount}`,
            date: ub.dueDate,
            type: isOverdue ? 'overdue' : 'due-soon'
          });
        }
      }
    });

    // Inspections / Road Tax / Insurance
    vehicles.forEach(veh => {
      const inspect = (db.vehicleInspections || []).find(vi => vi.vehicleId === veh.id);
      if (inspect && inspect.nextDueDate) {
        const isOverdue = inspect.nextDueDate < todayStr;
        const isDueSoon = inspect.nextDueDate >= todayStr && inspect.nextDueDate <= limitDateStr;
        if (isOverdue || isDueSoon) {
          urgent.push({
            id: `inspect-${inspect.id}`,
            title: `Inspection Due: ${veh.registrationNumber}`,
            subtitle: inspect.inspectionType,
            date: inspect.nextDueDate,
            type: isOverdue ? 'overdue' : 'due-soon'
          });
        }
      }

      const roadTax = (db.vehicleRoadTax || []).find(vrt => vrt.vehicleId === veh.id);
      if (roadTax && roadTax.expiryDate) {
        const isOverdue = roadTax.expiryDate < todayStr;
        const isDueSoon = roadTax.expiryDate >= todayStr && roadTax.expiryDate <= limitDateStr;
        if (isOverdue || isDueSoon) {
          urgent.push({
            id: `roadtax-${roadTax.id}`,
            title: `Road Tax Expiring: ${veh.registrationNumber}`,
            subtitle: `Renew RM ${roadTax.amount}`,
            date: roadTax.expiryDate,
            type: isOverdue ? 'overdue' : 'due-soon'
          });
        }
      }

      const ins = (db.vehicleInsurance || []).find(vins => vins.vehicleId === veh.id);
      if (ins && ins.expiryDate) {
        const isOverdue = ins.expiryDate < todayStr;
        const isDueSoon = ins.expiryDate >= todayStr && ins.expiryDate <= limitDateStr;
        if (isOverdue || isDueSoon) {
          urgent.push({
            id: `ins-${ins.id}`,
            title: `Insurance Expiring: ${veh.registrationNumber}`,
            subtitle: `${ins.insurer} Policy`,
            date: ins.expiryDate,
            type: isOverdue ? 'overdue' : 'due-soon'
          });
        }
      }
    });

    setUrgentReminders(urgent.sort((a, b) => new Date(a.date) - new Date(b.date)));
  };

  const db = getDb();
  const currency = db.settings?.currency || "RM";

  return html`
    <div>
      <!-- Dashboard Metric row -->
      <div class="dashboard-grid">
        <div class="card metric-card" onClick=${() => navigateToTab('properties')}>
          <div class="metric-icon-box bg-prop-theme">
            <${PropertyIcon} />
          </div>
          <div class="metric-info">
            <h3>Properties</h3>
            <div class="value">${metrics.totalProperties}</div>
            <div class="subtitle">${metrics.ownProperties} Own • ${metrics.clientProperties} Clients</div>
          </div>
        </div>

        <div class="card metric-card" onClick=${() => navigateToTab('vehicles')}>
          <div class="metric-icon-box bg-veh-theme">
            <${VehicleIcon} />
          </div>
          <div class="metric-info">
            <h3>Vehicles</h3>
            <div class="value">${metrics.activeVehicles}</div>
            <div class="subtitle">Active Logs & Service</div>
          </div>
        </div>

        <div class="card metric-card" onClick=${() => navigateToTab('loans')}>
          <div class="metric-icon-box bg-loan-theme">
            <${LoanIcon} />
          </div>
          <div class="metric-info">
            <h3>Total Outstanding</h3>
            <div class="value">${currency} ${metrics.outstandingLoans.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="subtitle">Bank & Personal Lending</div>
          </div>
        </div>

        <div class="card metric-card" onClick=${() => navigateToTab('financials')}>
          <div class="metric-icon-box bg-warning-theme">
            <${FinancialIcon} />
          </div>
          <div class="metric-info">
            <h3>Total Cash Flow</h3>
            <div class="value ${metrics.monthlyCashFlow >= 0 ? 'text-success' : 'text-danger'}">
              ${metrics.monthlyCashFlow >= 0 ? '+' : ''}${currency} ${metrics.monthlyCashFlow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div class="subtitle">${currency} ${metrics.monthlyIncome.toLocaleString()} In • ${currency} ${metrics.monthlyExpense.toLocaleString()} Out</div>
          </div>
        </div>
      </div>

      <!-- Content Grid -->
      <div class="content-grid-2">
        <!-- Recent Transactions -->
        <div class="card">
          <div class="card-title">
            <span>Recent Financial Actions</span>
            <button class="btn btn-secondary btn-sm" onClick=${() => navigateToTab('financials')}>View Ledger</button>
          </div>
          <div class="table-container">
            ${recentTransactions.length === 0 ? html`
              <p style="color: var(--text-muted); text-align: center; padding: 20px;">No transaction records found.</p>
            ` : html`
              <table class="mms-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Notes</th>
                    <th style="text-align: right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${recentTransactions.map(tx => html`
                    <tr key=${tx.id}>
                      <td style="color: var(--text-secondary);">${tx.date}</td>
                      <td>
                        <span class="badge ${tx.type === 'Income' ? 'badge-success' : 'badge-danger'}">${tx.category}</span>
                      </td>
                      <td>${tx.notes || '-'}</td>
                      <td style="text-align: right; font-weight: 700;" class=${tx.type === 'Income' ? 'text-success' : 'text-danger'}>
                        ${tx.type === 'Income' ? '+' : '-'}${currency} ${Number(tx.amount).toFixed(2)}
                      </td>
                    </tr>
                  `)}
                </tbody>
              </table>
            `}
          </div>
        </div>

        <!-- Urgent Alerts & Reminders -->
        <div class="card">
          <div class="card-title">
            <span>Urgent Notifications</span>
            ${metrics.overdueCount > 0 && html`
              <span class="badge badge-danger">${metrics.overdueCount} Overdue</span>
            `}
          </div>
          <div style="max-height: 350px; overflow-y: auto; padding-right: 4px;">
            ${urgentReminders.length === 0 ? html`
              <div style="text-align: center; padding: 40px 0; color: var(--text-muted);">
                <div style="font-size: 2rem; margin-bottom: 8px;">🎉</div>
                <p>No urgent reminders or overdue payments for the next 7 days!</p>
              </div>
            ` : html`
              <div>
                ${urgentReminders.map(rem => html`
                  <div key=${rem.id} class="reminder-item ${rem.type}" onClick=${() => navigateToTab('reminders')}>
                    <div class="reminder-details">
                      <div class="reminder-title">${rem.title}</div>
                      <div class="reminder-subtitle">${rem.subtitle}</div>
                    </div>
                    <div style="text-align: right;">
                      <div style="font-size: 0.8rem; font-weight: 700; color: ${rem.type === 'overdue' ? 'hsl(var(--color-danger))' : 'hsl(var(--color-warning))'}">
                        ${rem.type === 'overdue' ? 'OVERDUE' : 'DUE'}
                      </div>
                      <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">${rem.date}</div>
                    </div>
                  </div>
                `)}
              </div>
            `}
          </div>
        </div>
      </div>
    </div>
  `;
}
