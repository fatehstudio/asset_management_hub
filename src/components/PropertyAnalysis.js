import { html, useState, useEffect } from '../utils/htm.js';
import { getDb, getDynamicRentStatus } from '../utils/storage.js?v=20260808-google-sheets-1';

export default function PropertyAnalysis() {
  const [properties, setProperties] = useState([]);
  const [selectedProps, setSelectedProps] = useState([]);
  const [selectedYears, setSelectedYears] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [data, setData] = useState(null);

  useEffect(() => {
    loadData();
    window.addEventListener('mms_db_changed', loadData);
    return () => window.removeEventListener('mms_db_changed', loadData);
  }, []);

  const loadData = () => {
    const db = getDb();
    const props = db.properties || [];
    setProperties(props);

    // Auto-select all properties by default if none are selected yet
    if (selectedProps.length === 0 && props.length > 0) {
      setSelectedProps(props.map(p => p.id));
    }

    // Determine available years from data
    const yearsSet = new Set();
    const currentYearStr = new Date().getFullYear().toString();
    yearsSet.add(currentYearStr);
    yearsSet.add((new Date().getFullYear() - 1).toString());

    // Pull years from rent payments
    (db.rentPayments || []).forEach(rp => {
      const yr = (rp.date || rp.dueBy || '').slice(0, 4);
      if (yr && yr.length === 4) yearsSet.add(yr);
    });

    // Pull years from property taxes
    (db.propertyTaxes || []).forEach(pt => {
      if (pt.taxYear) yearsSet.add(pt.taxYear);
      const yr = (pt.paidDate || pt.dueDate || '').slice(0, 4);
      if (yr && yr.length === 4) yearsSet.add(yr);
    });

    // Pull years from utility bills
    (db.utilityBills || []).forEach(ub => {
      const yr = (ub.paidDate || ub.dueDate || '').slice(0, 4);
      if (yr && yr.length === 4) yearsSet.add(yr);
    });

    // Pull years from maintenance
    (db.maintenance || []).forEach(m => {
      const yr = (m.completedDate || m.reportedDate || '').slice(0, 4);
      if (yr && yr.length === 4) yearsSet.add(yr);
    });

    // Pull years from transactions
    (db.financialTransactions || []).forEach(tx => {
      const yr = (tx.date || '').slice(0, 4);
      if (yr && yr.length === 4) yearsSet.add(yr);
    });

    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);
    setAvailableYears(sortedYears);

    // Auto-select latest year by default if none selected yet
    if (selectedYears.length === 0 && sortedYears.length > 0) {
      setSelectedYears([sortedYears[0]]);
    }
  };

  // Run analysis when selections change
  useEffect(() => {
    if (selectedProps.length === 0 || selectedYears.length === 0) {
      setData(null);
      return;
    }

    const db = getDb();
    const currency = db.settings?.currency || 'RM';
    const txs = db.financialTransactions || [];
    const rps = db.rentPayments || [];
    const pts = db.propertyTaxes || [];
    const ubs = db.utilityBills || [];
    const uts = db.utilities || [];
    const maint = db.maintenance || [];

    // Filter properties
    const activeProperties = properties.filter(p => selectedProps.includes(p.id));

    // Calculate metrics by year
    const yearlyMetrics = {};

    selectedYears.forEach(year => {
      let income = 0;
      let mortgage = 0;
      let utilitiesCost = 0;
      let maintenanceCost = 0;
      let taxCost = 0;
      let otherExpenses = 0;

      activeProperties.forEach(p => {
        // 1. Rent Income (Paid payments)
        const propRps = rps.filter(r => r.propertyId === p.id && r.status === 'Paid');
        propRps.forEach(r => {
          const yr = (r.date || r.dueBy || '').slice(0, 4);
          if (yr === year) {
            income += Number(r.amount || 0);
          }
        });

        // 2. Mortgage Expense
        // Find property loans registered for this property
        const propLoans = (db.propertyLoans || []).filter(l => l.propertyId === p.id);
        const propLoanIds = propLoans.map(l => l.id);
        // Find transactions categorized under 'Property loan' referencing this property or loan
        txs.forEach(t => {
          if (t.category === 'Property loan' && t.date && t.date.slice(0, 4) === year) {
            // Check if notes contain property name
            if (t.notes && t.notes.toLowerCase().includes(p.name.toLowerCase())) {
              mortgage += Number(t.amount || 0);
            }
          }
        });

        // 3. Utility Expense
        const propUts = uts.filter(u => u.propertyId === p.id);
        const propUtIds = propUts.map(u => u.id);
        const propUbs = ubs.filter(b => propUtIds.includes(b.utilityId) && b.status === 'Paid');
        propUbs.forEach(b => {
          const yr = (b.paidDate || b.dueDate || '').slice(0, 4);
          if (yr === year) {
            utilitiesCost += Number(b.paidAmount || b.amount || 0);
          }
        });

        // 4. Maintenance Expense
        const propMaint = maint.filter(m => m.propertyId === p.id && m.status === 'Completed');
        propMaint.forEach(m => {
          const yr = (m.completedDate || m.reportedDate || '').slice(0, 4);
          if (yr === year) {
            maintenanceCost += Number(m.actualCost || 0);
          }
        });

        // 5. Tax Expense
        const propTaxes = pts.filter(t => t.propertyId === p.id && t.status === 'Paid');
        propTaxes.forEach(t => {
          // Filter by tax year or fallback to paid date year
          const yr = t.taxYear || (t.paidDate || t.dueDate || '').slice(0, 4);
          if (yr === year) {
            taxCost += Number(t.amount || 0);
          }
        });

        // 6. Other Expenses (transactions that reference property name in notes, aren't classified elsewhere)
        txs.forEach(t => {
          if (t.type === 'Expense' && t.date && t.date.slice(0, 4) === year) {
            if (t.notes && t.notes.toLowerCase().includes(p.name.toLowerCase())) {
              if (!['Property loan', 'Utilities', 'Maintenance', 'Tax'].includes(t.category)) {
                otherExpenses += Number(t.amount || 0);
              }
            }
          }
        });
      });

      const totalExpenses = mortgage + utilitiesCost + maintenanceCost + taxCost + otherExpenses;
      yearlyMetrics[year] = {
        income,
        mortgage,
        utilities: utilitiesCost,
        maintenance: maintenanceCost,
        tax: taxCost,
        other: otherExpenses,
        totalExpenses,
        netCashFlow: income - totalExpenses,
        efficiencyRate: income > 0 ? ((income - totalExpenses) / income) * 100 : 0
      };
    });

    // Aggregate totals across all selected years
    let totalRevenue = 0;
    let totalMortgage = 0;
    let totalUtilities = 0;
    let totalMaintenance = 0;
    let totalTax = 0;
    let totalOther = 0;

    Object.values(yearlyMetrics).forEach(ym => {
      totalRevenue += ym.income;
      totalMortgage += ym.mortgage;
      totalUtilities += ym.utilities;
      totalMaintenance += ym.maintenance;
      totalTax += ym.tax;
      totalOther += ym.other;
    });

    const totalExpenses = totalMortgage + totalUtilities + totalMaintenance + totalTax + totalOther;
    const netCashFlow = totalRevenue - totalExpenses;

    setData({
      currency,
      activeProperties,
      selectedYears: [...selectedYears].sort((a,b) => b-a),
      yearlyMetrics,
      totals: {
        revenue: totalRevenue,
        mortgage: totalMortgage,
        utilities: totalUtilities,
        maintenance: totalMaintenance,
        tax: totalTax,
        other: totalOther,
        expenses: totalExpenses,
        netCashFlow,
        efficiencyRate: totalRevenue > 0 ? (netCashFlow / totalRevenue) * 100 : 0
      }
    });
  }, [selectedProps, selectedYears, properties, availableYears]);

  const toggleProperty = (id) => {
    setSelectedProps(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const toggleYear = (yr) => {
    setSelectedYears(prev => 
      prev.includes(yr) ? prev.filter(y => y !== yr) : [...prev, yr]
    );
  };

  const selectAllProperties = () => {
    setSelectedProps(properties.map(p => p.id));
  };

  const selectNoneProperties = () => {
    setSelectedProps([]);
  };

  const selectAllYears = () => {
    setSelectedYears([...availableYears]);
  };

  const selectCurrentYear = () => {
    const current = new Date().getFullYear().toString();
    setSelectedYears([current]);
  };

  if (properties.length === 0) {
    return html`
      <div class="reference-empty" style="padding: 40px; text-align: center;">
        <p style="font-size: 1.1rem; color: var(--text-muted);">No properties found in database.</p>
        <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 8px;">Please add properties under the Properties tab first.</p>
      </div>
    `;
  }

  const totals = data?.totals;
  const currency = data?.currency || 'RM';

  return html`
    <div style="display: flex; flex-direction: column; gap: 24px; animation: fadeIn 0.4s ease;">
      <style>
        .analysis-filter-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        @media (min-width: 768px) {
          .analysis-filter-grid {
            grid-template-columns: 2fr 1fr;
          }
        }
      </style>
      
      <!-- Filter Card Section (Glassmorphism design) -->
      <div class="card" style="background: var(--card-bg); border: 1px solid var(--card-border); backdrop-filter: blur(var(--glass-blur));">
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 4px; color: var(--text-primary);">Analisis Data Hartanah</h3>
            <p style="font-size: 0.85rem; color: var(--text-secondary);">Select properties and calendar years to analyze financial cash flows, net worth performance, and expense breakdowns.</p>
          </div>
          
          <div class="analysis-filter-grid">
            <!-- Properties Selector -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Select Properties (1 or more)</label>
                <div style="display: flex; gap: 8px;">
                  <button class="btn btn-secondary btn-sm" style="padding: 2px 8px; font-size: 0.75rem;" onClick=${selectAllProperties}>All</button>
                  <button class="btn btn-secondary btn-sm" style="padding: 2px 8px; font-size: 0.75rem;" onClick=${selectNoneProperties}>Clear</button>
                </div>
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 8px; max-height: 120px; overflow-y: auto; padding: 4px 0;">
                ${properties.map(p => {
                  const isChecked = selectedProps.includes(p.id);
                  return html`
                    <button 
                      key=${p.id}
                      onClick=${() => toggleProperty(p.id)}
                      style="display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; border: 1px solid ${isChecked ? 'var(--accent-color)' : 'var(--border-color)'}; background: ${isChecked ? 'var(--accent-light)' : 'transparent'}; color: ${isChecked ? 'var(--accent-color)' : 'var(--text-primary)'};"
                    >
                      <span>${isChecked ? '✓' : '＋'}</span>
                      <span>${p.name}</span>
                    </button>
                  `;
                })}
              </div>
            </div>

            <!-- Years Selector -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Select Years</label>
                <div style="display: flex; gap: 8px;">
                  <button class="btn btn-secondary btn-sm" style="padding: 2px 8px; font-size: 0.75rem;" onClick=${selectAllYears}>All</button>
                  <button class="btn btn-secondary btn-sm" style="padding: 2px 8px; font-size: 0.75rem;" onClick=${selectCurrentYear}>Current</button>
                </div>
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 8px; padding: 4px 0;">
                ${availableYears.map(yr => {
                  const isChecked = selectedYears.includes(yr);
                  return html`
                    <button 
                      key=${yr}
                      onClick=${() => toggleYear(yr)}
                      style="display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; border: 1px solid ${isChecked ? 'var(--accent-color)' : 'var(--border-color)'}; background: ${isChecked ? 'var(--accent-light)' : 'transparent'}; color: ${isChecked ? 'var(--accent-color)' : 'var(--text-primary)'};"
                    >
                      <span>${yr}</span>
                    </button>
                  `;
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No selections alert -->
      ${(!data) ? html`
        <div class="card" style="padding: 40px; text-align: center; color: var(--text-muted);">
          ⚠️ Please select at least one property and one calendar year to compute performance analysis.
        </div>
      ` : html`
        
        <!-- Summary Cards Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
          
          <!-- Gross Revenue -->
          <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; border-left: 4px solid var(--accent-color);">
            <div>
              <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Gross Rental Revenue</span>
              <h2 style="font-size: 1.8rem; font-weight: 800; margin-top: 8px; color: var(--text-primary);">${currency} ${totals.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
            </div>
            <p style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 8px;">Total paid rents received during selected periods.</p>
          </div>

          <!-- Total Expenses -->
          <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; border-left: 4px solid var(--color-danger);">
            <div>
              <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Total Expenses</span>
              <h2 style="font-size: 1.8rem; font-weight: 800; margin-top: 8px; color: var(--text-primary);">${currency} ${totals.expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
            </div>
            <p style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 8px;">Mortgage, repairs, utilities, taxes and other fees.</p>
          </div>

          <!-- Net Income Cash Flow -->
          <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; border-left: 4px solid var(--color-success); background: ${totals.netCashFlow >= 0 ? 'transparent' : 'rgba(239, 68, 68, 0.05)'}">
            <div>
              <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Net Operating Flow</span>
              <h2 style="font-size: 1.8rem; font-weight: 800; margin-top: 8px; color: ${totals.netCashFlow >= 0 ? 'var(--color-success)' : 'hsl(var(--color-danger))'};">
                ${totals.netCashFlow < 0 ? '-' : ''}${currency} ${Math.abs(totals.netCashFlow).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h2>
            </div>
            <p style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 8px;">Profit margin after subtracting all operational expenses.</p>
          </div>

          <!-- Net Yield Margin -->
          <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; border-left: 4px solid var(--color-warning);">
            <div>
              <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Cash Flow Margin</span>
              <h2 style="font-size: 1.8rem; font-weight: 800; margin-top: 8px; color: var(--text-primary);">${totals.efficiencyRate.toFixed(1)}%</h2>
            </div>
            <p style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 8px;">Percentage of rental revenue retained as profit.</p>
          </div>

        </div>

        <div class="content-grid-2" style="margin-top: 8px;">
          
          <!-- Combined Expense Breakdown Panel -->
          <div class="card">
            <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 18px; color: var(--text-primary);">Combined Expense Breakdown</h3>
            
            ${totals.expenses === 0 ? html`
              <p style="color: var(--text-muted); text-align: center; padding: 40px 0;">No expenses recorded in the selected period.</p>
            ` : html`
              <div style="display: flex; flex-direction: column; gap: 16px;">
                
                <!-- Mortgage loans progress bar -->
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.88rem; font-weight: 600; margin-bottom: 6px;">
                    <span style="color: var(--text-primary);">Mortgages & Installments</span>
                    <span style="color: var(--text-secondary);">${currency} ${totals.mortgage.toLocaleString()} (${(totals.mortgage / totals.expenses * 100).toFixed(1)}%)</span>
                  </div>
                  <div style="width: 100%; height: 8px; background: var(--border-color); border-radius: 4px; overflow: hidden;">
                    <div style="width: ${(totals.mortgage / totals.expenses * 100)}%; height: 100%; background: var(--accent-color); border-radius: 4px;"></div>
                  </div>
                </div>

                <!-- Utilities progress bar -->
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.88rem; font-weight: 600; margin-bottom: 6px;">
                    <span style="color: var(--text-primary);">Utilities & Services</span>
                    <span style="color: var(--text-secondary);">${currency} ${totals.utilities.toLocaleString()} (${(totals.utilities / totals.expenses * 100).toFixed(1)}%)</span>
                  </div>
                  <div style="width: 100%; height: 8px; background: var(--border-color); border-radius: 4px; overflow: hidden;">
                    <div style="width: ${(totals.utilities / totals.expenses * 100)}%; height: 100%; background: hsl(var(--color-info)); border-radius: 4px;"></div>
                  </div>
                </div>

                <!-- Maintenance progress bar -->
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.88rem; font-weight: 600; margin-bottom: 6px;">
                    <span style="color: var(--text-primary);">Repairs & Maintenance</span>
                    <span style="color: var(--text-secondary);">${currency} ${totals.maintenance.toLocaleString()} (${(totals.maintenance / totals.expenses * 100).toFixed(1)}%)</span>
                  </div>
                  <div style="width: 100%; height: 8px; background: var(--border-color); border-radius: 4px; overflow: hidden;">
                    <div style="width: ${(totals.maintenance / totals.expenses * 100)}%; height: 100%; background: hsl(var(--color-warning)); border-radius: 4px;"></div>
                  </div>
                </div>

                <!-- Property Taxes progress bar -->
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.88rem; font-weight: 600; margin-bottom: 6px;">
                    <span style="color: var(--text-primary);">Cukai Tanah & Cukai Pintu</span>
                    <span style="color: var(--text-secondary);">${currency} ${totals.tax.toLocaleString()} (${(totals.tax / totals.expenses * 100).toFixed(1)}%)</span>
                  </div>
                  <div style="width: 100%; height: 8px; background: var(--border-color); border-radius: 4px; overflow: hidden;">
                    <div style="width: ${(totals.tax / totals.expenses * 100)}%; height: 100%; background: hsl(var(--color-danger)); border-radius: 4px;"></div>
                  </div>
                </div>

                <!-- Other Expenses progress bar -->
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.88rem; font-weight: 600; margin-bottom: 6px;">
                    <span style="color: var(--text-primary);">Other Fees & Charges</span>
                    <span style="color: var(--text-secondary);">${currency} ${totals.other.toLocaleString()} (${(totals.other / totals.expenses * 100).toFixed(1)}%)</span>
                  </div>
                  <div style="width: 100%; height: 8px; background: var(--border-color); border-radius: 4px; overflow: hidden;">
                    <div style="width: ${(totals.other / totals.expenses * 100)}%; height: 100%; background: var(--text-muted); border-radius: 4px;"></div>
                  </div>
                </div>

              </div>
            `}
          </div>

          <!-- Combined Multi-Year Net Worth Flow -->
          <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; background: linear-gradient(135deg, hsl(230, 20%, 15%) 0%, hsl(230, 20%, 8%) 100%); border: 1px solid var(--border-color); color: white;">
            <div>
              <span style="font-size: 0.72rem; font-weight: 700; color: #a5b4fc; text-transform: uppercase; letter-spacing: 1px;">Combined Net Operating Flow</span>
              <h1 style="font-size: 2.1rem; font-weight: 800; margin-top: 10px; color: #ffffff; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">
                ${totals.netCashFlow < 0 ? '-' : ''}${currency} ${Math.abs(totals.netCashFlow).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h1>
              <p style="font-size: 0.82rem; color: #cbd5e1; line-height: 1.5; margin-top: 14px;">
                This represents the net accumulated cash value generated from your selected properties (${data.activeProperties.length} active units) across the selected calendar periods (${data.selectedYears.join(', ')}).
              </p>
            </div>
            
            <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 14px; margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div>
                <span style="font-size: 0.68rem; color: #94a3b8; text-transform: uppercase;">Gross Profit</span>
                <p style="font-size: 0.95rem; font-weight: 700; color: var(--color-success); margin-top: 2px;">${currency} ${totals.revenue.toLocaleString()}</p>
              </div>
              <div>
                <span style="font-size: 0.68rem; color: #94a3b8; text-transform: uppercase;">Total Costs</span>
                <p style="font-size: 0.95rem; font-weight: 700; color: #f87171; margin-top: 2px;">${currency} ${totals.expenses.toLocaleString()}</p>
              </div>
            </div>
          </div>

        </div>

        <!-- Annual Comparison View -->
        ${data.selectedYears.length > 1 && html`
          <div class="card" style="margin-top: 24px;">
            <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 18px; color: var(--text-primary);">Annual Comparison (Perbandingan Rentas Tahun)</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
              ${data.selectedYears.map(year => {
                const metrics = data.yearlyMetrics[year];
                if (!metrics) return null;
                const isPositive = metrics.netCashFlow >= 0;
                
                return html`
                  <div key=${year} style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px; background: rgba(255,255,255,0.02); display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                        <span style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary);">${year}</span>
                        <span class="badge ${isPositive ? 'badge-success' : 'badge-danger'}" style="font-size: 0.72rem; padding: 3px 8px;">
                          ${isPositive ? 'Positive Flow' : 'Negative Flow'}
                        </span>
                      </div>
                      
                      <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.88rem;">
                          <span style="color: var(--text-muted);">Rental Income:</span>
                          <span style="font-weight: 700; color: var(--color-success);">${currency} ${metrics.income.toLocaleString()}</span>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; font-size: 0.88rem;">
                          <span style="color: var(--text-muted);">Total Expenses:</span>
                          <span style="font-weight: 700; color: hsl(var(--color-danger));">${currency} ${metrics.totalExpenses.toLocaleString()}</span>
                        </div>
                        
                        <!-- Mini expense bars -->
                        <div style="display: flex; height: 5px; background: var(--border-color); border-radius: 3px; overflow: hidden; margin-top: 4px;">
                          <div style="width: ${metrics.income > 0 ? (metrics.mortgage / metrics.income * 100) : 0}%; background: var(--accent-color);" title="Mortgage"></div>
                          <div style="width: ${metrics.income > 0 ? (metrics.utilities / metrics.income * 100) : 0}%; background: hsl(var(--color-info));" title="Utilities"></div>
                          <div style="width: ${metrics.income > 0 ? (metrics.maintenance / metrics.income * 100) : 0}%; background: hsl(var(--color-warning));" title="Maintenance"></div>
                          <div style="width: ${metrics.income > 0 ? (metrics.tax / metrics.income * 100) : 0}%; background: hsl(var(--color-danger));" title="Taxes"></div>
                          <div style="width: ${metrics.income > 0 ? (metrics.other / metrics.income * 100) : 0}%; background: var(--text-muted);" title="Others"></div>
                        </div>
                      </div>
                    </div>
                    
                    <div style="border-top: 1px solid var(--border-color); padding-top: 12px; display: flex; justify-content: space-between; align-items: center;">
                      <span style="font-size: 0.82rem; font-weight: 600; color: var(--text-secondary);">Net Flow:</span>
                      <span style="font-size: 1.15rem; font-weight: 800; color: ${isPositive ? 'var(--color-success)' : 'hsl(var(--color-danger))'};">
                        ${isPositive ? '' : '-'}${currency} ${Math.abs(metrics.netCashFlow).toLocaleString()}
                      </span>
                    </div>
                  </div>
                `;
              })}
            </div>
          </div>
        `}

        <!-- Detailed Breakdown Table -->
        <div class="card" style="margin-top: 24px;">
          <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 18px; color: var(--text-primary);">Annual Itemized Statement (Laporan Terperinci Tahunan)</h3>
          <div class="table-container">
            <table class="mms-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th style="text-align: right;">Rental Revenue</th>
                  <th style="text-align: right;">Mortgages</th>
                  <th style="text-align: right;">Utilities</th>
                  <th style="text-align: right;">Repairs</th>
                  <th style="text-align: right;">Cukai Tanah & Cukai Pintu</th>
                  <th style="text-align: right;">Other Costs</th>
                  <th style="text-align: right;">Total Cost</th>
                  <th style="text-align: right;">Net Income</th>
                </tr>
              </thead>
              <tbody>
                ${data.selectedYears.map(year => {
                  const m = data.yearlyMetrics[year];
                  if (!m) return null;
                  return html`
                    <tr key=${year}>
                      <td><strong>Year ${year}</strong></td>
                      <td style="text-align: right; color: var(--color-success); font-weight: 700;">${currency} ${m.income.toFixed(2)}</td>
                      <td style="text-align: right; color: var(--text-secondary);">${currency} ${m.mortgage.toFixed(2)}</td>
                      <td style="text-align: right; color: var(--text-secondary);">${currency} ${m.utilities.toFixed(2)}</td>
                      <td style="text-align: right; color: var(--text-secondary);">${currency} ${m.maintenance.toFixed(2)}</td>
                      <td style="text-align: right; color: var(--text-secondary); font-weight: 600;">${currency} ${m.tax.toFixed(2)}</td>
                      <td style="text-align: right; color: var(--text-secondary);">${currency} ${m.other.toFixed(2)}</td>
                      <td style="text-align: right; font-weight: 700; color: hsl(var(--color-danger));">${currency} ${m.totalExpenses.toFixed(2)}</td>
                      <td style="text-align: right; font-weight: 800; color: ${m.netCashFlow >= 0 ? 'var(--color-success)' : 'hsl(var(--color-danger))'};">
                        ${m.netCashFlow < 0 ? '-' : ''}${currency} ${Math.abs(m.netCashFlow).toFixed(2)}
                      </td>
                    </tr>
                  `;
                })}
                <tr style="border-top: 2px solid var(--text-primary); font-weight: 800; background: rgba(255,255,255,0.04);">
                  <td><strong>TOTAL</strong></td>
                  <td style="text-align: right; color: var(--color-success);">${currency} ${totals.revenue.toFixed(2)}</td>
                  <td style="text-align: right;">${currency} ${totals.mortgage.toFixed(2)}</td>
                  <td style="text-align: right;">${currency} ${totals.utilities.toFixed(2)}</td>
                  <td style="text-align: right;">${currency} ${totals.maintenance.toFixed(2)}</td>
                  <td style="text-align: right; font-weight: 700;">${currency} ${totals.tax.toFixed(2)}</td>
                  <td style="text-align: right;">${currency} ${totals.other.toFixed(2)}</td>
                  <td style="text-align: right; color: hsl(var(--color-danger));">${currency} ${totals.expenses.toFixed(2)}</td>
                  <td style="text-align: right; color: ${totals.netCashFlow >= 0 ? 'var(--color-success)' : 'hsl(var(--color-danger))'};">
                    ${totals.netCashFlow < 0 ? '-' : ''}${currency} ${Math.abs(totals.netCashFlow).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `}
    </div>
  `;
}
