import { html, useEffect, useState } from '../utils/htm.js';
import { getDb, getDynamicRentStatus } from '../utils/storage.js?v=20260808-google-sheets-1';

export default function ReferenceDashboard({ navigateToTab }) {
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    const load = () => {
      const db = getDb();
      const properties = db.properties || [];
      const vehicles = db.vehicles || [];
      const transactions = db.financialTransactions || [];
      const currency = db.settings?.currency || 'RM';
      const today = new Date().toISOString().slice(0, 10);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().slice(0, 10);
      const { overdueList, pendingList } = getDynamicRentStatus(db, today);
      const reminders = [];
      const add = (date, title, subtitle, path = 'reminders') => {
        if (!date || date > nextWeekStr) return;
        reminders.push({ date, title, subtitle, path, type: date < today ? 'overdue' : 'due-soon' });
      };
      [...overdueList, ...pendingList].forEach(item => {
        const property = properties.find(row => row.id === item.propertyId);
        add(item.dueBy, `Rent Due: ${property?.name || 'Property'}`, `${item.billingMonth} · ${currency} ${Number(item.amount || 0).toLocaleString()}`, 'properties');
      });
      (db.utilityBills || []).filter(item => item.status === 'Pending').forEach(item => {
        const utility = (db.utilities || []).find(row => row.id === item.utilityId);
        const property = properties.find(row => row.id === utility?.propertyId);
        add(item.dueDate, `${utility?.type || 'Utility'} Due: ${property?.name || 'Property'}`, `${item.billingMonth || ''} · ${currency} ${Number(item.amount || 0).toLocaleString()}`, 'utilities');
      });
      vehicles.forEach(vehicle => {
        const inspection = (db.vehicleInspections || []).find(item => item.vehicleId === vehicle.id);
        const roadTax = (db.vehicleRoadTax || []).find(item => item.vehicleId === vehicle.id);
        const insurance = (db.vehicleInsurance || []).find(item => item.vehicleId === vehicle.id);
        if (inspection) add(inspection.nextDueDate, `Inspection Due: ${vehicle.registrationNumber}`, inspection.inspectionType || 'Vehicle inspection', 'vehicles');
        if (roadTax) add(roadTax.expiryDate, `Road Tax Expiring: ${vehicle.registrationNumber}`, `Renewal · ${currency} ${Number(roadTax.amount || 0).toLocaleString()}`, 'vehicles');
        if (insurance) add(insurance.expiryDate, `Insurance Expiring: ${vehicle.registrationNumber}`, insurance.insurer || 'Vehicle insurance', 'vehicles');
      });
      const income = transactions.filter(item => item.type === 'Income').reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const expense = transactions.filter(item => item.type === 'Expense').reduce((sum, item) => sum + Number(item.amount || 0), 0);
      setSnapshot({
        properties: properties.length,
        own: properties.filter(item => item.ownerId === 'con-1').length,
        vehicles: vehicles.length,
        reminders: reminders.sort((a, b) => a.date.localeCompare(b.date)),
        overdueCount: reminders.filter(item => item.type === 'overdue').length,
        income,
        expense,
        net: income - expense,
        transactions: [...transactions].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 5),
        currency
      });
    };
    load();
    window.addEventListener('mms_db_changed', load);
    return () => window.removeEventListener('mms_db_changed', load);
  }, []);

  if (!snapshot) return html`<div class="reference-empty">Loading dashboard…</div>`;
  const money = value => `${snapshot.currency} ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const maxCash = Math.max(snapshot.income, snapshot.expense, 1);

  return html`
    <div class="reference-dashboard">
      <section class="portfolio-hero">
        <div><small>TODAY'S PORTFOLIO</small><h2>Welcome back.</h2><p>${snapshot.overdueCount} items need your attention.</p></div>
        <div class="hero-actions">
          <button onClick=${() => navigateToTab('properties')}><b>＋</b><span><strong>Rent payment</strong><small>Record income</small></span></button>
          <button onClick=${() => navigateToTab('financials')}><b>−</b><span><strong>Expense</strong><small>Record a new cost</small></span></button>
        </div>
      </section>

      <div class="reference-metrics">
        <button class="reference-metric navy" onClick=${() => navigateToTab('properties')}><span>Total properties</span><strong>${String(snapshot.properties).padStart(2, '0')}</strong><small>${snapshot.own} own · ${snapshot.properties - snapshot.own} managed</small></button>
        <button class="reference-metric teal" onClick=${() => navigateToTab('vehicles')}><span>Active vehicles</span><strong>${String(snapshot.vehicles).padStart(2, '0')}</strong><small>Service tracked</small></button>
        <button class="reference-metric green" onClick=${() => navigateToTab('financials')}><span>Net cash flow</span><strong>${money(snapshot.net)}</strong><small>All recorded data</small></button>
        <button class="reference-metric amber" onClick=${() => navigateToTab('reminders')}><span>Open actions</span><strong>${String(snapshot.overdueCount).padStart(2, '0')}</strong><small>Review reminders</small></button>
      </div>

      <div class="reference-dashboard-grid">
        <section class="reference-panel">
          <header><div><small>LATEST UPDATE</small><h3>Urgent reminders</h3></div><button onClick=${() => navigateToTab('reminders')}>View all →</button></header>
          ${snapshot.reminders.length === 0 ? html`<div class="reference-empty">No urgent reminders.</div>` : snapshot.reminders.slice(0, 4).map((item, index) => html`
            <button class="reference-compact" key=${`${item.date}-${index}`} onClick=${() => navigateToTab(item.path)}>
              <i class=${item.type}></i><span><strong>${item.title}</strong><small>${item.subtitle} · ${item.date}</small></span><em class="reference-badge ${item.type}">${item.type === 'overdue' ? 'Overdue' : 'Due Soon'}</em>
            </button>
          `)}
        </section>
        <section class="reference-panel">
          <header><div><small>LATEST UPDATE</small><h3>Cash flow</h3></div></header>
          <div class="cash-flow-panel">
            <small>Net balance</small><strong>${money(snapshot.net)}</strong>
            <label><span>Income</span><b>${money(snapshot.income)}</b></label><div class="cash-track"><i style=${{ width: `${snapshot.income / maxCash * 100}%` }}></i></div>
            <label><span>Expense</span><b>${money(snapshot.expense)}</b></label><div class="cash-track expense"><i style=${{ width: `${snapshot.expense / maxCash * 100}%` }}></i></div>
          </div>
        </section>
      </div>

      <section class="reference-panel">
        <header><div><small>LATEST UPDATE</small><h3>Recent transactions</h3></div></header>
        <div class="reference-table">
          ${snapshot.transactions.length === 0 ? html`<div class="reference-empty">No transaction records found.</div>` : html`
            <table class="mms-table"><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Type</th><th>Amount</th></tr></thead><tbody>
              ${snapshot.transactions.map(item => html`<tr key=${item.id}><td>${item.date}</td><td>${item.notes || '-'}</td><td>${item.category}</td><td><span class="reference-badge ${item.type === 'Income' ? 'success' : ''}">${item.type}</span></td><td>${money(item.amount)}</td></tr>`)}
            </tbody></table>
          `}
        </div>
      </section>
    </div>
  `;
}
