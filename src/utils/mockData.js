export const INITIAL_MOCK_DATA = {
  settings: {
    currency: "RM",
    theme: "dark",
    serviceTypes: [
      "Engine Oil & Filter",
      "Air & Cabin Filter",
      "Brake Pads & Discs",
      "Battery Replacement",
      "Tyres & Alignment",
      "Aircond Service",
      "Transmission Fluid",
      "Spark Plugs"
    ],
    utilityTypes: [
      "TNB (Electricity)",
      "Air (Water)",
      "Internet/Broadband",
      "Indah Water (Sewerage)",
      "JMB/MC Maintenance Fee",
      "Cukai Pintu (Assessment Tax)",
      "Cukai Tanah (Quit Rent)"
    ],
    documentTypes: [
      "Rental Agreement",
      "Tenant Identity (IC/Passport)",
      "Utility Bill",
      "Payment Receipt",
      "Loan Agreement",
      "Insurance Policy",
      "Road Tax Disc",
      "Service Receipt",
      "Inspection Certificate"
    ]
  },
  contacts: [
    { id: "con-1", name: "Ahmad (Self)", email: "ahmad@example.com", phone: "012-3456789", role: "Owner" },
    { id: "con-2", name: "Hajah Fatimah", email: "fatimah@example.com", phone: "019-8765432", role: "Owner" },
    { id: "con-3", name: "Sarah Lee", email: "sarah.l@example.com", phone: "013-1112222", role: "Tenant" },
    { id: "con-4", name: "Muhammad Haziq", email: "haziq.m@example.com", phone: "017-3334444", role: "Tenant" },
    { id: "con-5", name: "Ali Bin Abu", email: "ali.abu@example.com", phone: "016-5556666", role: "Borrower" },
    { id: "con-6", name: "Tan Plumber Services", email: "tanplumbing@example.com", phone: "011-2223344", role: "Contractor" },
    { id: "con-7", name: "Raju Roof Repair", email: "rajuroofing@example.com", phone: "018-4445555", role: "Contractor" },
    { id: "con-8", name: "Proton Glenmarie Workshop", email: "glenmarie@proton.com", phone: "03-55667788", role: "Workshop" }
  ],
  properties: [
    {
      id: "prop-1",
      name: "Kondominium Heights, Block A-12-03",
      address: "Jalan Kiara, Mont Kiara, 50480 Kuala Lumpur",
      type: "Condominium",
      ownerId: "con-1", // Self
      status: "Rented",
      monthlyRent: 2200,
      depositCollected: 4400,
      startDate: "2025-01-01"
    },
    {
      id: "prop-2",
      name: "Taman Melati Double Storey",
      address: "No. 45, Jalan Melati 3, Taman Melati, 53100 Kuala Lumpur",
      type: "Terrace House",
      ownerId: "con-2", // Hajah Fatimah (Managed client property)
      status: "Rented",
      monthlyRent: 1800,
      depositCollected: 3600,
      startDate: "2025-03-15"
    }
  ],
  tenants: [
    {
      id: "ten-1",
      propertyId: "prop-1",
      name: "Sarah Lee",
      icPassport: "980512-14-5562",
      phone: "013-1112222",
      emergencyContact: "Mr. Lee (Father) - 013-9998888",
      startDate: "2025-01-01",
      endDate: "2026-01-01",
      status: "Active"
    },
    {
      id: "ten-2",
      propertyId: "prop-2",
      name: "Muhammad Haziq",
      icPassport: "941120-10-5321",
      phone: "017-3334444",
      emergencyContact: "Aminah (Wife) - 017-6667777",
      startDate: "2025-03-15",
      endDate: "2026-03-15",
      status: "Active"
    }
  ],
  rentalAgreements: [
    {
      id: "ra-1",
      propertyId: "prop-1",
      tenantId: "ten-1",
      startDate: "2025-01-01",
      endDate: "2026-01-01",
      monthlyRent: 2200,
      depositAmount: 4400,
      dueDateDay: 5,
      status: "Active",
      documentLink: "https://drive.google.com/file/d/ra-1-copy"
    },
    {
      id: "ra-2",
      propertyId: "prop-2",
      tenantId: "ten-2",
      startDate: "2025-03-15",
      endDate: "2026-03-15",
      monthlyRent: 1800,
      depositAmount: 3600,
      dueDateDay: 15,
      status: "Active",
      documentLink: "https://drive.google.com/file/d/ra-2-copy"
    }
  ],
  rentPayments: [
    { id: "rp-1", propertyId: "prop-1", date: "2026-07-04", billingMonth: "July 2026", amount: 2200, method: "Bank Transfer", status: "Paid", receiptLink: "C:/Users/USER/Documents/receipts/rent_prop1_jul26.pdf" },
    { id: "rp-2", propertyId: "prop-1", date: "2026-06-03", billingMonth: "June 2026", amount: 2200, method: "Bank Transfer", status: "Paid", receiptLink: "" },
    { id: "rp-3", propertyId: "prop-2", date: "2026-07-14", billingMonth: "July 2026", amount: 1800, method: "Bank Transfer", status: "Paid", receiptLink: "" },
    { id: "rp-4", propertyId: "prop-1", date: "", billingMonth: "August 2026", amount: 2200, method: "", status: "Pending", dueBy: "2026-08-05" } // Due soon
  ],
  propertyLoans: [
    {
      id: "pl-1",
      propertyId: "prop-1",
      bank: "CIMB Bank",
      originalLoanAmount: 350000,
      startDate: "2024-10-01",
      tenureYears: 30,
      interestRate: 4.15,
      monthlyInstalment: 1450,
      dueDateDay: 1,
      outstandingBalance: 338500,
      status: "Active"
    }
  ],
  utilities: [
    { id: "ut-1", propertyId: "prop-1", type: "TNB (Electricity)", accountNumber: "220192019312", responsibleParty: "Tenant" },
    { id: "ut-2", propertyId: "prop-1", type: "Air (Water)", accountNumber: "99182013", responsibleParty: "Tenant" },
    { id: "ut-3", propertyId: "prop-1", type: "JMB/MC Maintenance Fee", accountNumber: "MC-BLK-A-12-03", responsibleParty: "Owner" },
    { id: "ut-4", propertyId: "prop-2", type: "TNB (Electricity)", accountNumber: "110292819388", responsibleParty: "Tenant" }
  ],
  utilityBills: [
    { id: "ub-1", utilityId: "ut-1", billingMonth: "June 2026", dueDate: "2026-06-25", amount: 185.40, paidDate: "2026-06-24", paidAmount: 185.40, method: "Online Banking", receiptLink: "", status: "Paid" },
    { id: "ub-2", utilityId: "ut-1", billingMonth: "July 2026", dueDate: "2026-07-25", amount: 194.20, paidDate: "2026-07-24", paidAmount: 194.20, method: "Online Banking", receiptLink: "", status: "Paid" },
    { id: "ub-3", utilityId: "ut-3", billingMonth: "July 2026", dueDate: "2026-07-07", amount: 320.00, paidDate: "2026-07-05", paidAmount: 320.00, method: "Auto-debit", receiptLink: "", status: "Paid" },
    { id: "ub-4", utilityId: "ut-4", billingMonth: "July 2026", dueDate: "2026-08-03", amount: 145.80, paidDate: "", paidAmount: 0, method: "", receiptLink: "", status: "Pending" } // Due in 3 days!
  ],
  maintenance: [
    {
      id: "maint-1",
      propertyId: "prop-1",
      issue: "Leaking master bedroom toilet pipe",
      reportedDate: "2026-06-10",
      category: "Plumbing",
      contractorId: "con-6", // Tan Plumber
      quotedCost: 150.00,
      actualCost: 150.00,
      status: "Completed",
      completedDate: "2026-06-11",
      notes: "Pipe joint replaced. Issue resolved.",
      receiptLink: ""
    },
    {
      id: "maint-2",
      propertyId: "prop-2",
      issue: "Roof damage / water marks on ceiling",
      reportedDate: "2026-07-28",
      category: "Roofing",
      contractorId: "con-7", // Raju Roof Repair
      quotedCost: 850.00,
      actualCost: 0,
      status: "Quoted",
      completedDate: "",
      notes: "Quotation received. Waiting for property owner Hajah Fatimah's approval.",
      receiptLink: ""
    }
  ],
  borrowers: [
    { id: "bor-1", name: "Ali Bin Abu", phone: "016-5556666", address: "Kampung Baru, KL", notes: "Colleague at office" }
  ],
  personalLoans: [
    {
      id: "pln-1",
      borrowerId: "bor-1",
      amountLent: 3000.00,
      startDate: "2026-01-05",
      monthlyInstalment: 250.00,
      dueDateDay: 5,
      notes: "Interest-free loan. Payback duration 12 months.",
      status: "Active"
    }
  ],
  loanPayments: [
    { id: "lp-1", loanId: "pln-1", date: "2026-02-04", amount: 250.00, method: "Bank Transfer", notes: "Feb instalment", receiptLink: "" },
    { id: "lp-2", loanId: "pln-1", date: "2026-03-05", amount: 250.00, method: "Bank Transfer", notes: "Mar instalment", receiptLink: "" },
    { id: "lp-3", loanId: "pln-1", date: "2026-04-05", amount: 250.00, method: "Bank Transfer", notes: "Apr instalment", receiptLink: "" },
    { id: "lp-4", loanId: "pln-1", date: "2026-05-04", amount: 250.00, method: "Bank Transfer", notes: "May instalment", receiptLink: "" },
    { id: "lp-5", loanId: "pln-1", date: "2026-06-05", amount: 250.00, method: "Bank Transfer", notes: "Jun instalment", receiptLink: "" },
    { id: "lp-6", loanId: "pln-1", date: "2026-07-06", amount: 250.00, method: "Bank Transfer", notes: "Jul instalment", receiptLink: "" }
  ],
  vehicles: [
    {
      id: "veh-1",
      registrationNumber: "V-1234",
      makeModel: "Proton X50 1.5 TGDi Flagship",
      year: 2023,
      owner: "Ahmad (Self)",
      purchaseDate: "2023-08-10",
      currentMileage: 38240,
      status: "Active",
      notes: "Primary daily driver."
    }
  ],
  vehicleLoans: [
    {
      id: "vl-1",
      vehicleId: "veh-1",
      bank: "Maybank Islamic",
      originalLoanAmount: 65000,
      startDate: "2023-08-15",
      tenureYears: 7,
      interestRate: 2.85,
      monthlyInstalment: 880,
      dueDateDay: 15,
      outstandingBalance: 37840,
      status: "Active"
    }
  ],
  vehicleServices: [
    {
      id: "vs-1",
      vehicleId: "veh-1",
      date: "2026-01-20",
      mileage: 30120,
      serviceType: "Engine Oil & Filter",
      workshopId: "con-8",
      cost: 320.00,
      items: "Fully synthetic Shell Helix, oil filter, wash washer fluid",
      receiptLink: "C:/Users/USER/Documents/receipts/service_x50_30k.pdf",
      notes: "No issues reported. Next service at 40,000 km or July 2026.",
      nextServiceDate: "2026-07-20",
      nextServiceMileage: 40120
    }
  ],
  vehicleInspections: [
    {
      id: "vi-1",
      vehicleId: "veh-1",
      inspectionType: "Routine Inspection",
      date: "2025-08-01",
      nextDueDate: "2026-08-01", // Due tomorrow!
      location: "Wangsa Maju Inspection Center",
      cost: 55.00,
      result: "Pass",
      documentLink: "",
      notes: "Inspection pass. Ready for road tax renewal."
    }
  ],
  vehicleRoadTax: [
    {
      id: "vrt-1",
      vehicleId: "veh-1",
      expiryDate: "2026-08-15", // Expirying soon
      renewalDate: "2025-08-14",
      amount: 90.00,
      receiptLink: "",
      status: "Active"
    }
  ],
  vehicleInsurance: [
    {
      id: "vins-1",
      vehicleId: "veh-1",
      insurer: "Etiqa Takaful",
      policyNumber: "PT-X50-01239841",
      startDate: "2025-08-15",
      expiryDate: "2026-08-15", // Expiring soon
      premium: 1450.00,
      ncdPercentage: 25,
      coverageType: "Comprehensive",
      policyDocumentLink: "",
      status: "Active"
    }
  ],
  financialTransactions: [
    // Income
    { id: "tx-1", date: "2026-07-04", type: "Income", category: "Rent", amount: 2200.00, referenceId: "rp-1", notes: "Rental Prop 1 (Sarah Lee)" },
    { id: "tx-2", date: "2026-07-06", type: "Income", category: "Personal loan repayment", amount: 250.00, referenceId: "lp-6", notes: "Ali Abu repayment" },
    { id: "tx-3", date: "2026-07-14", type: "Income", category: "Rent", amount: 1800.00, referenceId: "rp-3", notes: "Rental Prop 2 (Haziq)" },
    // Expense
    { id: "tx-4", date: "2026-07-01", type: "Expense", category: "Property loan", amount: 1450.00, referenceId: "pl-1", notes: "CIMB loan payment block A-12-03" },
    { id: "tx-5", date: "2026-07-05", type: "Expense", category: "Utilities", amount: 320.00, referenceId: "ub-3", notes: "MC maintenance block A-12-03" },
    { id: "tx-6", date: "2026-07-15", type: "Expense", category: "Vehicle loan", amount: 880.00, referenceId: "vl-1", notes: "Maybank Proton X50 loan" },
    { id: "tx-7", date: "2026-07-24", type: "Expense", category: "Utilities", amount: 194.20, referenceId: "ub-2", notes: "TNB Prop 1 bill" }
  ],
  documents: [
    { id: "doc-1", name: "Tenancy Agreement - Block A-12-03", type: "Rental Agreement", category: "Properties", linkedToId: "prop-1", link: "https://drive.google.com/file/d/agreement_prop1", uploadDate: "2025-01-01", expiryDate: "2026-01-01" },
    { id: "doc-2", name: "Sarah Lee MyKad Copy", type: "Tenant Identity (IC/Passport)", category: "Properties", linkedToId: "prop-1", link: "C:/Users/USER/Documents/documents/sarah_lee_ic.pdf", uploadDate: "2025-01-01", expiryDate: "" },
    { id: "doc-3", name: "Proton X50 JPJ Grant", type: "Registration Document", category: "Vehicles", linkedToId: "veh-1", link: "C:/Users/USER/Documents/documents/x50_grant.pdf", uploadDate: "2023-08-11", expiryDate: "" },
    { id: "doc-4", name: "Etiqa Takaful Policy Cover Note", type: "Insurance Policy", category: "Vehicles", linkedToId: "veh-1", link: "C:/Users/USER/Documents/documents/x50_insurance_25_26.pdf", uploadDate: "2025-08-14", expiryDate: "2026-08-15" }
  ]
};
