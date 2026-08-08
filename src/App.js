import { html, useState, useEffect } from './utils/htm.js';
import { getDb, getSupabase, subscribeToRealtimeChanges, syncAllFromSupabase, syncFromGoogleSheets, getDynamicRentStatus } from './utils/storage.js?v=20260808-google-sheets-1';
import { 
  DashboardIcon, PropertyIcon, VehicleIcon, LoanIcon, 
  UtilityIcon, MaintenanceIcon, ReminderIcon, FinancialIcon, 
  DocumentIcon, SettingsIcon, SunIcon, MoonIcon 
} from './components/Icons.js';

// Component imports
import Dashboard from './components/ReferenceDashboard.js';
import Properties from './components/Properties.js';
import Vehicles from './components/Vehicles.js';
import Loans from './components/Loans.js';
import Utilities from './components/Utilities.js';
import Maintenance from './components/Maintenance.js';
import Reminders from './components/Reminders.js';
import FinancialHub from './components/FinancialHub.js';
import Documents from './components/Documents.js';
import Settings from './components/Settings.js?v=20260808-google-sheets-1';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState('dark');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [overdueCount, setOverdueCount] = useState(0);

  // Supabase, Toasts, and App Lock states
  const [supabaseStatus, setSupabaseStatus] = useState('Offline');
  const [toasts, setToasts] = useState([]);
  const [isLocked, setIsLocked] = useState(false);
  const [pinBuffer, setPinBuffer] = useState('');

  useEffect(() => {
    // Initial theme & App Lock set
    const db = getDb();
    const activeTheme = db.settings?.theme || 'dark';
    setTheme(activeTheme);
    document.documentElement.setAttribute('data-theme', activeTheme);
    
    if (db.settings?.appLockPin) {
      setIsLocked(true);
    }

    calculateOverdueCount();

    if (db.settings?.googleSheetsUrl) {
      syncFromGoogleSheets(db.settings.googleSheetsUrl, db.settings.googleAppsScriptUrl || '')
        .then(() => setSupabaseStatus('Sheets'))
        .catch(error => {
          console.warn('Google Sheets startup sync failed:', error);
          window.dispatchEvent(new CustomEvent('mms_google_sheets_sync', { detail: { success: false, error: error.message } }));
        });
    }

    // Check overdue alerts on startup after a small delay
    setTimeout(() => {
      const freshDb = getDb();
      let overdue = 0;
      const todayStr = new Date().toISOString().slice(0, 10);
      
      const { overdueList } = getDynamicRentStatus(freshDb, todayStr);
      overdue += overdueList.length;
      (freshDb.utilityBills || []).forEach(ub => {
        if (ub.status === 'Pending' && ub.dueDate && ub.dueDate < todayStr) overdue++;
      });
      (freshDb.vehicleInspections || []).forEach(vi => {
        if (vi.nextDueDate && vi.nextDueDate < todayStr) overdue++;
      });
      (freshDb.vehicleRoadTax || []).forEach(vrt => {
        if (vrt.expiryDate && vrt.expiryDate < todayStr) overdue++;
      });
      (freshDb.vehicleInsurance || []).forEach(vins => {
        if (vins.expiryDate && vins.expiryDate < todayStr) overdue++;
      });
      
      if (overdue > 0) {
        showToast("⚠️ Overdue Deadlines", `You have ${overdue} overdue task(s) requiring attention!`, "warning");
      }
    }, 1500);

    // Initialize Supabase & Subscribe Realtime
    const client = getSupabase();
    if (client) {
      // Background sync from Supabase
      syncAllFromSupabase()
        .then(() => {
          console.log("Supabase connection established and data synced.");
          subscribeToRealtimeChanges();
        })
        .catch(err => {
          console.warn("Supabase connection/sync failed:", err);
          setSupabaseStatus('Offline');
        });
    }

    // Listeners
    window.addEventListener('mms_db_changed', handleDbChange);
    window.addEventListener('change_tab', handleTabChange);
    window.addEventListener('mms_supabase_status', handleSupabaseStatusChange);
    window.addEventListener('mms_supabase_sync_toast', handleSupabaseSyncToast);
    window.addEventListener('mms_google_sheets_status', handleGoogleSheetsStatus);
    window.addEventListener('mms_google_sheets_sync', handleGoogleSheetsSync);
    
    return () => {
      window.removeEventListener('mms_db_changed', handleDbChange);
      window.removeEventListener('change_tab', handleTabChange);
      window.removeEventListener('mms_supabase_status', handleSupabaseStatusChange);
      window.removeEventListener('mms_supabase_sync_toast', handleSupabaseSyncToast);
      window.removeEventListener('mms_google_sheets_status', handleGoogleSheetsStatus);
      window.removeEventListener('mms_google_sheets_sync', handleGoogleSheetsSync);
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

  const handleSupabaseStatusChange = (e) => {
    if (e.detail) setSupabaseStatus(e.detail);
  };

  const handleSupabaseSyncToast = (e) => {
    if (e.detail) {
      showToast("🔄 Database Synchronized", `Table '${e.detail.replace('Updated ', '')}' updated from mobile.`, "sync");
    }
  };

  const handleGoogleSheetsStatus = () => setSupabaseStatus('Sheets');

  const handleGoogleSheetsSync = (e) => {
    if (!e.detail) return;
    if (e.detail.success) showToast('Google Sheets synchronized', `${e.detail.table} was updated.`, 'sync');
    else showToast('Google Sheets connection', e.detail.error || 'Sync failed.', 'warning');
  };

  const showToast = (title, desc, type = 'sync') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, title, desc, type, closing: false }]);
    
    // Animate closing after 3.7 seconds
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, closing: true } : t));
    }, 3700);

    // Remove from DOM after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const handlePinKeyPress = (val) => {
    const db = getDb();
    const correctPin = db.settings?.appLockPin;
    if (!correctPin) return;

    if (val === 'Clear') {
      setPinBuffer('');
      return;
    }

    if (val === 'Delete') {
      setPinBuffer(prev => prev.slice(0, -1));
      return;
    }

    const nextPin = pinBuffer + val;
    if (nextPin.length <= correctPin.length) {
      setPinBuffer(nextPin);
      
      // Check if code matches
      if (nextPin === correctPin) {
        setTimeout(() => {
          setIsLocked(false);
          setPinBuffer('');
          showToast("🔓 Access Granted", "Welcome back to MMS Asset Hub!", "sync");
        }, 150);
      } else if (nextPin.length === correctPin.length) {
        // Wrong PIN, reset buffer with alert
        setTimeout(() => {
          setPinBuffer('');
          alert("Incorrect PIN code. Please try again.");
        }, 200);
      }
    }
  };

  const calculateOverdueCount = () => {
    const db = getDb();
    let overdue = 0;
    const todayStr = new Date().toISOString().slice(0, 10);
    
    // Rent payments overdue (dynamically calculated)
    const { overdueList } = getDynamicRentStatus(db, todayStr);
    overdue += overdueList.length;
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
      case 'dashboard': return 'Dashboard';
      case 'properties': return 'Properties';
      case 'vehicles': return 'Vehicles';
      case 'loans': return 'Lending & Debt Hub';
      case 'utilities': return 'Utility Accounts & Bill Records';
      case 'maintenance': return 'Maintenance Requests & Aduan';
      case 'reminders': return 'Reminders';
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
      case 'settings': return 'Configure preferences, connect live data, manage contacts, and export to CSV.';
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

  if (isLocked) {
    const db = getDb();
    const correctPin = db.settings?.appLockPin || '';
    const codeLength = correctPin.length || 4;
    
    return html`
      <div class="lock-screen-overlay">
        <div class="lock-screen-card">
          <div class="lock-screen-logo">A</div>
          <h2 style="font-weight: 800; font-size: 1.5rem; margin-bottom: 8px; color: var(--text-primary);">Asset Hub Locked</h2>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 24px;">Enter PIN Code to Unlock Dashboard</p>
          
          <!-- PIN Dots Indicator -->
          <div class="pin-display-container">
            ${Array.from({ length: codeLength }).map((_, i) => html`
              <div key=${i} class="pin-digit-dot ${i < pinBuffer.length ? 'filled' : ''}"></div>
            `)}
          </div>
          
          <!-- Numeric Keypad -->
          <div class="pin-keypad">
            ${['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Delete', '0', 'Clear'].map(key => html`
              <button 
                key=${key} 
                class="pin-key ${['Delete', 'Clear'].includes(key) ? 'action-key' : ''}" 
                onClick=${() => handlePinKeyPress(key)}
              >
                ${key}
              </button>
            `)}
          </div>
        </div>
      </div>
    `;
  }

  return html`
    <div class="app-container">
      
      <!-- Mobile hamburger toggle button (floating) -->
      <button class="mobile-menu-toggle control-btn btn-primary" onClick=${() => setSidebarOpen(!sidebarOpen)}>
        <span style="font-size:1.5rem; font-weight:800;">☰</span>
      </button>

      <!-- Sidebar Layout -->
      <aside class="sidebar ${sidebarOpen ? 'open' : ''}">
        <div class="sidebar-header">
          <div class="sidebar-mark">
            AH
          </div>
          <div class="sidebar-brand-copy">
            <span class="sidebar-logo">Asset Hub</span>
          </div>
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

          ${getDb().settings?.appLockPin && html`
            <li class="sidebar-item" style="margin-top: auto; border-top: 1px solid var(--border-color); padding-top: 12px;">
              <div class="sidebar-link" onClick=${() => setIsLocked(true)} style="color: var(--text-muted); cursor: pointer;">
                <span>🔒 Lock Dashboard</span>
              </div>
            </li>
          `}
        </ul>
        
        <div class="sidebar-footer">
          <span class="status-dot ${supabaseStatus !== 'Offline' ? 'connected' : ''}"></span>
          <span>${supabaseStatus !== 'Offline' ? 'Database connected' : 'Local database'}</span>
        </div>
      </aside>

      <!-- Main Workspace -->
      <main class="main-content">
        <!-- Top bar/header -->
        <header class="header-bar">
          <div class="header-title">
            <h1>${getPageTitle()}</h1>
          </div>
          
          <div class="header-controls">
            ${getDb().settings?.supabaseUrl && html`
              <div class="connection-badge ${supabaseStatus !== 'Offline' ? 'live' : 'offline'}" title="Cloud database connection">
                <span class="dot"></span>
                <span>${supabaseStatus}</span>
              </div>
            `}

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
        <section class="page-content">
          ${renderView()}
        </section>
      </main>

      <!-- Toast Container overlay -->
      <div class="toast-container">
        ${toasts.map(toast => html`
          <div key=${toast.id} class="toast-item ${toast.closing ? 'closing' : ''} ${toast.type === 'warning' ? 'toast-warning' : 'toast-sync'}">
            <div class="toast-content">
              <div class="toast-title">
                ${toast.type === 'warning' ? '⚠️' : '🔄'} ${toast.title}
              </div>
              <div class="toast-desc">${toast.desc}</div>
            </div>
            <button class="toast-close" onClick=${() => {
              setToasts(prev => prev.filter(t => t.id !== toast.id));
            }}>×</button>
          </div>
        `)}
      </div>

    </div>
  `;
}
