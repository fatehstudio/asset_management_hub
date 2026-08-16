import { html, useState, useEffect } from '../utils/htm.js';
import { getDb, saveItem, getDynamicRentStatus } from '../utils/storage.js?v=20260808-google-sheets-1';
import { REMINDER_START_DATE, isReminderDateIncluded } from '../utils/reminderPolicy.js';
import { ClockIcon, ArrowBackIcon, ArrowRightIcon } from './Icons.js';

export default function Reminders() {
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'calendar'
  const [reminders, setReminders] = useState([]);
  
  // Calendar states
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    loadReminders();
    window.addEventListener('mms_db_changed', loadReminders);
    return () => window.removeEventListener('mms_db_changed', loadReminders);
  }, []);

  const loadReminders = () => {
    const db = getDb();
    const properties = db.properties || [];
    const tenants = db.tenants || [];
    const vehicles = db.vehicles || [];
    const propLoans = db.propertyLoans || [];
    const vehLoans = db.vehicleLoans || [];
    const personalLoans = db.personalLoans || [];
    const utilities = db.utilities || [];
    const utilityBills = db.utilityBills || [];
    const rentPayments = db.rentPayments || [];
    const serviceHistory = db.vehicleServices || [];
    const inspections = db.vehicleInspections || [];
    const roadTax = db.vehicleRoadTax || [];
    const insurance = db.vehicleInsurance || [];
    const rentalAgreements = db.rentalAgreements || [];

    const list = [];
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    // Helper to calculate days diff
    const getDaysDiff = (dateStr) => {
      const target = new Date(dateStr);
      const diffTime = target - today;
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    // Helper to determine status and category
    const mapReminder = (date, title, subtitle, amount, status, path, typeName) => {
      if (!isReminderDateIncluded(date)) return null;
      const daysDiff = getDaysDiff(date);
      let group = 'upcoming';
      let statusColor = 'upcoming';
      
      if (status === 'Completed' || status === 'Paid') {
        group = 'completed';
        statusColor = 'completed';
      } else if (date < todayStr) {
        group = 'today'; // Red column
        statusColor = 'overdue';
      } else if (date === todayStr) {
        group = 'today';
        statusColor = 'due-soon';
      } else if (daysDiff <= 7) {
        group = 'next7';
        statusColor = 'due-soon';
      } else if (daysDiff <= 30) {
        group = 'next30';
        statusColor = 'upcoming';
      } else {
        group = 'future';
        statusColor = 'upcoming';
      }

      return {
        id: `${typeName}-${Math.random()}`,
        date,
        title,
        subtitle,
        amount,
        status,
        group,
        statusColor,
        path, // Navigation tab name
        typeName
      };
    };

    const addReminder = (...args) => {
      const reminder = mapReminder(...args);
      if (reminder) list.push(reminder);
    };

    // 1. Rent Due (dynamically calculated)
    const { overdueList: dynamicOverdue, pendingList: dynamicPending } = getDynamicRentStatus(db, todayStr);
    [...dynamicOverdue, ...dynamicPending].forEach(rp => {
      const prop = properties.find(p => p.id === rp.propertyId);
      addReminder(
        rp.dueBy, 
        `Rental Payment: ${prop ? prop.name : 'Property'}`,
        `Rent for ${rp.billingMonth}`,
        rp.amount,
        'Pending',
        'properties',
        'Rent'
      );
    });

    // Rental agreement expiry
    rentalAgreements.forEach(agreement => {
      if (agreement.status !== 'Active' || !agreement.endDate) return;
      const property = properties.find(p => p.id === agreement.propertyId);
      const tenant = tenants.find(t => t.id === agreement.tenantId);
      addReminder(
        agreement.endDate,
        `Rental Agreement Expiry: ${property?.name || 'Property'}`,
        tenant?.name ? `Tenant: ${tenant.name}` : 'Review or renew rental agreement',
        0,
        'Pending',
        'properties',
        'Agreement'
      );
    });

    // 2. Utility Bills
    utilityBills.forEach(ub => {
      if (ub.status === 'Pending' && ub.dueDate) {
        const ut = utilities.find(u => u.id === ub.utilityId);
        const prop = properties.find(p => p.id === ut?.propertyId);
        addReminder(
          ub.dueDate,
          `${ut?.type || 'Utility'} Bill: ${prop ? prop.name : 'Property'}`,
          `Bill for ${ub.billingMonth} (Acc: ${ut?.accountNumber || '-'})`,
          ub.amount,
          'Pending',
          'utilities',
          'Utility'
        );
      }
    });

    // 3. Property Loans
    propLoans.forEach(l => {
      if (l.status === 'Active' && l.dueDateDay) {
        // Construct due date for this month and next month
        const p = properties.find(x => x.id === l.propertyId);
        const buildDate = (monthOffset) => {
          const d = new Date();
          d.setMonth(d.getMonth() + monthOffset);
          const day = Math.min(l.dueDateDay, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate());
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        };

        addReminder(
          buildDate(0),
          `Property Loan: ${l.bank}`,
          `Instalment due for ${p ? p.name : 'Property'}`,
          l.monthlyInstalment,
          'Pending',
          'loans',
          'Loan'
        );
      }
    });

    // 4. Vehicle Loans
    vehLoans.forEach(l => {
      if (l.status === 'Active' && l.dueDateDay) {
        const v = vehicles.find(x => x.id === l.vehicleId);
        const buildDate = (monthOffset) => {
          const d = new Date();
          d.setMonth(d.getMonth() + monthOffset);
          const day = Math.min(l.dueDateDay, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate());
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        };

        addReminder(
          buildDate(0),
          `Vehicle Loan: ${l.bank}`,
          `Instalment for ${v ? v.registrationNumber : 'Car'}`,
          l.monthlyInstalment,
          'Pending',
          'loans',
          'Loan'
        );
      }
    });

    // 5. Personal Lending repayments
    personalLoans.forEach(l => {
      if (l.status === 'Active' && l.dueDateDay) {
        const borrower = db.contacts?.find(c => c.id === l.borrowerId)?.name || 'Borrower';
        const buildDate = (monthOffset) => {
          const d = new Date();
          d.setMonth(d.getMonth() + monthOffset);
          const day = Math.min(l.dueDateDay, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate());
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        };

        addReminder(
          buildDate(0),
          `Repayment from: ${borrower}`,
          `Monthly payment expected`,
          l.monthlyInstalment,
          'Pending',
          'loans',
          'Lending'
        );
      }
    });

    // 5b. Property Taxes
    (db.propertyTaxes || []).forEach(pt => {
      if (pt.status === 'Pending' && pt.dueDate) {
        const prop = properties.find(p => p.id === pt.propertyId);
        addReminder(
          pt.dueDate,
          `Property Tax: ${pt.taxType}`,
          `Tax due for ${prop ? prop.name : 'Property'} (${pt.taxYear})`,
          pt.amount,
          'Pending',
          'properties',
          'Tax'
        );
      }
    });

    // 6. Vehicles: Road tax, Insurance, Service, Inspection
    vehicles.forEach(v => {
      // Road Tax
      const vrt = roadTax.find(r => r.vehicleId === v.id);
      if (vrt && vrt.expiryDate) {
        addReminder(
          vrt.expiryDate,
          `Road Tax Expiry: ${v.registrationNumber}`,
          `${v.makeModel}`,
          vrt.amount,
          'Pending',
          'vehicles',
          'Roadtax'
        );
      }

      // Insurance
      const vins = insurance.find(i => i.vehicleId === v.id);
      if (vins && vins.expiryDate) {
        addReminder(
          vins.expiryDate,
          `Insurance Expiry: ${v.registrationNumber}`,
          `${vins.insurer} Policy: ${vins.policyNumber}`,
          vins.premium,
          'Pending',
          'vehicles',
          'Insurance'
        );
      }

      // Inspection
      const vi = inspections.find(i => i.vehicleId === v.id);
      if (vi && vi.nextDueDate) {
        addReminder(
          vi.nextDueDate,
          `Inspection Due: ${v.registrationNumber}`,
          `Routine safety inspection`,
          vi.cost,
          'Pending',
          'vehicles',
          'Inspection'
        );
      }

      // Service Due
      const lastSvc = serviceHistory.filter(s => s.vehicleId === v.id).sort((a,b) => new Date(b.date) - new Date(a.date))[0];
      if (lastSvc) {
        if (lastSvc.nextServiceDate) {
          addReminder(
            lastSvc.nextServiceDate,
            `Car Service Date: ${v.registrationNumber}`,
            `Next Service at ${lastSvc.nextServiceMileage?.toLocaleString() || '-'} km (${lastSvc.serviceType})`,
            lastSvc.cost,
            'Pending',
            'vehicles',
            'Service'
          );
        }

        // Mileage check
        const milDiff = lastSvc.nextServiceMileage - v.currentMileage;
        if (milDiff <= 500 && milDiff > 0 && todayStr >= REMINDER_START_DATE) {
          list.push({
            id: `service-mileage-${v.id}`,
            date: todayStr,
            title: `Service Mileage Warning: ${v.registrationNumber}`,
            subtitle: `Approaching service mark. Only ${milDiff} km left!`,
            amount: 0,
            status: 'Pending',
            group: 'today',
            statusColor: 'overdue',
            path: 'vehicles',
            typeName: 'Service'
          });
        }
      }
    });

    setReminders(list.sort((a, b) => new Date(a.date) - new Date(b.date)));
  };

  // Calendar render functions
  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday=0
    const totalDays = new Date(year, month + 1, 0).getDate();

    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const dayCells = [];

    // Prior month padding cells
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      dayCells.push({
        dayNum: prevMonthTotalDays - i,
        isCurrentMonth: false,
        dateStr: `${month === 0 ? year - 1 : year}-${String(month === 0 ? 12 : month).padStart(2,'0')}-${String(prevMonthTotalDays - i).padStart(2,'0')}`
      });
    }

    // Current month cells
    for (let i = 1; i <= totalDays; i++) {
      dayCells.push({
        dayNum: i,
        isCurrentMonth: true,
        dateStr: `${year}-${String(month + 1).padStart(2,'0')}-${String(i).padStart(2,'0')}`
      });
    }

    // Next month padding cells to align grids (total of 42 cells)
    const remainingCells = 42 - dayCells.length;
    for (let i = 1; i <= remainingCells; i++) {
      dayCells.push({
        dayNum: i,
        isCurrentMonth: false,
        dateStr: `${month === 11 ? year + 1 : year}-${String(month === 11 ? 1 : month + 2).padStart(2,'0')}-${String(i).padStart(2,'0')}`
      });
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    return html`
      <div class="calendar-grid">
        <!-- Week header days -->
        ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => html`
          <div key=${day} class="calendar-header-day">${day}</div>
        `)}

        <!-- Days cells -->
        ${dayCells.map((cell, idx) => {
          const cellReminders = reminders.filter(rem => rem.date === cell.dateStr && rem.status !== 'Completed');
          const isToday = cell.dateStr === todayStr;

          return html`
            <div key=${idx} class="calendar-day-cell ${isToday ? 'current-day' : ''}" style="opacity: ${cell.isCurrentMonth ? 1 : 0.4}">
              <div class="calendar-day-number">${cell.dayNum}</div>
              <div style="display:flex; flex-direction:column; gap:2px; overflow-y:auto; flex:1; max-height: 60px;">
                ${cellReminders.map(rem => {
                  let color = 'hsl(var(--color-info))';
                  if (rem.typeName === 'Rent') color = 'hsl(var(--color-property))';
                  else if (rem.typeName === 'Utility') color = 'hsl(var(--color-warning))';
                  else if (rem.typeName === 'Service' || rem.typeName === 'Roadtax') color = 'hsl(var(--color-vehicle))';
                  else if (rem.typeName === 'Loan') color = 'hsl(var(--color-danger))';

                  return html`
                    <div key=${rem.id} class="calendar-event" style="background-color: ${color};" title="${rem.title}: ${rem.subtitle}">
                      ${rem.typeName}: ${rem.amount > 0 ? `RM ${rem.amount}` : rem.title.slice(0,10)}
                    </div>
                  `;
                })}
              </div>
            </div>
          `;
        })}
      </div>
    `;
  };

  // Group columns
  const getGroupTitle = (group) => {
    switch (group) {
      case 'today': return '🔴 Overdue / Today';
      case 'next7': return '🟠 Next 7 Days';
      case 'next30': return '🟡 Next 30 Days';
      case 'completed': return '🟢 Completed';
      default: return 'Upcoming Future';
    }
  };

  const columns = ['today', 'next7', 'next30', 'completed'];

  const currency = getDb().settings?.currency || "RM";

  return html`
    <div class="reference-module reference-reminders-page">
      <header class="reference-module-header">
        <div><small>ASSET MANAGEMENT HUB</small><h2>Reminders & calendar</h2><p>Showing due dates from 1 August 2026 onward</p></div>
      </header>
      <div class="tab-header">
        <button class="tab-btn ${activeTab === 'list' ? 'active' : ''}" onClick=${() => setActiveTab('list')}>
          Grouped Deadlines List
        </button>
        <button class="tab-btn ${activeTab === 'calendar' ? 'active' : ''}" onClick=${() => setActiveTab('calendar')}>
          Interactive Calendar
        </button>
      </div>

      <!-- LIST VIEW -->
      ${activeTab === 'list' && html`
        <div class="reference-reminder-list">
          ${reminders.length === 0 ? html`<p class="reference-empty">No reminders found.</p>` : reminders.map(rem => html`
            <article key=${rem.id} class=${rem.statusColor} onClick=${() => window.dispatchEvent(new CustomEvent('change_tab', { detail: rem.path }))}>
              <time>${rem.date}</time>
              <span><small>${rem.typeName}</small><h3>${rem.title}</h3><p>${rem.subtitle}${rem.amount > 0 ? ` · ${currency} ${Number(rem.amount).toLocaleString()}` : ''}</p></span>
              <em class="reference-badge ${rem.statusColor}">${rem.statusColor === 'overdue' ? 'Overdue' : rem.statusColor === 'due-soon' ? 'Due Soon' : rem.statusColor === 'completed' ? 'Completed' : 'Upcoming'}</em>
            </article>
          `)}
        </div>
      `}

      <!-- CALENDAR VIEW -->
      ${activeTab === 'calendar' && html`
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
            <button class="btn btn-secondary" onClick=${handlePrevMonth}><${ArrowBackIcon} /> Prev</button>
            <h3 style="font-size:1.3rem; font-weight:800;">
              ${currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            <button class="btn btn-secondary" onClick=${handleNextMonth}>Next <${ArrowRightIcon} /></button>
          </div>
          ${renderCalendar()}
        </div>
      `}
    </div>
  `;
}
