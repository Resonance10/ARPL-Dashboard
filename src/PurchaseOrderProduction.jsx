import React, { useState, useMemo, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Plus, FileText, CheckCircle2, FileUp, DollarSign, MessageSquare, Info, Download, ClipboardList, Layers, Search, CreditCard, Trash2, History, Clock, X, Briefcase, Users, Eye, Printer, ChevronUp, ChevronDown } from 'lucide-react';
import { API_BASE_URL } from "./constants";

const CURRENCIES = [
  { code: 'INR', symbol: '₹' },
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' }
];

const getCurrencySymbol = (code) => CURRENCIES.find(c => c.code === code)?.symbol || '₹';

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
 * PurchaseOrderProduction Component
 * Standalone page for Production-based Purchase Requests.
 * Excludes Vendor and Part tabs as per requirements.
 */
const PurchaseOrderProduction = ({ programs = [], workOrders = [], registeredUsers = [], currentUser = {}, poRequests = [], setPoRequests, handleWorkflowAction, addNotification, showToast, generateRefId, syncToDisk, handleFilePreview, handleFileDownload, handleExportPDF, readOnly = false }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [viewingRequest, setViewingRequest] = useState(null);
  const [isReassigning, setIsReassigning] = useState(false);
  const [targetReassignUser, setTargetReassignUser] = useState('');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [reportFilters, setReportFilters] = useState({
    program: '',
    prId: ''
  });
  const [myRequestFilters, setMyRequestFilters] = useState({
    status: '',
    program: ''
  });
  const [showMyReqFilters, setShowMyReqFilters] = useState(false);
  const [showReportFilters, setShowReportFilters] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    programName: '',
    owner: '',
    workOrderId: '',
    productionHead: '',
    totalPrice: '',
    currency: 'INR',
    remarks: '',
    fileName: ''
  });
  const [poForm, setPoForm] = useState({
    selectedProgram: '',
    selectedPrId: '',
    poDetails: [{ poNo: '', amount: '', poFile: '', generatedDate: formatDate(new Date()), currency: 'INR' }] // Added generatedDate, poFile and currency
  });

  /**
   * Helper component to render a compact 4-stage status stepper in tables
   */
  const StatusStepper = ({ status }) => {
    const stages = [
      { id: 'Pending Owner', icon: <Clock size={12} />, productionId: 'Pending Production Head' },
      { id: 'Pending Admin', icon: <FileText size={12} /> },
      { id: 'Pending Head', icon: <Users size={12} />, productionId: 'Pending Program Head' },
      { id: 'Approved', icon: <CheckCircle2 size={12} /> }
    ];
    
    // Find index based on current status
    let currentIndex = stages.findIndex(s => s.id === status || s.productionId === status);
    
    // Special handling for Approved state
    if (status === 'Approved') currentIndex = 4;
    
    const isCorrection = status === 'Correction Required';
    const isTerminal = ['Rejected', 'Cancelled'].includes(status);

    return (
      <div className="status-stepper-container" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--space-xs)' }} aria-label={`Current status: ${status}`}>
        {stages.map((stage, i) => {
          let nodeColor = 'rgba(var(--text-sub-rgb), 0.1)';
          let iconColor = 'var(--text-sub)';
          let isDone = i < currentIndex;
          let isActive = i === currentIndex;

          if (isDone) {
            nodeColor = 'var(--emerald)'; 
            iconColor = '#ffffff';
          } else if (isActive) {
            nodeColor = isCorrection ? 'var(--warning)' : 'var(--accent)'; 
            iconColor = '#ffffff';
          } else if (isTerminal) {
            nodeColor = 'var(--error)'; 
            iconColor = '#ffffff';
          }

          return (
            <React.Fragment key={i}>
              <div
                className={`stepper-node ${isDone ? 'node-done' : isActive ? (isCorrection ? 'node-alert' : 'node-active') : isTerminal ? 'node-failed' : 'node-upcoming'}`}
                title={stage.productionId || stage.id}
                style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: nodeColor, color: iconColor, flexShrink: 0, zIndex: 2,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                {isDone ? <CheckCircle2 size={14} /> : stage.icon}
              </div>
              {i < stages.length - 1 && (
                <div style={{ width: '12px', height: '2px', backgroundColor: isDone ? 'var(--emerald)' : 'var(--border)', flexShrink: 0, opacity: 0.6 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  // Sub-navigation for Production PO (Excludes Vendors/Parts, includes Report)
  const userRoles = currentUser.roles || [];

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <PieChart size={16} />, hidden: !(userRoles.some(r => ['Administrator', 'Program Owner', 'Program Head', 'Production Head', 'Electrical Head', 'Developer'].includes(r))) },
    { id: 'po_request', label: 'New Request', icon: <Plus size={16} /> },
    { id: 'my_request', label: 'My Requests', icon: <FileText size={16} /> },
    { id: 'create_po_form', label: 'Create PO Form', icon: <CreditCard size={16} />, hidden: !(userRoles.some(r => ['Administrator', 'Program Admin', 'Developer', 'Program Head', 'Production Head', 'Electrical Head'].includes(r))) },
    { id: 'approvals', label: 'Approvals', icon: <CheckCircle2 size={16} />, hidden: !(userRoles.some(r => ['Production Head', 'Program Head', 'Electrical Head'].includes(r))) },
    { id: 'report', label: 'Report', icon: <FileText size={16} />, hidden: !(userRoles.some(r => ['Administrator', 'Program Admin', 'Developer', 'Program Head', 'Production Head', 'Electrical Head'].includes(r))) },
  ];

  // Check if Dashboard is allowed for current role
  const isDashboardAllowed = useMemo(() =>
    (currentUser.roles || []).some(r => ['Administrator', 'Program Owner', 'Program Head', 'Production Head', 'Electrical Head', 'Developer'].includes(r))
    , [currentUser.roles]);

  // Redirect if unauthorized to view current tab (prevents "glimpse")
  useEffect(() => {
    if (activeTab === 'dashboard' && !isDashboardAllowed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab('po_request');
    }
  }, [activeTab, isDashboardAllowed]);

  // Handle Production PO Submission
  const handleSubmit = () => {
    if (!formData.title || !formData.programName || !formData.productionHead || !formData.totalPrice || !formData.fileName) {
      showToast("Please fill in all mandatory fields.", "warning");
      return;
    }

    const newRequest = {
      id: Date.now(),
      refId: generateRefId('PR', poRequests), // Logic in App.jsx updated to MMYYYY
      title: formData.title,
      programName: formData.programName,
      programOwner: formData.owner,
      workOrderId: formData.workOrderId,
      productionHead: formData.productionHead,
      totalPrice: formData.totalPrice,
      remarks: formData.remarks,
      fileName: formData.fileName,
      isProduction: true,
      currency: formData.currency,
      status: 'Pending Production Head',
      requestedBy: currentUser.username,
      createdAt: new Date().toISOString(),
      history: [{
        date: new Date().toISOString(),
        user: currentUser.username,
        action: 'Production Request Submitted',
        remarks: 'Initial Submission'
      }]
    };

    const updated = [newRequest, ...poRequests];
    setPoRequests(updated);
    syncToDisk({ key: 'poRequests', data: updated });
    addNotification(formData.productionHead, `New Production Request: ${formData.title}`, newRequest.id);
    showToast("Purchase Request submitted for Production Head approval.");
    setActiveTab('my_request');
  };

  // Handle BOM File Upload
  const handleLocalFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setUploadProgress(1);
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE_URL}/api/upload`);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        };
        xhr.onload = () => {
          const fileName = JSON.parse(xhr.responseText).fileName;
          setFormData({ ...formData, fileName });
          showToast("BOM file uploaded successfully.");
          setTimeout(() => setUploadProgress(0), 1500);
        };
        xhr.onerror = () => { throw new Error('Upload failed'); };
        const fd = new FormData();
        fd.append('file', file);
        xhr.send(fd);
        // eslint-disable-next-line no-unused-vars
      } catch (error) {
        setUploadProgress(0);
        showToast("Failed to upload BOM.", "error");
      }
    }
  };

  // Handle Individual PO File Upload
  const handlePOFileUpload = async (index, file) => {
    if (!file) return;
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/api/upload`);
      xhr.onload = () => {
        const fileName = JSON.parse(xhr.responseText).fileName;
        updatePoRow(index, 'poFile', fileName);
        showToast("PO file uploaded successfully.");
      };
      xhr.onerror = () => { throw new Error('Upload failed'); };
      const fd = new FormData();
      fd.append('file', file);
      xhr.send(fd);
      // eslint-disable-next-line no-unused-vars
    } catch (error) {
      showToast("Failed to upload PO document.", "error");
    }
  };

  // Helper functions for PO rows
  const addPoRow = () => {
    setPoForm(prev => ({
      ...prev, // PO No. will be manual entry, not auto-generated here
      poDetails: [...prev.poDetails, { poNo: '', amount: '', poFile: '', generatedDate: formatDate(new Date()) }]
    }));
  };

  const removePoRow = (index) => {
    if (poForm.poDetails.length <= 1) return;
    const updated = poForm.poDetails.filter((_, i) => i !== index);
    setPoForm(prev => ({ ...prev, poDetails: updated }));
  };

  const updatePoRow = (index, field, value) => {
    const updated = [...poForm.poDetails];
    updated[index][field] = value;
    setPoForm(prev => ({ ...prev, poDetails: updated }));
  };

  const handleCreatePOs = () => {
    if (poForm.poDetails.some(po => !po.poNo || po.poNo.trim() === '')) {
      showToast("Please enter a PO Number for all Purchase Orders.", "warning");
      return;
    }
    if (!poForm.selectedPrId) {
      showToast("Please select a Purchase Request ID.", "warning");
      return;
    }
    if (poForm.poDetails.some(po => !po.amount || parseFloat(po.amount) <= 0)) {
      showToast("Please enter a valid amount for all Purchase Orders.", "warning");
      return;
    }

    const parentPr = productionRequests.find(req => String(req.id) === poForm.selectedPrId);
    if (!parentPr) {
      showToast("Selected Purchase Request not found.", "error");
      return;
    }

    const newPOs = poForm.poDetails.map(po => ({
      id: Date.now() + Math.random(), // Unique ID for each PO, using Math.random for uniqueness in this mock setup.
      refId: po.poNo, // Manual PO number entry.
      type: 'PO', // Mark as a Purchase Order
      prId: parentPr.id, // Link to the parent Purchase Request
      programName: parentPr.programName, // Store program name for reporting filters
      prRefId: parentPr.refId, // Store parent PR's refId for easy lookup
      title: `PO for PR: ${parentPr.refId} - ${parentPr.title}`, // Default title for the PO
      amount: parseFloat(po.amount),
      currency: po.currency || 'INR',
      poFile: po.poFile, // Store the uploaded PO file reference
      status: 'Created', // Initial status for a newly created PO
      generatedDate: po.generatedDate, // Store the generated date.
      createdAt: new Date().toISOString(),
      requestedBy: currentUser.username, // Admin/Program Admin creating the PO
      history: [{
        date: new Date().toISOString(),
        user: currentUser.username,
        action: 'Purchase Order Created',
        remarks: `Created for Purchase Request ${parentPr.refId}`
      }]
    }));

    const updatedPoRequests = [...poRequests, ...newPOs];
    setPoRequests(updatedPoRequests);
    syncToDisk({ key: 'poRequests', data: updatedPoRequests });
    showToast(`Successfully created ${newPOs.length} Purchase Order(s).`);

    // Reset form
    setPoForm({
      selectedProgram: '',
      selectedPrId: '',
      poDetails: [{ poNo: '', amount: '', poFile: '', generatedDate: formatDate(new Date()) }]
    });
    setActiveTab('my_request'); // Or back to dashboard
  };

  const getReassignedInfo = (req) => {
    if (!req) return null;
    if (req.isReassigned && req.reassignedTo) {
      return { username: req.reassignedTo, role: req.reassignedRole };
    }
    // Fallback: check history
    if (req.history && req.history.length > 0) {
      const lastEntry = req.history[req.history.length - 1];
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

  const handleReassignRequest = () => {
    if (!viewingRequest || !targetReassignUser) return;

    const targetUser = registeredUsers.find(u => u.username === targetReassignUser);
    if (!targetUser) return;

    const historyEntry = {
      date: new Date().toISOString(),
      user: currentUser.username,
      role: (currentUser.roles || []).join(', '),
      action: 'Request Reassigned',
      reassignedTo: targetUser.username,
      reassignedRole: (targetUser.roles || []).join(', '),
      remarks: `Approval reassigned to ${targetUser.username} (${(targetUser.roles || []).join(', ')})`
    };

    const fieldToUpdate = viewingRequest.status === 'Pending Production Head' ? 'productionHead' : 'programOwner';

    const updated = poRequests.map(r => r.id === viewingRequest.id ? {
      ...r,
      [fieldToUpdate]: targetReassignUser,
      isReassigned: true,
      reassignedTo: targetUser.username,
      reassignedRole: (targetUser.roles || []).join(', '),
      history: [...(r.history || []), historyEntry]
    } : r);

    setPoRequests(updated);
    syncToDisk({ key: 'poRequests', data: updated });
    addNotification(targetReassignUser, `A production request "${viewingRequest.title}" has been reassigned to you for approval.`, viewingRequest.id);
    setViewingRequest(null);
    setIsReassigning(false);
    setTargetReassignUser('');
    showToast(`Request reassigned to ${targetUser.username}.`);
  };

  // Helper to find associated POs for a PR
  const getPOsForPr = (prId) => {
    return poRequests.filter(req => req.type === 'PO' && String(req.prId) === String(prId));
  };

  // Filter Production requests for this module
  const productionRequests = poRequests.filter(req => req.isProduction === true);

  // Determine who approved the previous stage based on history
  const previousApproverInfo = useMemo(() => {
    if (!viewingRequest || !viewingRequest.history) return null;
    // Look for the most recent approval action in history
    return [...viewingRequest.history].reverse().find(h => h.action.includes('Approval Granted'));
  }, [viewingRequest]);

  // Dashboard Statistics for Production
  const productionStats = useMemo(() => {
    const total = productionRequests.length;
    const pendingProductionHead = productionRequests.filter(req => req.status === 'Pending Production Head').length; // This is for PRs.
    const pendingProgramHead = productionRequests.filter(req => req.status === 'Pending Program Head').length;
    const approved = productionRequests.filter(req => req.status === 'Approved').length;
    const rejected = productionRequests.filter(req => req.status === 'Rejected').length;
    const correctionRequired = productionRequests.filter(req => req.status === 'Correction Required').length;

    return {
      total,
      pendingProductionHead,
      pendingProgramHead,
      approved,
      rejected,
      correctionRequired,
      pendingTotal: pendingProductionHead + pendingProgramHead + correctionRequired
    };
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
  }, [productionRequests]);

  // Filtered PO Report Data (POs generated from PRs)
  const filteredPoReportData = useMemo(() => {
    return poRequests.filter(req => { // Filter all poRequests, not just productionRequests.
      const matchPrId = !reportFilters.prId || req.prRefId === reportFilters.prId; // Filter by prRefId.
      const matchProgram = !reportFilters.program || req.programName === reportFilters.program;
      const isPO = req.type === 'PO' && req.prId; // Ensure it's a generated PO.

      return isPO && matchPrId && matchProgram;
    });
  }, [poRequests, reportFilters]);

  const reportStats = useMemo(() => {
    const totalValue = filteredPoReportData.reduce((sum, po) => sum + (Number(po.amount) || 0), 0);
    return {
      totalValue,
      count: filteredPoReportData.length,
      uniquePrs: new Set(filteredPoReportData.map(po => po.prRefId)).size
    };
  }, [filteredPoReportData]);

  const statusChartData = useMemo(() => [
    { label: 'Approved', value: productionStats.approved, color: '#10b981' },
    { label: 'Pending', value: productionStats.pendingProductionHead + productionStats.pendingProgramHead, color: '#6366f1' },
    { label: 'Correction', value: productionStats.correctionRequired, color: '#f59e0b' },
    { label: 'Rejected', value: productionStats.rejected, color: '#ef4444' }
  ], [productionStats]);

  const chartGradient = useMemo(() => {
    const total = statusChartData.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return 'var(--border)';
    let current = 0;
    const segments = statusChartData.map(item => {
      const start = current;
      current += (item.value / total) * 100;
      return `${item.color} ${start}% ${current}%`;
    });
    return `conic-gradient(${segments.join(', ')})`;
  }, [statusChartData]);

  const handleExportPoReport = () => { // Renamed function.
    if (filteredPoReportData.length === 0) {
      showToast("No data to export", "warning");
      return;
    }

    const headers = ["PR ID", "PO ID", "Date", "Amount"];
    const rows = filteredPoReportData.map(req => [ // Exporting PO data.
      req.prRefId || 'N/A',
      req.refId,
      formatDate(req.createdAt),
      req.amount
    ].join(","));

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri); // Changed filename.
    link.setAttribute("download", `ARPL_Generated_PO_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page-view module-shell">
      <div className="sub-navigation po-sub-nav">
        {navItems.filter(item => !item.hidden).map((item) => (
          <motion.button
            key={item.id}
            whileTap={{ scale: 0.95 }}
            className={activeTab === item.id ? 'active' : ''}
            onClick={() => setActiveTab(item.id)}
          >
            {item.icon} {item.label}
          </motion.button>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="production-content-container"
      >
        {activeTab === 'dashboard' && isDashboardAllowed && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="po-dashboard-content">
            <div className="welcome-banner" style={{ marginBottom: 'var(--space-xl)', padding: 'var(--space-md)', borderRadius: 'var(--radius-xl)', background: 'linear-gradient(135deg, var(--accent-bg), transparent 80%)', border: '1px solid var(--border)' }}>
              <h2 style={{ margin: 0, fontSize: 'var(--fs-2xl)', fontWeight: '800', color: 'var(--text-h)' }}>Welcome back, {currentUser.fullName || currentUser.username}!</h2>
              <p style={{ color: 'var(--text-sub)', fontSize: 'var(--fs-md)', marginTop: 'var(--space-sm)' }}>Here is a live summary of your production purchase request ecosystem and procurement activities.</p>
            </div>

            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: 'var(--fs-md)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}><PieChart size={16} /> Key Performance Indicators</h3>
            </div>

            <motion.div
              className="stats-grid"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.08 } } }}
            >
              <motion.div variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }} whileHover={{ y: -4 }} className="stat-card">
                <span className="stat-label"><ClipboardList size={14} /> Total Production Requests</span>
                <div className="stat-value">{productionStats.total}</div>
              </motion.div>

              <motion.div variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }} whileHover={{ y: -4 }} className="stat-card">
                <span className="stat-label"><Clock size={14} /> Pending Approval</span>
                <div className="stat-value" style={{ color: 'var(--accent)' }}>{productionStats.pendingTotal}</div>
              </motion.div>

              <motion.div variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }} whileHover={{ y: -4 }} className="stat-card">
                <span className="stat-label"><CheckCircle2 size={14} /> Approved Requests</span>
                <div className="stat-value" style={{ color: 'var(--emerald)' }}>{productionStats.approved}</div>
              </motion.div>

              <motion.div variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }} whileHover={{ y: -4 }} className="stat-card">
                <span className="stat-label"><History size={14} /> Correction Required</span>
                <div className="stat-value" style={{ color: 'var(--amber-text)' }}>{productionStats.correctionRequired}</div>
              </motion.div>

              <motion.div variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }} whileHover={{ y: -4 }} className="stat-card">
                <span className="stat-label"><X size={14} /> Rejected Requests</span>
                <div className="stat-value" style={{ color: 'var(--rose-text)' }}>{productionStats.rejected}</div>
              </motion.div>
            </motion.div>

            <div className="charts-grid" style={{ marginTop: 'var(--space-md)' }}>
              <div className="card chart-card">
                <h4 style={{ marginBottom: 'var(--space-md)', fontSize: 'var(--fs-md)' }}>Approval Status Distribution</h4>
                {statusChartData.some(s => s.value > 0) ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xl)' }}>
                    <div style={{ width: '140px', height: '140px', borderRadius: '50%', background: chartGradient, flexShrink: 0 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', fontSize: 'var(--fs-base)' }}>
                      {statusChartData.map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                          <span style={{ color: 'var(--text-sub)' }}>{s.label}</span>
                          <span style={{ fontWeight: '600', marginLeft: 'auto' }}>{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : <p className="empty-msg">No data available yet.</p>}
              </div>
            </div>
          </motion.div>
        )}
        {activeTab === 'po_request' && (
          <div className="po-request-container">
            <div className="card po-form-section">
              <div className="card-header gradient">
                <div>
                  <h3 style={{ margin: 0, fontSize: 'var(--fs-lg)', fontWeight: '700', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <ClipboardList size={22} color="var(--accent)" /> New Production Request
                  </h3>
                  <p style={{ margin: 'var(--space-xs) 0 0 0', fontSize: 'var(--fs-base)', color: 'var(--text-sub)' }}>Generate professional purchase requests for production-scale inventory.</p>
                </div>
              </div>
              <div className="card-body form-grid">
                <div className="form-group span-2"><label>Request Title <span className="mandatory">*</span></label>
                  <input type="text" placeholder="e.g., Q4 Chassis Components Production Run" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                </div>
                <div className="form-group"><label>Program Name <span className="mandatory">*</span></label>
                  <select value={formData.programName} onChange={(e) => { const prog = programs.find(p => p.name === e.target.value); setFormData({ ...formData, programName: e.target.value, owner: prog ? prog.owner : '', workOrderId: '' }); }}>
                    <option value="">Select Target Program</option>
                    {programs.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Program Owner</label>
                  <input type="text" placeholder="Auto-populated" value={formData.owner} readOnly />
                </div>
                <div className="form-group"><label>Work Order (Optional)</label>
                  <select value={formData.workOrderId} onChange={(e) => setFormData({ ...formData, workOrderId: e.target.value })}>
                    <option value="">Select Work Order</option>
                    {workOrders.filter(wo => { if (!formData.programName) return true; const prog = programs.find(p => p.name === formData.programName); return prog ? wo.programId === prog.id : true; }).map(wo => (<option key={wo.id} value={wo.id}>{wo.refId} - {wo.title}</option>))}
                  </select>
                </div>
                <div className="form-group"><label>Production Head Approval <span className="mandatory">*</span></label>
                  <select value={formData.productionHead} onChange={(e) => setFormData({ ...formData, productionHead: e.target.value })}>
                    <option value="">Select Production Head</option>
                    {registeredUsers.filter(u => (u.roles || []).includes('Production Head')).map(u => <option key={u.username} value={u.username}>{u.fullName.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="card po-form-section">
              <div className="card-header gradient">
                <div>
                  <h3 style={{ margin: 0, fontSize: 'var(--fs-lg)', fontWeight: '700', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <Layers size={22} color="var(--accent)" /> BOM Data & Financials
                  </h3>
                  <p style={{ margin: 'var(--space-xs) 0 0 0', fontSize: 'var(--fs-base)', color: 'var(--text-sub)' }}>Upload bill of materials and set pricing details.</p>
                </div>
              </div>
              <div className="card-body form-grid">
                <div className="form-group span-2"><label>BOM Upload (Excel/CSV) <span className="mandatory">*</span></label>
                  <div className="file-dropzone" onClick={() => document.getElementById('bom-file-input').click()}>
                    <div className="dropzone-icon"><FileUp size={28} /></div>
                    <div>
                      <p style={{ fontSize: 'var(--fs-lg)', fontWeight: '600', margin: 0, color: 'var(--text-h)' }}>
                        {formData.fileName ? <>✓ {formData.fileName}</> : 'Click or Drag BOM File'}
                      </p>
                      <p style={{ fontSize: 'var(--fs-base)', margin: 'var(--space-xs) 0 0 0', color: 'var(--text-sub)' }}>
                        {formData.fileName ? 'File attached' : 'Supported formats: .XLSX, .CSV (Max 25MB)'}
                      </p>
                    </div>
                    <input type="file" accept=".csv, .xlsx, .xls" style={{ display: 'none' }} id="bom-file-input" onChange={handleLocalFileChange} />
                  </div>
                  {uploadProgress > 0 && (
                    <div className="upload-progress-container" style={{ marginTop: 'var(--space-sm)' }}>
                      <div className={`upload-progress-bar ${uploadProgress === 100 ? 'complete' : ''}`} style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                  )}
                </div>
                <div className="form-group"><label>Total Price (Excl. Tax) <span className="mandatory">*</span></label>
                  <div className="gap-row">
                    <select style={{ width: '80px' }} value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })}>
                      {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </select>
                    <input type="number" placeholder="0.00" style={{ fontWeight: '700', color: 'var(--accent)' }} value={formData.totalPrice} onChange={(e) => setFormData({ ...formData, totalPrice: e.target.value })} />
                  </div>
                </div>
                <div className="form-group span-2"><label>Remarks</label>
                  <textarea placeholder="Enter any production-specific instructions or delivery milestones..." rows="3" value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}></textarea>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setActiveTab('dashboard')}>Cancel</button>
              {!readOnly && (
                <button className="btn-primary" style={{ padding: '0.7rem var(--space-xl)' }} onClick={handleSubmit}>
                  <CheckCircle2 size={16} /> Submit Request
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'my_request' && (
    <div className="page-view module-shell">
            <div className="filter-bar" style={{ marginBottom: 'var(--space-md)' }}>
              <button className="btn-small" onClick={() => setShowMyReqFilters(!showMyReqFilters)} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <Search size={14} /> {showMyReqFilters ? 'Hide' : 'Show'} Filters
              </button>
              {showMyReqFilters && (
              <div style={{ padding: 'var(--space-xs)', display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
                <select style={{ fontSize: 'var(--fs-sm)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', minWidth: '120px' }} value={myRequestFilters.status} onChange={(e) => setMyRequestFilters({ ...myRequestFilters, status: e.target.value })}>
                  <option value="">All Statuses</option>
                  <option value="Pending Production Head">Pending Production Head</option>
                  <option value="Pending Program Head">Pending Program Head</option>
                  <option value="Approved">Approved</option>
                  <option value="Correction Required">Correction Required</option>
                  <option value="Rejected">Rejected</option>
                </select>
                <select style={{ fontSize: 'var(--fs-sm)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', minWidth: '120px' }} value={myRequestFilters.program} onChange={(e) => setMyRequestFilters({ ...myRequestFilters, program: e.target.value })}>
                  <option value="">All Programs</option>
                  {[...new Set(productionRequests.map(r => r.programName))].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              )}
            </div>

            <div className="card">
              <div className="card-header gradient">
                <div>
                  <h3 style={{ margin: 0, fontSize: 'var(--fs-lg)', fontWeight: '700', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <FileText size={20} color="var(--accent)" /> My Production Requests
                  </h3>
                  <p style={{ margin: 'var(--space-xs) 0 0 0', fontSize: 'var(--fs-base)', color: 'var(--text-sub)' }}>Requests you have submitted</p>
                </div>
              </div>
              <div className="card-body" style={{ padding: 'var(--space-md) var(--space-md) 0' }}>
                <table className="enterprise-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Ref ID</th>
                      <th>Date</th>
                      <th>Title</th>
                      <th>Progress</th>
                      <th>Document</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productionRequests
                      .filter(r => r.requestedBy === currentUser.username)
                      .filter(req => {
                        const matchStatus = !myRequestFilters.status || req.status === myRequestFilters.status;
                        const matchProgram = !myRequestFilters.program || req.programName === myRequestFilters.program;
                        return matchStatus && matchProgram;
                      })
                      .map(req => (
                        <tr key={req.id}>
                          <td><span style={{ fontWeight: 700, color: 'var(--accent)' }}>{req.refId}</span></td>
                          <td>{formatDate(req.createdAt)}</td>
                          <td>
                            <div style={{ fontWeight: 700 }}>{req.title}</div>
                            <div style={{ fontSize: 'var(--fs-base)', color: 'var(--text-sub)', marginTop: 'var(--space-xs)' }}>Requested by {req.requestedBy} • {getCurrencySymbol(req.currency)}{Number(req.totalPrice || 0).toLocaleString()}</div>
                          </td>
                          <td><StatusStepper status={req.status} /></td>
                          <td>
                            {req.fileName ? (
                              <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                                <button className="btn-icon-only" onClick={() => handleFilePreview(req.fileName)} title="Preview BOM"><Search size={14} /></button>
                                <button className="btn-icon-only success" onClick={() => handleFileDownload(req.fileName)} title="Download BOM"><Download size={14} /></button>
                              </div>
                            ) : <span style={{ fontSize: 'var(--fs-base)', color: 'var(--text-sub)' }}>No file</span>}
                          </td>
                          <td>
                            <span className={`pill-badge ${req.status === 'Approved' ? 'emerald' : 'amber'}`}>{req.status}</span>
                            {(() => {
                              const reassignedInfo = getReassignedInfo(req);
                              return reassignedInfo ? (
                                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--accent)', marginTop: 'var(--space-xs)', fontWeight: '600' }}>
                                  Reassigned to: {reassignedInfo.username} ({reassignedInfo.role})
                                </div>
                              ) : null;
                            })()}
                          </td>
                          <td className="text-right">
                            <div style={{ display: 'flex', gap: 'var(--space-xs)', justifyContent: 'flex-end' }}>
                              {getPOsForPr(req.id).map(po => (
                                <button key={po.id} className="btn-icon-only" onClick={() => handleExportPDF(po)} title={`Download PO: ${po.refId}`} style={{ color: 'var(--emerald)' }}><Download size={14} /></button>
                              ))}
                              <button className="btn-icon-only" onClick={() => setViewingRequest(req)} title="View Summary & History"><Eye size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    {productionRequests
                      .filter(r => r.requestedBy === currentUser.username)
                      .filter(req => {
                        const matchStatus = !myRequestFilters.status || req.status === myRequestFilters.status;
                        const matchProgram = !myRequestFilters.program || req.programName === myRequestFilters.program;
                        return matchStatus && matchProgram;
                      }).length === 0 && (
                        <tr><td colSpan="7" className="empty-msg">No production requests found matching your criteria.</td></tr>
                      )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'create_po_form' && (
          <div className="card">
            <div className="card-header gradient" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 'var(--fs-lg)', fontWeight: '700', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <CreditCard size={22} color="var(--accent)" /> Issue Purchase Orders
                </h3>
                <p style={{ margin: 'var(--space-xs) 0 0 0', fontSize: 'var(--fs-base)', color: 'var(--text-sub)' }}>Generate and attach Purchase Orders for approved PRs</p>
              </div>
              <span className="pill-badge emerald" style={{ fontSize: 'var(--fs-xs)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Financial Stage</span>
            </div>
            <div className="card-body" style={{ padding: 'var(--space-md) var(--space-md) 0' }}>
              <section className="form-section" style={{ marginBottom: 'var(--space-lg)', border: 'none', background: 'transparent' }}>
                <h4 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <div style={{ width: '8px', height: '24px', background: 'var(--accent)', borderRadius: 'var(--radius-sm)' }}></div>
                  <Info size={18} color="var(--accent)" /> Select Program & Purchase Request
                </h4>
                <div className="form-grid" style={{ padding: '0' }}>
                  <div className="form-group">
                    <label>Program Name <span className="mandatory">*</span></label>
                    <select
                      style={{ fontSize: 'var(--fs-md)', padding: '14px 16px' }}
                      value={poForm.selectedProgram}
                      onChange={(e) => setPoForm({ ...poForm, selectedProgram: e.target.value, selectedPrId: '' })}
                    >
                      <option value="">Select Program</option>
                      {[...new Set(productionRequests.filter(req => req.status === 'Approved').map(r => r.programName))].map(prog => (
                        <option key={prog} value={prog}>{prog}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group span-2">
                    <label>Purchase Request ID <span className="mandatory">*</span></label>
                    <select
                      style={{ padding: '0.8rem' }}
                      disabled={!poForm.selectedProgram}
                      value={poForm.selectedPrId}
                      onChange={(e) => setPoForm({ ...poForm, selectedPrId: e.target.value, poDetails: [{ poNo: '', amount: '', poFile: '', generatedDate: formatDate(new Date()) }] })}
                    >
                      <option value="">Select a PR ID</option>
                      {productionRequests
                        .filter(req => req.status === 'Approved' && req.programName === poForm.selectedProgram)
                        .map(req => (
                          <option key={req.id} value={req.id}>{req.refId} - {req.title}</option>
                        ))
                      }
                    </select>
                  </div>
                </div>

                {poForm.selectedPrId && (
                  <div className="card" style={{ padding: 'var(--space-lg)', marginTop: 'var(--space-lg)', border: '1px solid var(--accent-border)', background: 'rgba(var(--accent-rgb), 0.02)' }}>
                    {(() => {
                      const parentPr = productionRequests.find(req => String(req.id) === poForm.selectedPrId);
                      return parentPr ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                            <div style={{ background: 'var(--accent)', color: '#fff', padding: 'var(--space-sm)', borderRadius: 'var(--radius-lg)' }}>
                              <FileText size={24} />
                            </div>
                            <h4 style={{ margin: '0 0 var(--space-xs) 0' }}>{parentPr.refId}: {parentPr.title}</h4>
                            <p style={{ margin: 0, fontSize: 'var(--fs-base)', color: 'var(--text-sub)' }}>Requested by {parentPr.requestedBy} • Total Value: {getCurrencySymbol(parentPr.currency)}{Number(parentPr.totalPrice).toLocaleString()}</p>
                          </div>
                          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                            <button className="btn-small" style={{ borderRadius: 'var(--radius-md)' }} onClick={() => setViewingRequest(parentPr)}><Eye size={14} /> View PR</button>
                            {parentPr.fileName && <button className="btn-small success" style={{ borderRadius: 'var(--radius-md)' }} onClick={() => handleFileDownload(parentPr.fileName)}><Download size={14} /> Get BOM</button>}
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </section>

              {poForm.selectedPrId && (
                <section className="form-section" style={{ border: 'none', background: 'transparent' }}>
                  <h4 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <div style={{ width: '8px', height: '24px', background: 'var(--accent)', borderRadius: 'var(--radius-sm)' }}></div>
                    <Layers size={18} color="var(--accent)" /> Create Purchase Orders
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {poForm.poDetails.map((po, index) => (
                      <div key={index} style={{ padding: 'var(--space-lg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', position: 'relative' }}>
                        {poForm.poDetails.length > 1 && (
                          <button onClick={() => removePoRow(index)} style={{ position: 'absolute', top: 'var(--space-sm)', right: 'var(--space-sm)', padding: '5px', background: 'none', border: 'none', color: 'var(--rose-text)', cursor: 'pointer' }} title="Remove PO"><Trash2 size={16} /></button>
                        )}
                        <div className="form-grid" style={{ padding: '0' }}>
                          <div className="form-group">
                            <label>Generated Date</label>
                            <input type="text" value={po.generatedDate} readOnly style={{ background: 'var(--bg-subtle)', cursor: 'not-allowed', opacity: 0.8 }} />
                          </div>
                          <div className="form-group">
                            <label>PR ID</label>
                            <input type="text" value={productionRequests.find(req => String(req.id) === poForm.selectedPrId)?.refId || ''} readOnly style={{ background: 'var(--bg-subtle)', cursor: 'not-allowed', opacity: 0.8 }} />
                          </div>
                          <div className="form-group">
                            <label>PO No. <span className="mandatory">*</span></label> {/* Changed to manual entry. */}
                            <input
                              type="text"
                              value={po.poNo}
                              onChange={(e) => updatePoRow(index, 'poNo', e.target.value)}
                              placeholder="Enter PO Number"
                            />
                          </div>
                          <div className="form-group">
                            <label>Amount <span className="mandatory">*</span></label>
                            <div style={{ position: 'relative' }}>
                              <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                                <select style={{ padding: '14px 16px', fontSize: 'var(--fs-md)', borderRadius: 'var(--radius-md)', minWidth: '72px' }} value={po.currency || 'INR'} onChange={(e) => updatePoRow(index, 'currency', e.target.value)}>
                                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                                </select>
                                <input
                                  type="number"
                                  placeholder="0.00"
                                  style={{ paddingLeft: 'var(--space-sm)', fontWeight: '700', fontSize: 'var(--fs-lg)', color: 'var(--accent)', padding: '0.8rem' }}
                                  value={po.amount}
                                  onChange={(e) => updatePoRow(index, 'amount', e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="form-group">
                            <label>Upload PO Document</label>
                            <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                              <input type="file" id={`po-file-input-${index}`} style={{ display: 'none' }} onChange={(e) => handlePOFileUpload(index, e.target.files[0])} />
                              <button className="btn-small" style={{ width: '100%', borderStyle: 'dashed' }} onClick={() => document.getElementById(`po-file-input-${index}`).click()}>
                                <FileUp size={14} /> {po.poFile ? 'Change File' : 'Attach PO'}
                              </button>
                            </div>
                            {po.poFile && <small style={{ color: 'var(--emerald)', display: 'block', marginTop: 'var(--space-xs)' }}>✓ {po.poFile}</small>}
                          </div>
                        </div>
                      </div>
                    ))}
                    <button onClick={addPoRow} className="btn-small" style={{ alignSelf: 'flex-start', borderStyle: 'dashed', background: 'rgba(var(--accent-rgb), 0.05)' }}>+ Add Another PO</button>
                  </div>
                </section>
              )}

              <div style={{ padding: '0 0 var(--space-lg)', marginTop: 'var(--space-lg)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
                <button className="btn-small" style={{ padding: '0.6rem 1.2rem' }} onClick={() => setActiveTab('dashboard')}>Cancel</button>
                <button className="btn-primary" style={{ width: 'auto', padding: '0.7rem var(--space-xl)', fontSize: 'var(--fs-md)', fontWeight: '700' }} onClick={handleCreatePOs}>
                  <CheckCircle2 size={16} /> Create POs
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'report' && (
          <div className="card">
            <div className="card-header gradient" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 'var(--fs-lg)', fontWeight: '700', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <FileText size={22} color="var(--accent)" /> Production Intelligence
                </h3>
                <p style={{ margin: 'var(--space-xs) 0 0 0', fontSize: 'var(--fs-base)', color: 'var(--text-sub)' }}>Export generated POs and filter report data</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <span className="pill-badge" style={{ fontSize: 'var(--fs-xs)', background: 'rgba(var(--text-sub-rgb), 0.1)' }}>Reporting</span>
                <button className="btn-small" onClick={handleExportPoReport} title="Export generated PO data to CSV"><Download size={14} /> Export CSV</button>
              </div>
            </div>
            <div className="card-body" style={{ padding: 'var(--space-md) var(--space-md) 0' }}>
              <motion.div 
                className="stats-grid" 
                style={{ marginBottom: 'var(--space-xl)' }}
                initial="hidden" animate="show"
                variants={{ show: { transition: { staggerChildren: 0.08 } } }}
              >
                <motion.div variants={{ hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } }} whileHover={{ y: -5 }} className="stat-card glass-card">
                  <div className="stat-icon" style={{ background: 'rgba(var(--accent-rgb), 0.1)', color: 'var(--accent)', width: '36px', height: '36px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-sm)' }}>
                    <DollarSign size={20} />
                  </div>
                  <span className="stat-label">Total Value (Report)</span>
                  <div className="stat-value" style={{ fontSize: 'var(--fs-2xl)', fontWeight: '800', margin: 'var(--space-sm) 0' }}>{getCurrencySymbol('INR')}{reportStats.totalValue.toLocaleString()}</div>
                  <span className="stat-trend" style={{ color: 'var(--text-sub)', fontSize: 'var(--fs-sm)' }}>Based on active filters</span>
                </motion.div>
                <motion.div variants={{ hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } }} whileHover={{ y: -5 }} className="stat-card glass-card">
                  <div className="stat-icon" style={{ background: 'var(--emerald-bg)', color: 'var(--emerald-text)', width: '36px', height: '36px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-sm)' }}>
                    <CreditCard size={20} />
                  </div>
                  <span className="stat-label">PO Count</span>
                  <div className="stat-value" style={{ fontSize: 'var(--fs-2xl)', fontWeight: '800', margin: 'var(--space-sm) 0' }}>{reportStats.count}</div>
                  <span className="stat-trend positive" style={{ fontSize: 'var(--fs-sm)' }}>Issued PO records</span>
                </motion.div>
                <motion.div variants={{ hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } }} whileHover={{ y: -5 }} className="stat-card glass-card">
                  <div className="stat-icon" style={{ background: 'rgba(var(--accent-rgb), 0.1)', color: 'var(--accent)', width: '36px', height: '36px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-sm)' }}>
                    <ClipboardList size={20} />
                  </div>
                  <span className="stat-label">Linked PRs</span>
                  <div className="stat-value" style={{ fontSize: 'var(--fs-2xl)', fontWeight: '800', margin: 'var(--space-sm) 0' }}>{reportStats.uniquePrs}</div>
                  <span className="stat-trend" style={{ color: 'var(--text-sub)', fontSize: 'var(--fs-sm)' }}>Unique parent requests</span>
                </motion.div>
              </motion.div>

              <div className="filter-bar" style={{ marginBottom: 'var(--space-md)' }}>
                <button className="btn-small" onClick={() => setShowReportFilters(!showReportFilters)} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                  <Search size={14} /> {showReportFilters ? 'Hide' : 'Show'} Filters
                </button>
                {showReportFilters && (
              <div style={{ padding: 'var(--space-xs)', display: 'flex', gap: 'var(--space-xs)', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
                  <select style={{ fontSize: 'var(--fs-xs)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }} value={reportFilters.prId} onChange={(e) => setReportFilters({ ...reportFilters, prId: e.target.value })}>
                    <option value="">All PRs</option>
                    {[...new Set(productionRequests.filter(req => req.status === 'Approved').map(r => r.refId))].map(prId => <option key={prId} value={prId}>{prId}</option>)}
                  </select>
                  <select style={{ fontSize: 'var(--fs-xs)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }} value={reportFilters.program} onChange={(e) => setReportFilters({ ...reportFilters, program: e.target.value })}>
                    <option value="">All Programs</option>
                    {[...new Set(productionRequests.map(r => r.programName))].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
              </div>
                )}
              </div>

              {/* Removed the PR report table, only keeping the PO report table. */}
              <div className="card" style={{ marginTop: 'var(--space-xl)' }}>
                <div className="card-header gradient">
                  <div>
                    <h3 style={{ margin: 0, fontSize: 'var(--fs-lg)', fontWeight: '700', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <CreditCard size={20} color="var(--accent)" /> Generated Purchase Orders
                    </h3>
                    <p style={{ margin: 'var(--space-xs) 0 0 0', fontSize: 'var(--fs-base)', color: 'var(--text-sub)' }}>Financial records matching selected PRs</p>
                  </div>
                </div>
                <div className="card-body" style={{ padding: 'var(--space-md) var(--space-md) 0' }}>
                  <table className="enterprise-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>PR ID</th>
                        <th>PO ID</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th className="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPoReportData.length > 0 ? (
                        filteredPoReportData.map(po => {
                          const parentPr = productionRequests.find(req => String(req.id) === String(po.prId));
                          return (
                            <tr key={po.id}>
                              <td><span style={{ fontWeight: '600', color: 'var(--accent)' }}>{po.prRefId || 'N/A'}</span></td>
                              <td>{po.refId}</td>
                              <td>{formatDate(po.createdAt)}</td>
                              <td>{getCurrencySymbol(po.currency)}{Number(po.amount).toLocaleString()}</td>
                              <td className="text-right">
                            <div style={{ display: 'flex', gap: 'var(--space-xs)', justifyContent: 'flex-end' }}>
                                  {parentPr && <button className="btn-icon-only" onClick={() => setViewingRequest(parentPr)} title="Preview Original Request"><Eye size={14} /></button>}
                                  {parentPr?.fileName && <button className="btn-icon-only success" onClick={() => handleFileDownload(parentPr.fileName)} title="Download BOM"><Search size={14} /></button>}
                                  {po.poFile && <button className="btn-icon-only" onClick={() => handleFileDownload(po.poFile)} title="Download PO File" style={{ color: 'var(--emerald)' }}><Download size={14} /></button>}
                                  <button className="btn-icon-only" onClick={() => handleExportPDF(po)} title="Download PO Summary"><Printer size={14} /></button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr><td colSpan="5" className="empty-msg">No purchase orders found for the selected criteria.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="card">
            <div className="card-header gradient">
              <div>
                <h3 style={{ margin: 0, fontSize: 'var(--fs-lg)', fontWeight: '700', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <CheckCircle2 size={20} color="var(--accent)" /> Approvals
                </h3>
                <p style={{ margin: 'var(--space-xs) 0 0 0', fontSize: 'var(--fs-base)', color: 'var(--text-sub)' }}>Pending approval tasks for your role</p>
              </div>
            </div>
            <div className="card-body" style={{ padding: 'var(--space-md) var(--space-md) 0' }}>
              <table className="enterprise-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Requester</th>
                    <th>Title</th>
                    <th>Progress</th>
                    <th>Value</th>
                    <th>Document</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {productionRequests.filter(req => {
                    const roles = currentUser.roles || [];
                    if (roles.includes('Administrator')) return req.status.includes('Pending');
                    if (req.status === 'Pending Production Head') return roles.includes('Production Head') || roles.includes('Electrical Head');
                    if (req.status === 'Pending Program Head') return roles.includes('Program Head');
                    return false;
                  }).map(req => (
                    <tr key={req.id}>
                      <td>{req.requestedBy}</td>
                      <td>
                        <div style={{ fontWeight: '600' }}>{req.title}</div>
                        {(() => {
                          const reassignedInfo = getReassignedInfo(req);
                          return reassignedInfo ? (
                            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--accent)', marginTop: 'var(--space-xs)', fontWeight: '600' }}>
                              Reassigned to: {reassignedInfo.username} ({reassignedInfo.role})
                            </div>
                          ) : null;
                        })()}
                      </td>
                      <td><StatusStepper status={req.status} /></td>
                      <td>{getCurrencySymbol(req.currency)}{Number(req.totalPrice).toLocaleString()}</td>
                      <td>
                        {req.fileName ? (
                          <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                            <button className="btn-icon-only" onClick={() => handleFilePreview(req.fileName)} title="Preview BOM"><Search size={14} /></button>
                            <button className="btn-icon-only success" onClick={() => handleFileDownload(req.fileName)} title="Download BOM"><Download size={14} /></button>
                          </div>
                        ) : <span style={{ fontSize: 'var(--fs-base)', color: 'var(--text-sub)' }}>No file</span>}
                      </td>
                      <td className="text-right">
                        <button
                          className="btn-primary btn-small"
                          style={{ width: 'auto' }}
                          onClick={() => { setViewingRequest(req); setReviewRemarks(''); }}
                        >
                          Review Request
                        </button>
                      </td>
                    </tr>
                  ))}
                {productionRequests.filter(req => {
                  const roles = currentUser.roles || [];
                  if (req.status === 'Pending Production Head') return roles.includes('Production Head');
                  if (req.status === 'Pending Program Head') return roles.includes('Program Head');
                  return false;
                }).length === 0 && (
                    <tr><td colSpan="4" className="empty-msg">No pending production approvals for your role.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>

      {/* Request Preview Modal */}
      <AnimatePresence>
        {viewingRequest && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="modal-overlay"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: 'var(--space-lg)' }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="modal-content"
              style={{ maxWidth: '900px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '0', background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid var(--border)' }}
            >
              <div className="modal-header" style={{ padding: 'var(--space-lg) var(--space-xl)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 'var(--fs-xl)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <Briefcase size={20} color="var(--accent)" /> {viewingRequest.refId}: {viewingRequest.title}
                  </h2>
                  <p style={{ margin: 'var(--space-xs) 0 0 0', fontSize: 'var(--fs-base)', color: 'var(--text-sub)' }}>Submitted on {formatDate(viewingRequest.createdAt)}</p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                  <button className="btn-icon-only" onClick={() => handleExportPDF(viewingRequest)} title="Download Summary PDF"><Download size={18} /></button>
                  <button className="btn-icon-only" onClick={() => { setViewingRequest(null); setReviewRemarks(''); }} title="Close"><X size={18} /></button>
                </div>
              </div>

              <div style={{ padding: 'var(--space-xl)' }}>
                {/* Status Stepper */}
                <div className="stage-tracker horizontal-stepper" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 'var(--space-xl)', padding: '0 var(--space-lg)' }}>
                  {[
                    { id: 'Pending Production Head', label: 'Production Approval' },
                    { id: 'Pending Program Head', label: 'Program Approval' },
                    { id: 'Approved', label: 'Request Finalized' }
                  ].map((stage, idx, arr) => {
                    const stages = ['Pending Production Head', 'Pending Program Head', 'Approved'];
                    const currentIdx = stages.indexOf(viewingRequest.status);

                    let state = 'upcoming';
                    if (viewingRequest.status === 'Approved') state = 'completed';
                    else if (currentIdx > idx) state = 'completed';
                    else if (currentIdx === idx) state = 'active';

                    const colors = { completed: '#10b981', active: 'var(--accent)', upcoming: 'var(--border)' };

                    return (
                      <div key={idx} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%', background: colors[state], color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-sm)',
                          fontWeight: 'bold', fontSize: '14px', position: 'relative', zIndex: 2
                        }}>
                          {state === 'completed' ? '✓' : idx + 1}
                        </div>
                        <div style={{ fontSize: 'var(--fs-sm)', fontWeight: '600', color: state === 'upcoming' ? 'var(--text-sub)' : 'var(--text-h)' }}>{stage.label}</div>
                        {idx < arr.length - 1 && (
                          <div style={{ position: 'absolute', top: 'var(--space-md)', left: '50%', right: '-50%', height: '2px', background: state === 'completed' ? 'var(--emerald-text)' : 'var(--border)', zIndex: 1 }}></div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--space-xl)' }}>
                  {/* Left Column: Details */}
                  <div>
                    <h4 style={{ fontSize: 'var(--fs-base)', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 'var(--space-md)', borderBottom: '1px solid var(--border)', paddingBottom: '5px' }}>Request Details</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)', background: 'var(--bg-subtle)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)' }}>
                      <div>
                        <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)', display: 'block' }}>PROGRAM</label>
                        <span style={{ fontSize: 'var(--fs-md)', fontWeight: '600' }}>{viewingRequest.programName}</span>
                      </div>
                      <div>
                        <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)', display: 'block' }}>WORK ORDER</label>
                        <span style={{ fontSize: 'var(--fs-md)', fontWeight: '600' }}>
                          {workOrders.find(wo => String(wo.id) === String(viewingRequest.workOrderId))?.refId || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)', display: 'block' }}>TOTAL PRICE</label>
                        <span style={{ fontSize: 'var(--fs-md)', fontWeight: '700', color: 'var(--accent)' }}>{getCurrencySymbol(viewingRequest.currency)}{Number(viewingRequest.totalPrice).toLocaleString()}</span>
                      </div>
                      <div>
                        <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)', display: 'block' }}>REQUESTED BY</label>
                        <span style={{ fontSize: 'var(--fs-md)', fontWeight: '600' }}>{viewingRequest.requestedBy}</span>
                      </div>
                      <div>
                        <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)', display: 'block' }}>PRODUCTION HEAD</label>
                        <span style={{ fontSize: 'var(--fs-md)', fontWeight: '600' }}>{viewingRequest.productionHead}</span>
                      </div>
                      {(() => {
                        const reassignedInfo = getReassignedInfo(viewingRequest);
                        return reassignedInfo ? (
                          <div style={{ gridColumn: 'span 2', background: 'rgba(var(--accent-rgb), 0.05)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-border)' }}>
                            <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--accent)', display: 'block', fontWeight: '700' }}>REASSIGNED APPROVER</label>
                            <span style={{ fontSize: 'var(--fs-md)', fontWeight: '700' }}>
                              {reassignedInfo.username} ({reassignedInfo.role})
                            </span>
                          </div>
                        ) : null;
                      })()}
                      {previousApproverInfo && (
                        <div>
                          <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)', display: 'block' }}>PREVIOUS APPROVER ({previousApproverInfo.role || (previousApproverInfo.roles ? previousApproverInfo.roles.join(', ') : 'N/A')})</label>
                          <span style={{ fontSize: 'var(--fs-md)', fontWeight: '600', color: 'var(--emerald)' }}>
                            {previousApproverInfo.user}
                          </span>
                          {previousApproverInfo.remarks && (
                            <p style={{ fontSize: 'var(--fs-base)', margin: 'var(--space-xs) 0 0 0', lineHeight: '1.4', color: 'var(--text-sub)' }}>Remarks: "{previousApproverInfo.remarks}"</p>
                          )}
                        </div>
                      )}
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)', display: 'block' }}>REMARKS</label>
                        <p style={{ fontSize: 'var(--fs-base)', margin: 'var(--space-xs) 0 0 0', lineHeight: '1.4' }}>{viewingRequest.remarks || 'No remarks provided.'}</p>
                      </div>
                    </div>

                    {viewingRequest.fileName && (
                      <div style={{ marginTop: 'var(--space-lg)', padding: 'var(--space-md)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-md)', background: 'var(--accent-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                          <Layers size={18} color="var(--accent)" />
                          <span style={{ fontSize: 'var(--fs-base)', fontWeight: '600' }}>BOM: {viewingRequest.fileName}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                          <button className="btn-icon-only" onClick={() => handleFilePreview(viewingRequest.fileName)} title="Preview BOM"><Search size={14} /></button>
                          <button className="btn-icon-only success" onClick={() => handleFileDownload(viewingRequest.fileName)} title="Download BOM"><Download size={14} /></button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: History */}
                  <div>
                    <h4 style={{ fontSize: 'var(--fs-base)', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 'var(--space-md)', borderBottom: '1px solid var(--border)', paddingBottom: '5px' }}>Audit Trail</h4>
                    <div className="history-timeline" style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '300px', overflowY: 'auto', paddingRight: 'var(--space-sm)' }}>
                      {(viewingRequest.history || []).map((h, idx) => (
                        <div key={idx} style={{ paddingLeft: 'var(--space-sm)', borderLeft: '2px solid var(--accent)', position: 'relative' }}>
                          <div style={{ position: 'absolute', left: '-5px', top: '0', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }}></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: 'var(--fs-base)', fontWeight: '700' }}>{h.action}</span>
                            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)' }}>{formatDate(h.date)}</span>
                          </div>
                          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)' }}>By {h.user}</div>
                          {h.remarks && (
                            <div style={{ fontSize: 'var(--fs-sm)', fontStyle: 'italic', marginTop: 'var(--space-xs)', color: 'var(--accent)' }}>"{h.remarks}"</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Approver Actions Section */}
                {(() => {
                  const roles = currentUser.roles || [];
                  if ((viewingRequest.status === 'Pending Production Head' && roles.includes('Production Head')) ||
                    (viewingRequest.status === 'Pending Program Head' && roles.includes('Program Head'))) {
                    return (
                      <div style={{ marginTop: 'var(--space-xl)', background: 'var(--bg-card)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: 'var(--fs-base)', fontWeight: '700', marginBottom: 'var(--space-sm)', color: 'var(--text)' }}>
                          Approving as: <span style={{ color: 'var(--accent)', marginLeft: '5px' }}>{currentUser.username} ({roles.join(', ')})</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: 'var(--fs-base)', fontWeight: '700', marginBottom: 'var(--space-sm)', color: 'var(--text)' }}>
                          <MessageSquare size={16} /> Reviewer Remarks
                        </label>
                        <textarea
                          style={{ width: '100%', padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 'var(--fs-md)', resize: 'vertical' }}
                          placeholder="Provide feedback for approval, rejection, or required corrections..."
                          value={reviewRemarks}
                          onChange={(e) => setReviewRemarks(e.target.value)}
                          rows="3"
                        ></textarea>

                        {isReassigning && (
                          <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                            <label style={{ display: 'block', fontSize: 'var(--fs-base)', fontWeight: '700', marginBottom: 'var(--space-sm)' }}>Select New Approver</label>
                            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                              <select
                                style={{ flex: 1, padding: 'var(--space-sm)' }}
                                value={targetReassignUser}
                                onChange={(e) => setTargetReassignUser(e.target.value)}
                              >
                                <option value="">-- Choose User --</option>
                                {registeredUsers
                                  .filter(u => (u.roles || []).some(r => ['Program Owner', 'Program Head', 'Production Head', 'Electrical Head', 'Functional Head', 'Head of Technology'].includes(r)) && u.username !== currentUser.username)
                                  .map(u => <option key={u.username} value={u.username}>{u.username} ({(u.roles || []).join(', ')})</option>)}
                              </select>
                              <button className="btn-primary btn-small" style={{ width: 'auto' }} onClick={handleReassignRequest}>Confirm Reassign</button>
                              <button className="btn-small" onClick={() => setIsReassigning(false)}>Cancel</button>
                            </div>
                          </div>
                        )}

                        <div className="form-actions" style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
                          <button className="btn-small" onClick={() => { setViewingRequest(null); setReviewRemarks(''); }}>Cancel</button>
                          {!isReassigning && <button className="btn-small" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }} onClick={() => setIsReassigning(true)}>Reassign</button>}
                          <button className="btn-small destructive" onClick={() => { handleWorkflowAction(viewingRequest.id, 'reject', reviewRemarks); setViewingRequest(null); }}>Reject</button>
                          <button className="btn-small" style={{ borderColor: 'var(--amber-text)', color: 'var(--amber-text)' }} onClick={() => { handleWorkflowAction(viewingRequest.id, 'rollback', reviewRemarks); setViewingRequest(null); }}>Request Correction</button>
                          <button
                            className="btn-primary"
                            style={{ background: 'var(--emerald-text)', color: '#fff', width: 'auto', padding: '0.6rem 2rem' }}
                            onClick={() => { handleWorkflowAction(viewingRequest.id, 'approve', reviewRemarks); setViewingRequest(null); }}
                          >
                            {viewingRequest.status === 'Pending Program Head' ? 'Authorize & Close' : 'Approve & Forward'}
                          </button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div style={{ marginTop: 'var(--space-xl)', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-lg)' }}>
                      <button className="btn-primary" style={{ width: 'auto', padding: '0.7rem var(--space-xl)' }} onClick={() => { setViewingRequest(null); setReviewRemarks(''); }}>Close Preview</button>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PurchaseOrderProduction;