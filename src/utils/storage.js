import { INITIAL_MOCK_DATA } from './mockData.js';

const STORAGE_KEY = 'mms_database';

export function initializeDatabase() {
  if (!localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_DATA));
  }
}

export function getDb() {
  initializeDatabase();
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch (e) {
    console.error("Failed to parse database from localStorage, resetting to mock data.", e);
    return INITIAL_MOCK_DATA;
  }
}

export function saveDb(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  // Dispatch custom event to notify other components/tabs of database changes
  window.dispatchEvent(new Event('mms_db_changed'));
}

export function getItems(table) {
  const db = getDb();
  return db[table] || [];
}

export function getItemById(table, id) {
  const items = getItems(table);
  return items.find(item => item.id === id);
}

function getSheetName(table) {
  const mapping = {
    contacts: "Contacts",
    owners: "Owners",
    properties: "Properties",
    tenants: "Tenants",
    rentalAgreements: "RentalAgreements",
    rentPayments: "RentPayments",
    propertyLoans: "PropertyLoans",
    utilities: "Utilities",
    utilityBills: "UtilityBills",
    maintenance: "Maintenance",
    contractors: "Contractors",
    borrowers: "Borrowers",
    personalLoans: "PersonalLoans",
    loanPayments: "LoanPayments",
    vehicles: "Vehicles",
    vehicleLoans: "VehicleLoans",
    serviceTypes: "ServiceTypes",
    vehicleServices: "VehicleServices",
    vehicleInspections: "VehicleInspections",
    vehicleRoadTax: "VehicleRoadTax",
    vehicleInsurance: "VehicleInsurance",
    financialTransactions: "FinancialTransactions",
    documents: "Documents",
    reminders: "Reminders",
    activityLog: "ActivityLog",
    settings: "Settings"
  };
  return mapping[table] || table;
}

function mapKeysToSheet(obj, table) {
  const inverseMapping = {
    "id": table === "contacts" ? "Contact ID" : 
          table === "owners" ? "Owner ID" : 
          table === "properties" ? "Property ID" : 
          table === "tenants" ? "Tenant ID" : 
          table === "rentalAgreements" ? "Agreement ID" : 
          table === "rentPayments" ? "Payment ID" : 
          table === "propertyLoans" ? "Loan ID" : 
          table === "utilities" ? "Utility ID" : 
          table === "utilityBills" ? "Bill ID" : 
          table === "maintenance" ? "Maintenance ID" : 
          table === "contractors" ? "Contractor ID" : 
          table === "borrowers" ? "Borrower ID" : 
          table === "personalLoans" ? "Loan ID" : 
          table === "loanPayments" ? "Payment ID" : 
          table === "vehicles" ? "Vehicle ID" : 
          table === "vehicleLoans" ? "Loan ID" : 
          table === "vehicleServices" ? "Service ID" : 
          table === "vehicleInspections" ? "Inspection ID" : 
          table === "vehicleRoadTax" ? "Road Tax ID" : 
          table === "vehicleInsurance" ? "Insurance ID" : 
          table === "financialTransactions" ? "Transaction ID" : 
          table === "documents" ? "Document ID" : 
          table === "reminders" ? "Reminder ID" : 
          table === "activityLog" ? "Log ID" : "id",
    "name": "Name",
    "phone": "Phone",
    "email": "Email",
    "role": "Role",
    "notes": "Notes",
    "bank": "Bank",
    "address": "Address",
    "type": "Type",
    "ownerId": "Owner ID",
    "propertyId": "Property ID",
    "vehicleId": "Vehicle ID",
    "status": "Status",
    "monthlyRent": "Monthly Rent",
    "depositCollected": "Deposit Collected",
    "startDate": "Start Date",
    "icPassport": "IC/Passport",
    "emergencyContact": "Emergency Contact",
    "endDate": "End Date",
    "tenantId": "Tenant ID",
    "depositAmount": "Deposit Amount",
    "dueDateDay": "Due Date Day",
    "documentLink": "Document Link",
    "billingMonth": "Billing Month",
    "amount": "Amount",
    "method": "Method",
    "receiptLink": "Receipt Link",
    "dueBy": "Due By",
    "originalLoanAmount": "Original Loan Amount",
    "tenureYears": "Tenure Years",
    "interestRate": "Interest Rate",
    "monthlyInstalment": "Monthly Instalment",
    "outstandingBalance": "Outstanding Balance",
    "utilityId": "Utility ID",
    "accountNumber": "Account Number",
    "responsibleParty": "Responsible Party",
    "dueDate": "Due Date",
    "paidDate": "Paid Date",
    "paidAmount": "Paid Amount",
    "reportedDate": "Reported Date",
    "category": "Category",
    "contractorId": "Contractor ID",
    "quotedCost": "Quoted Cost",
    "actualCost": "Actual Cost",
    "completedDate": "Completed Date",
    "amountLent": "Amount Lent",
    "registrationNumber": "Registration Number",
    "makeModel": "Make/Model",
    "year": "Year",
    "owner": "Owner",
    "purchaseDate": "Purchase Date",
    "currentMileage": "Current Mileage",
    "mileage": "Mileage",
    "serviceType": "Service Type",
    "workshopId": "Workshop ID",
    "cost": "Cost",
    "items": "Items",
    "nextServiceDate": "Next Service Date",
    "nextServiceMileage": "Next Service Mileage",
    "inspectionType": "Inspection Type",
    "nextDueDate": "Next Due Date",
    "location": "Location",
    "result": "Result",
    "expiryDate": "Expiry Date",
    "renewalDate": "Renewal Date",
    "insurer": "Insurer",
    "policyNumber": "Policy Number",
    "premium": "Premium",
    "ncdPercentage": "NCD Percentage",
    "coverageType": "Coverage Type",
    "policyDocumentLink": "Policy Document Link",
    "referenceId": "Reference ID",
    "linkedToId": "Linked To ID",
    "link": "Link",
    "uploadDate": "Upload Date",
    "subtitle": "Subtitle",
    "timestamp": "Timestamp",
    "user": "User",
    "action": "Action",
    "details": "Details",
    "key": "Key",
    "value": "Value"
  };

  const mapped = {};
  for (const [key, val] of Object.entries(obj)) {
    const mappedKey = inverseMapping[key] || key.charAt(0).toUpperCase() + key.slice(1);
    mapped[mappedKey] = val;
  }
  return mapped;
}

export async function saveItem(table, item) {
  const db = getDb();
  if (!db[table]) {
    db[table] = [];
  }
  
  if (!item.id) {
    item.id = `${table.toLowerCase()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    db[table].push(item);
  } else {
    const index = db[table].findIndex(i => i.id === item.id);
    if (index !== -1) {
      db[table][index] = { ...db[table][index], ...item };
    } else {
      db[table].push(item);
    }
  }
  
  saveDb(db);

  // Sync to Google Sheets if write URL is configured
  const writeUrl = db.settings?.googleSheetsWriteUrl;
  if (writeUrl && table !== 'settings') {
    try {
      const sheetItem = mapKeysToSheet(item, table);
      fetch(writeUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", table: getSheetName(table), item: sheetItem })
      });
      console.log(`Synced save of ${table} to Google Sheets`);
    } catch (e) {
      console.error("Failed to sync save to Google Sheets:", e);
    }
  }

  return item;
}

export async function deleteItem(table, id) {
  const db = getDb();
  if (db[table]) {
    db[table] = db[table].filter(item => item.id !== id);
    saveDb(db);

    // Sync to Google Sheets if write URL is configured
    const writeUrl = db.settings?.googleSheetsWriteUrl;
    if (writeUrl && table !== 'settings') {
      try {
        fetch(writeUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete", table: getSheetName(table), id: id })
        });
        console.log(`Synced delete of ${table} (${id}) to Google Sheets`);
      } catch (e) {
        console.error("Failed to sync delete to Google Sheets:", e);
      }
    }
    return true;
  }
  return false;
}

// Backup & Restore
export function exportBackup() {
  const db = getDb();
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `mms_backup_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function importBackup(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    // Basic verification
    if (parsed.settings && parsed.properties && parsed.vehicles) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      window.dispatchEvent(new Event('mms_db_changed'));
      return { success: true };
    }
    return { success: false, error: "Invalid backup format: missing core database structures." };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export function resetDatabase() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_DATA));
  window.dispatchEvent(new Event('mms_db_changed'));
}

// CSV Exporter Utility
export function exportToCSV(tableName) {
  const data = getItems(tableName);
  if (data.length === 0) {
    alert(`No data available to export in table "${tableName}"`);
    return;
  }
  
  // Get all keys/columns present in the records
  const keys = Array.from(new Set(data.flatMap(item => Object.keys(item))));
  
  // Format rows
  const csvHeaders = keys.join(",");
  const csvRows = data.map(row => {
    return keys.map(key => {
      let cellValue = row[key] === undefined || row[key] === null ? "" : row[key];
      // Stringify objects if any
      if (typeof cellValue === 'object') {
        cellValue = JSON.stringify(cellValue);
      }
      // Escape double quotes and enclose string values
      let cellStr = String(cellValue);
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n') || cellStr.includes('\r')) {
        cellStr = `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(",");
  });
  
  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent([csvHeaders].concat(csvRows).join("\n"));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", csvContent);
  downloadAnchor.setAttribute("download", `mms_${tableName.toLowerCase()}_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function exportPropertyLedgerToCSV(propertyId, propertyName) {
  const db = getDb();
  const txs = db.financialTransactions || [];
  const rps = db.rentPayments || [];
  const maint = db.maintenance || [];
  const ubs = db.utilityBills || [];
  const uts = db.utilities || [];

  const propertyRentPaymentIds = rps.filter(r => r.propertyId === propertyId).map(r => r.id);
  const propertyMaintIds = maint.filter(m => m.propertyId === propertyId).map(m => m.id);
  const propertyUtilityIds = uts.filter(u => u.propertyId === propertyId).map(u => u.id);
  const propertyUtilityBillIds = ubs.filter(b => propertyUtilityIds.includes(b.utilityId)).map(b => b.id);

  const filteredTxs = txs.filter(tx => {
    if (tx.referenceId && (
      propertyRentPaymentIds.includes(tx.referenceId) ||
      propertyMaintIds.includes(tx.referenceId) ||
      propertyUtilityBillIds.includes(tx.referenceId)
    )) {
      return true;
    }
    if (tx.notes && tx.notes.toLowerCase().includes(propertyName.toLowerCase())) {
      return true;
    }
    return false;
  });

  if (filteredTxs.length === 0) {
    alert(`No transactions recorded for property "${propertyName}"`);
    return;
  }

  const keys = Array.from(new Set(filteredTxs.flatMap(item => Object.keys(item))));
  const csvHeaders = keys.join(",");
  const csvRows = filteredTxs.map(row => {
    return keys.map(key => {
      let cellValue = row[key] === undefined || row[key] === null ? "" : row[key];
      if (typeof cellValue === 'object') cellValue = JSON.stringify(cellValue);
      let cellStr = String(cellValue);
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n') || cellStr.includes('\r')) {
        cellStr = `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(",");
  });

  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent([csvHeaders].concat(csvRows).join("\n"));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", csvContent);
  const cleanName = propertyName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  downloadAnchor.setAttribute("download", `mms_ledger_${cleanName}_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function parseCSV(text) {
  const lines = [];
  let row = [""];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i+1];
    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') {
        i++;
      }
      lines.push(row);
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== '') {
    lines.push(row);
  }
  
  if (lines.length < 2) return [];
  const headers = lines[0].map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const obj = {};
    headers.forEach((header, idx) => {
      let val = line[idx] !== undefined ? line[idx].trim().replace(/^"|"$/g, '').replace(/""/g, '"') : "";
      if (val !== "" && !isNaN(val)) {
        obj[header] = Number(val);
      } else {
        obj[header] = val;
      }
    });
    return obj;
  });
}

function mapKeys(obj, table) {
  const tableMappings = {
    Owners: {
      "Owner ID": "id",
      "Name": "name",
      "Phone": "phone",
      "Email": "email",
      "Bank": "bank",
      "Notes": "notes"
    },
    Properties: {
      "Property ID": "id",
      "Name": "name",
      "Address": "address",
      "Type": "type",
      "Owner ID": "ownerId",
      "Status": "status",
      "Monthly Rent": "monthlyRent",
      "Deposit Collected": "depositCollected",
      "Start Date": "startDate",
      "Notes": "notes"
    },
    Tenants: {
      "Tenant ID": "id",
      "Property ID": "propertyId",
      "Name": "name",
      "IC/Passport": "icPassport",
      "Phone": "phone",
      "Emergency Contact": "emergencyContact",
      "Start Date": "startDate",
      "End Date": "endDate",
      "Status": "status"
    },
    RentalAgreements: {
      "Agreement ID": "id",
      "Property ID": "propertyId",
      "Tenant ID": "tenantId",
      "Start Date": "startDate",
      "End Date": "endDate",
      "Monthly Rent": "monthlyRent",
      "Deposit Amount": "depositAmount",
      "Due Date Day": "dueDateDay",
      "Status": "status",
      "Document Link": "documentLink"
    },
    RentPayments: {
      "Payment ID": "id",
      "Property ID": "propertyId",
      "Date": "date",
      "Billing Month": "billingMonth",
      "Amount": "amount",
      "Method": "method",
      "Status": "status",
      "Receipt Link": "receiptLink",
      "Due By": "dueBy"
    },
    PropertyLoans: {
      "Loan ID": "id",
      "Property ID": "propertyId",
      "Bank": "bank",
      "Original Loan Amount": "originalLoanAmount",
      "Start Date": "startDate",
      "Tenure Years": "tenureYears",
      "Interest Rate": "interestRate",
      "Monthly Instalment": "monthlyInstalment",
      "Due Date Day": "dueDateDay",
      "Outstanding Balance": "outstandingBalance",
      "Status": "status"
    },
    Utilities: {
      "Utility ID": "id",
      "Property ID": "propertyId",
      "Type": "type",
      "Account Number": "accountNumber",
      "Responsible Party": "responsibleParty"
    },
    UtilityBills: {
      "Bill ID": "id",
      "Utility ID": "utilityId",
      "Billing Month": "billingMonth",
      "Due Date": "dueDate",
      "Amount": "amount",
      "Paid Date": "paidDate",
      "Paid Amount": "paidAmount",
      "Method": "method",
      "Receipt Link": "receiptLink",
      "Status": "status"
    },
    Maintenance: {
      "Maintenance ID": "id",
      "Property ID": "propertyId",
      "Issue": "issue",
      "Reported Date": "reportedDate",
      "Category": "category",
      "Contractor ID": "contractorId",
      "Quoted Cost": "quotedCost",
      "Actual Cost": "actualCost",
      "Status": "status",
      "Completed Date": "completedDate",
      "Notes": "notes",
      "Receipt Link": "receiptLink"
    },
    Contractors: {
      "Contractor ID": "id",
      "Name": "name",
      "Phone": "phone",
      "Email": "email",
      "Role": "role",
      "Notes": "notes"
    },
    Borrowers: {
      "Borrower ID": "id",
      "Name": "name",
      "Phone": "phone",
      "Address": "address",
      "Notes": "notes"
    },
    PersonalLoans: {
      "Loan ID": "id",
      "Borrower ID": "borrowerId",
      "Amount Lent": "amountLent",
      "Start Date": "startDate",
      "Monthly Instalment": "monthlyInstalment",
      "Due Date Day": "dueDateDay",
      "Notes": "notes",
      "Status": "status"
    },
    LoanPayments: {
      "Payment ID": "id",
      "Loan ID": "loanId",
      "Date": "date",
      "Amount": "amount",
      "Method": "method",
      "Notes": "notes",
      "Receipt Link": "receiptLink"
    },
    Vehicles: {
      "Vehicle ID": "id",
      "Registration Number": "registrationNumber",
      "Make/Model": "makeModel",
      "Year": "year",
      "Owner": "owner",
      "Purchase Date": "purchaseDate",
      "Current Mileage": "currentMileage",
      "Status": "status",
      "Notes": "notes"
    },
    VehicleLoans: {
      "Loan ID": "id",
      "Vehicle ID": "vehicleId",
      "Bank": "bank",
      "Original Loan Amount": "originalLoanAmount",
      "Start Date": "startDate",
      "Tenure Years": "tenureYears",
      "Interest Rate": "interestRate",
      "Monthly Instalment": "monthlyInstalment",
      "Due Date Day": "dueDateDay",
      "Outstanding Balance": "outstandingBalance",
      "Status": "status"
    },
    VehicleServices: {
      "Service ID": "id",
      "Vehicle ID": "vehicleId",
      "Date": "date",
      "Mileage": "mileage",
      "Service Type": "serviceType",
      "Workshop ID": "workshopId",
      "Cost": "cost",
      "Items": "items",
      "Receipt Link": "receiptLink",
      "Notes": "notes",
      "Next Service Date": "nextServiceDate",
      "Next Service Mileage": "nextServiceMileage"
    },
    VehicleInspections: {
      "Inspection ID": "id",
      "Vehicle ID": "vehicleId",
      "Inspection Type": "inspectionType",
      "Date": "date",
      "Next Due Date": "nextDueDate",
      "Location": "location",
      "Cost": "cost",
      "Result": "result",
      "Document Link": "documentLink",
      "Notes": "notes"
    },
    VehicleRoadTax: {
      "Road Tax ID": "id",
      "Vehicle ID": "vehicleId",
      "Expiry Date": "expiryDate",
      "Renewal Date": "renewalDate",
      "Amount": "amount",
      "Receipt Link": "receiptLink",
      "Status": "status"
    },
    VehicleInsurance: {
      "Insurance ID": "id",
      "Vehicle ID": "vehicleId",
      "Insurer": "insurer",
      "Policy Number": "policyNumber",
      "Start Date": "startDate",
      "Expiry Date": "expiryDate",
      "Premium": "premium",
      "NCD Percentage": "ncdPercentage",
      "Coverage Type": "coverageType",
      "Policy Document Link": "policyDocumentLink",
      "Status": "status"
    },
    FinancialTransactions: {
      "Transaction ID": "id",
      "Date": "date",
      "Type": "type",
      "Category": "category",
      "Amount": "amount",
      "Reference ID": "referenceId",
      "Notes": "notes"
    },
    Documents: {
      "Document ID": "id",
      "Name": "name",
      "Type": "type",
      "Category": "category",
      "Linked To ID": "linkedToId",
      "Link": "link",
      "Upload Date": "uploadDate",
      "Expiry Date": "expiryDate"
    },
    Reminders: {
      "Reminder ID": "id",
      "Date": "date",
      "Title": "title",
      "Subtitle": "subtitle",
      "Amount": "amount",
      "Status": "status",
      "Category": "category",
      "Linked To ID": "linkedToId"
    },
    ActivityLog: {
      "Log ID": "id",
      "Timestamp": "timestamp",
      "User": "user",
      "Action": "action",
      "Details": "details"
    },
    Contacts: {
      "Contact ID": "id",
      "Name": "name",
      "Phone": "phone",
      "Email": "email",
      "Role": "role",
      "Notes": "notes"
    },
    Settings: {
      "Key": "key",
      "Value": "value"
    }
  };

  const mapping = tableMappings[table] || {};
  const mapped = {};
  for (const [key, val] of Object.entries(obj)) {
    const mappedKey = mapping[key] || key.charAt(0).toLowerCase() + key.slice(1).replace(/\s+/g, '');
    mapped[mappedKey] = val;
  }
  return mapped;
}

export async function syncFromGoogleSheets(sheetUrl) {
  const matches = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!matches) {
    throw new Error("Invalid Google Sheets URL. Make sure it contains '/d/SPREADSHEET_ID'");
  }
  const spreadsheetId = matches[1];

  const oldDb = getDb();
  const existingSheetsUrl = oldDb.settings?.googleSheetsUrl || sheetUrl;

  const tables = [
    "Owners", "Properties", "Tenants", "RentalAgreements", "RentPayments", 
    "PropertyLoans", "Utilities", "UtilityBills", "Maintenance", "Contractors", 
    "Borrowers", "PersonalLoans", "LoanPayments", "Vehicles", "VehicleLoans", 
    "ServiceTypes", "VehicleServices", "VehicleInspections", "VehicleRoadTax", 
    "VehicleInsurance", "FinancialTransactions", "Documents", "Contacts", "Settings"
  ];

  const db = {
    settings: {
      currency: "RM",
      theme: "dark",
      googleSheetsUrl: existingSheetsUrl,
      serviceTypes: [],
      utilityTypes: [],
      documentTypes: []
    }
  };

  for (const table of tables) {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(table)}&t=${Date.now()}`;
    const response = await fetch(csvUrl);
    if (!response.ok) {
      console.warn(`Failed to fetch sheet "${table}". Skipping.`);
      continue;
    }
    const csvText = await response.text();
    const rows = parseCSV(csvText);
    const mappedRows = rows.map(row => mapKeys(row, table));

    if (table === "Settings") {
      mappedRows.forEach(row => {
        if (row.key) db.settings[row.key] = row.value;
      });
    } else if (table === "ServiceTypes") {
      db.settings.serviceTypes = mappedRows.map(r => r.type || r.value || r.key).filter(Boolean);
    } else {
      const dbKey = table.charAt(0).toLowerCase() + table.slice(1);
      db[dbKey] = mappedRows;
    }
  }

  // Set default values if empty
  if (!db.settings.serviceTypes || db.settings.serviceTypes.length === 0) {
    db.settings.serviceTypes = ["Engine Oil & Filter", "Air & Cabin Filter", "Brake Pads & Discs", "Battery Replacement", "Tyres & Alignment", "Aircond Service", "Transmission Fluid", "Spark Plugs"];
  }
  if (!db.settings.utilityTypes || db.settings.utilityTypes.length === 0) {
    db.settings.utilityTypes = ["TNB (Electricity)", "Air (Water)", "Internet/Broadband", "Indah Water (Sewerage)", "JMB/MC Maintenance Fee", "Cukai Pintu (Assessment Tax)", "Cukai Tanah (Quit Rent)"];
  }
  if (!db.settings.documentTypes || db.settings.documentTypes.length === 0) {
    db.settings.documentTypes = ["Rental Agreement", "Tenant Identity (IC/Passport)", "Utility Bill", "Payment Receipt", "Loan Agreement", "Insurance Policy", "Road Tax Disc", "Service Receipt", "Inspection Certificate"];
  }

  saveDb(db);
  return db;
}


