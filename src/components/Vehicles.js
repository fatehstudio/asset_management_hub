import { html, useState, useEffect } from '../utils/htm.js';
import { getItems, saveItem, deleteItem, getDb } from '../utils/storage.js';
import { PlusIcon, EditIcon, TrashIcon, ArrowBackIcon, ExternalLinkIcon, ClockIcon } from './Icons.js';

export default function Vehicles({ selectedVehicleId, setSelectedVehicleId, navigateToTab }) {
  const [vehicles, setVehicles] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [services, setServices] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [roadTaxes, setRoadTaxes] = useState([]);
  const [insurances, setInsurances] = useState([]);
  const [loans, setLoans] = useState([]);
  
  // UI states
  const [view, setView] = useState('list'); // 'list', 'detail', 'form-vehicle', 'form-service', 'form-inspection', 'form-roadtax', 'form-insurance'
  const [search, setSearch] = useState('');
  const [activeVehicle, setActiveVehicle] = useState(null);
  
  // Forms states
  const [vehForm, setVehForm] = useState({ id: '', registrationNumber: '', makeModel: '', year: 2024, owner: 'Ahmad (Self)', purchaseDate: '', currentMileage: 0, status: 'Active', notes: '' });
  
  const [serviceForm, setServiceForm] = useState({ id: '', vehicleId: '', date: new Date().toISOString().slice(0,10), mileage: 0, serviceType: 'Engine Oil & Filter', workshopId: '', cost: 0, items: '', receiptLink: '', notes: '', nextServiceDate: '', nextServiceMileage: 0 });
  
  const [inspectForm, setInspectForm] = useState({ id: '', vehicleId: '', inspectionType: 'Routine Inspection', date: new Date().toISOString().slice(0,10), nextDueDate: '', location: '', cost: 55, result: 'Pass', documentLink: '', notes: '' });
  
  const [roadTaxForm, setRoadTaxForm] = useState({ id: '', vehicleId: '', expiryDate: '', renewalDate: new Date().toISOString().slice(0,10), amount: 90, receiptLink: '', status: 'Active' });
  
  const [insuranceForm, setInsuranceForm] = useState({ id: '', vehicleId: '', insurer: 'Etiqa Takaful', policyNumber: '', startDate: '', expiryDate: '', premium: 1000, ncdPercentage: 25, coverageType: 'Comprehensive', policyDocumentLink: '', status: 'Active' });

  useEffect(() => {
    loadData();
    window.addEventListener('mms_db_changed', loadData);
    return () => window.removeEventListener('mms_db_changed', loadData);
  }, []);

  useEffect(() => {
    if (selectedVehicleId) {
      const db = getDb();
      const veh = (db.vehicles || []).find(v => v.id === selectedVehicleId);
      if (veh) {
        setActiveVehicle(veh);
        setView('detail');
      }
    }
  }, [selectedVehicleId, vehicles]);

  const loadData = () => {
    const db = getDb();
    setVehicles(db.vehicles || []);
    setContacts(db.contacts || []);
    setServices(db.vehicleServices || []);
    setInspections(db.vehicleInspections || []);
    setRoadTaxes(db.vehicleRoadTax || []);
    setInsurances(db.vehicleInsurance || []);
    setLoans(db.vehicleLoans || []);
  };

  const handleBack = () => {
    setSelectedVehicleId(null);
    setActiveVehicle(null);
    setView('list');
  };

  const handleOpenFormVehicle = (veh = null) => {
    if (veh) {
      setVehForm({ ...veh });
    } else {
      setVehForm({ id: '', registrationNumber: '', makeModel: '', year: 2025, owner: 'Ahmad (Self)', purchaseDate: '', currentMileage: 0, status: 'Active', notes: '' });
    }
    setView('form-vehicle');
  };

  const handleSaveVehicle = (e) => {
    e.preventDefault();
    const saved = saveItem('vehicles', {
      ...vehForm,
      year: Number(vehForm.year),
      currentMileage: Number(vehForm.currentMileage)
    });
    
    if (activeVehicle && activeVehicle.id === saved.id) {
      setActiveVehicle(saved);
      setView('detail');
    } else {
      setView('list');
    }
  };

  const handleDeleteVehicle = (id) => {
    if (confirm('Are you sure you want to delete this vehicle and all associated records?')) {
      deleteItem('vehicles', id);
      handleBack();
    }
  };

  // SERVICE
  const handleOpenFormService = (vehId, service = null) => {
    if (service) {
      setServiceForm({ ...service });
    } else {
      const v = vehicles.find(x => x.id === vehId);
      const currMil = v ? Number(v.currentMileage) : 0;
      setServiceForm({
        id: '',
        vehicleId: vehId,
        date: new Date().toISOString().slice(0, 10),
        mileage: currMil,
        serviceType: 'Engine Oil & Filter',
        workshopId: contacts.find(c => c.role === 'Workshop')?.id || '',
        cost: 0,
        items: '',
        receiptLink: '',
        notes: '',
        nextServiceDate: '',
        nextServiceMileage: currMil + 10000
      });
    }
    setView('form-service');
  };

  const handleSaveService = (e) => {
    e.preventDefault();
    const serviceRecord = {
      ...serviceForm,
      mileage: Number(serviceForm.mileage),
      cost: Number(serviceForm.cost),
      nextServiceMileage: Number(serviceForm.nextServiceMileage)
    };
    
    const saved = saveItem('vehicleServices', serviceRecord);

    // Update vehicle's current mileage if this service is higher
    const db = getDb();
    const veh = (db.vehicles || []).find(v => v.id === serviceForm.vehicleId);
    if (veh && Number(serviceRecord.mileage) > Number(veh.currentMileage)) {
      veh.currentMileage = serviceRecord.mileage;
      saveItem('vehicles', veh);
    }

    // Log in ledger
    saveItem('financialTransactions', {
      date: saved.date,
      type: 'Expense',
      category: 'Service',
      amount: saved.cost,
      referenceId: saved.id,
      notes: `Vehicle Service: ${veh ? veh.registrationNumber : 'Car'} - ${saved.serviceType}`
    });

    setView('detail');
  };

  // INSPECTION
  const handleOpenFormInspection = (vehId, inspect = null) => {
    if (inspect) {
      setInspectForm({ ...inspect });
    } else {
      setInspectForm({
        id: '',
        vehicleId: vehId,
        inspectionType: 'Routine Inspection',
        date: new Date().toISOString().slice(0, 10),
        nextDueDate: '',
        location: '',
        cost: 55,
        result: 'Pass',
        documentLink: '',
        notes: ''
      });
    }
    setView('form-inspection');
  };

  const handleSaveInspection = (e) => {
    e.preventDefault();
    const saved = saveItem('vehicleInspections', {
      ...inspectForm,
      cost: Number(inspectForm.cost)
    });
    
    // Log expense
    const veh = vehicles.find(v => v.id === inspectForm.vehicleId);
    saveItem('financialTransactions', {
      date: saved.date,
      type: 'Expense',
      category: 'Other expenses',
      amount: saved.cost,
      referenceId: saved.id,
      notes: `Vehicle Inspection: ${veh ? veh.registrationNumber : 'Car'}`
    });
    
    setView('detail');
  };

  // ROAD TAX
  const handleOpenFormRoadTax = (vehId, rt = null) => {
    if (rt) {
      setRoadTaxForm({ ...rt });
    } else {
      setRoadTaxForm({
        id: '',
        vehicleId: vehId,
        expiryDate: '',
        renewalDate: new Date().toISOString().slice(0,10),
        amount: 90,
        receiptLink: '',
        status: 'Active'
      });
    }
    setView('form-roadtax');
  };

  const handleSaveRoadTax = (e) => {
    e.preventDefault();
    const saved = saveItem('vehicleRoadTax', {
      ...roadTaxForm,
      amount: Number(roadTaxForm.amount)
    });

    const veh = vehicles.find(v => v.id === roadTaxForm.vehicleId);
    saveItem('financialTransactions', {
      date: saved.renewalDate,
      type: 'Expense',
      category: 'Road tax',
      amount: saved.amount,
      referenceId: saved.id,
      notes: `Road Tax Renewal: ${veh ? veh.registrationNumber : 'Car'}`
    });

    setView('detail');
  };

  // INSURANCE
  const handleOpenFormInsurance = (vehId, ins = null) => {
    if (ins) {
      setInsuranceForm({ ...ins });
    } else {
      setInsuranceForm({
        id: '',
        vehicleId: vehId,
        insurer: 'Etiqa Takaful',
        policyNumber: '',
        startDate: '',
        expiryDate: '',
        premium: 1000,
        ncdPercentage: 25,
        coverageType: 'Comprehensive',
        policyDocumentLink: '',
        status: 'Active'
      });
    }
    setView('form-insurance');
  };

  const handleSaveInsurance = (e) => {
    e.preventDefault();
    const saved = saveItem('vehicleInsurance', {
      ...insuranceForm,
      premium: Number(insuranceForm.premium),
      ncdPercentage: Number(insuranceForm.ncdPercentage)
    });

    const veh = vehicles.find(v => v.id === insuranceForm.vehicleId);
    saveItem('financialTransactions', {
      date: saved.startDate,
      type: 'Expense',
      category: 'Insurance',
      amount: saved.premium,
      referenceId: saved.id,
      notes: `Car Insurance: ${veh ? veh.registrationNumber : 'Car'} (${saved.insurer})`
    });

    setView('detail');
  };

  const getWorkshopName = (id) => {
    return contacts.find(c => c.id === id)?.name || "Unknown Workshop";
  };

  const currency = getDb().settings?.currency || "RM";

  const filteredVehicles = vehicles.filter(v => 
    v.registrationNumber.toLowerCase().includes(search.toLowerCase()) || 
    v.makeModel.toLowerCase().includes(search.toLowerCase())
  );

  if (view === 'form-vehicle') {
    return html`
      <div class="card" style="max-width: 600px; margin: 0 auto;">
        <div class="modal-header">
          <h2>${vehForm.id ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
          <button class="modal-close" onClick=${() => setView(activeVehicle ? 'detail' : 'list')}><${ArrowBackIcon} /></button>
        </div>
        <form onSubmit=${handleSaveVehicle}>
          <div class="form-group">
            <label>Registration Number (Plate Number)</label>
            <input type="text" class="form-control" placeholder="e.g. V-1234" value=${vehForm.registrationNumber} onInput=${e => setVehForm({ ...vehForm, registrationNumber: e.target.value })} required />
          </div>
          <div class="form-group">
            <label>Make & Model</label>
            <input type="text" class="form-control" placeholder="e.g. Proton X50 1.5 TGDi" value=${vehForm.makeModel} onInput=${e => setVehForm({ ...vehForm, makeModel: e.target.value })} required />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Year Manufactured</label>
              <input type="number" class="form-control" value=${vehForm.year} onInput=${e => setVehForm({ ...vehForm, year: e.target.value })} required />
            </div>
            <div class="form-group">
              <label>Current Mileage (km)</label>
              <input type="number" class="form-control" value=${vehForm.currentMileage} onInput=${e => setVehForm({ ...vehForm, currentMileage: e.target.value })} required />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Owner Name</label>
              <input type="text" class="form-control" value=${vehForm.owner} onInput=${e => setVehForm({ ...vehForm, owner: e.target.value })} required />
            </div>
            <div class="form-group">
              <label>Purchase Date</label>
              <input type="date" class="form-control" value=${vehForm.purchaseDate} onInput=${e => setVehForm({ ...vehForm, purchaseDate: e.target.value })} />
            </div>
          </div>
          <div class="form-group">
            <label>Notes</label>
            <textarea class="form-control" rows="2" value=${vehForm.notes} onInput=${e => setVehForm({ ...vehForm, notes: e.target.value })}></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onClick=${() => setView(activeVehicle ? 'detail' : 'list')}>Cancel</button>
            <button type="submit" class="btn btn-primary">Save Vehicle</button>
          </div>
        </form>
      </div>
    `;
  }

  if (view === 'form-service') {
    const serviceTypes = getDb().settings?.serviceTypes || [];
    return html`
      <div class="card" style="max-width: 600px; margin: 0 auto;">
        <div class="modal-header">
          <h2>Log Service & Maintenance</h2>
          <button class="modal-close" onClick=${() => setView('detail')}><${ArrowBackIcon} /></button>
        </div>
        <form onSubmit=${handleSaveService}>
          <div class="form-row">
            <div class="form-group">
              <label>Service Date</label>
              <input type="date" class="form-control" value=${serviceForm.date} onInput=${e => setServiceForm({ ...serviceForm, date: e.target.value })} required />
            </div>
            <div class="form-group">
              <label>Service Mileage (km)</label>
              <input type="number" class="form-control" value=${serviceForm.mileage} onInput=${e => setServiceForm({ ...serviceForm, mileage: e.target.value })} required />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Service Category</label>
              <select class="form-control" value=${serviceForm.serviceType} onChange=${e => setServiceForm({ ...serviceForm, serviceType: e.target.value })}>
                ${serviceTypes.map(t => html`<option key=${t} value=${t}>${t}</option>`)}
                <option value="Other Repair">Other Repair / Part Swap</option>
              </select>
            </div>
            <div class="form-group">
              <label>Workshop / Service Center</label>
              <select class="form-control" value=${serviceForm.workshopId} onChange=${e => setServiceForm({ ...serviceForm, workshopId: e.target.value })}>
                <option value="">Select Workshop...</option>
                ${contacts.filter(c => c.role === 'Workshop').map(c => html`
                  <option key=${c.id} value=${c.id}>${c.name}</option>
                `)}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Cost (${currency})</label>
            <input type="number" step="0.01" class="form-control" value=${serviceForm.cost} onInput=${e => setServiceForm({ ...serviceForm, cost: e.target.value })} required />
          </div>
          <div class="form-group">
            <label>Service Details / Items Changed</label>
            <textarea class="form-control" rows="2" placeholder="e.g., Oil brand, brake pad model, tyre size..." value=${serviceForm.items} onInput=${e => setServiceForm({ ...serviceForm, items: e.target.value })}></textarea>
          </div>
          <div class="form-row" style="background: rgba(var(--accent-light), 0.1); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 16px;">
            <div class="form-group" style="margin-bottom:0;">
              <label>Next Service Date</label>
              <input type="date" class="form-control" value=${serviceForm.nextServiceDate} onInput=${e => setServiceForm({ ...serviceForm, nextServiceDate: e.target.value })} />
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label>Next Service Mileage (km)</label>
              <input type="number" class="form-control" value=${serviceForm.nextServiceMileage} onInput=${e => setServiceForm({ ...serviceForm, nextServiceMileage: e.target.value })} />
            </div>
          </div>
          <div class="form-group">
            <label>Receipt File Link (URL or local path)</label>
            <input type="text" class="form-control" placeholder="C:/receipts/..." value=${serviceForm.receiptLink} onInput=${e => setServiceForm({ ...serviceForm, receiptLink: e.target.value })} />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onClick=${() => setView('detail')}>Cancel</button>
            <button type="submit" class="btn btn-primary">Save Service Log</button>
          </div>
        </form>
      </div>
    `;
  }

  if (view === 'form-inspection') {
    return html`
      <div class="card" style="max-width: 600px; margin: 0 auto;">
        <div class="modal-header">
          <h2>Log Vehicle Inspection</h2>
          <button class="modal-close" onClick=${() => setView('detail')}><${ArrowBackIcon} /></button>
        </div>
        <form onSubmit=${handleSaveInspection}>
          <div class="form-group">
            <label>Inspection Type</label>
            <select class="form-control" value=${inspectForm.inspectionType} onChange=${e => setInspectForm({ ...inspectForm, inspectionType: e.target.value })}>
              <option value="Routine Inspection">Routine (Periodic) Inspection</option>
              <option value="Transfer Ownership Inspection">Transfer Ownership Inspection</option>
              <option value="Hire Purchase Inspection">Hire Purchase (B7) Inspection</option>
              <option value="JPJ / Official Inspection">JPJ / Official Inspection</option>
              <option value="Other Inspection">Other Inspection</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Inspection Date</label>
              <input type="date" class="form-control" value=${inspectForm.date} onInput=${e => setInspectForm({ ...inspectForm, date: e.target.value })} required />
            </div>
            <div class="form-group">
              <label>Next Due / Expiry Date</label>
              <input type="date" class="form-control" value=${inspectForm.nextDueDate} onInput=${e => setInspectForm({ ...inspectForm, nextDueDate: e.target.value })} required />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Inspection Location</label>
              <input type="text" class="form-control" placeholder="e.g. Wangsa Maju" value=${inspectForm.location} onInput=${e => setInspectForm({ ...inspectForm, location: e.target.value })} />
            </div>
            <div class="form-group">
              <label>Cost (${currency})</label>
              <input type="number" class="form-control" value=${inspectForm.cost} onInput=${e => setInspectForm({ ...inspectForm, cost: e.target.value })} />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Inspection Result</label>
              <select class="form-control" value=${inspectForm.result} onChange=${e => setInspectForm({ ...inspectForm, result: e.target.value })}>
                <option value="Pass">Pass</option>
                <option value="Fail">Fail</option>
              </select>
            </div>
            <div class="form-group">
              <label>Document Link (Certificate PDF)</label>
              <input type="text" class="form-control" placeholder="C:/docs/..." value=${inspectForm.documentLink} onInput=${e => setInspectForm({ ...inspectForm, documentLink: e.target.value })} />
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onClick=${() => setView('detail')}>Cancel</button>
            <button type="submit" class="btn btn-primary">Save Inspection</button>
          </div>
        </form>
      </div>
    `;
  }

  if (view === 'form-roadtax') {
    return html`
      <div class="card" style="max-width: 600px; margin: 0 auto;">
        <div class="modal-header">
          <h2>Renew Road Tax</h2>
          <button class="modal-close" onClick=${() => setView('detail')}><${ArrowBackIcon} /></button>
        </div>
        <form onSubmit=${handleSaveRoadTax}>
          <div class="form-row">
            <div class="form-group">
              <label>Renewal Date</label>
              <input type="date" class="form-control" value=${roadTaxForm.renewalDate} onInput=${e => setRoadTaxForm({ ...roadTaxForm, renewalDate: e.target.value })} required />
            </div>
            <div class="form-group">
              <label>New Expiry Date</label>
              <input type="date" class="form-control" value=${roadTaxForm.expiryDate} onInput=${e => setRoadTaxForm({ ...roadTaxForm, expiryDate: e.target.value })} required />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Amount Paid (${currency})</label>
              <input type="number" class="form-control" value=${roadTaxForm.amount} onInput=${e => setRoadTaxForm({ ...roadTaxForm, amount: e.target.value })} required />
            </div>
            <div class="form-group">
              <label>Receipt Link</label>
              <input type="text" class="form-control" placeholder="C:/docs/..." value=${roadTaxForm.receiptLink} onInput=${e => setRoadTaxForm({ ...roadTaxForm, receiptLink: e.target.value })} />
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onClick=${() => setView('detail')}>Cancel</button>
            <button type="submit" class="btn btn-primary">Save Road Tax</button>
          </div>
        </form>
      </div>
    `;
  }

  if (view === 'form-insurance') {
    return html`
      <div class="card" style="max-width: 600px; margin: 0 auto;">
        <div class="modal-header">
          <h2>Renew Motor Insurance Policy</h2>
          <button class="modal-close" onClick=${() => setView('detail')}><${ArrowBackIcon} /></button>
        </div>
        <form onSubmit=${handleSaveInsurance}>
          <div class="form-group">
            <label>Insurer / Takaful Company</label>
            <input type="text" class="form-control" placeholder="e.g. Etiqa Takaful, Allianz" value=${insuranceForm.insurer} onInput=${e => setInsuranceForm({ ...insuranceForm, insurer: e.target.value })} required />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Policy Number</label>
              <input type="text" class="form-control" placeholder="PT-..." value=${insuranceForm.policyNumber} onInput=${e => setInsuranceForm({ ...insuranceForm, policyNumber: e.target.value })} required />
            </div>
            <div class="form-group">
              <label>Coverage Type</label>
              <select class="form-control" value=${insuranceForm.coverageType} onChange=${e => setInsuranceForm({ ...insuranceForm, coverageType: e.target.value })}>
                <option value="Comprehensive">Comprehensive (First Party)</option>
                <option value="Third Party Fire & Theft">Third Party Fire & Theft</option>
                <option value="Third Party Only">Third Party Only</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Premium Paid (${currency})</label>
              <input type="number" class="form-control" value=${insuranceForm.premium} onInput=${e => setInsuranceForm({ ...insuranceForm, premium: e.target.value })} required />
            </div>
            <div class="form-group">
              <label>NCD Discount (%)</label>
              <input type="number" class="form-control" placeholder="e.g. 25" value=${insuranceForm.ncdPercentage} onInput=${e => setInsuranceForm({ ...insuranceForm, ncdPercentage: e.target.value })} />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Policy Start Date</label>
              <input type="date" class="form-control" value=${insuranceForm.startDate} onInput=${e => setInsuranceForm({ ...insuranceForm, startDate: e.target.value })} required />
            </div>
            <div class="form-group">
              <label>Policy Expiry Date</label>
              <input type="date" class="form-control" value=${insuranceForm.expiryDate} onInput=${e => setInsuranceForm({ ...insuranceForm, expiryDate: e.target.value })} required />
            </div>
          </div>
          <div class="form-group">
            <label>Cover Note Document Link</label>
            <input type="text" class="form-control" placeholder="C:/docs/..." value=${insuranceForm.policyDocumentLink} onInput=${e => setInsuranceForm({ ...insuranceForm, policyDocumentLink: e.target.value })} />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onClick=${() => setView('detail')}>Cancel</button>
            <button type="submit" class="btn btn-primary">Save Policy</button>
          </div>
        </form>
      </div>
    `;
  }

  if (view === 'detail' && activeVehicle) {
    const vehServices = services.filter(s => s.vehicleId === activeVehicle.id).sort((a,b) => new Date(b.date) - new Date(a.date));
    const vehInspects = inspections.filter(i => i.vehicleId === activeVehicle.id).sort((a,b) => new Date(b.date) - new Date(a.date));
    const activeRoadTax = roadTaxes.filter(r => r.vehicleId === activeVehicle.id).sort((a,b) => new Date(b.expiryDate) - new Date(a.expiryDate))[0];
    const activeIns = insurances.filter(i => i.vehicleId === activeVehicle.id).sort((a,b) => new Date(b.expiryDate) - new Date(a.expiryDate))[0];
    const vehLoan = loans.filter(l => l.vehicleId === activeVehicle.id).sort((a,b) => new Date(b.startDate) - new Date(a.startDate))[0];

    // Calculate service warnings
    const lastService = vehServices[0];
    let serviceWarning = false;
    let serviceWarningReason = "";
    if (lastService && lastService.nextServiceMileage) {
      const currentMilVal = Number(activeVehicle.currentMileage);
      const targetMilVal = Number(lastService.nextServiceMileage);
      if (currentMilVal >= targetMilVal - 500) {
        serviceWarning = true;
        serviceWarningReason = `Mileage Limit Approaching (${currentMilVal} km / ${targetMilVal} km)`;
      }
      
      if (lastService.nextServiceDate) {
        const today = new Date().toISOString().slice(0,10);
        if (lastService.nextServiceDate <= today) {
          serviceWarning = true;
          serviceWarningReason = serviceWarningReason ? `${serviceWarningReason} and Date Expired` : "Service Date Expired";
        }
      }
    }

    return html`
      <div>
        <div class="detail-header">
          <button class="btn btn-secondary" onClick=${handleBack}><${ArrowBackIcon} /> Back</button>
          <h2>${activeVehicle.makeModel} (${activeVehicle.registrationNumber})</h2>
          <span class="badge badge-success">${activeVehicle.status}</span>
          <div style="margin-left: auto; display: flex; gap: 8px;">
            <button class="btn btn-secondary btn-sm" onClick=${() => handleOpenFormVehicle(activeVehicle)}><${EditIcon} /> Edit</button>
            <button class="btn btn-danger btn-sm" onClick=${() => handleDeleteVehicle(activeVehicle.id)}><${TrashIcon} /> Delete</button>
          </div>
        </div>

        ${serviceWarning && html`
          <div class="reminder-item overdue" style="margin-bottom: 24px;">
            <div class="reminder-details">
              <div class="reminder-title" style="color: hsl(var(--color-danger));">⚠️ Service Required Immediately</div>
              <div class="reminder-subtitle">${serviceWarningReason}</div>
            </div>
            <button class="btn btn-danger btn-sm" onClick=${() => handleOpenFormService(activeVehicle.id)}>Record Service</button>
          </div>
        `}

        <div class="detail-grid">
          <div class="detail-cell">
            <div class="detail-cell-label">Current Mileage</div>
            <div class="detail-cell-value">${Number(activeVehicle.currentMileage).toLocaleString()} km</div>
          </div>
          <div class="detail-cell">
            <div class="detail-cell-label">Owner</div>
            <div class="detail-cell-value">${activeVehicle.owner}</div>
          </div>
          <div class="detail-cell">
            <div class="detail-cell-label">Purchase Date</div>
            <div class="detail-cell-value">${activeVehicle.purchaseDate || '-'}</div>
          </div>
          <div class="detail-cell">
            <div class="detail-cell-label">Year Manufactured</div>
            <div class="detail-cell-value">${activeVehicle.year}</div>
          </div>
        </div>

        <!-- 2 Column details -->
        <div class="content-grid-2">
          <!-- Left Pane - Services & Inspections -->
          <div style="display: flex; flex-direction: column; gap: 24px;">
            
            <!-- Service Logs -->
            <div class="card">
              <div class="card-title">
                <span>Service & Maintenance History</span>
                <button class="btn btn-primary btn-sm" onClick=${() => handleOpenFormService(activeVehicle.id)}><${PlusIcon} /> Log Service</button>
              </div>
              <div class="table-container">
                ${vehServices.length === 0 ? html`
                  <p style="color: var(--text-muted); text-align: center; padding: 20px;">No service logs recorded.</p>
                ` : html`
                  <table class="mms-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Mileage</th>
                        <th>Type</th>
                        <th>Workshop</th>
                        <th style="text-align: right;">Cost</th>
                        <th style="text-align: right;">Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${vehServices.map(s => html`
                        <tr key=${s.id}>
                          <td>${s.date}</td>
                          <td>${s.mileage.toLocaleString()} km</td>
                          <td>
                            <span style="font-weight:700;">${s.serviceType}</span>
                            <div style="font-size:0.75rem; color:var(--text-muted); margin-top: 2px;">Next: ${s.nextServiceMileage?.toLocaleString() || '-'} km</div>
                          </td>
                          <td>${getWorkshopName(s.workshopId)}</td>
                          <td style="text-align: right; font-weight: 700;">${currency} ${Number(s.cost).toFixed(2)}</td>
                          <td style="text-align: right;">
                            ${s.receiptLink ? html`
                              <a href="${s.receiptLink}" target="_blank" class="file-link" style="font-size:0.8rem;"><${ExternalLinkIcon} /></a>
                            ` : '-'}
                          </td>
                        </tr>
                      `)}
                    </tbody>
                  </table>
                `}
              </div>
            </div>

            <!-- Inspections -->
            <div class="card">
              <div class="card-title">
                <span>Vehicle Inspection Logs</span>
                <button class="btn btn-secondary btn-sm" onClick=${() => handleOpenFormInspection(activeVehicle.id)}><${PlusIcon} /> Record Inspection</button>
              </div>
              <div class="table-container">
                ${vehInspects.length === 0 ? html`
                  <p style="color: var(--text-muted); text-align: center; padding: 20px;">No inspection certificates saved.</p>
                ` : html`
                  <table class="mms-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Result</th>
                        <th>Next Due</th>
                        <th style="text-align: right;">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${vehInspects.map(i => html`
                        <tr key=${i.id}>
                          <td>${i.date}</td>
                          <td>
                            <div style="font-weight:600;">${i.inspectionType}</div>
                            <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">At: ${i.location || '-'}</div>
                          </td>
                          <td>
                            <span class="badge ${i.result === 'Pass' ? 'badge-success' : 'badge-danger'}">${i.result}</span>
                          </td>
                          <td style="font-weight:700;">${i.nextDueDate}</td>
                          <td style="text-align: right; font-weight:700;">${currency} ${Number(i.cost).toFixed(2)}</td>
                        </tr>
                      `)}
                    </tbody>
                  </table>
                `}
              </div>
            </div>
          </div>

          <!-- Right Sidebar Pane - Insurance, Roadtax, Loan -->
          <div style="display: flex; flex-direction: column; gap: 24px;">
            
            <!-- Insurance -->
            <div class="card">
              <div class="card-title">
                <span>Motor Insurance Policy</span>
                <button class="btn btn-secondary btn-sm" onClick=${() => handleOpenFormInsurance(activeVehicle.id)}><${EditIcon} /></button>
              </div>
              ${activeIns ? html`
                <div>
                  <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <span style="color:var(--text-secondary);">Insurer:</span>
                    <span style="font-weight:700;">${activeIns.insurer}</span>
                  </div>
                  <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <span style="color:var(--text-secondary);">Policy No:</span>
                    <span style="font-weight:600;">${activeIns.policyNumber}</span>
                  </div>
                  <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <span style="color:var(--text-secondary);">NCD Discount:</span>
                    <span style="font-weight:700; color:hsl(var(--color-success));">${activeIns.ncdPercentage}%</span>
                  </div>
                  <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <span style="color:var(--text-secondary);">Premium Paid:</span>
                    <span style="font-weight:700;">${currency} ${Number(activeIns.premium).toFixed(2)}</span>
                  </div>
                  <div style="display:flex; justify-content:space-between; margin-bottom:12px; border-top:1px solid var(--border-color); padding-top:10px;">
                    <span style="color:var(--text-secondary);">Expiry Date:</span>
                    <span style="font-weight:700; color:hsl(var(--color-warning));">${activeIns.expiryDate}</span>
                  </div>
                  ${activeIns.policyDocumentLink && html`
                    <a href="${activeIns.policyDocumentLink}" target="_blank" class="file-link" style="font-size:0.8rem; margin-top:8px;">
                      <${ExternalLinkIcon} /> Policy Document Link
                    </a>
                  `}
                </div>
              ` : html`
                <p style="color:var(--text-muted); font-size:0.88rem; padding-bottom:10px;">No active insurance profile found.</p>
                <button class="btn btn-secondary btn-sm" style="width: 100%; justify-content: center;" onClick=${() => handleOpenFormInsurance(activeVehicle.id)}>
                  Renew/Add Insurance
                </button>
              `}
            </div>

            <!-- Road Tax -->
            <div class="card">
              <div class="card-title">
                <span>Road Tax</span>
                <button class="btn btn-secondary btn-sm" onClick=${() => handleOpenFormRoadTax(activeVehicle.id)}><${EditIcon} /></button>
              </div>
              ${activeRoadTax ? html`
                <div>
                  <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <span style="color:var(--text-secondary);">Renewal Date:</span>
                    <span style="font-weight:600;">${activeRoadTax.renewalDate}</span>
                  </div>
                  <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <span style="color:var(--text-secondary);">Amount:</span>
                    <span style="font-weight:700;">${currency} ${Number(activeRoadTax.amount).toFixed(2)}</span>
                  </div>
                  <div style="display:flex; justify-content:space-between; margin-bottom:12px; border-top:1px solid var(--border-color); padding-top:10px;">
                    <span style="color:var(--text-secondary);">Expiry Date:</span>
                    <span style="font-weight:700; color:hsl(var(--color-warning));">${activeRoadTax.expiryDate}</span>
                  </div>
                </div>
              ` : html`
                <p style="color:var(--text-muted); font-size:0.88rem; padding-bottom:10px;">No road tax record found.</p>
                <button class="btn btn-secondary btn-sm" style="width:100%; justify-content:center;" onClick=${() => handleOpenFormRoadTax(activeVehicle.id)}>
                  Renew/Add Road Tax
                </button>
              `}
            </div>

            <!-- Vehicle Loan -->
            <div class="card">
              <div class="card-title">Vehicle Loan</div>
              ${vehLoan ? html`
                <div>
                  <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <span style="color:var(--text-secondary);">Bank:</span>
                    <span style="font-weight:700;">${vehLoan.bank}</span>
                  </div>
                  <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <span style="color:var(--text-secondary);">Monthly Instalment:</span>
                    <span style="font-weight:700;">${currency} ${Number(vehLoan.monthlyInstalment).toFixed(2)}</span>
                  </div>
                  <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <span style="color:var(--text-secondary);">Interest Rate:</span>
                    <span style="font-weight:600;">${vehLoan.interestRate}%</span>
                  </div>
                  <div style="display:flex; justify-content:space-between; margin-bottom:12px; border-top:1px solid var(--border-color); padding-top:10px;">
                    <span style="color:var(--text-secondary);">Outstanding:</span>
                    <span style="font-weight:700;">${currency} ${Number(vehLoan.outstandingBalance).toLocaleString()}</span>
                  </div>
                  <button class="btn btn-secondary btn-sm" style="width:100%; justify-content:center;" onClick=${() => navigateToTab('loans')}>
                    Manage Loans
                  </button>
                </div>
              ` : html`
                <p style="color:var(--text-muted); font-size:0.88rem; padding-bottom:10px;">No vehicle loan linked to this vehicle.</p>
                <button class="btn btn-secondary btn-sm" style="width:100%; justify-content:center;" onClick=${() => navigateToTab('loans')}>
                  Add Loan
                </button>
              `}
            </div>

          </div>
        </div>
      </div>
    `;
  }

  return html`
    <div>
      <div class="filter-bar">
        <div class="search-input-wrapper">
          <input type="text" class="form-control" placeholder="Search vehicle registration plate or model..." value=${search} onInput=${e => setSearch(e.target.value)} />
        </div>
        <button class="btn btn-primary" onClick=${() => handleOpenFormVehicle()}><${PlusIcon} /> Add Vehicle</button>
      </div>

      <div class="card">
        <div class="table-container">
          ${filteredVehicles.length === 0 ? html`
            <p style="color:var(--text-muted); text-align:center; padding:30px;">No vehicles found.</p>
          ` : html`
            <table class="mms-table">
              <thead>
                <tr>
                  <th>Vehicle Registration</th>
                  <th>Make & Model</th>
                  <th>Manufactured Year</th>
                  <th>Owner</th>
                  <th>Current Mileage</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${filteredVehicles.map(veh => html`
                  <tr key=${veh.id}>
                    <td>
                      <div style="font-weight: 800; font-size: 1.1rem; cursor: pointer; color: var(--accent-color);" onClick=${() => {
                        setSelectedVehicleId(veh.id);
                        setActiveVehicle(veh);
                        setView('detail');
                      }}>
                        ${veh.registrationNumber}
                      </div>
                    </td>
                    <td>${veh.makeModel}</td>
                    <td>${veh.year}</td>
                    <td>${veh.owner}</td>
                    <td style="font-weight: 700;">${Number(veh.currentMileage).toLocaleString()} km</td>
                    <td style="text-align: right;">
                      <div style="display:inline-flex; gap:8px;">
                        <button class="btn btn-secondary btn-sm" onClick=${() => handleOpenFormVehicle(veh)}><${EditIcon} /></button>
                        <button class="btn btn-danger btn-sm" onClick=${() => handleDeleteVehicle(veh.id)}><${TrashIcon} /></button>
                      </div>
                    </td>
                  </tr>
                `)}
              </tbody>
            </table>
          `}
        </div>
      </div>
    </div>
  `;
}
