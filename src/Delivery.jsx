import React, { useState, useMemo } from 'react';
import { Truck, Calendar, Target, CheckCircle2, AlertCircle, Save, ChevronRight, BarChart3, Package, LayoutDashboard, Settings2, ArrowUpRight, ArrowDownRight, TrendingUp, X, Info, Filter, User, AlertTriangle, Activity, PieChart, Briefcase, Layers, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Delivery = ({ workOrders = [], programs = [], traceabilityData = [], currentUser = {}, syncToDisk, deliveryPlanning = [], setDeliveryPlanning, showToast }) => {
  const [selectedWoId, setSelectedWoId] = useState('');
  const [planningProgramId, setPlanningProgramId] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showDashFilters, setShowDashFilters] = useState(false);
  const [showPlanningFilters, setShowPlanningFilters] = useState(false);

  // Dashboard specific filters
  const [dashboardFilters, setDashboardFilters] = useState({
    year: new Date().getFullYear().toString(),
    month: '',
    type: '',
    woId: '',
    programId: ''
  });

  const years = ["2024", "2025", "2026", "2027"];

  // Reset filters
  const resetFilters = () => setDashboardFilters({ month: '', type: '', woId: '', programId: '', year: new Date().getFullYear().toString() });

  // Check if current user has permission to set targets
  const isOwner = useMemo(() =>
    (currentUser.roles || []).some(r => ['Program Owner', 'Administrator', 'Developer', 'Program Head'].includes(r))
    , [currentUser.roles]);

  const selectedWO = useMemo(() =>
    workOrders.find(wo => String(wo.id) === String(selectedWoId))
    , [selectedWoId, workOrders]);

  const woTotalQty = useMemo(() =>
    (selectedWO?.items || []).reduce((sum, item) => sum + Number(item.qty), 0)
    , [selectedWO]);

  // Consolidate filtered work orders for dashboard views
  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter(wo => {
      const matchType = !dashboardFilters.type || wo.type === dashboardFilters.type;
      const matchId = !dashboardFilters.woId || String(wo.id) === String(dashboardFilters.woId);
      const matchProgram = !dashboardFilters.programId || String(wo.programId) === String(dashboardFilters.programId);
      return matchType && matchId && matchProgram;
    });
  }, [workOrders, dashboardFilters]);

  // Generate months for the current year
  const currentYear = parseInt(dashboardFilters.year) || new Date().getFullYear();
  const months = useMemo(() => {
    const m = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentYear, i, 1);
      m.push({
        id: `${currentYear}-${String(i + 1).padStart(2, '0')}`,
        label: `${date.toLocaleString('default', { month: 'long' })} ${currentYear}`
      });
    }
    return m;
  }, [currentYear, dashboardFilters.year]);

  // Calculate Actual data from Traceability (Global Map: { [woId-month]: count })
  const actualStatsMap = useMemo(() => {
    const approvedEntries = traceabilityData.filter(e => e.status === 'Approved');
    const unitProgress = {};

    approvedEntries.forEach(entry => {
      const sn = (entry.actualSerialNo || 'NA').trim().toUpperCase();
      const unitKey = `${entry.workOrderId}-${sn}`;

      if (!unitProgress[unitKey]) {
        unitProgress[unitKey] = { pdi: false, eol: false, date: entry.createdAt, woId: entry.workOrderId };
      }

      if (entry.type === 'PDI') unitProgress[unitKey].pdi = true;
      if (entry.type === 'EOL') unitProgress[unitKey].eol = true;
      if (new Date(entry.createdAt) > new Date(unitProgress[unitKey].date)) {
        unitProgress[unitKey].date = entry.createdAt;
      }
    });

    const stats = {};
    Object.values(unitProgress).forEach(unit => {
      if (unit.pdi && unit.eol) {
        const monthKey = unit.date.substring(0, 7);
        const key = `${unit.woId}-${monthKey}`;
        stats[key] = (stats[key] || 0) + 1;
      }
    });
    return stats;
  }, [traceabilityData]);

  // Consolidate approved units for granular breakdown
  const approvedUnits = useMemo(() => {
    const approvedEntries = traceabilityData.filter(e => e.status === 'Approved');
    const unitProgress = {};

    approvedEntries.forEach(entry => {
      const sn = (entry.actualSerialNo || 'NA').trim().toUpperCase();
      const unitKey = `${entry.workOrderId}-${sn}`;

      if (!unitProgress[unitKey]) {
        unitProgress[unitKey] = { pdi: false, eol: false, date: entry.createdAt, woId: entry.workOrderId, modelNumber: entry.modelNumber, partNumber: entry.partNumber };
      }

      if (entry.type === 'PDI') unitProgress[unitKey].pdi = true;
      if (entry.type === 'EOL') unitProgress[unitKey].eol = true;
      if (new Date(entry.createdAt) > new Date(unitProgress[unitKey].date)) {
        unitProgress[unitKey].date = entry.createdAt;
      }
    });

    return Object.values(unitProgress).filter(u => u.pdi && u.eol);
  }, [traceabilityData]);

  // Calculate Monthly Trends Data for the selected year and filters
  const monthlyTrends = useMemo(() => {
    return months.map(m => {
      const filteredWoIds = filteredWorkOrders.map(w => String(w.id));

      const planned = deliveryPlanning
        .filter(p => filteredWoIds.includes(String(p.workOrderId)))
        .reduce((sum, p) => sum + (p.planning[m.id] || 0), 0);

      const actual = Object.entries(actualStatsMap)
        .filter(([key]) => {
          const [woId, month] = key.split('-');
          return filteredWoIds.includes(woId) && month === m.id;
        })
        .reduce((sum, [_, v]) => sum + v, 0);

      return { month: m.label, planned, actual, id: m.id };
    });
  }, [months, deliveryPlanning, actualStatsMap, filteredWorkOrders]);

  const getStatus = (planned, actual) => {
    if (planned === 0 && actual === 0) return { label: 'No Target', color: 'var(--text-sub)', class: 'gray' };
    if (actual > planned) return { label: 'Overachieved', color: 'var(--accent)', class: 'indigo' };
    if (actual === planned && planned > 0) return { label: 'On Track', color: 'var(--emerald)', class: 'emerald' };
    if (actual < planned) return { label: 'Delay', color: '#ef4444', class: 'rose' };
    return { label: 'Pending', color: 'var(--text-sub)', class: 'gray' };
  };

  const handleUpdatePlanned = (monthId, value) => {
    const selectedWO = workOrders.find(wo => String(wo.id) === String(selectedWoId));
    const woTotalQty = (selectedWO?.items || []).reduce((sum, item) => sum + Number(item.qty), 0);
    const woPlanningEntry = deliveryPlanning.find(p => String(p.workOrderId) === String(selectedWoId))?.planning || {};

    const newValue = Math.max(0, parseInt(value) || 0);
    const otherMonthsPlanned = Object.entries(woPlanningEntry)
      .filter(([m]) => m !== monthId)
      .reduce((sum, [_, v]) => sum + v, 0);

    if (otherMonthsPlanned + newValue > woTotalQty) {
      showToast(`Total planned (${otherMonthsPlanned + newValue}) exceeds Work Order quantity (${woTotalQty}).`, "warning");
      return;
    }

    const updatedPlanning = { ...woPlanningEntry, [monthId]: newValue };
    const newDeliveryPlanning = [...deliveryPlanning];
    const index = newDeliveryPlanning.findIndex(p => String(p.workOrderId) === String(selectedWoId));

    if (index > -1) {
      newDeliveryPlanning[index] = { ...newDeliveryPlanning[index], planning: updatedPlanning };
    } else {
      newDeliveryPlanning.push({ workOrderId: selectedWoId, planning: updatedPlanning });
    }

    setDeliveryPlanning(newDeliveryPlanning);
    syncToDisk({ key: 'deliveryPlanning', data: newDeliveryPlanning });
  };

  return (
    <div className="page-view module-shell">
      <div className="sub-navigation po-sub-nav">
        <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>
          <PieChart size={16} /> Dashboard Overview
        </button>
        <button className={activeTab === 'planning' ? 'active' : ''} onClick={() => setActiveTab('planning')}>
          <Calendar size={16} /> Monthly Target Planning
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <div className="filter-bar" style={{ marginBottom: 'var(--space-md)' }}>
          <button className="btn-small" onClick={() => setShowDashFilters(!showDashFilters)} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
            <Filter size={14} /> {showDashFilters ? 'Hide' : 'Show'} Filters
          </button>
          {showDashFilters && (
            <div style={{ padding: 'var(--space-xs)', display: 'flex', gap: 'var(--space-xs)', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
              <select value={dashboardFilters.year} onChange={(e) => setDashboardFilters({ ...dashboardFilters, year: e.target.value })} style={{ fontSize: 'var(--fs-xs)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
                {years.map(y => (<option key={y} value={y}>{y}</option>))}
              </select>
              <select value={dashboardFilters.month} onChange={(e) => setDashboardFilters({ ...dashboardFilters, month: e.target.value })} style={{ fontSize: 'var(--fs-xs)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
                <option value="">All Months</option>
                {months.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
              <select value={dashboardFilters.programId} onChange={(e) => setDashboardFilters({ ...dashboardFilters, programId: e.target.value, woId: '' })} style={{ fontSize: 'var(--fs-xs)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
                <option value="">All Programs</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={dashboardFilters.type} onChange={(e) => setDashboardFilters({ ...dashboardFilters, type: e.target.value })} style={{ fontSize: 'var(--fs-xs)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
                <option value="">All Types</option>
                <option value="Internal">Internal Only</option>
                <option value="Customer">Customer Only</option>
              </select>
              <select value={dashboardFilters.woId} onChange={(e) => setDashboardFilters({ ...dashboardFilters, woId: e.target.value })} style={{ fontSize: 'var(--fs-xs)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
                <option value="">All Active Work Orders</option>
                {workOrders.filter(wo => !dashboardFilters.programId || String(wo.programId) === String(dashboardFilters.programId)).map(wo => (
                  <option key={wo.id} value={wo.id}>{wo.refId} - {wo.title}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {activeTab === 'planning' && (
        <div className="filter-bar" style={{ marginBottom: 'var(--space-md)' }}>
          <button className="btn-small" onClick={() => setShowPlanningFilters(!showPlanningFilters)} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
            <Package size={14} /> {showPlanningFilters ? 'Hide' : 'Show'} Planning Filters
          </button>
          {showPlanningFilters && (
            <div style={{ padding: 'var(--space-xs)', display: 'flex', gap: 'var(--space-xs)', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
              <select value={planningProgramId} onChange={(e) => { setPlanningProgramId(e.target.value); setSelectedWoId(''); }} style={{ fontSize: 'var(--fs-xs)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
                <option value="">-- Program --</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={selectedWoId} onChange={(e) => setSelectedWoId(e.target.value)} disabled={!planningProgramId} style={{ fontSize: 'var(--fs-xs)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
                <option value="">-- Work Order --</option>
                {workOrders.filter(wo => String(wo.programId) === String(planningProgramId)).map(wo => (
                  <option key={wo.id} value={wo.id}>{wo.refId} - {wo.title} ({wo.samples || 0})</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' ? (
          <motion.div key="db" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="stats-grid">
              {['Total Workload', 'Planned for Year', 'Yearly Actual', 'Achievement Rate'].map((label, idx) => {
                let value = 0;
                let color = '';

                const filteredWoIds = new Set(filteredWorkOrders.map(w => String(w.id)));

                if (idx === 0) {
                  value = filteredWorkOrders.reduce((s, w) => s + (w.samples || 0), 0);
                } else if (idx === 1) {
                  value = deliveryPlanning
                    .filter(p => filteredWoIds.has(String(p.workOrderId)))
                    .reduce((s, p) => s + Object.entries(p.planning)
                      .filter(([m]) => { const matchYear = m.startsWith(dashboardFilters.year); const matchMonth = !dashboardFilters.month || m === dashboardFilters.month; return matchYear && matchMonth; })
                      .reduce((ps, [_, v]) => ps + Number(v), 0), 0);
                  color = 'accent';
                } else if (idx === 2) {
                  value = Object.entries(actualStatsMap)
                    .filter(([key]) => { const [woId, month] = key.split('-'); return filteredWoIds.has(String(woId)) && month.startsWith(dashboardFilters.year) && (!dashboardFilters.month || month === dashboardFilters.month); })
                    .reduce((s, [_, v]) => s + v, 0);
                  color = 'emerald';
                } else {
                  const planned = deliveryPlanning
                    .filter(p => filteredWoIds.has(String(p.workOrderId)))
                    .reduce((s, p) => s + Object.entries(p.planning)
                      .filter(([m]) => { const matchYear = m.startsWith(dashboardFilters.year); const matchMonth = !dashboardFilters.month || m === dashboardFilters.month; return matchYear && matchMonth; })
                      .reduce((ps, [_, v]) => ps + Number(v), 0), 0);
                  const actual = Object.entries(actualStatsMap)
                    .filter(([key]) => { const [woId, month] = key.split('-'); return filteredWoIds.has(String(woId)) && month.startsWith(dashboardFilters.year) && (!dashboardFilters.month || month === dashboardFilters.month); })
                    .reduce((s, [_, v]) => s + v, 0);
                  value = planned > 0 ? `${Math.round((actual / planned) * 100)}%` : '0%';
                }

                return (
                  <motion.div key={label} whileHover={{ y: -4 }} className={`stat-card ${color ? 'primary-stat' : ''}`}>
                    <span className="stat-label">{label}</span>
                    <div className="stat-value" style={color === 'accent' ? { color: 'var(--accent)' } : color === 'emerald' ? { color: 'var(--emerald-text)' } : {}}>{value}</div>
                  </motion.div>
                );
              })}
            </div>

            <div className="card">
              <div className="card-body">
                <h3 className="section-heading accent-bottom"><BarChart3 size={20} color="var(--accent)" /> Monthly Delivery Trend - {currentYear}</h3>
                <div className="bar-chart-wrapper" style={{ height: '220px' }}>
                  {monthlyTrends.map((data, i) => {
                    const maxVal = Math.max(...monthlyTrends.map(t => Math.max(t.planned, t.actual)), 1);
                    const plannedHeight = (data.planned / maxVal) * 100;
                    const actualHeight = (data.actual / maxVal) * 100;
                    const isCurrent = data.id === dashboardFilters.month;

                    return (
                      <div key={i} className="bar-group">
                        <div className="bars" style={{ height: '180px' }}>
                          <motion.div initial={{ height: 0 }} animate={{ height: `${plannedHeight}%` }} title={`Planned: ${data.planned}`} className="bar planned" />
                          <motion.div initial={{ height: 0 }} animate={{ height: `${actualHeight}%` }} title={`Actual: ${data.actual}`} className={`bar actual${data.actual < data.planned ? ' delay' : ''}`} />
                        </div>
                        <span className={`month-label${isCurrent ? ' active' : ''}`}>{data.month.substring(0, 3)}</span>
                        {(data.actual < data.planned && data.planned > 0) && (
                          <div style={{ position: 'absolute', top: '-15px', color: 'var(--rose-text)' }} title="Target Missed"><AlertTriangle size={12} /></div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="chart-legend">
                  <div className="legend-item"><div className="swatch muted"></div> Planned Target</div>
                  <div className="legend-item"><div className="swatch accent"></div> Achieved (On Track)</div>
                  <div className="legend-item"><div className="swatch red"></div> Target Missed (Delay)</div>
                </div>
              </div>
            </div>

            <div className="card table-container" style={{ margin: 0 }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><Activity size={20} /> Active Build Progress Breakdown</h3>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  <span className="pill-badge blue" style={{ fontSize: 'var(--fs-xs)' }}>Year: {currentYear}</span>
                  {dashboardFilters.month && <span className="pill-badge amber" style={{ fontSize: 'var(--fs-xs)' }}>Month: {months.find(m => m.id === dashboardFilters.month)?.label}</span>}
                </div>
              </div>
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th>Work Order Reference</th>
                    <th>Model & Part Details</th>
                    <th className="text-center">Target Qty (Item)</th>
                    <th className="text-center">Monthly Actual</th>
                    <th className="text-center">Delivery Status</th>
                    <th style={{ width: '150px' }}>Item Fulfillment</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkOrders
                    .flatMap(wo => (wo.items || []).map(item => ({ ...wo, itemBreakdown: item })))
                    .map((flatWo, fIdx) => {
                      const { itemBreakdown } = flatWo;

                      // Calculate planned for this month for this WO
                      const woPlanningEntry = deliveryPlanning.find(p =>
                        String(p.workOrderId) === String(flatWo.id) &&
                        p.modelNumber === itemBreakdown.modelNumber &&
                        p.partNumber === itemBreakdown.partNumber
                      )?.planning || {};
                      const currentMonthPlanned = dashboardFilters.month ? (woPlanningEntry[dashboardFilters.month] || 0) :
                        Object.entries(woPlanningEntry).filter(([m]) => m.startsWith(dashboardFilters.year)).reduce((s, [_, v]) => s + v, 0);

                      // Calculate actuals for this specific Model/Part
                      const actual = approvedUnits.filter(u =>
                        String(u.woId) === String(flatWo.id) &&
                        u.modelNumber === itemBreakdown.modelNumber &&
                        u.partNumber === itemBreakdown.partNumber &&
                        u.date.startsWith(dashboardFilters.month || dashboardFilters.year)
                      ).length;

                      const percent = itemBreakdown.qty > 0 ? Math.min(100, Math.round((actual / itemBreakdown.qty) * 100)) : 0;
                      const status = getStatus(currentMonthPlanned, actual);

                      return (
                        <tr key={`${flatWo.id}-${fIdx}`}>
                          <td>
                            <div style={{ fontWeight: '700', fontSize: 'var(--fs-md)' }}>{flatWo.refId}</div>
                            <div style={{ fontSize: 'var(--fs-base)', color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                              <User size={12} /> {flatWo.type === 'Customer' ? flatWo.customerName : 'Internal Project'}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: 'var(--fs-base)' }}>
                              <strong>{itemBreakdown.modelNumber}</strong>
                              <span style={{ margin: '0 var(--space-sm)', opacity: 0.3 }}>|</span>
                              <span style={{ color: 'var(--text-sub)' }}>{itemBreakdown.partNumber}</span>
                            </div>
                          </td>
                          <td className="text-center" style={{ fontWeight: '600' }}>{itemBreakdown.qty}</td>
                          <td className="text-center" style={{ fontWeight: '700', color: actual > 0 ? 'var(--emerald)' : 'inherit' }}>{actual}</td>
                          <td className="text-center">
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-xs)' }}>
                              <span className={`pill-badge ${status.class}`} style={{ fontSize: 'var(--fs-xs)' }}>{status.label}</span>
                              {status.label === 'Delay' && <span style={{ color: 'var(--rose-text)', fontSize: 'var(--fs-xs)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}><AlertTriangle size={10} /> MISSING {currentMonthPlanned - actual}</span>}
                            </div>
                          </td>
                          <td>
                            <div style={{ width: '100%', height: 'var(--space-sm)', background: 'var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: 'var(--space-xs)' }}>
                              <div style={{ width: `${percent}%`, height: '100%', background: percent >= 100 ? 'var(--emerald)' : (percent > 50 ? 'var(--accent)' : 'var(--amber-text)'), transition: 'width 1s ease' }}></div>
                            </div>
                            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)' }}>{percent}% of target</span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <motion.div key="plan" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {selectedWO ? (
              <>
                <div className="stats-grid">
                  <div className="stat-card primary-stat">
                    <span className="stat-label">WO Total Quantity</span>
                    <div className="stat-value">{(selectedWO?.items || []).reduce((sum, item) => sum + Number(item.qty), 0)}</div>
                  </div>
                  <div className="stat-card primary-stat">
                    <span className="stat-label">Currently Scheduled</span>
                    <div className="stat-value" style={{ color: 'var(--accent)' }}>
                      {Object.values(deliveryPlanning.find(p => String(p.workOrderId) === String(selectedWoId))?.planning || {}).reduce((sum, val) => sum + Number(val || 0), 0)}
                    </div>
                  </div>
                </div>

                <div className="card table-container">
                  <div className="card-header">
                    <div className="gap-row">
                      <h3>Monthly Build Targets - {selectedWO.refId}</h3>
                      {isOwner && <span className="pill-badge accent pill-sm">Planning Enabled</span>}
                    </div>
                  </div>
                  <table className="enterprise-table">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th className="text-center" style={{ width: '200px' }}>Planned Target Qty</th>
                        <th>Allocation Progress</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {months.map(month => {
                        const woPlanningEntry = deliveryPlanning.find(p => String(p.workOrderId) === String(selectedWoId))?.planning || {};
                        const woTotalQty = (selectedWO?.items || []).reduce((sum, item) => sum + Number(item.qty), 0);
                        const planned = woPlanningEntry[month.id] || 0;
                        const percentOfWo = woTotalQty > 0 ? Math.round((planned / woTotalQty) * 100) : 0;

                        return (
                          <tr key={month.id}>
                            <td style={{ fontWeight: '600' }}>{month.label}</td>
                            <td className="text-center">
                              {isOwner ? (
                                <input
                                  type="number"
                                  min="0"
                                  className="text-center"
                                  style={{ width: '100px', padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border)', fontSize: 'var(--fs-lg)', fontWeight: '700' }}
                                  value={planned}
                                  onChange={(e) => handleUpdatePlanned(month.id, e.target.value)}
                                />
                              ) : <span style={{ fontSize: 'var(--fs-lg)', fontWeight: '700' }}>{planned}</span>}
                            </td>
                            <td style={{ verticalAlign: 'middle' }}>
                              <div style={{ width: '100%', maxWidth: '200px', height: 'var(--space-xs)', background: 'var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                                <div style={{ width: `${percentOfWo}%`, height: '100%', background: 'var(--accent)' }}></div>
                              </div>
                              <small style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)' }}>{percentOfWo}% of WO</small>
                            </td>
                            <td className="text-right">
                              {isOwner && planned > 0 && (
                                <button className="btn-ghost-small destructive" onClick={() => handleUpdatePlanned(month.id, 0)} title="Reset Month"><X size={14} /></button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {isOwner && (
                    <div className="card-footer" style={{ padding: 'var(--space-md) var(--space-lg)', background: 'var(--bg-subtle)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                      <p style={{ fontSize: 'var(--fs-base)', color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                        <Info size={14} /> Values are auto-saved to database on change.
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="card" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
                <BarChart3 size={48} style={{ margin: '0 auto var(--space-md)', opacity: 0.2 }} />
                <p className="empty-msg">Please select a context Work Order from the bar above to plan targets.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Delivery;