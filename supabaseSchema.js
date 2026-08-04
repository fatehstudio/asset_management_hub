export const SUPABASE_SQL_SCHEMA = `-- ========================================================
-- MMS Asset Management Hub Setup Script (Corrected)
-- Paste this script inside your Supabase SQL Editor and click RUN.
-- ========================================================

-- Drop tables in reverse dependency order if they exist
drop table if exists settings cascade;
drop table if exists activity_log cascade;
drop table if exists documents cascade;
drop table if exists financial_transactions cascade;
drop table if exists vehicle_insurance cascade;
drop table if exists vehicle_road_tax cascade;
drop table if exists vehicle_inspections cascade;
drop table if exists vehicle_services cascade;
drop table if exists vehicle_loans cascade;
drop table if exists vehicles cascade;
drop table if exists loan_payments cascade;
drop table if exists personal_loans cascade;
drop table if exists borrowers cascade;
drop table if exists maintenance cascade;
drop table if exists contractors cascade;
drop table if exists utility_bills cascade;
drop table if exists utilities cascade;
drop table if exists property_loans cascade;
drop table if exists rent_payments cascade;
drop table if exists rental_agreements cascade;
drop table if exists tenants cascade;
drop table if exists properties cascade;
drop table if exists owners cascade;
drop table if exists contacts cascade;

-- 1. Create Contacts Table
create table contacts (
  id text primary key,
  name text not null,
  email text,
  phone text,
  role text,
  notes text
);

-- 2. Create Owners Table
create table owners (
  id text primary key,
  name text not null,
  company text,
  phone text,
  email text
);

-- 3. Create Properties Table
create table properties (
  id text primary key,
  name text not null,
  address text,
  type text,
  "ownerId" text references contacts(id) on delete set null,
  status text,
  "monthlyRent" numeric default 0,
  "depositCollected" numeric default 0,
  "startDate" text,
  notes text
);

-- 4. Create Tenants Table
create table tenants (
  id text primary key,
  "propertyId" text references properties(id) on delete set null,
  name text not null,
  "icPassport" text,
  phone text,
  "emergencyContact" text,
  "startDate" text,
  "endDate" text,
  status text
);

-- 5. Create Rental Agreements Table
create table rental_agreements (
  id text primary key,
  "propertyId" text references properties(id) on delete cascade,
  "tenantId" text references tenants(id) on delete cascade,
  "startDate" text,
  "endDate" text,
  "monthlyRent" numeric default 0,
  "depositAmount" numeric default 0,
  "dueDateDay" integer default 5,
  status text,
  "documentLink" text
);

-- 6. Create Rent Payments Table
create table rent_payments (
  id text primary key,
  "propertyId" text references properties(id) on delete cascade,
  "tenantId" text references tenants(id) on delete cascade,
  "billingMonth" text,
  date text,
  "dueBy" text,
  amount numeric default 0,
  "paidBy" text,
  "paymentMethod" text,
  "referenceId" text,
  "receiptLink" text,
  status text
);

-- 7. Create Property Loans Table
create table property_loans (
  id text primary key,
  "propertyId" text references properties(id) on delete cascade,
  bank text,
  "originalLoanAmount" numeric default 0,
  "tenureYears" integer default 0,
  "interestRate" numeric default 0,
  "monthlyInstalment" numeric default 0,
  "outstandingBalance" numeric default 0,
  "startDate" text,
  status text
);

-- 8. Create Utilities Table
create table utilities (
  id text primary key,
  "propertyId" text references properties(id) on delete cascade,
  name text,
  "accountNumber" text,
  "responsibleParty" text,
  "lastCheckedDate" text,
  status text
);

-- 9. Create Utility Bills Table
create table utility_bills (
  id text primary key,
  "utilityId" text references utilities(id) on delete cascade,
  "billingMonth" text,
  "dueDate" text,
  "paidDate" text,
  "paidAmount" numeric default 0,
  "paymentMethod" text,
  "referenceId" text,
  "receiptLink" text,
  status text
);

-- 10. Create Contractors Table
create table contractors (
  id text primary key,
  name text not null,
  phone text,
  category text,
  email text
);

-- 11. Create Maintenance Logs Table
create table maintenance (
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
  status text
);

-- 12. Create Borrowers Table
create table borrowers (
  id text primary key,
  name text not null,
  phone text,
  email text,
  notes text
);

-- 13. Create Personal Loans Table
create table personal_loans (
  id text primary key,
  "borrowerId" text references borrowers(id) on delete cascade,
  title text,
  "amountLent" numeric default 0,
  "monthlyInstalment" numeric default 0,
  "startDate" text,
  status text,
  notes text
);

-- 14. Create Loan Payments Table
create table loan_payments (
  id text primary key,
  "loanId" text references personal_loans(id) on delete cascade,
  date text,
  amount numeric default 0,
  method text,
  "referenceId" text,
  "receiptLink" text,
  notes text
);

-- 15. Create Vehicles Table
create table vehicles (
  id text primary key,
  "registrationNumber" text not null,
  "makeModel" text,
  year integer,
  owner text,
  "purchaseDate" text,
  "currentMileage" integer default 0,
  status text,
  notes text
);

-- 16. Create Vehicle Loans Table
create table vehicle_loans (
  id text primary key,
  "vehicleId" text references vehicles(id) on delete cascade,
  bank text,
  "originalLoanAmount" numeric default 0,
  "startDate" text,
  "tenureYears" integer default 0,
  "interestRate" numeric default 0,
  "monthlyInstalment" numeric default 0,
  "dueDateDay" integer default 15,
  "outstandingBalance" numeric default 0,
  status text
);

-- 17. Create Vehicle Services Table
create table vehicle_services (
  id text primary key,
  "vehicleId" text references vehicles(id) on delete cascade,
  date text,
  mileage integer default 0,
  "serviceType" text,
  "workshopId" text references contractors(id) on delete set null,
  cost numeric default 0,
  items text,
  "receiptLink" text,
  notes text,
  "nextServiceDate" text,
  "nextServiceMileage" integer default 0
);

-- 18. Create Vehicle Inspections Table
create table vehicle_inspections (
  id text primary key,
  "vehicleId" text references vehicles(id) on delete cascade,
  "inspectionType" text,
  date text,
  "nextDueDate" text,
  location text,
  cost numeric default 0,
  result text,
  "documentLink" text,
  notes text
);

-- 19. Create Vehicle Road Tax Table
create table vehicle_road_tax (
  id text primary key,
  "vehicleId" text references vehicles(id) on delete cascade,
  "expiryDate" text,
  "renewalDate" text,
  amount numeric default 0,
  "receiptLink" text,
  status text
);

-- 20. Create Vehicle Insurance Table
create table vehicle_insurance (
  id text primary key,
  "vehicleId" text references vehicles(id) on delete cascade,
  insurer text,
  "policyNumber" text,
  "startDate" text,
  "expiryDate" text,
  premium numeric default 0,
  "ncdPercentage" numeric default 0,
  "coverageType" text,
  "policyDocumentLink" text,
  status text
);

-- 21. Create Financial Transactions Table
create table financial_transactions (
  id text primary key,
  date text,
  type text,
  category text,
  amount numeric default 0,
  "referenceId" text,
  notes text
);

-- 22. Create Documents Table
create table documents (
  id text primary key,
  name text not null,
  type text,
  description text,
  link text,
  association text,
  "createdDate" text
);

-- 23. Create Activity Log Table
create table activity_log (
  id text primary key,
  date text,
  "user" text,
  action text,
  details text
);

-- 24. Create Settings Table
create table settings (
  key text primary key,
  value text
);

-- ========================================================
-- Seed Initial Mock Data
-- ========================================================
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

insert into owners (id, name, company, phone, email) values
('con-1', 'Ahmad (Self)', 'MMS Assets Sdn Bhd', '012-3456789', 'ahmad@example.com'),
('con-2', 'Hajah Fatimah', 'Fatimah Holdings', '019-8765432', 'fatimah@example.com')
on conflict (id) do nothing;

insert into properties (id, name, address, type, "ownerId", status, "monthlyRent", "depositCollected", "startDate", notes) values
('prop-1', 'Kondominium Heights, Block A-12-03', 'Jalan Kiara, Mont Kiara, 50480 Kuala Lumpur', 'Condominium', 'con-1', 'Rented', 2200, 4400, '2025-01-01', 'Key in mailbox. Maintenance contact: En. Rosli'),
('prop-2', 'Taman Melati Double Storey', 'No. 45, Jalan Melati 3, Taman Melati, 53100 Kuala Lumpur', 'Terrace House', 'con-2', 'Rented', 1800, 3600, '2025-03-15', 'Paddy fields rental nearby. Check boundary markings annually.')
on conflict (id) do nothing;

insert into tenants (id, "propertyId", name, "icPassport", phone, "emergencyContact", "startDate", "endDate", status) values
('ten-1', 'prop-1', 'Sarah Lee', '980512-14-5562', '013-1112222', 'Mr. Lee (Father) - 013-9998888', '2025-01-01', '2026-01-01', 'Active'),
('ten-2', 'prop-2', 'Muhammad Haziq', '941120-10-5321', '017-3334444', 'Aminah (Wife) - 017-6667777', '2025-03-15', '2026-03-15', 'Active')
on conflict (id) do nothing;

insert into rental_agreements (id, "propertyId", "tenantId", "startDate", "endDate", "monthlyRent", "depositAmount", "dueDateDay", status, "documentLink") values
('ra-1', 'prop-1', 'ten-1', '2025-01-01', '2026-01-01', 2200, 4400, 5, 'Active', 'https://drive.google.com/file/d/agreement1'),
('ra-2', 'prop-2', 'ten-2', '2025-03-15', '2026-03-15', 1800, 3600, 5, 'Active', 'https://drive.google.com/file/d/agreement2')
on conflict (id) do nothing;

insert into vehicles (id, "registrationNumber", "makeModel", year, owner, "purchaseDate", "currentMileage", status, notes) values
('veh-1', 'VBF 8321', 'Proton X70 1.8 TGDi', 2021, 'Ahmad (Self)', '2021-08-15', 52300, 'Active', 'Primary daily driver.'),
('veh-2', 'WYY 4482', 'Perodua Myvi 1.5 AV', 2018, 'Ahmad (Self)', '2018-05-10', 92400, 'Active', 'Secondary runabout.')
on conflict (id) do nothing;

insert into settings (key, value) values
('currency', 'RM'),
('theme', 'dark')
on conflict (key) do update set value = excluded.value;

-- ========================================================
-- Disable Row Level Security (RLS) on all tables to prevent 401/403 authorization blocks
-- ========================================================
alter table contacts disable row level security;
alter table owners disable row level security;
alter table properties disable row level security;
alter table tenants disable row level security;
alter table rental_agreements disable row level security;
alter table rent_payments disable row level security;
alter table property_loans disable row level security;
alter table utilities disable row level security;
alter table utility_bills disable row level security;
alter table contractors disable row level security;
alter table maintenance disable row level security;
alter table borrowers disable row level security;
alter table personal_loans disable row level security;
alter table loan_payments disable row level security;
alter table vehicles disable row level security;
alter table vehicle_loans disable row level security;
alter table vehicle_services disable row level security;
alter table vehicle_inspections disable row level security;
alter table vehicle_road_tax disable row level security;
alter table vehicle_insurance disable row level security;
alter table financial_transactions disable row level security;
alter table documents disable row level security;
alter table activity_log disable row level security;
alter table settings disable row level security;

-- ========================================================
-- Enable Supabase Realtime Replication
-- ========================================================
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for all tables;
commit;
`;
