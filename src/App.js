import { html, useState, useEffect } from './utils/htm.js';
import { getDb } from './utils/storage.js';
import { 
  DashboardIcon, PropertyIcon, VehicleIcon, LoanIcon, 
  UtilityIcon, MaintenanceIcon, ReminderIcon, FinancialIcon, 
  DocumentIcon, SettingsIcon, SunIcon, MoonIcon 
} from './components/Icons.js';

// Component imports
import Dashboard from './components/Dashboard.js';
import Properties from './components/Properties.js';
import Vehicles from './components/Vehicles.js';
import Loans from './components/Loans.js';
import Utilities from './components/Utilities.js';
import Maintenance from './components/Maintenance.js';
import Reminders from './components/Reminders.js';
import FinancialHub from './components/FinancialHub.js';
import Documents from './components/Documents.js';
import Settings from './components/Settings.js';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState('dark');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [overdueCount, setOverdueCount] = useState(0);

  useEffect(() => {
    // Initial theme set
    const db = getDb();
    const activeTheme = db.settings?.theme || 'dark';
    setTheme(activeTheme);
    document.documentElement.setAttribute('data-theme', activeTheme);
    
    calculateOverdueCount();

    // Auto-sync from Google Sheets in background on startup if URL is saved
    const sheetUrl = db.settings?.googleSheetsUrl;
    if (sheetUrl) {
      import('./utils/storage.js').then(({ syncFromGoogleSheets }) => {
        syncFromGoogleSheets(sheetUrl)
          .then(() => console.log("Auto-synced live Google Sheets data on startup."))
          .catch(err => console.warn("Auto-sync on startup failed:", err));
      });
    }

    // Listeners
    window.addEventListener('mms_db_changed', handleDbChange);
    window.addEventListener('change_tab', handleTabChange);
    
    return () => {
      window.removeEventListener('mms_db_changed', handleDbChange);
      window.removeEventListener('change_tab', handleTabChange);
    };
  }, []);

  const handleDbChange = () => {
    calculateOverdueCount();
  };

  const handleTabChange = (e) => {
    if (e.detail) {
      setActiveTab(e.detail);
    }
  };

  const calculateOverdueCount = () => {
    const db = getDb();
    let overdue = 0;
    const todayStr = new Date().toISOString().slice(0, 10);
    
    // Rent payments overdue
    (db.rentPayments || []).forEach(rp => {
      if (rp.status === 'Pending' && rp.dueBy && rp.dueBy < todayStr) overdue++;
    });
    // Utility bills overdue
    (db.utilityBills || []).forEach(ub => {
      if (ub.status === 'Pending' && ub.dueDate && ub.dueDate < todayStr) overdue++;
    });
    // Vehicle inspections overdue
    (db.vehicleInspections || []).forEach(vi => {
      if (vi.nextDueDate && vi.nextDueDate < todayStr) overdue++;
    });
    // Vehicle road tax expired
    (db.vehicleRoadTax || []).forEach(vrt => {
      if (vrt.expiryDate && vrt.expiryDate < todayStr) overdue++;
    });
    // Vehicle insurance expired
    (db.vehicleInsurance || []).forEach(vins => {
      if (vins.expiryDate && vins.expiryDate < todayStr) overdue++;
    });

    setOverdueCount(overdue);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Save to settings
    const db = getDb();
    db.settings = { ...db.settings, theme: newTheme };
    localStorage.setItem('mms_database', JSON.stringify(db));
  };

  const navigateToTab = (tab, subId = null) => {
    setActiveTab(tab);
    if (tab === 'properties' && subId) {
      setSelectedPropertyId(subId);
    } else if (tab === 'vehicles' && subId) {
      setSelectedVehicleId(subId);
    }
    setSidebarOpen(false); // Close sidebar on mobile navigation
  };

  // Render the current view
  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return html`<${Dashboard} navigateToTab=${navigateToTab} />`;
      case 'properties':
        return html`<${Properties} 
          selectedPropertyId=${selectedPropertyId} 
          setSelectedPropertyId=${setSelectedPropertyId} 
          navigateToTab=${navigateToTab} 
        />`;
      case 'vehicles':
        return html`<${Vehicles} 
          selectedVehicleId=${selectedVehicleId} 
          setSelectedVehicleId=${setSelectedVehicleId} 
          navigateToTab=${navigateToTab} 
        />`;
      case 'loans':
        return html`<${Loans} />`;
      case 'utilities':
        return html`<${Utilities} />`;
      case 'maintenance':
        return html`<${Maintenance} />`;
      case 'reminders':
        return html`<${Reminders} />`;
      case 'financials':
        return html`<${FinancialHub} />`;
      case 'documents':
        return html`<${Documents} />`;
      case 'settings':
        return html`<${Settings} />`;
      default:
        return html`<${Dashboard} navigateToTab=${navigateToTab} />`;
    }
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard Overview';
      case 'properties': return 'Property Portfolio';
      case 'vehicles': return 'Vehicle Maintenance Logs';
      case 'loans': return 'Lending & Debt Hub';
      case 'utilities': return 'Utility Accounts & Bill Records';
      case 'maintenance': return 'Maintenance Requests & Aduan';
      case 'reminders': return 'Deadline Calendar & Reminders';
      case 'financials': return 'Financial Ledger & Cash Flow';
      case 'documents': return 'Document File Tracker';
      case 'settings': return 'App Settings & Contact Book';
      default: return 'Asset Hub';
    }
  };

  const getPageSubtitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'High-level financial summaries, loans, and next reminders.';
      case 'properties': return 'Manage owned and managed properties, agreements, and tenant receipts.';
      case 'vehicles': return 'Log car servicing, mileage, road tax, and JPJ inspection reminders.';
      case 'loans': return 'Track property/vehicle mortgages and personal money lent (tunggakan calculations).';
      case 'utilities': return 'Track electricity, water, internet accounts, bills due, and responsible payers.';
      case 'maintenance': return 'Manage repairs, costs, and contact information for local contractors.';
      case 'reminders': return 'Look at upcoming deadlines on lists or mapped onto a monthly calendar.';
      case 'financials': return 'View overall expenses vs income, property P&Ls, and annual car costs.';
      case 'documents': return 'Organize and access contracts, cover notes, and receipts saved on Google Drive.';
      case 'settings': return 'Configure preferences, load seed data, manage contacts, and export to CSV.';
      default: return '';
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
    { id: 'properties', label: 'Properties', icon: PropertyIcon },
    { id: 'vehicles', label: 'Vehicles', icon: VehicleIcon },
    { id: 'loans', label: 'Loans & Lending', icon: LoanIcon },
    { id: 'utilities', label: 'Utilities', icon: UtilityIcon },
    { id: 'maintenance', label: 'Maintenance', icon: MaintenanceIcon },
    { id: 'reminders', label: 'Reminders', icon: ReminderIcon, badge: overdueCount },
    { id: 'financials', label: 'Financial Hub', icon: FinancialIcon },
    { id: 'documents', label: 'Documents', icon: DocumentIcon },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return html`
    <div class="app-container">
      
      <!-- Mobile hamburger toggle button (floating) -->
      <button class="mobile-menu-toggle control-btn btn-primary" onClick=${() => setSidebarOpen(!sidebarOpen)}>
        <span style="font-size:1.5rem; font-weight:800;">☰</span>
      </button>

      <!-- Sidebar Layout -->
      <aside class="sidebar ${sidebarOpen ? 'open' : ''}">
        <div class="sidebar-header">
          <div style="background: var(--accent-color); width: 32px; height: 32px; border-radius: var(--radius-sm); display:flex; align-items:center; justify-content:center; font-weight:900; font-size:1.1rem; color:white;">
            A
          </div>
          <span class="sidebar-logo">ASSET HUB</span>
        </div>
        
        <ul class="sidebar-menu">
          ${menuItems.map(item => {
            const isActive = activeTab === item.id;
            return html`
              <li key=${item.id} class="sidebar-item">
                <div 
                  class="sidebar-link ${isActive ? 'active' : ''}" 
                  onClick=${() => {
                    setActiveTab(item.id);
                    setSelectedPropertyId(null);
                    setSelectedVehicleId(null);
                    setSidebarOpen(false);
                  }}
                >
                  <${item.icon} />
                  <span>${item.label}</span>
                  ${item.badge > 0 && html`
                    <span class="badge badge-danger" style="margin-left: auto; font-size:0.68rem; padding: 2px 6px;">
                      ${item.badge}
                    </span>
                  `}
                </div>
              </li>
            `;
          })}
        </ul>
        
        <div class="sidebar-footer">
          <div>Asset Hub v1.2</div>
          <div style="margin-top:4px;">Zero Install local database</div>
        </div>
      </aside>

      <!-- Main Workspace -->
      <main class="main-content">
        <!-- Top bar/header -->
        <header class="header-bar">
          <div class="header-title">
            <h1>${getPageTitle()}</h1>
            <p>${getPageSubtitle()}</p>
          </div>
          
          <div class="header-controls">
            <!-- Theme toggle button -->
            <button class="control-btn" onClick=${toggleTheme} title="Toggle Light/Dark Theme">
              ${theme === 'dark' ? html`<${SunIcon} />` : html`<${MoonIcon} />`}
            </button>
            
            <!-- Quick Overdue Alert indicator -->
            <button class="control-btn" onClick=${() => navigateToTab('reminders')} title="View Alerts Calendar">
              <${ReminderIcon} />
              ${overdueCount > 0 && html`<span class="badge-dot">${overdueCount}</span>`}
            </button>
          </div>
        </header>

        <!-- Main tab page view contents -->
        <section style="flex: 1;">
          ${renderView()}
        </section>
      </main>

    </div>
  `;
}
