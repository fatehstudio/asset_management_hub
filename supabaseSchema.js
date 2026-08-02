export const SUPABASE_SQL_SCHEMA = `-- ========================================================
-- MMS Asset Management Hub Setup Script
-- Paste this script inside your Supabase SQL Editor and click RUN.
-- ========================================================

-- Disable Row Level Security (RLS) for simple personal setup, or you can enable it later
-- 1. Create Contacts Table
create table if not exists contacts (
  id text primary key,
  name text not null,
  email text,
  phone text,
  role text,
  notes text
);

-- 2. Create Owners Table (Fallback info)
create table if not exists owners (
  id text primary key,
  name text not null,
  company text,
  phone text,
  email text
);

-- 3. Create Properties Table
create table if not exists properties (
  id text primary key,
  name text not null,
  address text,
  type text,
  "ownerId" text references contacts(id) on delete set null,
  "monthlyRent" numeric default 0,
  "depositCollected" numeric default 0,
  "startDate" text,
  notes text,
  status text default 'Vacant'
);

-- 4. Create Tenants Table
create table if not exists tenants (
  id text primary key,
  "propertyId" text references properties(id) on delete set null,
  name text not null,
  "icPassport" text,
  phone text,
  "emergencyContact" text,
  "startDate" text,
  "endDate" text,
  status text default 'Active'
);

-- 5. Create Rental Agreements Table
create table if not exists rental_agreements (
  id text primary key,
  "propertyId" text references properties(id) on delete cascade,
  "tenantId" text references tenants(id) on delete cascade,
  "startDate" text,
  "endDate" text,
  "monthlyRent" numeric default 0,
  "depositAmount" numeric default 0,
  "dueDateDay" integer default 5,
  status text default 'Active',
  "documentLink" text
);

-- 6. Create Rent Payments Table
create table if not exists rent_payments (
  id text primary key,
  "propertyId" text references properties(id) on delete cascade,
  "tenantId" text references tenants(id) on delete cascade,
  "billingMonth" text,
  date text,
  amount numeric default 0,
  "paidBy" text,
  "paymentMethod" text,
  "referenceId" text,
  "receiptLink" text,
  status text default 'Unpaid'
);

-- 7. Create Property Loans Table
create table if not exists property_loans (
  id text primary key,
  "propertyId" text references properties(id) on delete cascade,
  bank text,
  "originalLoanAmount" numeric default 0,
  "tenureYears" integer default 0,
  "interestRate" numeric default 0,
  "monthlyInstalment" numeric default 0,
  "outstandingBalance" numeric default 0,
  "startDate" text,
  status text default 'Active'
);

-- 8. Create Utilities Table
create table if not exists utilities (
  id text primary key,
  "propertyId" text references properties(id) on delete cascade,
  name text,
  "accountNumber" text,
  "responsibleParty" text,
  status text default 'Active'
);

-- 9. Create Utility Bills Table
create table if not exists utility_bills (
  id text primary key,
  "utilityId" text references utilities(id) on delete cascade,
  "billingMonth" text,
  "dueDate" text,
  "paidDate" text,
  "paidAmount" numeric default 0,
  "paymentMethod" text,
  "referenceId" text,
  "receiptLink" text,
  status text default 'Unpaid'
);

-- 10. Create Contractors Table
create table if not exists contractors (
  id text primary key,
  name text not null,
  phone text,
  category text,
  email text
);

-- 11. Create Maintenance Logs Table
create table if not exists maintenance (
  id text primary key,
  "propertyId" text references properties(id) on delete cascade,
  title text,
  description text,
  "reportedDate" text,
  category text,
  "contractorId" text references contractors(id) on delete set null,
  "quotedCost" numeric default 0,
  "actualCost" numeric default 0,
  "completedDate" text,
  status text default 'Pending'
);

-- 12. Create Borrowers Table
create table if not exists borrowers (
  id text primary key,
  name text not null,
  phone text,
  email text,
  notes text
);

-- 13. Create Personal Loans Table
create table if not exists personal_loans (
  id text primary key,
  "borrowerId" text references borrowers(id) on delete cascade,
  title text,
  "amountLent" numeric default 0,
  "monthlyInstalment" numeric default 0,
  "startDate" text,
  status text default 'Active',
  notes text
);

-- 14. Create Loan Payments Table
create table if not exists loan_payments (
  id text primary key,
  "loanId" text references personal_loans(id) on delete cascade,
  date text,
  amount numeric default 0,
  "referenceId" text,
  notes text
);

-- 15. Create Vehicles Table
create table if not exists vehicles (
  id text primary key,
  "registrationNumber" text not null,
  "makeModel" text,
  year integer,
  owner text,
  "purchaseDate" text,
  "currentMileage" integer default 0,
  "nextServiceMileage" integer default 0,
  "nextServiceDate" text,
  status text default 'Active'
);

-- 16. Create Vehicle Loans Table
create table if not exists vehicle_loans (
  id text primary key,
  "vehicleId" text references vehicles(id) on delete cascade,
  bank text,
  "originalLoanAmount" numeric default 0,
  "tenureYears" integer default 0,
  "interestRate" numeric default 0,
  "monthlyInstalment" numeric default 0,
  "outstandingBalance" numeric default 0,
  "startDate" text,
  status text default 'Active'
);

-- 17. Create Vehicle Services Table
create table if not exists vehicle_services (
  id text primary key,
  "vehicleId" text references vehicles(id) on delete cascade,
  "serviceDate" text,
  mileage integer default 0,
  description text,
  "quotedCost" numeric default 0,
  "actualCost" numeric default 0,
  "invoiceLink" text,
  status text default 'Completed'
);

-- 18. Create Vehicle Inspections Table
create table if not exists vehicle_inspections (
  id text primary key,
  "vehicleId" text references vehicles(id) on delete cascade,
  date text,
  type text,
  "expiryDate" text,
  cost numeric default 0,
  "receiptLink" text,
  status text default 'Active'
);

-- 19. Create Vehicle Road Tax Table
create table if not exists vehicle_road_tax (
  id text primary key,
  "vehicleId" text references vehicles(id) on delete cascade,
  "startDate" text,
  "expiryDate" text,
  cost numeric default 0,
  "receiptLink" text,
  status text default 'Active'
);

-- 20. Create Vehicle Insurance Table
create table if not exists vehicle_insurance (
  id text primary key,
  "vehicleId" text references vehicles(id) on delete cascade,
  company text,
  "policyNumber" text,
  "coverNoteLink" text,
  cost numeric default 0,
  "startDate" text,
  "expiryDate" text,
  status text default 'Active'
);

-- 21. Create Financial Transactions Table
create table if not exists financial_transactions (
  id text primary key,
  date text,
  type text,
  category text,
  amount numeric default 0,
  "referenceId" text,
  notes text
);

-- 22. Create Documents Table
create table if not exists documents (
  id text primary key,
  name text not null,
  type text,
  description text,
  link text,
  association text,
  "createdDate" text
);

-- 23. Create Activity Log Table
create table if not exists activity_log (
  id text primary key,
  date text,
  "user" text,
  action text,
  details text
);

-- 24. Create Settings Table
create table if not exists settings (
  key text primary key,
  value text
);

-- ========================================================
-- Seed Initial Mock Data
-- ========================================================

-- Seed Contacts
insert into contacts (id, name, email, phone, role, notes) values
('con-1', 'Ahmad (Self)', 'ahmad@example.com', '012-3456789', 'Owner', 'System Owner Account'),
('con-2', 'Hajah Fatimah', 'fatimah@example.com', '019-8765432', 'Owner', 'Client property owner'),
('con-3', 'Sarah Lee', 'sarah.l@example.com', '013-1112222', 'Tenant', 'Kondominium Heights Tenant'),
('con-4', 'Muhammad Haziq', 'haziq.m@example.com', '017-3334444', 'Tenant', 'Taman Melati Tenant'),
('con-5', 'Ali Bin Abu', 'ali.abu@example.com', '016-5556666', 'Borrower', 'Personal friend borrower'),
('con-6', 'Tan Plumber Services', 'tanplumbing@example.com', '011-2223344', 'Contractor', 'Trusted plumber'),
('con-7', 'Raju Roof Repair', 'rajuroofing@example.com', '018-4445555', 'Contractor', 'Roof contractor'),
('con-8', 'Proton Glenmarie Workshop', 'glenmarie@proton.com', '03-55667788', 'Workshop', 'Proton service outlet')
on conflict (id) do nothing;

-- Seed Owners
insert into owners (id, name, company, phone, email) values
('con-1', 'Ahmad (Self)', 'MMS Assets Sdn Bhd', '012-3456789', 'ahmad@example.com'),
('con-2', 'Hajah Fatimah', 'Fatimah Holdings', '019-8765432', 'fatimah@example.com')
on conflict (id) do nothing;

-- Seed Properties
insert into properties (id, name, address, type, "ownerId", "monthlyRent", "depositCollected", "startDate", notes, status) values
('prop-1', 'Kondominium Heights, Block A-12-03', 'Jalan Kiara, Mont Kiara, 50480 Kuala Lumpur', 'Condominium', 'con-1', 2200, 4400, '2025-01-01', 'Key in mailbox. Maintenance contact: En. Rosli', 'Rented'),
('prop-2', 'Taman Melati Double Storey', 'No. 45, Jalan Melati 3, Taman Melati, 53100 Kuala Lumpur', 'Terrace House', 'con-2', 1800, 3600, '2025-03-15', 'Paddy fields rental nearby. Check boundary markings annually.', 'Rented')
on conflict (id) do nothing;

-- Seed Tenants
insert into tenants (id, "propertyId", name, "icPassport", phone, "emergencyContact", "startDate", "endDate", status) values
('ten-1', 'prop-1', 'Sarah Lee', '980512-14-5562', '013-1112222', 'Mr. Lee (Father) - 013-9998888', '2025-01-01', '2026-01-01', 'Active'),
('ten-2', 'prop-2', 'Muhammad Haziq', '941120-10-5321', '017-3334444', 'Aminah (Wife) - 017-6667777', '2025-03-15', '2026-03-15', 'Active')
on conflict (id) do nothing;

-- Seed Rental Agreements
insert into rental_agreements (id, "propertyId", "tenantId", "startDate", "endDate", "monthlyRent", "depositAmount", "dueDateDay", status, "documentLink") values
('ra-1', 'prop-1', 'ten-1', '2025-01-01', '2026-01-01', 2200, 4400, 5, 'Active', 'https://drive.google.com/file/d/agreement1'),
('ra-2', 'prop-2', 'ten-2', '2025-03-15', '2026-03-15', 1800, 3600, 5, 'Active', 'https://drive.google.com/file/d/agreement2')
on conflict (id) do nothing;

-- Seed Vehicles
insert into vehicles (id, "registrationNumber", "makeModel", year, owner, "purchaseDate", "currentMileage", "nextServiceMileage", "nextServiceDate", status) values
('veh-1', 'VBF 8321', 'Proton X70 1.8 TGDi', 2021, 'Ahmad (Self)', '2021-08-15', 52300, 55000, '2025-10-15', 'Active'),
('veh-2', 'WYY 4482', 'Perodua Myvi 1.5 AV', 2018, 'Ahmad (Self)', '2018-05-10', 92400, 95000, '2025-08-01', 'Active')
on conflict (id) do nothing;

-- Seed Settings
insert into settings (key, value) values
('currency', 'RM'),
('theme', 'dark')
on conflict (key) do update set value = excluded.value;

-- ========================================================
-- Enable Supabase Realtime Replication
-- ========================================================
begin;
  -- Remove existing subscription configuration to prevent errors if running multiple times
  drop publication if exists supabase_realtime;
  
  -- Create publication
  create publication supabase_realtime for all tables;
commit;
`;
