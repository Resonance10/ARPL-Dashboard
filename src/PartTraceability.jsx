// eslint-disable-next-line no-unused-vars
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FileText, CheckCircle2, Search, Download, X, PieChart, Filter, Users, Trash2, Upload, BarChart3, Activity, TrendingUp, AlertCircle, Package, LineChart as LineChartIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { API_BASE_URL } from "./constants";

const formatDate = (dateInput) => {
  if (!dateInput) return 'N/A';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return dateInput;

  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'long' }).toUpperCase();
  const year = date.getFullYear();

  const getOrdinal = (d) => {
    if (d > 3 && d < 21) return d + 'th';
    switch (d % 10) {
      case 1: return d + 'st';
      case 2: return d + 'nd';
      case 3: return d + 'rd';
      default: return d + 'th';
    }
  };

  return `${getOrdinal(day)} ${month} ${year}`;
};

/**
 * PartTraceability Component
 */
// eslint-disable-next-line no-unused-vars
const PartTraceability = ({ workOrders = [], programs = [], traceabilityData = [], setTraceabilityData, registeredUsers = [], currentUser = {}, permissions = {}, showToast, syncToDisk, handleFileDownload, handleFilePreview, addNotification, deliveryPlanning = [] }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [reassigningEntry, setReassigningEntry] = useState(null);
  const [targetUser, setTargetUser] = useState('');
  const [selectedWoMap, setSelectedWoMap] = useState({});

  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 1 + i));

  const [dashboardFilters, setDashboardFilters] = useState({
    programName: '',
    modelNumber: '',
    customerName: '',
    type: '',
    workOrderRef: '',
    year: new Date().getFullYear().toString(),
    month: '',
    woId: ''
  });
  const [reportFilters, setReportFilters] = useState({
    startDate: '',
    endDate: '',
    programName: '',
    modelNumber: '',
    customerName: '',
    status: '',
    workOrderRef: ''
  });
  const fileInputRef = useRef(null);
  const [uploadingEntry, setUploadingEntry] = useState(null); // { id, type, field }
  const [showDashFilters, setShowDashFilters] = useState(false);
  const [showReportFilters, setShowReportFilters] = useState(false);

  // Generate months for the current year
  const currentYear = parseInt(dashboardFilters.year) || new Date().getFullYear();
  const months = useMemo(() => {
    const m = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentYear, i, 1);
      m.push({
        id: `${currentYear}-${String(i + 1).padStart(2, '0')}`,
        label: date.toLocaleString('default', { month: 'long' })
      });
    }
    return m;
  }, [currentYear]);

  const handleEntryFileUpload = async (file) => {
    if (!file || !uploadingEntry) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.fileName) {
        const updated = traceabilityData.map(e =>
          e.id === uploadingEntry.id ? { ...e, [uploadingEntry.field]: data.fileName }
            : (uploadingEntry.workOrderId && uploadingEntry.actualSerialNo
              ? (String(e.workOrderId) === String(uploadingEntry.workOrderId) &&
                 (e.actualSerialNo || '').toString().trim().toUpperCase() === (uploadingEntry.actualSerialNo || '').toString().trim().toUpperCase() &&
                 e.type === uploadingEntry.type
                ? { ...e, [uploadingEntry.field]: data.fileName } : e)
              : e)
        );
        setTraceabilityData(updated);
        syncToDisk({ key: 'traceability', data: updated });
        showToast(`${uploadingEntry.field === 'pdiReport' ? 'PDI' : 'EOL'} report uploaded.`);
      }
    } catch (err) {
      showToast("Upload failed.", "error");
    }
    setUploadingEntry(null);
  };

  const handleApproval = (id, action) => {
    const entry = traceabilityData.find(e => e.id === id);
    if (!entry) return;

    let nextStatus = entry.status;
    let historyAction = '';

    if (action === 'approve') {
      if (['Pending Program Owner', 'Pending Program Head'].includes(entry.status)) {
        nextStatus = 'Approved';
        historyAction = 'Final Approval Granted';
        addNotification(entry.submittedBy, `Your ${entry.type} record for ${entry.modelNumber} has been fully approved.`, entry.id, 'motor_traceability');
      } else if (entry.status.startsWith('Pending')) {
        nextStatus = 'Pending Program Owner';
        historyAction = `${entry.status.replace('Pending ', '')} Approved`;
        addNotification('Program Owner', `${entry.type} record for ${entry.modelNumber} approved by ${entry.status.replace('Pending ', '')}. Pending your approval.`, entry.id, 'motor_traceability');
      }
    } else {
      nextStatus = 'Rejected';
      historyAction = 'Record Rejected';
      addNotification(entry.submittedBy, `Your ${entry.type} record for ${entry.modelNumber} was rejected.`, entry.id, 'motor_traceability');
    }

    const updated = traceabilityData.map(e => e.id === id ? {
      ...e,
      status: nextStatus,
      assignedTo: null, // Clear individual assignment when moving to next workflow stage
      isReassigned: false,
      reassignedTo: null,
      reassignedRole: null,
      history: [...e.history, {
        date: new Date().toISOString(),
        user: currentUser.username,
        action: historyAction,
        role: (currentUser.roles || []).join(', ')
      }]
    } : e);

    setTraceabilityData(updated);
    syncToDisk({ key: 'traceability', data: updated });
    showToast(`Record ${action === 'approve' ? 'Approved' : 'Rejected'}.`);
  };

  const handleFinalApproval = (group, assignedWoId = null) => {
    const ids = [];
    if (group.pdiEntry?.status === 'Pending Program Approval' || group.pdiEntry?.status === 'Pending Program Owner') ids.push(group.pdiEntry.id);
    if (group.eolEntry?.status === 'Pending Program Approval' || group.eolEntry?.status === 'Pending Program Owner') ids.push(group.eolEntry.id);
    if (ids.length === 0) return;
    let updated = [...traceabilityData];
    ids.forEach(id => {
      const entry = updated.find(e => e.id === id);
      if (!entry) return;
      updated = updated.map(e => e.id === id ? {
        ...e,
        ...(assignedWoId ? { workOrderId: assignedWoId } : {}),
        status: 'Approved',
        assignedTo: null,
        isReassigned: false,
        reassignedTo: null,
        reassignedRole: null,
        history: [...e.history, { date: new Date().toISOString(), user: currentUser.username, action: 'Final Approval Granted', role: (currentUser.roles || []).join(', ') }]
      } : e);
    });
    setTraceabilityData(updated);
    syncToDisk({ key: 'traceability', data: updated });
    showToast('Record(s) Approved.');
    setSelectedWoMap(prev => { const copy = { ...prev }; delete copy[group.key]; return copy; });
  };

  const handleFinalReject = (group) => {
    const ids = [];
    if (group.pdiEntry?.status === 'Pending Program Approval' || group.pdiEntry?.status === 'Pending Program Owner') ids.push(group.pdiEntry.id);
    if (group.eolEntry?.status === 'Pending Program Approval' || group.eolEntry?.status === 'Pending Program Owner') ids.push(group.eolEntry.id);
    if (ids.length === 0) return;
    let updated = [...traceabilityData];
    ids.forEach(id => {
      updated = updated.map(e => e.id === id ? {
        ...e,
        status: 'Rejected',
        assignedTo: null,
        isReassigned: false,
        reassignedTo: null,
        reassignedRole: null,
        history: [...e.history, { date: new Date().toISOString(), user: currentUser.username, action: 'Record Rejected', role: (currentUser.roles || []).join(', ') }]
      } : e);
    });
    setTraceabilityData(updated);
    syncToDisk({ key: 'traceability', data: updated });
    showToast('Record(s) Rejected.');
  };

  const getReassignedInfo = (entry) => {
    if (!entry) return null;
    if (entry.isReassigned && entry.reassignedTo) {
      return { username: entry.reassignedTo, role: entry.reassignedRole };
    }
    // Fallback: check history
    if (entry.history && entry.history.length > 0) {
      const lastEntry = entry.history[entry.history.length - 1];
      if (lastEntry && (lastEntry.action === 'Request Reassigned' || lastEntry.action === 'Record Reassigned')) {
        if (lastEntry.reassignedTo) {
          return { username: lastEntry.reassignedTo, role: lastEntry.reassignedRole };
        }
        // Parse from remarks: "Approval reassigned to username (role1, role2)"
        // or "Reassigned specifically to username (role1, role2)"
        const match = lastEntry.remarks?.match(/(?:reassigned to|specifically to)\s+(\S+)\s*\(([^)]+)\)/i);
        if (match) {
          return { username: match[1], role: match[2] };
        }
      }
    }
    return null;
  };

  const handleReassignRole = () => {
    if (!reassigningEntry || !targetUser) return;

    const selectedTarget = registeredUsers.find(u => u.username === targetUser);
    if (!selectedTarget) return;

    // Determine the appropriate status string based on the selected user's primary capability
    let nextStatus = reassigningEntry.status;
    const roles = selectedTarget.roles || [];

    if (roles.includes('Program Head') || roles.includes('Program Owner')) {
      nextStatus = 'Pending Program Owner';
    } else if (roles.includes('Functional Head')) {
      if (selectedTarget.domain === 'Prototyping') nextStatus = 'Pending Proto Functional Head';
      else if (selectedTarget.domain === 'Validation') nextStatus = 'Pending Validation Functional Head';
      else if (selectedTarget.domain === 'Program') nextStatus = 'Pending Program Owner';
    }

    const historyEntry = {
      date: new Date().toISOString(),
      user: currentUser.username,
      role: (currentUser.roles || []).join(', '),
      action: 'Record Reassigned',
      reassignedTo: selectedTarget.username,
      reassignedRole: roles.join(', '),
      remarks: `Reassigned specifically to ${selectedTarget.username} (${roles.join(', ')})`
    };

    const updated = traceabilityData.map(e => e.id === reassigningEntry.id ? {
      ...e,
      status: nextStatus,
      assignedTo: targetUser,
      isReassigned: true,
      reassignedTo: selectedTarget.username,
      reassignedRole: roles.join(', '),
      history: [...(e.history || []), historyEntry]
    } : e);

    setTraceabilityData(updated);
    syncToDisk({ key: 'traceability', data: updated });
    addNotification(targetUser, `A traceability record for ${reassigningEntry.modelNumber} has been reassigned specifically to you for approval.`, reassigningEntry.id, 'motor_traceability');
    setReassigningEntry(null);
    setTargetUser('');
    showToast(`Entry reassigned to ${selectedTarget.username}.`);
  };

  const handleDeleteEntry = (id) => {
    if (window.confirm("Are you sure you want to delete this traceability record?")) {
      const updated = traceabilityData.filter(e => e.id !== id);
      setTraceabilityData(updated);
      syncToDisk({ key: 'traceability', data: updated });
      showToast("Traceability record deleted.");
    }
  };

  // Calculate Actual data from Traceability (Global Map: { [woId|model|part|month]: count })
  const actualStatsMap = useMemo(() => {
    const approvedEntries = traceabilityData.filter(e => e.status === 'Approved');
    const unitProgress = {};

    approvedEntries.forEach(entry => {
      const sn = (entry.actualSerialNo || 'NA').trim().toUpperCase();
      const unitKey = `${entry.workOrderId}-${sn}`;

      // Fallback for historical data that might use 'date' or missing 'createdAt'
      const entryDate = entry.createdAt || entry.date || new Date().toISOString();

      if (!unitProgress[unitKey]) {
        unitProgress[unitKey] = {
          pdi: false,
          eol: false,
          date: entryDate,
          woId: entry.workOrderId,
          model: entry.modelNumber,
          part: entry.partNumber
        };
      }

      if (entry.type === 'PDI') unitProgress[unitKey].pdi = true;
      if (entry.type === 'EOL') unitProgress[unitKey].eol = true;
      if (new Date(entryDate) > new Date(unitProgress[unitKey].date)) {
        unitProgress[unitKey].date = entryDate;
      }
    });

    const stats = {};
    Object.values(unitProgress).forEach(unit => {
      if (unit.pdi && unit.eol) {
        const d = new Date(unit.date);
        // Ensure key is standardized YYYY-MM even if source date wasn't padded
        const monthKey = !isNaN(d.getTime())
          ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          : (unit.date || "").substring(0, 7);

        const key = `${unit.woId}|${unit.model}|${unit.part}|${monthKey}`;
        stats[key] = (stats[key] || 0) + 1;
      }
    });
    return stats;
  }, [traceabilityData]);

  const getStatus = (planned, actual) => {
    if (planned === 0 && actual === 0) return { label: 'No Target', color: 'var(--text-sub)', class: 'gray' };
    if (actual > planned) return { label: 'Overachieved', color: 'var(--accent)', class: 'indigo' };
    if (actual === planned && planned > 0) return { label: 'On Track', color: 'var(--emerald)', class: 'emerald' };
    if (actual < planned) return { label: 'Delay', color: '#ef4444', class: 'rose' };
    return { label: 'Pending', color: 'var(--text-sub)', class: 'gray' };
  };

  // Calculate Monthly Trends Data for the selected year and filters
  const monthlyTrends = useMemo(() => {
    const filteredWOs = (workOrders || []).filter(wo => {
      const program = programs.find(p => p.id === wo.programId);
      const programName = program ? program.name : 'N/A';
      const matchProgram = !dashboardFilters.programName || programName === dashboardFilters.programName;
      const matchCustomer = !dashboardFilters.customerName || (wo.customerName || '').toLowerCase().includes(dashboardFilters.customerName.toLowerCase());
      const matchType = !dashboardFilters.type || wo.type === dashboardFilters.type;
      const matchWorkOrder = !dashboardFilters.workOrderRef || wo.refId === dashboardFilters.workOrderRef;
      return matchProgram && matchCustomer && matchType && matchWorkOrder;
    });
    const filteredWoIds = filteredWOs.map(w => String(w.id));

    return months.map(m => {
      const planned = deliveryPlanning
        .filter(p => p.modelNumber && p.partNumber)
        .filter(p => filteredWoIds.includes(String(p.workOrderId)))
        .filter(p => {
          const matchModel = !dashboardFilters.modelNumber || (p.modelNumber || '').toLowerCase().includes(dashboardFilters.modelNumber.toLowerCase());
          return matchModel;
        })
        .reduce((sum, p) => sum + (p.planning[m.id] || 0), 0);

      const actual = Object.entries(actualStatsMap)
        .filter(([key]) => {
          const keyParts = key.split('|');
          const woId = String(keyParts[0]);
          const model = keyParts[1];
          const month = keyParts[3];

          const matchWO = filteredWoIds.includes(woId);
          const matchModel = !dashboardFilters.modelNumber || (model || '').toLowerCase().includes(dashboardFilters.modelNumber.toLowerCase());
          return matchWO && matchModel && month === m.id;
        })
        .reduce((sum, [_, v]) => sum + v, 0);

      return { month: m.label, planned, actual, id: m.id };
    });
  }, [months, deliveryPlanning, actualStatsMap, workOrders, programs, dashboardFilters]);

  // Consolidate PDI and EOL data for the Reports tab
  const consolidatedReports = useMemo(() => {
    const reportMap = new Map();

    // Pre-map Work Order details for fast lookup
    const woDetailsMap = new Map();
    (workOrders || []).forEach(wo => {
      const prog = programs.find(p => p.id === wo.programId);
      woDetailsMap.set(String(wo.id), {
        refId: wo.refId,
        customerName: wo.customerName || 'N/A',
        type: wo.type,
        programName: prog ? prog.name : 'N/A',
        workOrderTitle: wo.title
      });
    });

    traceabilityData.forEach(entry => {
      // Group strictly by workOrderId AND actualSerialNo
      const normalizedSerial = (entry.actualSerialNo || '').toString().trim().toUpperCase();
      const key = `${entry.workOrderId}-${normalizedSerial}`;
      const woInfo = woDetailsMap.get(String(entry.workOrderId)) || { refId: 'N/A', customerName: 'N/A', type: 'Internal', programName: 'N/A', workOrderTitle: 'N/A' };

      if (!reportMap.has(key)) {
        reportMap.set(key, {
          workOrderId: entry.workOrderId,
          workOrderTitle: woInfo.workOrderTitle,
          refId: woInfo.refId,
          customerName: woInfo.customerName,
          type: woInfo.type,
          programName: woInfo.programName,
          modelNumber: entry.modelNumber,
          partNumber: entry.partNumber,
          actualSerialNo: normalizedSerial, // Use normalized serial for consistency
          createdAt: entry.createdAt, // Use the creation date of the first entry for this consolidated record
          pdiReport: entry.type === 'PDI' ? entry.pdiReport : null,
          pdiStatus: entry.type === 'PDI' ? entry.status : null,
          eolReport: entry.type === 'EOL' ? entry.eolReport : null,
          eolStatus: entry.type === 'EOL' ? entry.status : null,
        });
      } else {
        const existing = reportMap.get(key);
        if (entry.type === 'PDI') {
          existing.pdiReport = entry.pdiReport;
          existing.pdiStatus = entry.status;
        } else if (entry.type === 'EOL') {
          existing.eolReport = entry.eolReport;
          existing.eolStatus = entry.status;
        }
        // Update model/part if not already set (e.g., if EOL came first)
        existing.modelNumber = existing.modelNumber === 'N/A' ? entry.modelNumber : existing.modelNumber;
        existing.partNumber = existing.partNumber === 'N/A' ? entry.partNumber : existing.partNumber;
        // Use the earliest creation date for the consolidated record
        existing.createdAt = existing.createdAt < entry.createdAt ? existing.createdAt : entry.createdAt;
      }
    });

    // No need for serialMismatch flag here, as entries are grouped by matching serial numbers.
    // If PDI and EOL have different serials, they will appear as separate entries.

    return Array.from(reportMap.values()).filter(report => {
      const matchProgram = !reportFilters.programName || report.programName === reportFilters.programName;
      const matchModel = !reportFilters.modelNumber || report.modelNumber.toLowerCase().includes(reportFilters.modelNumber.toLowerCase());
      const matchCustomer = !reportFilters.customerName || report.customerName.toLowerCase().includes(reportFilters.customerName.toLowerCase());
      const matchWorkOrder = !reportFilters.workOrderRef || report.refId === reportFilters.workOrderRef;
      const filterSerial = (reportFilters.actualSerialNo || '').trim().toUpperCase();
      const matchSerial = !reportFilters.actualSerialNo || report.actualSerialNo.includes(filterSerial);

      let matchDate = true;
      if (reportFilters.startDate || reportFilters.endDate) {
        const date = new Date(report.createdAt);
        if (reportFilters.startDate) {
          const start = new Date(reportFilters.startDate);
          start.setHours(0, 0, 0, 0);
          if (date < start) matchDate = false;
        }
        if (reportFilters.endDate) {
          const end = new Date(reportFilters.endDate);
          end.setHours(23, 59, 59, 999);
          if (date > end) matchDate = false;
        }
      }

      let matchStatus = true;
      if (reportFilters.status === 'Ready') {
        matchStatus = report.pdiStatus === 'Approved' && report.eolStatus === 'Approved';
      } else if (reportFilters.status === 'In Progress') { // Any record not fully approved
        matchStatus = (report.pdiStatus !== 'Approved' || report.eolStatus !== 'Approved');
      }

      return matchProgram && matchModel && matchCustomer && matchDate && matchStatus && matchWorkOrder && matchSerial;
    });
  }, [traceabilityData, workOrders, programs, reportFilters]);

  // Pre-calculate report statistics to avoid repetitive filtering in render
  const reportStatsMemo = useMemo(() => {
    return {
      total: consolidatedReports.length,
      pdiApproved: consolidatedReports.filter(r => r.pdiStatus === 'Approved').length,
      eolApproved: consolidatedReports.filter(r => r.eolStatus === 'Approved').length,
      fullyReady: consolidatedReports.filter(r => r.pdiStatus === 'Approved' && r.eolStatus === 'Approved').length
    };
  }, [consolidatedReports]);

  const handleDownloadAllReports = async () => {
    const zip = new JSZip();
    const rootFolder = zip.folder(`Traceability_Reports_${new Date().toISOString().split('T')[0]}`);

    const downloadTasks = [];
    consolidatedReports.forEach(report => {
      // Sanitize folder names to remove invalid characters for file systems
      const sanitize = (name) => (name || 'N_A').toString().replace(/[<>:"/\\|?*]/g, '_').trim();

      const woDir = sanitize(report.workOrderTitle);
      const modelDir = sanitize(report.modelNumber);
      const partDir = sanitize(report.partNumber);
      const basePath = `${woDir}/${modelDir}/${partDir}`;

      if (report.pdiReport) {
        downloadTasks.push({
          path: `${basePath}/PDI_${report.actualSerialNo || 'NA'}_${report.pdiReport}`,
          url: `${API_BASE_URL}/uploads/${report.pdiReport}`
        });
      }
      if (report.eolReport) {
        downloadTasks.push({
          path: `${basePath}/EOL_${report.actualSerialNo || 'NA'}_${report.eolReport}`,
          url: `${API_BASE_URL}/uploads/${report.eolReport}`
        });
      }
    });

    if (downloadTasks.length === 0) {
      showToast("No reports found in the current filtered list.", "warning");
      return;
    }

    showToast(`Generating structured ZIP for ${downloadTasks.length} files...`, "info");
    try {
      await Promise.all(downloadTasks.map(async (task) => {
        try {
          const response = await fetch(task.url);
          if (response.ok) {
            const blob = await response.blob();
            rootFolder.file(task.path, blob);
          }
        } catch (err) {
          console.error(`Download failed for: ${task.url}`, err);
        }
      }));

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `Motor_Traceability_Reports_${new Date().toISOString().split('T')[0]}.zip`);
    } catch (error) {
      console.error("ZIP Generation error", error);
      showToast("Failed to download reports as ZIP.", "error");
    }
  };

  const handleExportCSV = () => {
    if (consolidatedReports.length === 0) {
      showToast("No data to export", "warning");
      return;
    }
    const headers = ["Date", "Program", "Customer", "Type", "WO Title", "WO Ref", "Model", "Part", "Serial No", "PDI Status", "EOL Status"];
    const rows = consolidatedReports.map(r => [
      formatDate(r.createdAt),
      `"${(r.programName || '').replace(/"/g, '""')}"`,
      `"${(r.customerName || '').replace(/"/g, '""')}"`,
      r.type,
      `"${(r.workOrderTitle || '').replace(/"/g, '""')}"`,
      r.refId,
      r.modelNumber,
      r.partNumber,
      r.actualSerialNo,
      r.pdiStatus || 'N/A',
      r.eolStatus || 'N/A'
    ].join(","));

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Motor_Traceability_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Raw Dashboard Statistics Calculation (before filtering)
  const rawDashboardStats = useMemo(() => {
    const stats = {};

    // Filter work orders based on dashboard filters (program and customer)
    const filteredWOs = (workOrders || []).filter(wo => {
      const program = programs.find(p => p.id === wo.programId);
      const programName = program ? program.name : 'N/A';

      const matchProgram = !dashboardFilters.programName || programName === dashboardFilters.programName;
      const matchCustomer = !dashboardFilters.customerName || (wo.customerName || '').toLowerCase().includes(dashboardFilters.customerName.toLowerCase());
      const matchType = !dashboardFilters.type || wo.type === dashboardFilters.type;
      const matchWorkOrder = !dashboardFilters.workOrderRef || wo.refId === dashboardFilters.workOrderRef;

      return matchProgram && matchCustomer && matchType && matchWorkOrder;
    });

    const filteredWOIds = new Set(filteredWOs.map(wo => String(wo.id)));

    // Aggregate totals from filtered Work Orders per Part Number
    filteredWOs.forEach(wo => {
      const program = programs.find(p => p.id === wo.programId);
      const programName = program ? program.name : 'N/A';

      wo.items?.forEach(item => {
        const key = `${item.modelNumber}-${item.partNumber}`;
        if (!stats[key]) {
          stats[key] = {
            partNumber: item.partNumber,
            modelNumber: item.modelNumber,
            programName: programName,
            total: Number(item.qty),
            ready: 0,
            serials: []
          };
        } else {
          stats[key].total += Number(item.qty);
        }
      });
    });

    // Track approved units (Both PDI and EOL must be approved)
    // Only for the filtered WOs
    const unitProgress = {}; // key: "woId-unitIndex"
    (traceabilityData || []).forEach(entry => {
      if (!filteredWOIds.has(String(entry.workOrderId))) return;

      // Deduction logic updated: Group by serial number instead of index
      const normalizedSerial = (entry.actualSerialNo || '').toString().trim().toUpperCase();
      const key = `${entry.workOrderId}-${normalizedSerial}`;
      if (!unitProgress[key]) {
        unitProgress[key] = { pdi: false, eol: false, pdiExists: false, eolExists: false, partNumber: entry.partNumber, modelNumber: entry.modelNumber, woId: entry.workOrderId };
      }

      if (entry.status !== 'Approved') {
        // If not approved, it's not ready, but we still need to track its serial for comparison
        if (entry.type === 'PDI') unitProgress[key].pdiSerial = normalizedSerial;
        if (entry.type === 'EOL') unitProgress[key].eolSerial = normalizedSerial;
        return; // Only approved entries contribute to 'ready' count
      }

      if (entry.type === 'PDI') unitProgress[key].pdi = true;
      if (entry.type === 'EOL') unitProgress[key].eol = true;

      unitProgress[key].actualSerialNo = normalizedSerial;
    });

    Object.values(unitProgress).forEach(unit => {
      const statKey = `${unit.modelNumber}-${unit.partNumber}`;
      if (unit.pdi && unit.eol && stats[statKey]) {
        stats[statKey].ready += 1;
        if (unit.actualSerialNo && !stats[statKey].serials.includes(unit.actualSerialNo)) {
          stats[statKey].serials.push(unit.actualSerialNo);
        }
      }
    });

    return Object.values(stats);
  }, [workOrders, programs, traceabilityData, dashboardFilters.programName, dashboardFilters.customerName, dashboardFilters.type, dashboardFilters.workOrderRef]);

  // Filtered Dashboard Statistics
  const filteredDashboardStats = useMemo(() => {
    return rawDashboardStats.filter(stat => {
      const matchesModel = !dashboardFilters.modelNumber || stat.modelNumber.toLowerCase().includes(dashboardFilters.modelNumber.toLowerCase());
      return matchesModel;
    });
  }, [rawDashboardStats, dashboardFilters]);

  return (
    <div className="page-view module-shell">
      <div className="sub-navigation po-sub-nav">
        <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}><PieChart size={16} /> Dashboard</button>
        <button className={activeTab === 'program_approval' ? 'active' : ''} onClick={() => setActiveTab('program_approval')}><CheckCircle2 size={16} /> Program Approval</button>
        {((currentUser.roles || []).some(r => ['Administrator', 'Developer'].includes(r)) || (permissions.mt_reports && ((permissions.mt_reports.roles || []).some(r => (currentUser.roles || []).includes(r)) || (permissions.mt_reports.domains || []).includes(currentUser.domain)))) && (
          <button className={activeTab === 'reports' ? 'active' : ''} onClick={() => setActiveTab('reports')}><FileText size={16} /> Report</button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <div className="filter-bar" style={{ marginBottom: 'var(--space-md)' }}>
              <button className="btn-small" onClick={() => setShowDashFilters(!showDashFilters)} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <Filter size={14} /> {showDashFilters ? 'Hide' : 'Show'} Filters
              </button>
              {showDashFilters && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 6, padding: '5px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6 }}>
                <select style={{ fontSize: 10, padding: '4px 8px', width: 120 }} value={dashboardFilters.programName} onChange={(e) => setDashboardFilters({ ...dashboardFilters, programName: e.target.value, workOrderRef: '' })}>
                  <option value="">All Programs</option>
                  {[...new Set(programs.map(p => p.name))].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <input type="text" placeholder="Model..." style={{ fontSize: 10, padding: '4px 8px', width: 110 }} value={dashboardFilters.modelNumber} onChange={(e) => setDashboardFilters({ ...dashboardFilters, modelNumber: e.target.value })} />
                <select style={{ fontSize: 10, padding: '4px 8px', width: 100 }} value={dashboardFilters.type} onChange={(e) => setDashboardFilters({ ...dashboardFilters, type: e.target.value })}>
                  <option value="">All Types</option>
                  <option value="Customer">Customer</option>
                  <option value="Internal">Internal</option>
                </select>
                <select style={{ fontSize: 10, padding: '4px 8px', width: 120 }} value={dashboardFilters.workOrderRef} onChange={(e) => setDashboardFilters({ ...dashboardFilters, workOrderRef: e.target.value })}>
                  <option value="">All Work Orders</option>
                  {workOrders.filter(wo => { if (!dashboardFilters.programName) return true; const prog = programs.find(p => p.name === dashboardFilters.programName); return prog ? wo.programId === prog.id : true; }).map(wo => <option key={wo.id} value={wo.refId}>{wo.refId} - {wo.title}</option>)}
                </select>
                <select style={{ fontSize: 10, padding: '4px 8px', width: 90 }} value={dashboardFilters.year} onChange={(e) => setDashboardFilters({ ...dashboardFilters, year: e.target.value })}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select style={{ fontSize: 10, padding: '4px 8px', width: 100 }} value={dashboardFilters.month} onChange={(e) => setDashboardFilters({ ...dashboardFilters, month: e.target.value })}>
                  <option value="">All Months</option>
                  {months.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </div>
              )}
            </div>

            <div className="stats-grid">
              <motion.div whileHover={{ y: -4 }} className="stat-card">
                <span className="stat-label"><Package size={14} style={{ marginRight: 'var(--space-xs)' }} /> Total Unique Models</span>
                <div className="stat-value">{filteredDashboardStats.length}</div>
              </motion.div>
              <motion.div whileHover={{ y: -4 }} className="stat-card">
                <span className="stat-label"><CheckCircle2 size={14} style={{ marginRight: 'var(--space-xs)' }} /> Total Ready Units</span>
                <div className="stat-value" style={{ color: 'var(--emerald-text)' }}>{filteredDashboardStats.reduce((sum, s) => sum + s.ready, 0)}</div>
              </motion.div>
              <motion.div whileHover={{ y: -4 }} className="stat-card">
                <span className="stat-label"><TrendingUp size={14} style={{ marginRight: 'var(--space-xs)' }} /> Monthly Achievement</span>
                <div className="stat-value" style={{ color: 'var(--accent)' }}>
                  {(() => {
                    const filteredWOs = (workOrders || []).filter(wo => {
                      const program = programs.find(p => p.id === wo.programId);
                      const programName = program ? program.name : 'N/A';
                      const matchProgram = !dashboardFilters.programName || programName === dashboardFilters.programName;
                      const matchWorkOrder = !dashboardFilters.workOrderRef || wo.refId === dashboardFilters.workOrderRef;
                      return matchProgram && matchWorkOrder;
                    });
                    const filteredWoIds = filteredWOs.map(w => String(w.id));
                    const planned = deliveryPlanning
                      .filter(p => p.modelNumber && p.partNumber)
                      .filter(p => filteredWoIds.includes(String(p.workOrderId)))
                      .filter(p => {
                        const matchWO = filteredWoIds.includes(String(p.workOrderId));
                        const matchModel = !dashboardFilters.modelNumber || (p.modelNumber || '').toLowerCase().includes(dashboardFilters.modelNumber.toLowerCase());
                        return matchWO && matchModel;
                      })
                      .reduce((sum, p) => sum + Object.entries(p.planning)
                        .filter(([m]) => m.startsWith(dashboardFilters.month || dashboardFilters.year))
                        .reduce((ps, [_, v]) => ps + Number(v), 0)
                        , 0);
                    const actual = Object.entries(actualStatsMap)
                      .filter(([key]) => {
                        const keyParts = key.split('|');
                        const woId = keyParts[0];
                        const model = keyParts[1];
                        const month = keyParts[3];
                        const matchWO = filteredWoIds.includes(woId);
                        const matchModel = !dashboardFilters.modelNumber || (model || '').toLowerCase().includes(dashboardFilters.modelNumber.toLowerCase());
                        const matchTime = month.startsWith(dashboardFilters.month || dashboardFilters.year);
                        return matchWO && matchModel && matchTime;
                      })
                      .reduce((s, [_, v]) => s + v, 0);
                    return planned > 0 ? `${Math.round((actual / planned) * 100)}%` : '0%';
                  })()}
                </div>
              </motion.div>
              <div className="stat-card">
                <span className="stat-label"><AlertCircle size={14} style={{ marginRight: 'var(--space-xs)' }} /> Remaining Build</span>
                <div className="stat-value" style={{ color: 'var(--amber-text)' }}>{filteredDashboardStats.reduce((sum, s) => sum + (s.total - s.ready), 0)}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
              <div className="card">
                <div className="card-body">
                  <h3 className="section-heading accent-bottom"><BarChart3 size={20} color="var(--accent)" /> Build Volume (Planned vs Actual)</h3>
                  <div className="bar-chart-wrapper">
                    {monthlyTrends.map((data, i) => {
                      const maxVal = Math.max(...monthlyTrends.map(t => Math.max(t.planned, t.actual)), 1);
                      const plannedHeight = (data.planned / maxVal) * 100;
                      const actualHeight = (data.actual / maxVal) * 100;
                      const isCurrent = data.id === dashboardFilters.month;

                      return (
                        <div key={i} className="bar-group">
                          <div className="bars">
                            <motion.div initial={{ height: 0 }} animate={{ height: `${plannedHeight}%` }} title={`Planned: ${data.planned}`} className="bar planned" style={{ width: 'var(--space-sm)' }} />
                            <motion.div initial={{ height: 0 }} animate={{ height: `${actualHeight}%` }} title={`Actual: ${data.actual}`} className="bar actual" style={{ width: 'var(--space-sm)', background: 'var(--emerald-text)' }} />
                          </div>
                          <span className={`month-label${isCurrent ? ' active' : ''}`} style={{ fontSize: 'var(--fs-xs)' }}>{data.month.substring(0, 3)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="chart-legend" style={{ gap: 'var(--space-lg)', fontSize: 'var(--fs-xs)' }}>
                    <div className="legend-item"><div className="swatch" style={{ background: 'var(--accent)', opacity: 0.6 }}></div> Planned</div>
                    <div className="legend-item"><div className="swatch" style={{ background: 'var(--emerald-text)' }}></div> Achieved</div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-body">
                  <h3 className="section-heading accent-bottom"><LineChartIcon size={20} color="var(--accent)" /> Planned vs Actual Trend</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={monthlyTrends.map(m => ({ month: m.month.substring(0, 3), planned: m.planned, actual: m.actual }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-sub)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--text-sub)' }} />
                      <Tooltip labelStyle={{ color: 'var(--text)' }} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6 }} />
                      <Line type="monotone" dataKey="planned" stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--accent)', r: 4 }} activeDot={{ r: 6 }} name="Planned" />
                      <Line type="monotone" dataKey="actual" stroke="var(--emerald-text)" strokeWidth={2} dot={{ fill: 'var(--emerald-text)', r: 4 }} activeDot={{ r: 6 }} name="Actual" />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="chart-legend" style={{ gap: 'var(--space-lg)', fontSize: 'var(--fs-xs)', marginTop: 'var(--space-sm)' }}>
                    <div className="legend-item"><div className="swatch" style={{ background: 'var(--accent)' }}></div> Planned</div>
                    <div className="legend-item"><div className="swatch" style={{ background: 'var(--emerald-text)' }}></div> Actual</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card table-container">
              <div className="card-header">
                <h3 className="section-heading"><Activity size={20} /> Active Build Progress Breakdown</h3>
              </div>
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th style={{ width: '120px' }}>Period</th>
                    <th style={{ width: '180px' }}>Part Details</th>
                    <th>Model Number</th>
                    <th className="text-center">{dashboardFilters.month ? 'Monthly Target' : 'Annual Target'}</th>
                    <th className="text-center">{dashboardFilters.month ? 'Monthly Actual' : 'Annual Actual'}</th>
                    <th className="text-center">Status (Period)</th>
                    <th className="text-center">Progress (Total)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDashboardStats.map((stat, idx) => {
                    const percent = stat.total > 0 ? Math.round((stat.ready / stat.total) * 100) : 0;

                    // Find matching Work Orders to aggregate targets
                    const filteredWOs = (workOrders || []).filter(wo => {
                      const program = programs.find(p => p.id === wo.programId);
                      const programName = program ? program.name : 'N/A';
                      const matchProgram = !dashboardFilters.programName || programName === dashboardFilters.programName;
                      const matchCustomer = !dashboardFilters.customerName || (wo.customerName || '').toLowerCase().includes(dashboardFilters.customerName.toLowerCase());
                      const matchType = !dashboardFilters.type || wo.type === dashboardFilters.type;
                      const matchWorkOrder = !dashboardFilters.workOrderRef || wo.refId === dashboardFilters.workOrderRef;
                      const hasItem = wo.items?.some(i => i.modelNumber === stat.modelNumber && i.partNumber === stat.partNumber);
                      return matchProgram && matchCustomer && matchType && matchWorkOrder && hasItem;
                    });
                    const filteredWoIds = filteredWOs.map(w => String(w.id));

                    const periodPlanned = deliveryPlanning
                      .filter(p =>
                        filteredWoIds.includes(String(p.workOrderId)) &&
                        p.modelNumber === stat.modelNumber &&
                        p.partNumber === stat.partNumber
                      )
                      .reduce((sum, p) => {
                        if (dashboardFilters.month) return sum + (p.planning[dashboardFilters.month] || 0);
                        return sum + Object.entries(p.planning)
                          .filter(([m]) => m.startsWith(dashboardFilters.year))
                          .reduce((s, [_, v]) => s + v, 0);
                      }, 0);

                    const periodActual = Object.entries(actualStatsMap)
                      .filter(([key]) => {
                        const keyParts = key.split('|');
                        const woId = keyParts[0];
                        const model = keyParts[1];
                        const part = keyParts[2];
                        const month = keyParts[3];
                        const matchWO = filteredWoIds.includes(woId);
                        const matchModelPart = model === stat.modelNumber && part === stat.partNumber;
                        const matchPeriod = dashboardFilters.month ? month === dashboardFilters.month : month.startsWith(dashboardFilters.year);
                        return matchWO && matchModelPart && matchPeriod;
                      })
                      .reduce((sum, [_, v]) => sum + v, 0);

                    const status = getStatus(periodPlanned, periodActual);

                    return (
                      <tr key={idx}>
                        <td>
                          <span className="pill-badge blue" style={{ fontSize: 'var(--fs-xs)' }}>
                            {dashboardFilters.month ? months.find(m => m.id === dashboardFilters.month)?.label : `FY ${dashboardFilters.year}`}
                          </span>
                        </td>
                        <td style={{ fontWeight: '700' }}>{stat.partNumber}</td>
                        <td>{stat.modelNumber}</td>
                        <td className="text-center" style={{ fontWeight: '700' }}>{periodPlanned}</td>
                        <td className="text-center" style={{ color: periodActual > 0 ? 'var(--emerald-text)' : 'inherit', fontWeight: '700' }}>{periodActual}</td>
                        <td className="text-center">
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-xs)' }}>
                            <span className={`pill-badge ${status.class}`} style={{ fontSize: 'var(--fs-xs)' }}>{status.label}</span>
                            {status.label === 'Delay' && <span style={{ color: 'var(--rose-text)', fontSize: 'var(--fs-xs)', fontWeight: '800' }}>-{periodPlanned - periodActual}</span>}
                          </div>
                        </td>
                        <td style={{ minWidth: '160px' }}>
                          <div style={{ width: '100%', height: 'var(--space-sm)', background: 'var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                            <div style={{ width: `${percent}%`, height: '100%', background: percent === 100 ? 'var(--emerald-text)' : 'var(--accent)', transition: 'width 0.5s ease' }}></div>
                          </div>
                          <small style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)' }}>{percent}% Complete (Total: {stat.total})</small>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredDashboardStats.length === 0 && <tr><td colSpan="7" className="empty-msg">No data available from work orders or matching filters.</td></tr>}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'program_approval' && (
          <motion.div key="program_approval" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="card table-container">
              <div className="card-header"><h3>Program Owner Final Approval</h3></div>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={e => { handleEntryFileUpload(e.target.files[0]); e.target.value = ''; }} />
              {(() => {
                const roles = currentUser.roles || [];
                const canApprove = roles.includes('Program Owner') || roles.includes('Program Head') || roles.includes('Administrator');
                const approvableEntries = traceabilityData.filter(e =>
                  e.status === 'Pending Program Approval' || e.status === 'Pending Program Owner' || e.status === 'Pending Program Head'
                );
                // Group by model+part+serial
                const groups = {};
                approvableEntries.forEach(entry => {
                  const key = `${entry.modelNumber}|${entry.partNumber}|${entry.actualSerialNo}`;
                  if (!groups[key]) groups[key] = { key, modelNumber: entry.modelNumber, partNumber: entry.partNumber, actualSerialNo: entry.actualSerialNo, pdiEntry: null, eolEntry: null };
                  if (entry.type === 'PDI') groups[key].pdiEntry = entry;
                  else if (entry.type === 'EOL') groups[key].eolEntry = entry;
                });
                const groupedEntries = Object.values(groups);

                return (
                  <>
                    <table className="enterprise-table">
                      <thead>
                        <tr>
                          <th>Model / Part</th>
                          <th>Actual S/N</th>
                          <th>Work Order</th>
                          <th>PDI Report & Status</th>
                          <th>EOL Report & Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedEntries.map(group => (
                          <tr key={group.key}>
                            <td>
                              <div style={{ fontSize: 'var(--fs-base)', fontWeight: '600' }}>{group.modelNumber}</div>
                              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)' }}>{group.partNumber}</div>
                            </td>
                            <td>{group.actualSerialNo}</td>
                            <td>
                              {canApprove ? (
                                <select
                                  style={{ fontSize: 'var(--fs-sm)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', minWidth: '140px' }}
                                  value={selectedWoMap[group.key] || ''}
                                  onChange={(e) => setSelectedWoMap(prev => ({ ...prev, [group.key]: e.target.value }))}
                                >
                                  <option value="">Select Work Order</option>
                                  {workOrders.map(wo => {
                                    const prog = programs.find(p => p.id === wo.programId);
                                    return <option key={wo.id} value={wo.id}>{wo.refId} - {wo.title} {prog ? `(${prog.name})` : ''}</option>;
                                  })}
                                </select>
                              ) : (
                                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)' }}>—</span>
                              )}
                            </td>
                            <td>
                              {group.pdiEntry ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
                                    {group.pdiEntry.pdiReport ? (
                                      <>
                                        <button className="btn-icon-only" onClick={() => handleFilePreview(group.pdiEntry.pdiReport)} title="Preview PDI"><Search size={14} /></button>
                                        <button className="btn-icon-only success" onClick={() => handleFileDownload(group.pdiEntry.pdiReport)} title="Download PDI"><Download size={14} /></button>
                                      </>
                                    ) : (
                                      <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)' }}>No File</span>
                                    )}
                                  </div>
                                  <div>
                                    <span className={`pill-badge ${group.pdiEntry.status === 'Approved' ? 'emerald' : 'blue'}`} style={{ fontSize: 'var(--fs-xs)' }}>
                                      {group.pdiEntry.status}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)' }}>Not Submitted</span>
                              )}
                            </td>
                            <td>
                              {group.eolEntry ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
                                    {group.eolEntry.eolReport ? (
                                      <>
                                        <button className="btn-icon-only" onClick={() => handleFilePreview(group.eolEntry.eolReport)} title="Preview EOL"><Search size={14} /></button>
                                        <button className="btn-icon-only success" onClick={() => handleFileDownload(group.eolEntry.eolReport)} title="Download EOL"><Download size={14} /></button>
                                      </>
                                    ) : (
                                      <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)' }}>No File</span>
                                    )}
                                  </div>
                                  <div>
                                    <span className={`pill-badge ${group.eolEntry.status === 'Approved' ? 'emerald' : 'blue'}`} style={{ fontSize: 'var(--fs-xs)' }}>
                                      {group.eolEntry.status}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)' }}>Not Submitted</span>
                              )}
                            </td>
                            <td>
                              {canApprove && (group.pdiEntry?.status === 'Pending Program Approval' || group.eolEntry?.status === 'Pending Program Approval' || group.pdiEntry?.status === 'Pending Program Owner' || group.eolEntry?.status === 'Pending Program Owner') ? (
                                <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                                  <button className="btn-icon-only" style={{ color: 'var(--emerald-text)' }} onClick={() => handleFinalApproval(group, selectedWoMap[group.key] || null)} title="Final Approve"><CheckCircle2 size={14} /></button>
                                  <button className="btn-icon-only" style={{ color: 'var(--rose-text)' }} onClick={() => handleFinalReject(group)} title="Reject Final Approval"><X size={14} /></button>
                                  {group.pdiEntry && <button className="btn-icon-only" style={{ color: 'var(--accent)' }} onClick={() => setReassigningEntry(group.pdiEntry)} title="Reassign"><Users size={14} /></button>}
                                </div>
                              ) : (
                                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)' }}>—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {groupedEntries.length === 0 && <tr><td colSpan="6" className="empty-msg">No reports pending program approval.</td></tr>}
                      </tbody>
                    </table>
                  </>
                );
              })()}
            </div>
          </motion.div>
        )}

        {activeTab === 'reports' && ((currentUser.roles || []).some(r => ['Administrator', 'Developer'].includes(r)) || (permissions.mt_reports && ((permissions.mt_reports.roles || []).some(r => (currentUser.roles || []).includes(r)) || (permissions.mt_reports.domains || []).includes(currentUser.domain)))) && (
          <motion.div key="reports" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="filter-bar" style={{ marginBottom: 'var(--space-md)' }}>
              <button className="btn-small" onClick={() => setShowReportFilters(!showReportFilters)} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <Filter size={14} /> {showReportFilters ? 'Hide' : 'Show'} Report Filters
              </button>
              {showReportFilters && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 6, padding: '5px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6 }}>
                <input type="date" style={{ fontSize: 10, padding: '4px 8px', width: 110 }} value={reportFilters.startDate} onChange={(e) => setReportFilters({ ...reportFilters, startDate: e.target.value })} />
                <span style={{ fontSize: 9, color: 'var(--text-sub)' }}>to</span>
                <input type="date" style={{ fontSize: 10, padding: '4px 8px', width: 110 }} value={reportFilters.endDate} onChange={(e) => setReportFilters({ ...reportFilters, endDate: e.target.value })} />
                <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 2px' }} />
                <select style={{ fontSize: 10, padding: '4px 8px', width: 110 }} value={reportFilters.programName} onChange={(e) => setReportFilters({ ...reportFilters, programName: e.target.value })}>
                  <option value="">All Programs</option>
                  {[...new Set(programs.map(p => p.name))].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <input type="text" placeholder="Model" style={{ fontSize: 10, padding: '4px 8px', width: 100 }} value={reportFilters.modelNumber} onChange={(e) => setReportFilters({ ...reportFilters, modelNumber: e.target.value })} />
                <input type="text" placeholder="Serial" style={{ fontSize: 10, padding: '4px 8px', width: 100 }} value={reportFilters.actualSerialNo} onChange={(e) => setReportFilters({ ...reportFilters, actualSerialNo: e.target.value })} />
                <select style={{ fontSize: 10, padding: '4px 8px', width: 100 }} value={reportFilters.status} onChange={(e) => setReportFilters({ ...reportFilters, status: e.target.value })}>
                  <option value="">All Status</option>
                  <option value="Ready">Ready</option>
                  <option value="In Progress">In Progress</option>
                </select>
                <input type="text" placeholder="Customer" style={{ fontSize: 10, padding: '4px 8px', width: 100 }} value={reportFilters.customerName} onChange={(e) => setReportFilters({ ...reportFilters, customerName: e.target.value })} />
                <select style={{ fontSize: 10, padding: '4px 8px', width: 120 }} value={reportFilters.workOrderRef} onChange={(e) => setReportFilters({ ...reportFilters, workOrderRef: e.target.value })}>
                  <option value="">All Work Orders</option>
                  {workOrders
                    .filter(wo => {
                      if (!reportFilters.programName) return true;
                      const prog = programs.find(p => p.name === reportFilters.programName);
                      return prog ? wo.programId === prog.id : true;
                    })
                    .map(wo => <option key={wo.id} value={wo.refId}>{wo.refId} - {wo.title}</option>)}
                </select>
              </div>
              )}
            </div>

            <div className="stats-grid" style={{ marginBottom: 'var(--space-lg)' }}>
              <div className="stat-card">
                <span className="stat-label">Units in Filter</span>
                <div className="stat-value">{reportStatsMemo.total}</div>
              </div>
              <div className="stat-card">
                <span className="stat-label">PDI Approved</span>
                <div className="stat-value" style={{ color: 'var(--emerald-text)' }}>{reportStatsMemo.pdiApproved}</div>
              </div>
              <div className="stat-card">
                <span className="stat-label">EOL Approved</span>
                <div className="stat-value" style={{ color: 'var(--emerald-text)' }}>{reportStatsMemo.eolApproved}</div>
              </div>
              <div className="stat-card primary-stat">
                <span className="stat-label">Fully Ready</span>
                <div className="stat-value">{reportStatsMemo.fullyReady}</div>
              </div>
            </div>

            <div className="card table-container" style={{ padding: '0' }}>
              <div className="card-header">
                <h3>Consolidated Traceability Report</h3>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  <button className="btn-small" onClick={handleDownloadAllReports} title="Download all filtered PDI/EOL reports in a ZIP file"><Download size={14} /> Download Zip</button>
                  <button className="btn-small" onClick={handleExportCSV} title="Export this report to CSV format"><Download size={14} /> Export CSV</button>
                </div>
              </div>
              <div className="table-container">
                <table className="enterprise-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Program / Customer</th>
                      <th>WO / Serial No</th>
                      <th>Model / Part</th>
                      <th>PDI Report</th>
                      <th>EOL Report</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consolidatedReports.map((entry, idx) => (
                      <tr key={idx}>
                        <td>{formatDate(entry.createdAt)}</td>
                        <td><span className={`pill-badge ${entry.type === 'Customer' ? 'accent' : 'blue'}`} style={{ fontSize: 'var(--fs-xs)' }}>{entry.type}</span></td>
                        <td>
                          <div style={{ fontSize: 'var(--fs-base)', fontWeight: '600' }}>{entry.programName}</div>
                          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)' }}>{entry.customerName}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: 'var(--fs-base)', fontWeight: '700' }}>{entry.refId}</div>
                          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                            S/N: {entry.actualSerialNo || 'N/A'}
                            {entry.pdiStatus === 'Approved' && entry.eolStatus === 'Approved' && entry.actualSerialNo && (
                              // Marked as complete only if both PDI and EOL are fully approved for this exact serial
                              <CheckCircle2 size={14} color="var(--emerald-text)" title="PDI and EOL records exist for this serial" />
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: 'var(--fs-base)', fontWeight: '600' }}>{entry.modelNumber}</div>
                          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)' }}>{entry.partNumber}</div>
                        </td>
                        <td>
                          {entry.pdiReport ? (
                            <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
                              <button className="btn-icon-only" onClick={() => handleFilePreview(entry.pdiReport)} title="Preview PDI"><Search size={12} /></button>
                              <button className="btn-small" onClick={() => handleFileDownload(entry.pdiReport)} title={`Download PDI Report (Status: ${entry.pdiStatus})`}>
                                <FileText size={14} />
                                {entry.pdiStatus === 'Approved' ? ' View PDI' : ` PDI (${entry.pdiStatus})`}
                              </button>
                            </div>
                          ) : <span style={{ color: 'var(--text-sub)', fontSize: 'var(--fs-base)' }}>Not Submitted</span>}
                          <button className="btn-icon-only" style={{ color: 'var(--accent)', marginLeft: 4 }} onClick={() => { setUploadingEntry({ id: entry.id, workOrderId: entry.workOrderId, actualSerialNo: entry.actualSerialNo, type: 'PDI', field: 'pdiReport' }); fileInputRef.current?.click(); }} title="Upload PDI Report"><Upload size={12} /></button>
                        </td>
                        <td>
                          {entry.eolReport ? (
                            <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
                              <button className="btn-icon-only" onClick={() => handleFilePreview(entry.eolReport)} title="Preview EOL"><Search size={12} /></button>
                              <button className="btn-small" onClick={() => handleFileDownload(entry.eolReport)} title={`Download EOL Report (Status: ${entry.eolStatus})`}>
                                <FileText size={14} />
                                {entry.eolStatus === 'Approved' ? ' View EOL' : ` EOL (${entry.eolStatus})`}
                              </button>
                            </div>
                          ) : <span style={{ color: 'var(--text-sub)', fontSize: 'var(--fs-base)' }}>Not Submitted</span>}
                          <button className="btn-icon-only" style={{ color: 'var(--accent)', marginLeft: 4 }} onClick={() => { setUploadingEntry({ id: entry.id, workOrderId: entry.workOrderId, actualSerialNo: entry.actualSerialNo, type: 'EOL', field: 'eolReport' }); fileInputRef.current?.click(); }} title="Upload EOL Report"><Upload size={12} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Reassign Modal for Motor Traceability */}
      <AnimatePresence>
        {reassigningEntry && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="card" style={{ maxWidth: '400px', width: '90%', padding: 'var(--space-xl)', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <h3 style={{ margin: 0 }}>Reassign Traceability Approval</h3>
                <button className="btn-icon-only" onClick={() => setReassigningEntry(null)} title="Close"><X size={18} /></button>
              </div>
              <p style={{ fontSize: 'var(--fs-base)', color: 'var(--text-sub)', marginBottom: 'var(--space-lg)' }}>Select a specific individual to handle this approval instead of the generic role.</p>
              <div className="form-group">
                <label>Target Approver</label>
                <select
                  value={targetUser}
                  onChange={(e) => setTargetUser(e.target.value)}
                  style={{ width: '100%', padding: 'var(--space-sm) var(--space-md)', fontSize: 'var(--fs-md)' }}
                >
                  <option value="">-- Select User --</option>
                  {registeredUsers
                    .filter(u => (u.roles || []).some(r => ['Functional Head', 'Program Owner', 'Program Head', 'Mechanical Head', 'Electrical Head', 'Production Head', 'Head of Technology'].includes(r)) && u.username !== currentUser.username)
                    .map(u => <option key={u.username} value={u.username}>{u.username} ({(u.roles || []).join(', ')})</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-xl)' }}>
                <button className="btn-primary" onClick={handleReassignRole}>Confirm Reassign</button>
                <button className="btn-small" onClick={() => setReassigningEntry(null)}>Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default PartTraceability;