const DEFAULT_SERVICE_TYPES = [
  'Engine Oil & Filter', 'Air & Cabin Filter', 'Brake Pads & Discs',
  'Battery Replacement', 'Tyres & Alignment', 'Aircond Service',
  'Transmission Fluid', 'Spark Plugs'
];

const DEFAULT_UTILITY_TYPES = [
  'TNB (Electricity)', 'Air (Water)', 'Internet/Broadband',
  'Indah Water (Sewerage)', 'JMB/MC Maintenance Fee',
  'Cukai Pintu (Assessment Tax)', 'Cukai Tanah (Quit Rent)'
];

const DEFAULT_DOCUMENT_TYPES = [
  'Rental Agreement', 'Tenant Identity (IC/Passport)', 'Utility Bill',
  'Payment Receipt', 'Loan Agreement', 'Insurance Policy', 'Road Tax Disc',
  'Service Receipt', 'Inspection Certificate'
];

export const DEFAULT_GOOGLE_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/1cKzRkNBFu0EFa7VgRRrjt5peALnhQ_lIPfDgUY4GwGQ/edit';

const DATA_TABLES = [
  'contacts', 'owners', 'properties', 'tenants', 'rentalAgreements',
  'rentPayments', 'propertyLoans', 'utilities', 'utilityBills', 'maintenance',
  'contractors', 'borrowers', 'personalLoans', 'loanPayments', 'vehicles',
  'vehicleLoans', 'vehicleServices', 'vehicleInspections', 'vehicleRoadTax',
  'vehicleInsurance', 'financialTransactions', 'documents', 'reminders',
  'activityLog', 'propertyTaxes'
];

export function createEmptyDatabase(existingSettings = {}) {
  const database = {
    settings: {
      currency: existingSettings.currency || 'RM',
      theme: existingSettings.theme || 'dark',
      serviceTypes: existingSettings.serviceTypes?.length ? existingSettings.serviceTypes : DEFAULT_SERVICE_TYPES,
      utilityTypes: existingSettings.utilityTypes?.length ? existingSettings.utilityTypes : DEFAULT_UTILITY_TYPES,
      documentTypes: existingSettings.documentTypes?.length ? existingSettings.documentTypes : DEFAULT_DOCUMENT_TYPES,
      googleSheetsUrl: existingSettings.googleSheetsUrl || DEFAULT_GOOGLE_SHEETS_URL,
      dataMode: 'live'
    }
  };

  ['supabaseUrl', 'supabaseAnonKey', 'googleAppsScriptUrl', 'appLockPin'].forEach(key => {
    if (existingSettings[key]) database.settings[key] = existingSettings[key];
  });

  DATA_TABLES.forEach(table => { database[table] = []; });
  return database;
}

export function isLegacySampleDatabase(database) {
  if (!database || database.settings?.dataMode === 'live') return false;
  const propertyIds = (database.properties || []).map(item => item.id).sort().join(',');
  const vehicleIds = (database.vehicles || []).map(item => item.id).sort().join(',');
  return propertyIds === 'prop-1,prop-2' &&
    vehicleIds === 'veh-1' &&
    (database.properties || []).some(item => item.name === 'Kondominium Heights, Block A-12-03');
}
