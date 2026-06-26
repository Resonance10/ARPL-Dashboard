import React, { useState, useMemo, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Users, Settings, Package, PieChart, Bell, Download, Plus, Search, Filter,
  Calendar, CheckCircle2, Clock, AlertCircle, CreditCard, Truck, ShieldCheck, Info, Briefcase,
  FileUp, MessageSquare, Trash2, X, Eye, Save, Hash
} from 'lucide-react';
import { API_BASE_URL } from "./constants";
import { FilterSection, FilterInput, FilterSelect, FilterDateInput } from './components/ui';
import { formatDate } from './utils/formatDate';
import { CURRENCY_DATA } from './utils/currency';
import { getStatusVariant, STEPPER_COLORS } from './utils/statusColors';

const CHART_STAGE_COLORS = ['#c36e46', '#f59e0b', '#3b82f6', '#10b981'];
const CHART_PROGRAM_COLORS = ['#c36e46', '#6366f1', '#ec4899', '#14b8a6', '#f97316'];

const StatusStepper = ({ status }) => {
  const stages = [
    { id: 'Pending Owner', icon: <Clock size={12} />, productionId: 'Pending Production Head' },
    { id: 'Pending Admin', icon: <FileText size={12} /> },
    { id: 'Pending Head', icon: <Users size={12} />, productionId: 'Pending Program Head' },
    { id: 'Approved', icon: <CheckCircle2 size={12} /> }
  ];
  const currentIndex = stages.findIndex(s => s.id === status || s.productionId === status);
  const isCorrection = status === 'Correction Required';
  const isTerminal = ['Rejected', 'Cancelled'].includes(status);

  return (
    <div className="status-stepper-container" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }} aria-label={`Current status: ${status}`}>
      {stages.map((stage, i) => {
        let nodeColor = STEPPER_COLORS.idle;
        let iconColor = 'var(--text-sub)';
        if (i < currentIndex || status === 'Approved') { nodeColor = STEPPER_COLORS.done; iconColor = STEPPER_COLORS.iconOn; }
        else if (i === currentIndex) {
          if (isCorrection) { nodeColor = STEPPER_COLORS.correction; iconColor = STEPPER_COLORS.iconOn; }
          else { nodeColor = STEPPER_COLORS.active; iconColor = STEPPER_COLORS.iconOn; }
        } else if (isTerminal) { nodeColor = STEPPER_COLORS.terminal; iconColor = STEPPER_COLORS.iconOn; }
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div
              className={`stepper-node ${i < currentIndex || status === 'Approved' ? 'node-done' : i === currentIndex ? (isCorrection ? 'node-alert' : 'node-active') : isTerminal ? 'node-failed' : 'node-upcoming'}`}
              title={stage.productionId || stage.id}
              style={{ width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: nodeColor, color: iconColor, flexShrink: 0, zIndex: 2 }}
            >
              {i < currentIndex || status === 'Approved' ? <CheckCircle2 size={14} /> : stage.icon}
            </div>
            {i < stages.length - 1 && (
              <div style={{ width: '8px', height: '2px', backgroundColor: i < currentIndex || (status === 'Approved' && i < stages.length - 1) ? 'var(--emerald-text)' : 'var(--border)', flexShrink: 0 }} />
            )}
          </div>
        );
      })}
    </div>
  );
};

const generatePieGradient = (data, colors) => {
  if (!data || data.length === 0) return 'var(--border)';
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return 'var(--border)';
  let currentPercentage = 0;
  const segments = data.map((item, index) => {
    const start = currentPercentage;
    currentPercentage += (item.value / total) * 100;
    return `${colors[index % colors.length]} ${start}% ${currentPercentage}%`;
  });
  return `conic-gradient(${segments.join(', ')})`;
};

const PurchaseOrder = ({
  programs = [], workOrders = [], registeredUsers = [], currentUser = {},
  poRequests = [], setPoRequests, handleWorkflowAction, addNotification,
  showToast, generateRefId, syncToDisk, handleFilePreview,
  handleFileDownload, handleExportPDF, loginForm = { username: '' },
  setReviewingRequest, reviewingRequest,
  setViewingRequestDetails, viewingRequestDetails,
  previewFile, setPreviewFile, setCurrentPage, setActiveProgramTab,
  vendors: propVendors, setVendors: propSetVendors,
  parts: propParts, setParts: propSetParts
}) => {
  const [vendors, setVendors] = useState(propVendors || []);
  const [vendorSearch, setVendorSearch] = useState('');
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);

  const filteredVendors = useMemo(() => {
    if (!vendorSearch) return vendors;
    const term = vendorSearch.toLowerCase();
    return vendors.filter(v =>
      v.name.toLowerCase().includes(term) ||
      (v.gstin && v.gstin.toLowerCase().includes(term)) ||
      (v.contactPerson && v.contactPerson.toLowerCase().includes(term)) ||
      (v.email && v.email.toLowerCase().includes(term))
    );
  }, [vendors, vendorSearch]);

  const [parts, setParts] = useState(propParts || []);
  const [editingRequestId, setEditingRequestId] = useState(null);
  const [showPartForm, setShowPartForm] = useState(false);
  const [editPartId, setEditPartId] = useState(null);
  const [partForm, setPartForm] = useState({ drawing: '', name: '', units: 'Nos.' });
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [editVendorId, setEditVendorId] = useState(null);
  const [vendorForm, setVendorForm] = useState({ name: '', email: '', contactPerson: '', phone: '', gstin: '', address: '' });
  const [poRequestForm, setPoRequestForm] = useState({
    title: '', vendorId: '', type: 'PO', category: 'Prototypes (BO & Machining)',
    workOrderId: '', programName: '', programOwner: '', programAdmin: 'Program Admin',
    budgetCode: '', items: [{ partDrawing: '', partName: '', unit: 'Nos.', qty: '', unitPrice: '', currency: 'INR' }],
    paymentMode: 'Credit', paymentComments: '', deliveryValue: '', deliveryUnit: 'Days',
    qualityAssurance: false, qualityTC: false, remarks: '', fileName: '',
    customVendorName: '', customWorkOrderTitle: '', customCategory: ''
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isReassigning, setIsReassigning] = useState(false);
  const [targetReassignUser, setTargetReassignUser] = useState('');
  const [reportFilters, setReportFilters] = useState({ startDate: '', endDate: '', program: '', vendor: '', status: '' });
  const [myRequestFilters, setMyRequestFilters] = useState({ status: '', program: '', vendor: '' });
  const [showMyReqFilters, setShowMyReqFilters] = useState(false);
  const [showReportFilters, setShowReportFilters] = useState(false);

  useEffect(() => { if (propVendors && propVendors.length) setVendors(propVendors); }, [propVendors]);
  useEffect(() => { if (propParts && propParts.length) setParts(propParts); }, [propParts]);

  const userRoles = currentUser.roles || [];
  const isAdmin = ['DEV', 'Admin'].includes(loginForm.username) || userRoles.some(r => ['Administrator', 'Program Head', 'Developer'].includes(r));

  const allowedTabs = useMemo(() => {
    const allTabs = ['dashboard', 'po_request', 'my_request', 'vendor', 'part', 'approvals', 'report'];
    if (userRoles.some(r => ['Administrator', 'Developer', 'Program Admin', 'Program Owner', 'Program Head'].includes(r))) return allTabs;
    if (userRoles.some(r => ['Production Head', 'Mechanical Head', 'Electrical Head'].includes(r))) return ['dashboard', 'po_request', 'my_request', 'vendor', 'part', 'approvals'];
    if (userRoles.includes('Functional Head')) return ['po_request', 'my_request', 'vendor', 'part'];
    if (userRoles.some(r => ['Engineer', 'Sr. Engineer'].includes(r))) return ['po_request', 'my_request'];
    return [];
  }, [userRoles]);

  useEffect(() => {
    if (!allowedTabs.includes(activeTab) && allowedTabs.length > 0) setActiveTab(allowedTabs[0]);
  }, [allowedTabs, activeTab]);

  const protoRequests = useMemo(() => poRequests.filter(req => !req.isProduction && !req.prId), [poRequests]);

  const userScope = useMemo(() => {
    if (!loginForm.username) return { requests: [], programs: [], stats: { totalRequests: 0, pending: 0, completed: 0, cancelled: 0, avgTime: 0 }, stageCounts: [], progCounts: [], stageChartGradient: '', programChartGradient: '' };
    const scopedRequests = isAdmin ? [...protoRequests] : protoRequests.filter(req =>
      req.requestedBy === loginForm.username || req.programOwner === loginForm.username || req.programAdmin === loginForm.username
    );
    const calculatedStats = {
      totalRequests: scopedRequests.length,
      pending: scopedRequests.filter(r => r.status?.includes('Pending')).length,
      completed: scopedRequests.filter(r => r.status === 'Approved').length,
      cancelled: scopedRequests.filter(r => r.status === 'Cancelled' || r.status === 'Rejected').length,
      totalValue: scopedRequests.reduce((sum, r) => sum + (r.items ? r.items.reduce((s, i) => s + (Number(i.qty || 0) * Number(i.unitPrice || 0)), 0) : 0), 0)
    };
    const stageCounts = [
      { label: 'Pending Owner', value: scopedRequests.filter(r => r.status === 'Pending Owner').length },
      { label: 'Pending Admin', value: scopedRequests.filter(r => r.status === 'Pending Admin').length },
      { label: 'Pending Head', value: scopedRequests.filter(r => r.status === 'Pending Head').length },
      { label: 'Correction', value: scopedRequests.filter(r => r.status === 'Correction Required').length }
    ];
    const progCounts = [...new Set(scopedRequests.map(r => r.programName))].map(name => ({
      label: name, value: scopedRequests.filter(r => r.programName === name).length
    })).slice(0, 5);
    return {
      requests: scopedRequests, programs: isAdmin || userRoles.some(r => ['Engineer', 'Sr. Engineer', 'Functional Head', 'Program Admin'].includes(r)) ? programs : [],
      stats: calculatedStats, stageCounts, progCounts,
      stageChartGradient: generatePieGradient(stageCounts, CHART_STAGE_COLORS),
      programChartGradient: generatePieGradient(progCounts, CHART_PROGRAM_COLORS)
    };
  }, [protoRequests, programs, loginForm.username, isAdmin, userRoles]);

  const filteredReportData = useMemo(() => {
    return protoRequests.filter(req => {
      const matchProgram = !reportFilters.program || req.programName === reportFilters.program;
      const matchVendor = !reportFilters.vendor || String(req.vendorId) === String(reportFilters.vendor);
      const matchStatus = !reportFilters.status || req.status === reportFilters.status;
      let matchDate = true;
      if (reportFilters.startDate || reportFilters.endDate) {
        const reqDate = new Date(req.createdAt);
        if (reportFilters.startDate) { const start = new Date(reportFilters.startDate); start.setHours(0, 0, 0, 0); if (reqDate < start) matchDate = false; }
        if (reportFilters.endDate) { const endDateObj = new Date(reportFilters.endDate); endDateObj.setHours(23, 59, 59, 999); if (reqDate > endDateObj) matchDate = false; }
      }
      return matchProgram && matchVendor && matchStatus && matchDate;
    });
  }, [protoRequests, reportFilters]);

  const reportStats = useMemo(() => {
    const total = filteredReportData.reduce((sum, req) => {
      return sum + (req.items ? req.items.reduce((s, i) => s + (Number(i.qty || 0) * Number(i.unitPrice || 0)), 0) : (Number(req.qty || 0) * Number(req.unitPrice || 0)));
    }, 0);
    return { count: filteredReportData.length, totalValue: total, avgValue: filteredReportData.length > 0 ? total / filteredReportData.length : 0 };
  }, [filteredReportData]);

  const uploadFile = async (file) => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/api/upload`);
      xhr.upload.onprogress = (event) => { if (event.lengthComputable) setUploadProgress(Math.round((event.loaded / event.total) * 100)); };
      xhr.onload = () => { if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText).fileName); else reject(new Error('Upload failed')); };
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send(formData);
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try { setUploadProgress(1); const fileName = await uploadFile(file); setPoRequestForm(prev => ({ ...prev, fileName })); setTimeout(() => setUploadProgress(0), 1500); }
      catch (error) { console.error("Upload failed", error); setUploadProgress(0); showToast("Failed to upload quotation.", "error"); }
    }
  };

  const handleSavePORequest = () => {
    if (!poRequestForm.title || !poRequestForm.programName || poRequestForm.items.some(i => !i.partDrawing || !i.partName)) {
      showToast('Please fill in all required fields', 'warning'); return;
    }
    const submitData = {
      ...poRequestForm,
      vendorId: poRequestForm.vendorId === 'Other' ? poRequestForm.customVendorName : poRequestForm.vendorId,
      workOrderId: poRequestForm.workOrderId === 'Other' ? poRequestForm.customWorkOrderTitle : poRequestForm.workOrderId,
      category: poRequestForm.category === 'Other' ? poRequestForm.customCategory : poRequestForm.category
    };
    let updated;
    if (editingRequestId) {
      const historyEntry = { date: new Date().toISOString(), user: loginForm.username, role: userRoles.join(', '), action: 'Request Resubmitted', remarks: 'Corrected as per reviewer feedback' };
      updated = poRequests.map(r => r.id === editingRequestId ? { ...r, ...submitData, status: 'Pending Owner', updatedAt: new Date().toISOString(), history: [...(r.history || []), historyEntry] } : r);
    } else {
      const historyEntry = { date: new Date().toISOString(), user: loginForm.username, role: userRoles.join(', '), action: 'Request Submitted', remarks: poRequestForm.remarks || 'Initial submission' };
      const newRequest = { ...submitData, id: Date.now(), refId: generateRefId(poRequestForm.type, poRequests), status: 'Pending Owner', createdAt: new Date().toISOString(), requestedBy: loginForm.username, remarks: '', poFile: null, history: [historyEntry] };
      updated = [newRequest, ...poRequests];
      addNotification(poRequestForm.programOwner, `New PO Request from ${loginForm.username}: ${poRequestForm.title}`, newRequest.id, 'po');
      addNotification('Program Head', `New PO Request from ${loginForm.username} (Requires Owner Approval): ${poRequestForm.title}`, newRequest.id, 'po');
    }
    setPoRequests(updated);
    syncToDisk({ key: 'poRequests', data: updated });
    setPoRequestForm({
      title: '', vendorId: '', type: 'PO', category: 'Prototypes (BO & Machining)', workOrderId: '', programName: '',
      programOwner: '', programAdmin: 'Program Admin', budgetCode: '', items: [{ partDrawing: '', partName: '', unit: 'Nos.', qty: '', unitPrice: '', currency: 'INR' }],
      paymentMode: 'Credit', paymentComments: '', deliveryValue: '', deliveryUnit: 'Days', qualityAssurance: false, qualityTC: false, remarks: '', fileName: '',
      customVendorName: '', customWorkOrderTitle: '', customCategory: ''
    });
    setEditingRequestId(null);
    showToast(editingRequestId ? 'Request updated and resubmitted!' : 'PO Request submitted successfully!');
    setActiveTab('my_request');
  };

  const addPOItemRow = () => setPoRequestForm(prev => ({ ...prev, items: [...prev.items, { partDrawing: '', partName: '', unit: 'Nos.', qty: '', unitPrice: '', currency: 'INR' }] }));
  const removePOItemRow = (index) => { if (poRequestForm.items.length <= 1) return; setPoRequestForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) })); };
  const updatePOItem = (index, field, value) => { setPoRequestForm(prev => ({ ...prev, items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item) })); };

  const handleEditOwnRequest = (req) => {
    setPoRequestForm({
      title: req.title, vendorId: req.vendorId, type: req.type, category: req.category, workOrderId: req.workOrderId,
      programName: req.programName, programOwner: req.programOwner, programAdmin: req.programAdmin, budgetCode: req.budgetCode,
      items: req.items || [{ partDrawing: req.partDrawing, partName: req.partName, unit: req.unit, qty: req.qty, unitPrice: req.unitPrice }],
      paymentMode: req.paymentMode, paymentComments: req.paymentComments, deliveryValue: req.deliveryValue, deliveryUnit: req.deliveryUnit,
      qualityAssurance: req.qualityAssurance, qualityTC: req.qualityTC, remarks: req.remarks, fileName: req.fileName || '', lastRemarks: req.remarks,
      customVendorName: req.vendorId || '', customWorkOrderTitle: req.workOrderId || '', customCategory: req.category || ''
    });
    setEditingRequestId(req.id);
    setActiveTab('po_request');
  };

  const handleFollowUp = (req) => {
    let targetUser = '';
    if (req.status === 'Pending Owner') targetUser = req.programOwner;
    else if (req.status === 'Pending Admin') targetUser = req.programAdmin;
    else if (req.status === 'Pending Head') targetUser = 'Program Head';
    if (targetUser) { addNotification(targetUser, `Follow-up request for "${req.title}" from ${loginForm.username}`, req.id, 'po'); showToast(`Follow-up notification sent to ${targetUser}`); }
    else showToast("No pending approver found.", "error");
  };

  const handleCancelRequest = (requestId) => {
    if (window.confirm("Are you sure you want to cancel this request?")) {
      const updated = poRequests.map(r => r.id === requestId ? { ...r, status: 'Cancelled' } : r);
      setPoRequests(updated); syncToDisk({ key: 'poRequests', data: updated });
      const req = poRequests.find(r => r.id === requestId);
      if (req) addNotification(req.programOwner, `User cancelled request: ${req.title}`, requestId, 'po');
    }
  };

  const getReassignedInfo = (req) => {
    if (!req) return null;
    if (req.isReassigned && req.reassignedTo) return { username: req.reassignedTo, role: req.reassignedRole };
    if (req.history && req.history.length > 0) {
      const lastEntry = req.history[req.history.length - 1];
      if (lastEntry && (lastEntry.action === 'Request Reassigned' || lastEntry.action === 'Record Reassigned')) {
        if (lastEntry.reassignedTo) return { username: lastEntry.reassignedTo, role: lastEntry.reassignedRole };
        const match = lastEntry.remarks?.match(/(?:reassigned to|specifically to)\s+(\S+)\s*\(([^)]+)\)/i);
        if (match) return { username: match[1], role: match[2] };
      }
    }
    return null;
  };

  const handleReassignRequest = (requestId, newUser) => {
    const request = poRequests.find(r => r.id === requestId);
    if (!request || !newUser) return;
    const targetUser = registeredUsers.find(u => u.username === newUser);
    if (!targetUser) return;
    let fieldToUpdate = '';
    if (request.status === 'Pending Owner' || request.status === 'Pending Production Head') fieldToUpdate = request.isProduction ? 'productionHead' : 'programOwner';
    else if (request.status === 'Pending Admin') fieldToUpdate = 'programAdmin';
    else if (request.status === 'Pending Head' || request.status === 'Pending Program Head') fieldToUpdate = 'programOwner';
    if (!fieldToUpdate) fieldToUpdate = 'programOwner';
    const historyEntry = { date: new Date().toISOString(), user: loginForm.username, role: userRoles.join(', '), action: 'Request Reassigned', reassignedTo: targetUser.username, reassignedRole: (targetUser.roles || []).join(', '), remarks: `Approval reassigned to ${targetUser.username} (${(targetUser.roles || []).join(', ')})` };
    const updated = poRequests.map(r => r.id === requestId ? { ...r, [fieldToUpdate]: newUser, isReassigned: true, reassignedTo: targetUser.username, reassignedRole: (targetUser.roles || []).join(', '), history: [...(r.history || []), historyEntry] } : r);
    setPoRequests(updated); syncToDisk({ key: 'poRequests', data: updated });
    addNotification(newUser, `A request "${request.title}" has been reassigned to you for approval.`, requestId, 'po');
    setReviewingRequest(null); setIsReassigning(false); setTargetReassignUser('');
    showToast(`Request reassigned to ${targetUser.username}.`);
  };

  const handleExportReport = () => {
    if (filteredReportData.length === 0) { showToast("No data to export", "warning"); return; }
    const headers = ["Date", "Title", "Program", "Vendor", "Qty", "Unit Price", "Total Amount", "Status"];
    const rows = filteredReportData.map(req => {
      const vendorName = vendors.find(v => String(v.id) === String(req.vendorId))?.name || req.vendorId || 'N/A';
      return [formatDate(req.createdAt), `"${req.title.replace(/"/g, '""')}"`, `"${req.programName}"`, `"${vendorName}"`, req.qty, req.unitPrice, Number(req.qty) * Number(req.unitPrice), req.status].join(",");
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ARPL_PO_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const syncVendors = (updated) => {
    setVendors(updated);
    if (propSetVendors) propSetVendors(updated);
    const allData = JSON.parse(localStorage.getItem('arpl_data') || '{}');
    allData.vendors = updated;
    localStorage.setItem('arpl_data', JSON.stringify(allData));
    // Persist to the server so additions survive a refresh
    if (syncToDisk) syncToDisk({ key: 'vendors', data: updated });
  };

  const syncParts = (updated) => {
    setParts(updated);
    if (propSetParts) propSetParts(updated);
    const allData = JSON.parse(localStorage.getItem('arpl_data') || '{}');
    allData.parts = updated;
    localStorage.setItem('arpl_data', JSON.stringify(allData));
    // Persist to the server so additions survive a refresh
    if (syncToDisk) syncToDisk({ key: 'parts', data: updated });
  };

  const handleSaveVendor = () => {
    if (!vendorForm.name || !vendorForm.email) { showToast('Please fill in Name and Email', 'warning'); return; }
    let updated;
    if (editVendorId) updated = vendors.map(v => v.id === editVendorId ? { ...v, ...vendorForm } : v);
    else updated = [...vendors, { ...vendorForm, id: Date.now() }];
    syncVendors(updated);
    setShowVendorForm(false); setEditVendorId(null); setVendorForm({ name: '', email: '', contactPerson: '', phone: '', gstin: '', address: '' });
    showToast(editVendorId ? 'Vendor updated!' : 'Vendor added!');
  };

  const handleEditVendor = (v) => { setEditVendorId(v.id); setVendorForm({ name: v.name, email: v.email, contactPerson: v.contactPerson, phone: v.phone, gstin: v.gstin, address: v.address }); setShowVendorForm(true); };

  const handleDeleteVendor = (id) => { if (window.confirm('Delete vendor?')) { const updated = vendors.filter(v => v.id !== id); syncVendors(updated); showToast('Vendor deleted.'); } };

  const handleSavePart = () => {
    if (!partForm.drawing || !partForm.name) { showToast('Please fill in Drawing No. and Name', 'warning'); return; }
    let updated;
    if (editPartId) updated = parts.map(p => p.id === editPartId ? { ...p, ...partForm } : p);
    else updated = [...parts, { ...partForm, id: Date.now() }];
    syncParts(updated);
    setShowPartForm(false); setEditPartId(null); setPartForm({ drawing: '', name: '', units: 'Nos.' });
    showToast(editPartId ? 'Part updated!' : 'Part added!');
  };

  const handleEditPart = (p) => { setEditPartId(p.id); setPartForm({ drawing: p.drawing, name: p.name, units: p.units || 'Nos.' }); setShowPartForm(true); };

  const handleDeletePart = (id) => { if (window.confirm('Delete part?')) { const updated = parts.filter(p => p.id !== id); syncParts(updated); showToast('Part deleted.'); } };

  const previousApproverInfoForReview = useMemo(() => {
    if (!reviewingRequest?.history?.length) return null;
    const history = [...reviewingRequest.history];
    history.reverse();
    const lastApprove = history.find(h => h.action === 'Approval Granted' || h.action === 'PO Uploaded by Admin');
    if (lastApprove) return { user: lastApprove.user, role: lastApprove.role, remarks: lastApprove.remarks };
    return null;
  }, [reviewingRequest]);

  const tabIcon = (tab) => {
    const icons = { dashboard: <PieChart size={16} />, vendor: <Users size={16} />, part: <Settings size={16} />, po_request: <Plus size={16} />, my_request: <FileText size={16} />, approvals: <CheckCircle2 size={16} />, report: <PieChart size={16} /> };
    return icons[tab] || null;
  };

  const tabLabel = (tab) => {
    const labels = { dashboard: 'Dashboard', vendor: 'Vendors', part: 'Parts', po_request: 'New Request', my_request: 'My Requests', approvals: 'Approvals', report: 'Report' };
    return labels[tab] || tab;
  };

  return (
    <div className="page-view module-shell">
      <div className="sub-navigation po-sub-nav">
        {allowedTabs.map(tab => (
          <motion.button key={tab} whileTap={{ scale: 0.95 }} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>
            {tabIcon(tab)} {tabLabel(tab)}
          </motion.button>
        ))}
      </div>

      {activeTab === 'dashboard' && allowedTabs.includes('dashboard') && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="po-dashboard-content">
          <div className="welcome-banner" style={{ marginBottom: 'var(--space-xl)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-xl)', background: 'linear-gradient(135deg, var(--accent-bg), transparent 80%)', border: '1px solid var(--border)' }}>
            <h2 style={{ margin: 0, fontSize: 'var(--fs-2xl)', fontWeight: '800', color: 'var(--text-h)' }}>Welcome back, {currentUser.fullName || loginForm.username}!</h2>
            <p style={{ color: 'var(--text-sub)', fontSize: 'var(--fs-md)', marginTop: 'var(--space-sm)' }}>Here is a live summary of your purchase order ecosystem and procurement activities.</p>
          </div>
          
          <div style={{ marginBottom: 'var(--space-lg)' }}>
             <h3 style={{ fontSize: 'var(--fs-md)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}><PieChart size={16} /> Key Performance Indicators</h3>
          </div>

          <div className="stats-grid">
            <div className="stat-card"><span className="stat-label"><Package size={14} /> Total Requests</span><span className="stat-value">{userScope.stats.totalRequests}</span></div>
            <div className="stat-card"><span className="stat-label"><Clock size={14} /> Pending</span><span className="stat-value">{userScope.stats.pending}</span></div>
            <div className="stat-card"><span className="stat-label"><CheckCircle2 size={14} /> Completed</span><span className="stat-value">{userScope.stats.completed}</span></div>
            <div className="stat-card"><span className="stat-label"><AlertCircle size={14} /> Cancelled / Rejected</span><span className="stat-value">{userScope.stats.cancelled}</span></div>
            {userScope.stats.totalValue > 0 && (
              <div className="stat-card"><span className="stat-label"><CreditCard size={14} /> Total Value</span><span className="stat-value">{CURRENCY_DATA.find(c => c.code === 'INR')?.symbol || '₹'}{userScope.stats.totalValue.toLocaleString()}</span></div>
            )}
          </div>
          <div className="charts-grid" style={{ marginTop: 'var(--space-lg)' }}>
            <div className="card chart-card">
              <h4 style={{ marginBottom: 'var(--space-md)', fontSize: 'var(--fs-md)' }}>Requests by Stage</h4>
              {userScope.stageCounts.some(s => s.value > 0) ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xl)' }}>
                  <div style={{ width: '140px', height: '140px', borderRadius: '50%', background: userScope.stageChartGradient, flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', fontSize: 'var(--fs-base)' }}>
                    {userScope.stageCounts.map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: CHART_STAGE_COLORS[i % CHART_STAGE_COLORS.length], display: 'inline-block' }} />
                        <span style={{ color: 'var(--text-sub)' }}>{s.label}</span>
                        <span style={{ fontWeight: '600', marginLeft: 'auto' }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="empty-msg">No data available yet.</p>}
            </div>
            <div className="card chart-card">
              <h4 style={{ marginBottom: 'var(--space-md)', fontSize: 'var(--fs-md)' }}>Requests by Program</h4>
              {userScope.progCounts.some(s => s.value > 0) ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xl)' }}>
                  <div style={{ width: '140px', height: '140px', borderRadius: '50%', background: userScope.programChartGradient, flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', fontSize: 'var(--fs-base)' }}>
                    {userScope.progCounts.map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: CHART_PROGRAM_COLORS[i % CHART_PROGRAM_COLORS.length], display: 'inline-block' }} />
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

      {activeTab === 'vendor' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-view">
          <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
            <div style={{ padding: 'var(--space-lg) var(--space-lg)', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, var(--accent-bg), transparent 70%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 'var(--fs-lg)', fontWeight: '700', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><Users size={20} color="var(--accent)" /> Vendor Master</h3>
                <p style={{ margin: 'var(--space-xs) 0 0 0', fontSize: 'var(--fs-base)', color: 'var(--text-sub)' }}>Manage registered suppliers and their commercial details</p>
              </div>
              <button className="btn-primary btn-small" onClick={() => setShowVendorForm(true)}><Plus size={14} /> Add Vendor</button>
            </div>
            <div className="toolbar" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-md) var(--space-lg)', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
              <div className="search-wrapper" style={{ flex: 1, background: 'var(--bg-card)', position: 'relative', display: 'flex', alignItems: 'center', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-sub)' }} />
                <input 
                  type="text" 
                  placeholder="Search by name, GSTIN, contact or email..." 
                  value={vendorSearch} 
                  onChange={e => setVendorSearch(e.target.value)} 
                  style={{ width: '100%', padding: 'var(--space-sm) 40px', background: 'transparent', border: 'none', fontSize: 'var(--fs-md)', outline: 'none' }} 
                />
                {vendorSearch && (
                  <button onClick={() => setVendorSearch('')} style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', padding: 'var(--space-xs)', cursor: 'pointer', color: 'var(--text-sub)', display: 'flex', alignItems: 'center' }}><X size={14} /></button>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: 'var(--fs-base)', color: 'var(--text-sub)', whiteSpace: 'nowrap', padding: '0 var(--space-sm)' }}>
                <span style={{ fontWeight: '700', color: 'var(--accent)' }}>{filteredVendors.length}</span> {filteredVendors.length === 1 ? 'vendor' : 'vendors'} found
              </div>
            </div>
            <table className="enterprise-table">
              <thead><tr><th>Name</th><th>Contact Person</th><th>Email</th><th>Phone</th><th>GSTIN</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {filteredVendors.map(v => (
                  <tr key={v.id}>
                    <td><strong>{v.name}</strong></td><td>{v.contactPerson || '-'}</td><td>{v.email}</td><td>{v.phone || '-'}</td><td><code>{v.gstin || '-'}</code></td>
                    <td className="text-right"><div style={{ display: 'flex', gap: 'var(--space-xs)', justifyContent: 'flex-end' }}>
                      <button className="btn-icon-only" onClick={() => handleEditVendor(v)}><Settings size={14} /></button>
                      <button className="btn-icon-only destructive" onClick={() => handleDeleteVendor(v.id)}><Trash2 size={14} /></button>
                    </div></td>
                  </tr>
                ))}
                {filteredVendors.length === 0 && (
                  <tr>
                    <td colSpan="6" className="empty-msg">
                      {vendorSearch ? `No vendors match "${vendorSearch}"` : 'No vendors yet. Click "Add Vendor" to get started.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <AnimatePresence>
            {showVendorForm && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay">
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="modal-content" style={{ maxWidth: '650px', padding: '0', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
                  <div style={{ padding: 'var(--space-lg) var(--space-lg)', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, var(--accent-bg), transparent 70%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ margin: 0, fontSize: 'var(--fs-lg)', fontWeight: '700', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <Users size={20} color="var(--accent)" /> {editVendorId ? 'Edit Vendor Details' : 'Add New Vendor'}
                    </h3>
                    <button className="btn-icon-only" onClick={() => setShowVendorForm(false)}><X size={18} /></button>
                  </div>
                  <div className="form-grid" style={{ padding: 'var(--space-lg)', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
                     <div className="form-group"><label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><Briefcase size={15} /> Vendor Name <span className="mandatory">*</span></label><input value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })} style={{ padding: '14px 16px', fontSize: 'var(--fs-md)' }} /></div>
                     <div className="form-group"><label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><FileText size={15} /> Contact Person</label><input value={vendorForm.contactPerson} onChange={e => setVendorForm({ ...vendorForm, contactPerson: e.target.value })} style={{ padding: '14px 16px', fontSize: 'var(--fs-md)' }} /></div>
                     <div className="form-group"><label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><FileText size={15} /> Email <span className="mandatory">*</span></label><input type="email" value={vendorForm.email} onChange={e => setVendorForm({ ...vendorForm, email: e.target.value })} style={{ padding: '14px 16px', fontSize: 'var(--fs-md)' }} /></div>
                     <div className="form-group"><label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><FileText size={15} /> Phone</label><input value={vendorForm.phone} onChange={e => setVendorForm({ ...vendorForm, phone: e.target.value })} style={{ padding: '14px 16px', fontSize: 'var(--fs-md)' }} /></div>
                     <div className="form-group"><label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><Hash size={15} /> GSTIN</label><input value={vendorForm.gstin} onChange={e => setVendorForm({ ...vendorForm, gstin: e.target.value })} style={{ padding: '14px 16px', fontSize: 'var(--fs-md)' }} /></div>
                     <div className="form-group" style={{ gridColumn: 'span 2' }}><label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><FileText size={15} /> Address</label><textarea value={vendorForm.address} onChange={e => setVendorForm({ ...vendorForm, address: e.target.value })} style={{ padding: 'var(--space-sm) var(--space-sm)', fontSize: 'var(--fs-md)', minHeight: '80px' }} /></div>
                  </div>
                  <div className="form-actions" style={{ padding: 'var(--space-md) var(--space-lg)', borderTop: '1px solid var(--border)', background: 'var(--bg-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
                    <button className="btn-secondary" onClick={() => setShowVendorForm(false)}>Cancel</button>
                     <button className="btn-primary" onClick={handleSaveVendor} style={{ width: 'auto', padding: '0.7rem var(--space-xl)', fontSize: 'var(--fs-md)', fontWeight: '700' }}>
                      <Save size={16} /> {editVendorId ? 'Update Vendor' : 'Add Vendor'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {activeTab === 'part' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-view">
          <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
            <div style={{ padding: 'var(--space-lg) var(--space-lg)', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, var(--accent-bg), transparent 70%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 'var(--fs-lg)', fontWeight: '700', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><Settings size={20} color="var(--accent)" /> Part Master</h3>
                <p style={{ margin: 'var(--space-xs) 0 0 0', fontSize: 'var(--fs-base)', color: 'var(--text-sub)' }}>Catalog of mechanical and electrical components</p>
              </div>
              <button className="btn-primary btn-small" onClick={() => setShowPartForm(true)}><Plus size={14} /> Add Part</button>
            </div>
            <table className="enterprise-table">
              <thead><tr><th>Drawing No.</th><th>Part Name</th><th>Units</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {parts.map(p => (
                  <tr key={p.id}><td><code>{p.drawing}</code></td><td><strong>{p.name}</strong></td><td>{p.units || 'Nos.'}</td>
                    <td className="text-right"><div style={{ display: 'flex', gap: 'var(--space-xs)', justifyContent: 'flex-end' }}>
                      <button className="btn-icon-only" onClick={() => handleEditPart(p)}><Settings size={14} /></button>
                      <button className="btn-icon-only destructive" onClick={() => handleDeletePart(p.id)}><Trash2 size={14} /></button>
                    </div></td>
                  </tr>
                ))}
                {parts.length === 0 && <tr><td colSpan="4" className="empty-msg">No parts yet. Click "Add Part" to get started.</td></tr>}
              </tbody>
            </table>
          </div>
          <AnimatePresence>
            {showPartForm && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay">
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="modal-content" style={{ maxWidth: '550px', padding: '0', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
                  <div style={{ padding: 'var(--space-lg) var(--space-lg)', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, var(--accent-bg), transparent 70%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ margin: 0, fontSize: 'var(--fs-lg)', fontWeight: '700', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <Settings size={20} color="var(--accent)" /> {editPartId ? 'Edit Part Details' : 'Add New Part'}
                    </h3>
                    <button className="btn-icon-only" onClick={() => setShowPartForm(false)}><X size={18} /></button>
                  </div>
                  <div className="form-grid" style={{ padding: 'var(--space-lg)', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
                     <div className="form-group"><label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><Hash size={15} /> Drawing No. <span className="mandatory">*</span></label><input value={partForm.drawing} onChange={e => setPartForm({ ...partForm, drawing: e.target.value })} style={{ padding: '14px 16px', fontSize: 'var(--fs-md)' }} /></div>
                     <div className="form-group"><label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><Package size={15} /> Part Name <span className="mandatory">*</span></label><input value={partForm.name} onChange={e => setPartForm({ ...partForm, name: e.target.value })} style={{ padding: '14px 16px', fontSize: 'var(--fs-md)' }} /></div>
                     <div className="form-group" style={{ gridColumn: 'span 2' }}><label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><FileText size={15} /> Units</label><select value={partForm.units} onChange={e => setPartForm({ ...partForm, units: e.target.value })} style={{ padding: '14px 16px', fontSize: 'var(--fs-md)' }}>
                      <option>Nos.</option><option>Kgs.</option><option>Ltrs.</option><option>Mtrs.</option><option>Sq. Mtrs.</option>
                    </select></div>
                  </div>
                  <div className="form-actions" style={{ padding: 'var(--space-md) var(--space-lg)', borderTop: '1px solid var(--border)', background: 'var(--bg-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
                    <button className="btn-secondary" onClick={() => setShowPartForm(false)}>Cancel</button>
                     <button className="btn-primary" onClick={handleSavePart} style={{ width: 'auto', padding: '0.7rem var(--space-xl)', fontSize: 'var(--fs-md)', fontWeight: '700' }}>
                      <Save size={16} /> {editPartId ? 'Update Part' : 'Add Part'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {activeTab === 'po_request' && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="po-request-container">
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', marginBottom: 'var(--space-lg)', overflow: 'hidden' }}>
            <div style={{ padding: 'var(--space-lg) var(--space-lg)', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, var(--accent-bg), transparent 70%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 'var(--fs-lg)', fontWeight: '700', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <FileText size={22} color="var(--accent)" /> {editingRequestId ? 'Edit Purchase Request' : 'Create New Purchase Request'}
                </h3>
                <p style={{ margin: 'var(--space-xs) 0 0 0', fontSize: 'var(--fs-base)', color: 'var(--text-sub)' }}>Prototype purchase order for machining and procurement</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <div style={{ padding: 'var(--space-xs) var(--space-sm)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                  <Clock size={14} /> Draft
                </div>
              </div>
            </div>
            
            <div style={{ padding: 'var(--space-xs) var(--space-lg)', borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)', display: 'flex', gap: 'var(--space-lg)' }}>
              {[{id: 'request-info', label: 'Request Info', icon: <FileText size={15} />}, {id: 'items', label: 'Items', icon: <Package size={15} />}, {id: 'terms', label: 'Commercial Terms', icon: <CreditCard size={15} />}, {id: 'docs', label: 'Documentation', icon: <FileUp size={15} />}].map((section, idx) => (
                <div key={section.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: 'var(--space-sm) 0', fontSize: 'var(--fs-base)', color: 'var(--text-sub)', borderBottom: section.id === 'request-info' ? '2px solid var(--accent)' : '2px solid transparent', fontWeight: '600' }}>
                  <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>{idx + 1}</span>
                  {section.icon} {section.label}
                </div>
              ))}
            </div>

            <div className="form-grid" style={{ padding: 'var(--space-lg)', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-lg)' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><FileText size={15} /> Request Title <span className="mandatory">*</span></label>
                <input value={poRequestForm.title} onChange={e => setPoRequestForm({ ...poRequestForm, title: e.target.value })} placeholder="Enter a descriptive title for this request..." style={{ fontSize: 'var(--fs-md)', padding: '14px 16px' }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><Briefcase size={15} /> Request Type</label>
                <select value={poRequestForm.type} onChange={e => setPoRequestForm({ ...poRequestForm, type: e.target.value })} style={{ fontSize: 'var(--fs-md)', padding: '14px 16px' }}>
                  <option value="PO">Purchase Order (PO)</option>
                  <option value="SO">Service Order (SO)</option>
                </select>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><Settings size={15} /> Category</label>
                <input list="po-categories" value={poRequestForm.category} onChange={e => setPoRequestForm({ ...poRequestForm, category: e.target.value })} placeholder="Select or type..." style={{ fontSize: 'var(--fs-md)', padding: '14px 16px' }} />
                <datalist id="po-categories">
                  <option value="Prototypes (BO & Machining)" />
                  <option value="Consumables" />
                  <option value="Tools & Tackles" />
                  <option value="Other" />
                </datalist>
                {poRequestForm.category === 'Other' && (
                  <input
                    type="text"
                    value={poRequestForm.customCategory || ''}
                    onChange={e => setPoRequestForm({ ...poRequestForm, customCategory: e.target.value })}
                    placeholder="Enter category manually..."
                    style={{ fontSize: 'var(--fs-md)', padding: '14px 16px', marginTop: '8px' }}
                  />
                )}
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><Users size={15} /> Vendor</label>
                <input list="po-vendors" value={poRequestForm.vendorId} onChange={e => setPoRequestForm({ ...poRequestForm, vendorId: e.target.value })} placeholder="Search vendor..." style={{ fontSize: 'var(--fs-md)', padding: '14px 16px' }} />
                <datalist id="po-vendors">
                  {vendors.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                  <option value="Other">Other (not listed)</option>
                </datalist>
                {poRequestForm.vendorId === 'Other' && (
                  <input
                    type="text"
                    value={poRequestForm.customVendorName}
                    onChange={e => setPoRequestForm({ ...poRequestForm, customVendorName: e.target.value })}
                    placeholder="Enter vendor name manually..."
                    style={{ fontSize: 'var(--fs-md)', padding: '14px 16px', marginTop: '8px' }}
                  />
                )}
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><Briefcase size={15} /> Program <span className="mandatory">*</span></label>
                <select value={poRequestForm.programName} onChange={e => setPoRequestForm({ ...poRequestForm, programName: e.target.value })} style={{ fontSize: 'var(--fs-md)', padding: '14px 16px' }}>
                  <option value="">Select Program</option>
                  {programs.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><FileText size={15} /> Work Order</label>
                <input list="po-workorders" value={poRequestForm.workOrderId} onChange={e => setPoRequestForm({ ...poRequestForm, workOrderId: e.target.value })} placeholder="Select work order..." style={{ fontSize: 'var(--fs-md)', padding: '14px 16px' }} />
                <datalist id="po-workorders">
                  {workOrders.map(wo => <option key={wo.id} value={wo.refId || wo.id}>{wo.refId || wo.id} - {wo.title}</option>)}
                  <option value="Other">Other (not listed)</option>
                </datalist>
                {poRequestForm.workOrderId === 'Other' && (
                  <input
                    type="text"
                    value={poRequestForm.customWorkOrderTitle}
                    onChange={e => setPoRequestForm({ ...poRequestForm, customWorkOrderTitle: e.target.value })}
                    placeholder="Enter work order title manually..."
                    style={{ fontSize: 'var(--fs-md)', padding: '14px 16px', marginTop: '8px' }}
                  />
                )}
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><Users size={15} /> Program Owner</label>
                <select value={poRequestForm.programOwner} onChange={e => setPoRequestForm({ ...poRequestForm, programOwner: e.target.value })} style={{ fontSize: 'var(--fs-md)', padding: '14px 16px' }}>
                  <option value="">Select Owner</option>
                  {registeredUsers.filter(u => (u.roles || []).some(r => ['Program Owner', 'Program Head'].includes(r))).map(u => <option key={u.username} value={u.username}>{u.fullName || u.username}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><Hash size={15} /> Budget Code</label>
                <input value={poRequestForm.budgetCode} onChange={e => setPoRequestForm({ ...poRequestForm, budgetCode: e.target.value })} placeholder="Auto-filled or manual entry" style={{ fontSize: 'var(--fs-md)', padding: '14px 16px' }} />
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 'var(--space-lg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, var(--accent-bg), transparent 70%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 'var(--fs-lg)', fontWeight: '700', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><Package size={18} color="var(--accent)" /> Part / Item Details</h3>
              <button className="btn-primary btn-small" onClick={addPOItemRow}><Plus size={14} /> Add Item</button>
            </div>
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {poRequestForm.items.map((item, idx) => (
                <div key={idx} style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'var(--bg)' : 'var(--bg-card)', display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 0.8fr 0.7fr 0.9fr 0.9fr 0.6fr', gap: 'var(--space-sm)', alignItems: 'end' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', fontSize: 'var(--fs-sm)' }}><FileText size={13} /> Drawing No. <span className="mandatory">*</span></label>
                     <input list={`part-drawings-${idx}`} value={item.partDrawing} onChange={e => updatePOItem(idx, 'partDrawing', e.target.value)} placeholder="Part drawing..." style={{ padding: 'var(--space-sm) var(--space-sm)', fontSize: 'var(--fs-md)' }} />
                     <datalist id={`part-drawings-${idx}`}>{parts.map(p => <option key={p.id} value={p.drawing}>{p.drawing} - {p.name}</option>)}</datalist>
                   </div>
                   <div className="form-group" style={{ marginBottom: 0 }}>
                     <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', fontSize: 'var(--fs-sm)' }}><Package size={13} /> Part Name <span className="mandatory">*</span></label>
                     <input value={item.partName} onChange={e => updatePOItem(idx, 'partName', e.target.value)} placeholder="Part name..." style={{ padding: 'var(--space-sm) var(--space-sm)', fontSize: 'var(--fs-md)' }} />
                   </div>
                   <div className="form-group" style={{ marginBottom: 0 }}>
                     <label style={{ fontSize: 'var(--fs-sm)' }}>Unit</label>
                     <select value={item.unit} onChange={e => updatePOItem(idx, 'unit', e.target.value)} style={{ padding: 'var(--space-sm) var(--space-sm)', fontSize: 'var(--fs-md)' }}>
                       <option>Nos.</option><option>Kgs.</option><option>Ltrs.</option><option>Mtrs.</option>
                     </select>
                   </div>
                   <div className="form-group" style={{ marginBottom: 0 }}>
                     <label style={{ fontSize: 'var(--fs-sm)' }}>Qty</label>
                     <input type="number" min="1" value={item.qty} onChange={e => updatePOItem(idx, 'qty', e.target.value)} style={{ padding: 'var(--space-sm) var(--space-sm)', fontSize: 'var(--fs-md)' }} />
                   </div>
                   <div className="form-group" style={{ marginBottom: 0 }}>
                     <label style={{ fontSize: 'var(--fs-sm)' }}>Unit Price</label>
                     <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => updatePOItem(idx, 'unitPrice', e.target.value)} style={{ padding: 'var(--space-sm) var(--space-sm)', fontSize: 'var(--fs-md)' }} />
                   </div>
                   <div className="form-group" style={{ marginBottom: 0 }}>
                     <label style={{ fontSize: 'var(--fs-sm)' }}>Currency</label>
                     <select value={item.currency} onChange={e => updatePOItem(idx, 'currency', e.target.value)} style={{ padding: 'var(--space-sm) var(--space-sm)', fontSize: 'var(--fs-md)' }}>
                      {CURRENCY_DATA.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                    <label style={{ fontSize: 'var(--fs-sm)' }}>Amount</label>
                    <span style={{ fontSize: 'var(--fs-md)', fontWeight: '750', color: 'var(--accent)', padding: 'var(--space-sm) 0' }}>
                      {CURRENCY_DATA.find(c => c.code === item.currency)?.symbol || '₹'}{(Number(item.qty || 0) * Number(item.unitPrice || 0)).toLocaleString()}
                    </span>
                  </div>
                  {poRequestForm.items.length > 1 && (
                    <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 'var(--space-xs)' }}>
                      <button className="btn-icon-only destructive" onClick={() => removePOItemRow(idx)} title="Remove Item"><Trash2 size={16} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {poRequestForm.items.length > 0 && (
              <div style={{ padding: 'var(--space-md) 22px', background: 'var(--bg-card)', borderTop: '2px solid var(--border)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <span style={{ fontSize: 'var(--fs-md)', fontWeight: '600', color: 'var(--text-sub)' }}>TOTAL ITEMS: {poRequestForm.items.length}</span>
                <span style={{ fontSize: 'var(--fs-lg)', fontWeight: '700', color: 'var(--accent)' }}>
                  {CURRENCY_DATA.find(c => c.code === (poRequestForm.items[0]?.currency || 'INR'))?.symbol || '₹'}
                  {poRequestForm.items.reduce((sum, i) => sum + (Number(i.qty || 0) * Number(i.unitPrice || 0)), 0).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="card" style={{ marginBottom: 'var(--space-lg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, var(--accent-bg), transparent 70%)' }}>
              <h3 style={{ margin: 0, fontSize: 'var(--fs-lg)', fontWeight: '700', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><CreditCard size={18} color="var(--accent)" /> Commercial Terms & Compliance</h3>
            </div>
            <div className="form-grid" style={{ padding: '22px', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: 'var(--space-sm)' }}><CreditCard size={15} /> Payment Mode</label>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-xs)' }}>
                  <label style={{ flex: 1, padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-md)', border: `2px solid ${poRequestForm.paymentMode === 'Credit' ? 'var(--accent)' : 'var(--border)'}`, background: poRequestForm.paymentMode === 'Credit' ? 'var(--accent-bg)' : 'var(--bg)', cursor: 'pointer', fontSize: 'var(--fs-md)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <input type="radio" name="paymentMode" checked={poRequestForm.paymentMode === 'Credit'} onChange={() => setPoRequestForm({ ...poRequestForm, paymentMode: 'Credit' })} style={{ width: '18px', height: '18px' }} /> Credit
                  </label>
                  <label style={{ flex: 1, padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-md)', border: `2px solid ${poRequestForm.paymentMode === 'Advance' ? 'var(--accent)' : 'var(--border)'}`, background: poRequestForm.paymentMode === 'Advance' ? 'var(--accent-bg)' : 'var(--bg)', cursor: 'pointer', fontSize: 'var(--fs-md)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <input type="radio" name="paymentMode" checked={poRequestForm.paymentMode === 'Advance'} onChange={() => setPoRequestForm({ ...poRequestForm, paymentMode: 'Advance' })} style={{ width: '18px', height: '18px' }} /> Advance
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}><Truck size={15} /> Delivery / Lead Time</label>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                   <input type="number" min="1" value={poRequestForm.deliveryValue} onChange={e => setPoRequestForm({ ...poRequestForm, deliveryValue: e.target.value })} placeholder="Value" style={{ flex: '1', padding: '14px 16px', fontSize: 'var(--fs-md)' }} />
                   <select value={poRequestForm.deliveryUnit} onChange={e => setPoRequestForm({ ...poRequestForm, deliveryUnit: e.target.value })} style={{ flex: '1', padding: '14px 16px', fontSize: 'var(--fs-md)' }}>
                     <option value="Days">Days</option><option value="Months">Months</option>
                   </select>
                </div>
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}><MessageSquare size={15} /> Payment Comments / Specific Terms</label>
                 <textarea value={poRequestForm.paymentComments} onChange={e => setPoRequestForm({ ...poRequestForm, paymentComments: e.target.value })} placeholder="Enter any specific payment terms, special instructions, or notes..." style={{ marginTop: 'var(--space-sm)', minHeight: '90px', padding: 'var(--space-sm) var(--space-sm)', fontSize: 'var(--fs-md)' }} />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: 'var(--space-sm)' }}><ShieldCheck size={15} /> Quality Requirements</label>
                <div style={{ display: 'flex', gap: 'var(--space-lg)', marginTop: 'var(--space-xs)' }}>
                  <label style={{ flex: 1, padding: 'var(--space-sm) 18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', fontSize: 'var(--fs-md)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <input type="checkbox" checked={poRequestForm.qualityAssurance} onChange={e => setPoRequestForm({ ...poRequestForm, qualityAssurance: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontWeight: '600' }}>Part Assurance Required</span>
                      <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)' }}>Quality verification needed for manufactured parts</span>
                    </div>
                  </label>
                  <label style={{ flex: 1, padding: 'var(--space-sm) 18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', fontSize: 'var(--fs-md)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <input type="checkbox" checked={poRequestForm.qualityTC} onChange={e => setPoRequestForm({ ...poRequestForm, qualityTC: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontWeight: '600' }}>Supplier TC Required</span>
                      <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)' }}>Technical clearance from vendor needed</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 'var(--space-lg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, var(--accent-bg), transparent 70%)' }}>
              <h3 style={{ margin: 0, fontSize: 'var(--fs-lg)', fontWeight: '700', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><FileUp size={18} color="var(--accent)" /> Documentation & Remarks</h3>
            </div>
            <div className="form-grid" style={{ padding: '22px', gridTemplateColumns: '1fr', gap: 'var(--space-lg)' }}>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}><FileUp size={15} /> Upload Quotation <span className="mandatory">*</span></label>
                <div style={{ marginTop: 'var(--space-sm)' }}>
                   <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} style={{ padding: '14px 16px', fontSize: 'var(--fs-md)', border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg)', width: '100%' }} />
                  {poRequestForm.fileName && (
                    <div style={{ marginTop: 'var(--space-sm)', padding: 'var(--space-sm) 18px', background: 'var(--emerald-bg)', border: '1px solid var(--emerald-bg)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-sm)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', overflow: 'hidden' }}>
                        <FileText size={18} color="#065f46" />
                        <span style={{ fontSize: 'var(--fs-md)', color: 'var(--emerald-text)', fontWeight: '600' }}>{poRequestForm.fileName}</span>
                      </div>
                      <CheckCircle2 size={18} color="#065f46" />
                    </div>
                  )}
                  {uploadProgress > 0 && (
                    <div style={{ marginTop: 'var(--space-sm)' }}>
                      <div style={{ fontSize: 'var(--fs-base)', color: 'var(--text-sub)', marginBottom: 'var(--space-xs)' }}>Uploading... {uploadProgress}%</div>
                      <div className="upload-progress-container"><div className={`upload-progress-bar ${uploadProgress === 100 ? 'complete' : ''}`} style={{ width: `${uploadProgress}%` }}></div></div>
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}><MessageSquare size={15} /> Internal Remarks</label>
                 <textarea value={poRequestForm.remarks} onChange={e => setPoRequestForm({ ...poRequestForm, remarks: e.target.value })} placeholder="Any internal notes for the approver regarding this request..." style={{ marginTop: 'var(--space-sm)', minHeight: '100px', padding: 'var(--space-sm) var(--space-sm)', fontSize: 'var(--fs-md)' }} />
              </div>
            </div>
          </div>

          <div className="form-actions" style={{ padding: '0 var(--space-lg) var(--space-xl)', display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
            <button className="btn-secondary" onClick={() => setActiveTab('my_request')}>Cancel</button>
            <button className="btn-primary" onClick={handleSavePORequest} style={{ width: 'auto', padding: '0.7rem var(--space-xl)', fontSize: 'var(--fs-md)', fontWeight: '700' }}>
              <Save size={16} /> {editingRequestId ? 'Update Request' : 'Save & Generate'}
            </button>
          </div>
        </motion.div>
      )}

      {activeTab === 'my_request' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card table-container">
          <FilterSection
            show={showMyReqFilters}
            onToggle={() => setShowMyReqFilters(!showMyReqFilters)}
            label="My Request Filters"
            activeCount={[myRequestFilters.status, myRequestFilters.program, myRequestFilters.vendor].filter(Boolean).length}
            onClear={() => setMyRequestFilters({ status: '', program: '', vendor: '' })}
          >
            <FilterSelect value={myRequestFilters.status} onChange={e => setMyRequestFilters({ ...myRequestFilters, status: e.target.value })}>
              <option value="">All Statuses</option><option>Pending Owner</option><option>Pending Admin</option><option>Pending Head</option><option>Approved</option><option>Correction Required</option><option>Rejected</option><option>Cancelled</option>
            </FilterSelect>
            <FilterSelect value={myRequestFilters.program} onChange={e => setMyRequestFilters({ ...myRequestFilters, program: e.target.value })}>
              <option value="">All Programs</option>{[...new Set(protoRequests.map(r => r.programName))].map(p => <option key={p} value={p}>{p}</option>)}
            </FilterSelect>
            <FilterSelect value={myRequestFilters.vendor} onChange={e => setMyRequestFilters({ ...myRequestFilters, vendor: e.target.value })}>
              <option value="">All Vendors</option>{vendors.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
            </FilterSelect>
          </FilterSection>
          <table className="enterprise-table">
            <thead className="sticky-header"><tr><th>Date</th><th>Title</th><th>Vendor</th><th>Progress</th><th>Status</th><th className="text-right" style={{ paddingRight: 'var(--space-md)' }}>Actions</th></tr></thead>
            <tbody>
              {protoRequests.filter(req => req.requestedBy === loginForm.username).filter(req => {
                if (myRequestFilters.status && req.status !== myRequestFilters.status) return false;
                if (myRequestFilters.program && req.programName !== myRequestFilters.program) return false;
                const vendorName = vendors.find(v => String(v.id) === String(req.vendorId))?.name || req.vendorId || '';
                if (myRequestFilters.vendor && vendorName !== myRequestFilters.vendor) return false;
                return true;
              }).map(req => (
                <motion.tr key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileHover={{ backgroundColor: 'rgba(var(--accent-rgb), 0.02)' }}>
                  <td>{formatDate(req.createdAt)}</td>
                  <td>{req.title}</td>
                  <td>{vendors.find(v => String(v.id) === String(req.vendorId))?.name || req.vendorId || 'N/A'}</td>
                  <td><StatusStepper status={req.status} /></td>
                  <td>
                    <span className={`pill-badge ${getStatusVariant(req.status)}`}>{req.status}</span>
                    {(() => { const ri = getReassignedInfo(req); return ri ? <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--accent)', marginTop: 'var(--space-xs)', fontWeight: '600' }}>Reassigned to: {ri.username} ({ri.role})</div> : null; })()}
                  </td>
                  <td className="text-right">
                    <div style={{ display: 'flex', gap: 'var(--space-xs)', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      {(req.status.includes('Pending') || req.status === 'Correction Required') && <button className="btn-small" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }} onClick={() => handleEditOwnRequest(req)}>Edit</button>}
                      {req.status.includes('Pending') && <button className="btn-small" style={{ borderColor: 'var(--rose-text)', color: 'var(--rose-text)' }} onClick={() => handleCancelRequest(req.id)}>Cancel</button>}
                      {req.status.includes('Pending') && <button className="btn-icon-only" style={{ color: 'var(--amber-text)', borderColor: 'var(--amber-bg)', background: 'var(--amber-bg)' }} onClick={() => handleFollowUp(req)} title="Send Follow-up"><Bell size={16} /></button>}
                      <button className="btn-icon-only" onClick={() => setViewingRequestDetails(req)} title="View Summary & History"><Eye size={16} /></button>
                      {req.fileName && <button className="btn-icon-only success" onClick={() => handleFileDownload(req.fileName)} title="Download Quotation"><FileText size={16} /></button>}
                      {req.poFile && <button className="btn-icon-only" onClick={() => handleFileDownload(req.poFile)} title="Download Purchase Order" style={{ color: 'var(--emerald-text)', borderColor: 'var(--emerald-bg)', background: 'var(--emerald-bg)' }}><Download size={16} /></button>}
                    </div>
                  </td>
                </motion.tr>
              ))}
              {protoRequests.filter(req => req.requestedBy === loginForm.username).length === 0 && <tr><td colSpan="6" className="empty-state-cell"><div className="empty-state-content">No active requests found.</div></td></tr>}
            </tbody>
          </table>
        </motion.div>
      )}

      {activeTab === 'approvals' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card table-container">
          <div style={{ padding: 'var(--space-lg) var(--space-lg)', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, var(--accent-bg), transparent 70%)' }}>
            <h3 style={{ margin: 0, fontSize: 'var(--fs-lg)', fontWeight: '700', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <CheckCircle2 size={20} color="var(--accent)" /> Pending Approvals
            </h3>
            <p style={{ margin: 'var(--space-xs) 0 0 0', fontSize: 'var(--fs-base)', color: 'var(--text-sub)' }}>Requests awaiting your review and authorization</p>
          </div>
          <table className="enterprise-table">
            <thead className="sticky-header"><tr><th>Date</th><th>From</th><th>Title</th><th>Progress</th><th>Status</th><th className="text-right" style={{ paddingRight: 'var(--space-md)' }}>Action</th></tr></thead>
            <tbody>
              {userScope.requests.filter(req => {
                if (userRoles.includes('Administrator')) return req.status.includes('Pending');
                if (req.status === 'Pending Owner') return req.programOwner === loginForm.username || userRoles.includes('Program Head');
                if (req.status === 'Pending Admin') return req.programAdmin === loginForm.username;
                if (req.status === 'Pending Head') return userRoles.includes('Program Head');
                return false;
              }).map(req => (
                <tr key={req.id}>
                  <td>{formatDate(req.createdAt)}</td>
                  <td>{req.requestedBy}</td>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>{req.title}</div></td>
                  <td><StatusStepper status={req.status} /></td>
                  <td>
                    <span className="pill-badge amber">{req.status}</span>
                    {(() => { const ri = getReassignedInfo(req); return ri ? <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--accent)', marginTop: 'var(--space-xs)', fontWeight: '600' }}>Reassigned to: {ri.username} ({ri.role})</div> : null; })()}
                  </td>
                  <td className="text-right"><button className="btn-primary btn-small" style={{ width: 'auto' }} onClick={() => setReviewingRequest({ ...req })}>Review Request</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {userScope.requests.filter(req =>
            (userRoles.includes('Administrator') && req.status.includes('Pending')) ||
            (req.status === 'Pending Owner' && (req.programOwner === loginForm.username || userRoles.includes('Program Head'))) ||
            (req.status === 'Pending Admin' && req.programAdmin === loginForm.username) ||
            (req.status === 'Pending Head' && userRoles.includes('Program Head'))
          ).length === 0 && <p className="empty-msg">No pending approvals for you.</p>}
        </motion.div>
      )}

      {activeTab === 'report' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-view">
          <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
            <FilterSection
              show={showReportFilters}
              onToggle={() => setShowReportFilters(!showReportFilters)}
              label="Report Filters"
              activeCount={[reportFilters.startDate, reportFilters.endDate, reportFilters.program, reportFilters.vendor, reportFilters.status].filter(Boolean).length}
              onClear={() => setReportFilters({ startDate: '', endDate: '', program: '', vendor: '', status: '' })}
            >
              <FilterDateInput value={reportFilters.startDate} onChange={e => setReportFilters({ ...reportFilters, startDate: e.target.value })} />
              <FilterDateInput value={reportFilters.endDate} onChange={e => setReportFilters({ ...reportFilters, endDate: e.target.value })} />
              <FilterSelect value={reportFilters.program} onChange={e => setReportFilters({ ...reportFilters, program: e.target.value })}>
                <option value="">All Programs</option>{[...new Set(protoRequests.map(r => r.programName))].map(p => <option key={p} value={p}>{p}</option>)}
              </FilterSelect>
              <FilterSelect value={reportFilters.vendor} onChange={e => setReportFilters({ ...reportFilters, vendor: e.target.value })}>
                <option value="">All Vendors</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </FilterSelect>
              <FilterSelect value={reportFilters.status} onChange={e => setReportFilters({ ...reportFilters, status: e.target.value })}>
                <option value="">All Statuses</option><option>Pending Owner</option><option>Pending Admin</option><option>Pending Head</option><option>Approved</option><option>Correction Required</option><option>Rejected</option><option>Cancelled</option>
              </FilterSelect>
              <button className="btn-small" onClick={handleExportReport} style={{ padding: '6px 12px', fontSize: 'var(--fs-sm)' }} title="Download the filtered report as a CSV file"><Download size={14} /> Export</button>
            </FilterSection>
           </div>
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <div className="stat-card" style={{ maxWidth: '250px' }}><span className="stat-label"><Package size={14} style={{ marginRight: 'var(--space-xs)' }} /> Filtered Count</span><span className="stat-value">{reportStats.count}</span></div>
          </div>
          <div className="card table-container">
            <table className="enterprise-table">
              <thead className="sticky-header"><tr><th>Date</th><th>Title</th><th>Program</th><th>Vendor</th><th>Amount</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {filteredReportData.map(req => (
                  <tr key={req.id}>
                    <td>{formatDate(req.createdAt)}</td>
                    <td>{req.title}</td>
                    <td>{req.programName}</td>
                    <td>{vendors.find(v => String(v.id) === String(req.vendorId))?.name || req.vendorId || 'N/A'}</td>
                    <td>{(() => { const currency = (req.items && req.items[0]?.currency) || 'INR'; const symbol = CURRENCY_DATA.find(c => c.code === currency)?.symbol || '₹'; const amount = req.items ? req.items.reduce((sum, i) => sum + (Number(i.qty || 0) * Number(i.unitPrice || 0)), 0) : (Number(req.qty || 0) * Number(req.unitPrice || 0)); return `${symbol}${amount.toLocaleString()}`; })()}</td>
                    <td><span className={`pill-badge ${getStatusVariant(req.status)}`}>{req.status}</span></td>
                    <td className="text-right"><div style={{ display: 'flex', gap: 'var(--space-xs)', justifyContent: 'flex-end' }}>
                      <button className="btn-icon-only" onClick={() => setViewingRequestDetails(req)} title="View Summary & History"><Eye size={16} /></button>
                      {req.fileName && <button className="btn-icon-only success" onClick={() => handleFileDownload(req.fileName)} title="Download Quotation"><FileText size={16} /></button>}
                      {req.poFile && <button className="btn-icon-only" onClick={() => handleFileDownload(req.poFile)} title="Download Purchase Order" style={{ color: 'var(--emerald-text)', borderColor: 'var(--emerald-bg)', background: 'var(--emerald-bg)' }}><Download size={16} /></button>}
                    </div></td>
                  </tr>
                ))}
                {filteredReportData.length === 0 && <tr><td colSpan="7" className="empty-msg">No records found for selected filters.</td></tr>}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {reviewingRequest && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="modal-content" style={{ maxWidth: '1100px', width: '95%', maxHeight: '92vh', overflowY: 'auto', padding: '0', background: 'var(--bg)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
              <div style={{ padding: 'var(--space-lg) var(--space-xl)', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, var(--accent-bg), transparent 70%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 'var(--fs-xl)', fontWeight: '800', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <ShieldCheck size={24} color="var(--accent)" /> {reviewingRequest.isProduction ? 'Production Request Review' : 'Purchase Request Review'}
                  </h2>
                  <p style={{ margin: 'var(--space-xs) 0 0 0', fontSize: 'var(--fs-base)', color: 'var(--text-sub)' }}>Ref ID: <span style={{ color: 'var(--accent)', fontWeight: '600' }}>{reviewingRequest.refId || reviewingRequest.id}</span> • Submitted on {formatDate(reviewingRequest.createdAt)}</p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                  <span className={`pill-badge ${getStatusVariant(reviewingRequest.status)}`} style={{ padding: 'var(--space-xs) var(--space-md)', fontSize: 'var(--fs-md)' }}>{reviewingRequest.status}</span>
                  <button className="btn-icon-only" onClick={() => setReviewingRequest(null)} title="Close"><X size={18} /></button>
                </div>
              </div>
              <div style={{ padding: 'var(--space-xl)' }}>
                <section style={{ marginBottom: 'var(--space-xl)' }}>
                  <h3 style={{ fontSize: 'var(--fs-base)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent)', marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><Info size={16} /> General Information</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-lg)', background: 'var(--bg-subtle)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                    <div className="detail-block"><label style={{ display: 'block', fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', marginBottom: 'var(--space-xs)', fontWeight: '600' }}>Vendor</label><div style={{ fontSize: 'var(--fs-md)', fontWeight: '500' }}>{vendors.find(v => v.id === Number(reviewingRequest.vendorId))?.name || reviewingRequest.vendorId || 'N/A'}</div></div>
                    <div className="detail-block"><label style={{ display: 'block', fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', marginBottom: 'var(--space-xs)', fontWeight: '600' }}>Request Type / Category</label><div style={{ fontSize: 'var(--fs-md)', fontWeight: '500' }}>{reviewingRequest.type} • {reviewingRequest.category}</div></div>
                    <div className="detail-block"><label style={{ display: 'block', fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', marginBottom: 'var(--space-xs)', fontWeight: '600' }}>Program Name</label>
                       <input style={{ width: '100%', padding: '14px 16px', fontSize: 'var(--fs-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)' }} value={reviewingRequest.programName || ''} onChange={e => setReviewingRequest({ ...reviewingRequest, programName: e.target.value })} type="text" />
                     </div>
                     <div className="detail-block"><label style={{ display: 'block', fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', marginBottom: 'var(--space-xs)', fontWeight: '600' }}>Budget Code</label>
                       <input style={{ width: '100%', padding: '14px 16px', fontSize: 'var(--fs-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)' }} value={reviewingRequest.budgetCode || ''} onChange={e => setReviewingRequest({ ...reviewingRequest, budgetCode: e.target.value })} type="text" />
                     </div>
                     <div className="detail-block"><label style={{ display: 'block', fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', marginBottom: 'var(--space-xs)', fontWeight: '600' }}>Work Order</label>
                       <input style={{ width: '100%', padding: '14px 16px', fontSize: 'var(--fs-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)' }} value={reviewingRequest.workOrderId || ''} onChange={e => setReviewingRequest({ ...reviewingRequest, workOrderId: e.target.value })} type="text" />
                    </div>
                    <div className="detail-block"><label style={{ display: 'block', fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', marginBottom: 'var(--space-xs)', fontWeight: '600' }}>Program Owner</label><div style={{ fontSize: 'var(--fs-md)', fontWeight: '500' }}>{reviewingRequest.programOwner}</div></div>
                    <div className="detail-block"><label style={{ display: 'block', fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', marginBottom: 'var(--space-xs)', fontWeight: '600' }}>Program Admin</label><div style={{ fontSize: 'var(--fs-md)', fontWeight: '500' }}>{reviewingRequest.programAdmin}</div></div>
                    <div className="detail-block"><label style={{ display: 'block', fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', marginBottom: 'var(--space-xs)', fontWeight: '600' }}>Requested By</label><div style={{ fontSize: 'var(--fs-md)', fontWeight: '500' }}>{reviewingRequest.requestedBy}</div></div>
                    {previousApproverInfoForReview && (
                      <div style={{ gridColumn: 'span 4', marginTop: 'var(--space-sm)', padding: 'var(--space-sm) var(--space-md)', background: 'var(--emerald-bg)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--emerald-text)' }}>
                        <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--emerald-text)', display: 'block', fontWeight: '700', textTransform: 'uppercase', marginBottom: 'var(--space-xs)' }}>Previous Approver Verdict</label>
                        <span style={{ fontSize: 'var(--fs-md)', fontWeight: '600', color: 'var(--emerald-text)' }}>{previousApproverInfoForReview.user} ({previousApproverInfoForReview.role})</span>
                        {previousApproverInfoForReview.remarks && <p style={{ fontSize: 'var(--fs-base)', margin: 'var(--space-xs) 0 0 0', lineHeight: '1.4', color: 'var(--text-sub)' }}>Remarks: "{previousApproverInfoForReview.remarks}"</p>}
                      </div>
                    )}
                  </div>
                </section>

                <section style={{ marginBottom: 'var(--space-xl)' }}>
                  <h3 style={{ fontSize: 'var(--fs-base)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent)', marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><Package size={16} /> Material List & Pricing</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                    {(reviewingRequest.items || [{ partName: reviewingRequest.partName, partDrawing: reviewingRequest.partDrawing, qty: reviewingRequest.qty, unit: reviewingRequest.unit, unitPrice: reviewingRequest.unitPrice }]).map((item, idx) => (
                      <div key={idx} style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md) var(--space-lg)', display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1.2fr', gap: 'var(--space-lg)', border: '1px solid var(--border)', alignItems: 'center' }}>
                        <div className="detail-block"><label style={{ display: 'block', fontSize: 'var(--fs-xs)', color: 'var(--text-sub)', textTransform: 'uppercase', marginBottom: 'var(--space-xs)' }}>Part Name</label><div style={{ fontSize: 'var(--fs-md)', fontWeight: '700' }}>{item.partName}</div></div>
                        <div className="detail-block"><label style={{ display: 'block', fontSize: 'var(--fs-xs)', color: 'var(--text-sub)', textTransform: 'uppercase', marginBottom: 'var(--space-xs)' }}>Drawing No.</label><div style={{ fontSize: 'var(--fs-md)', fontWeight: '500', fontFamily: 'var(--font-mono)' }}>{item.partDrawing}</div></div>
                        <div className="detail-block"><label style={{ display: 'block', fontSize: 'var(--fs-xs)', color: 'var(--text-sub)', textTransform: 'uppercase', marginBottom: 'var(--space-xs)' }}>Quantity</label><div style={{ fontSize: 'var(--fs-md)', fontWeight: '600' }}>{item.qty} <small style={{ fontWeight: '400', color: 'var(--text-sub)' }}>{item.unit}</small></div></div>
                        <div className="detail-block"><label style={{ display: 'block', fontSize: 'var(--fs-xs)', color: 'var(--text-sub)', textTransform: 'uppercase', marginBottom: 'var(--space-xs)' }}>Unit Price</label><div style={{ fontSize: 'var(--fs-md)', fontWeight: '600' }}>{CURRENCY_DATA.find(c => c.code === (item.currency || 'INR'))?.symbol || '₹'}{Number(item.unitPrice).toLocaleString()}</div></div>
                        <div className="detail-block" style={{ textAlign: 'right' }}><label style={{ display: 'block', fontSize: 'var(--fs-xs)', color: 'var(--text-sub)', textTransform: 'uppercase', marginBottom: 'var(--space-xs)' }}>Amount</label><div style={{ fontSize: 'var(--fs-lg)', fontWeight: '800', color: 'var(--accent)' }}>{CURRENCY_DATA.find(c => c.code === (item.currency || 'INR'))?.symbol || '₹'}{(Number(item.qty) * Number(item.unitPrice)).toLocaleString()}</div></div>
                      </div>
                    ))}
                    <div style={{ padding: 'var(--space-lg) var(--space-lg)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 'var(--space-md)', borderTop: '2px solid var(--border)', marginTop: 'var(--space-sm)', background: 'var(--bg-subtle)', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }}>
                      <span style={{ fontSize: 'var(--fs-md)', fontWeight: '700', color: 'var(--text-sub)', letterSpacing: '0.05em' }}>TOTAL REQUISITION VALUE</span>
                      <span style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--accent)' }}>{CURRENCY_DATA.find(c => c.code === (reviewingRequest.items?.[0]?.currency || 'INR'))?.symbol || '₹'}{(reviewingRequest.items ? reviewingRequest.items.reduce((sum, i) => sum + (Number(i.qty) * Number(i.unitPrice)), 0) : (Number(reviewingRequest.qty) * Number(reviewingRequest.unitPrice))).toLocaleString()}</span>
                    </div>
                  </div>
                </section>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', marginBottom: 'var(--space-xl)' }}>
                  <section>
                    <h3 style={{ fontSize: 'var(--fs-base)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent)', marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><Truck size={16} /> Logistics & Compliance</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-md)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 'var(--fs-md)', color: 'var(--text-sub)' }}>Payment Mode: <strong style={{ color: 'var(--text)' }}>{reviewingRequest.paymentMode}</strong></span>
                        <span style={{ fontSize: 'var(--fs-md)', color: 'var(--text-sub)' }}>Lead Time: <strong style={{ color: 'var(--text)' }}>{reviewingRequest.deliveryValue} {reviewingRequest.deliveryUnit}</strong></span>
                      </div>
                      {reviewingRequest.paymentComments && <div style={{ padding: 'var(--space-md)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}><span style={{ display: 'block', fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', textTransform: 'uppercase', marginBottom: 'var(--space-xs)' }}>Specific Terms / Comments</span><div style={{ fontSize: 'var(--fs-md)', fontWeight: '500' }}>{reviewingRequest.paymentComments}</div></div>}
                      <div style={{ padding: 'var(--space-md)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                        <span style={{ display: 'block', fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', textTransform: 'uppercase', marginBottom: 'var(--space-sm)' }}>Requirements</span>
                        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', fontSize: 'var(--fs-base)', color: reviewingRequest.qualityAssurance ? 'var(--emerald-text)' : 'var(--text-sub)' }}>
                            {reviewingRequest.qualityAssurance ? <CheckCircle2 size={16} /> : <Clock size={16} />} Part Assurance
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', fontSize: 'var(--fs-base)', color: reviewingRequest.qualityTC ? 'var(--emerald-text)' : 'var(--text-sub)' }}>
                            {reviewingRequest.qualityTC ? <CheckCircle2 size={16} /> : <Clock size={16} />} Supplier TC
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 style={{ fontSize: 'var(--fs-base)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent)', marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><FileUp size={16} /> Support Documents</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                      {reviewingRequest.fileName && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-sm) var(--space-md)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', overflow: 'hidden' }}><FileText size={18} color="var(--accent)" /><span style={{ fontSize: 'var(--fs-md)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Quotation: {reviewingRequest.fileName}</span></div>
                          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                            <button className="btn-icon-only" onClick={() => handleFilePreview(reviewingRequest.fileName)}><Search size={14} /></button>
                            <button className="btn-icon-only success" onClick={() => handleFileDownload(reviewingRequest.fileName)}><Download size={14} /></button>
                          </div>
                        </div>
                      )}
                      {reviewingRequest.poFile && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-sm) var(--space-md)', background: 'var(--emerald-bg)', border: '1px solid var(--emerald-text)', borderRadius: 'var(--radius-md)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', overflow: 'hidden' }}><ShieldCheck size={18} color="var(--emerald-text)" /><span style={{ fontSize: 'var(--fs-md)', color: 'var(--emerald-text)', fontWeight: '600' }}>Purchase Order Attached</span></div>
                          <button className="btn-icon-only success" onClick={() => handleFileDownload(reviewingRequest.poFile)} style={{ borderColor: 'var(--emerald-text)' }}><Download size={14} /></button>
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                {reviewingRequest.status === 'Pending Admin' && (
                  <section style={{ background: 'rgba(var(--accent-rgb), 0.04)', border: '1px dashed var(--accent)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
                    <h3 style={{ margin: '0 0 var(--space-md) 0', fontSize: 'var(--fs-lg)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', color: 'var(--accent)' }}><FileUp size={20} /> Fulfillment Action: Attach Purchase Order</h3>
                    <input type="file" onChange={async (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        try { setUploadProgress(1); const fileName = await uploadFile(file); setReviewingRequest({ ...reviewingRequest, poFile: fileName }); setTimeout(() => setUploadProgress(0), 1500); }
                        catch (error) { console.error("PO Upload failed", error); setUploadProgress(0); showToast("Failed to upload PO file.", "error"); }
                      }
                    }} style={{ width: '100%', padding: 'var(--space-sm)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }} />
                    {uploadProgress > 0 && <div className="upload-progress-container" style={{ marginTop: 'var(--space-sm)' }}><div className={`upload-progress-bar ${uploadProgress === 100 ? 'complete' : ''}`} style={{ width: `${uploadProgress}%` }}></div></div>}
                  </section>
                )}

                <div style={{ background: 'var(--bg-subtle)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: 'var(--fs-base)', fontWeight: '700', marginBottom: 'var(--space-sm)', color: 'var(--text)' }}><MessageSquare size={16} /> Reviewer Remarks</label>
                   <textarea style={{ width: '100%', padding: 'var(--space-sm) var(--space-sm)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 'var(--fs-md)', resize: 'vertical' }} placeholder="Provide feedback for approval, rejection, or required corrections..." value={reviewingRequest.reviewRemarks || ''} onChange={e => setReviewingRequest({ ...reviewingRequest, reviewRemarks: e.target.value })} rows="3" />
                  {isReassigning && (
                    <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                      <label style={{ display: 'block', fontSize: 'var(--fs-base)', fontWeight: '700', marginBottom: 'var(--space-sm)' }}>Select New Approver</label>
                      <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                         <select style={{ flex: 1, padding: '14px 16px', fontSize: 'var(--fs-md)' }} value={targetReassignUser} onChange={e => setTargetReassignUser(e.target.value)}>
                          <option value="">-- Choose User --</option>
                          {registeredUsers.filter(u => (u.roles || []).some(r => ['Program Owner', 'Program Head', 'Mechanical Head', 'Electrical Head', 'Production Head', 'Functional Head', 'Head of Technology'].includes(r)) && u.username !== loginForm.username).map(u => <option key={u.username} value={u.username}>{u.username} ({(u.roles || []).join(', ')})</option>)}
                        </select>
                        <button className="btn-primary btn-small" onClick={() => handleReassignRequest(reviewingRequest.id, targetReassignUser)}>Confirm Reassign</button>
                        <button className="btn-small" onClick={() => setIsReassigning(false)}>Cancel</button>
                      </div>
                    </div>
                  )}
                  <div className="form-actions" style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
                    <button className="btn-secondary" style={{ padding: '0.6rem var(--space-lg)' }} onClick={() => setReviewingRequest(null)}>Discard Changes</button>
                    {!isReassigning && <button className="btn-secondary" style={{ padding: '0.6rem var(--space-lg)', borderColor: 'var(--accent)', color: 'var(--accent)' }} onClick={() => setIsReassigning(true)}>Reassign Workflow</button>}
                    <button className="btn-action btn-reject" onClick={() => handleWorkflowAction(reviewingRequest.id, 'reject', reviewingRequest.reviewRemarks)}>Reject Application</button>
                    <button className="btn-action btn-correction" onClick={() => handleWorkflowAction(reviewingRequest.id, 'rollback', reviewingRequest.reviewRemarks)}>Return for Correction</button>
                    <button className="btn-action btn-approve"
                      onClick={() => handleWorkflowAction(reviewingRequest.id, 'approve', reviewingRequest.reviewRemarks, { programName: reviewingRequest.programName, workOrderId: reviewingRequest.workOrderId, budgetCode: reviewingRequest.budgetCode, poFile: reviewingRequest.poFile })}>
                      {['Pending Head', 'Pending Program Head'].includes(reviewingRequest.status) ? 'Authorize & Close' : 'Approve & Forward'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingRequestDetails && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--overlay-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: 'var(--space-lg)' }}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="card modal-content" style={{ maxWidth: '950px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '0', background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}>
              <div style={{ padding: 'var(--space-lg) var(--space-xl)', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, var(--accent-bg), transparent 70%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 'var(--fs-xl)', fontWeight: '800', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <FileText size={22} color="var(--accent)" /> {viewingRequestDetails.isProduction ? 'Production Request Summary' : 'Purchase Request Summary'}
                  </h2>
                  <p style={{ margin: 'var(--space-xs) 0 0 0', fontSize: 'var(--fs-base)', color: 'var(--text-sub)' }}>Reference: <span style={{ fontWeight: '700', color: 'var(--accent)' }}>{viewingRequestDetails.refId || 'PR-' + viewingRequestDetails.id}</span></p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                  <button className="btn-icon-only" onClick={() => handleExportPDF(viewingRequestDetails)} title="Download Summary PDF"><Download size={18} /></button>
                  <button className="btn-icon-only" onClick={() => setViewingRequestDetails(null)} title="Close"><X size={18} /></button>
                </div>
              </div>
              <div style={{ padding: 'var(--space-xl)' }}>
                <div className="stage-tracker horizontal-stepper" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 'var(--space-xl)', padding: '0 24px' }}>
                  {[{ id: 'Created', label: 'Request Created' }, { id: 'Pending Owner', label: 'Owner Approval' }, { id: 'Pending Admin', label: 'PO Upload' }, { id: 'Pending Head', label: 'Final Approval' }, { id: 'Approved', label: 'Finalized' }].map((stage, idx, arr) => {
                    const stages = ['', 'Pending Owner', 'Pending Admin', 'Pending Head', 'Approved'];
                    const currentStatus = viewingRequestDetails.status;
                    let currentIdx = stages.indexOf(currentStatus);
                    if (currentStatus === 'Correction Required') currentIdx = 1;
                    let state = 'upcoming';
                    if (currentStatus === 'Approved') state = 'completed';
                    else if (currentIdx > idx && currentIdx !== -1) state = 'completed';
                    else if (currentIdx === idx) state = currentStatus === 'Correction Required' ? 'warning' : 'active';
                    else if (['Rejected', 'Cancelled'].includes(currentStatus)) state = 'failed';
                    const colors = { completed: 'var(--emerald-text)', active: '#c36e46', warning: 'var(--amber-text)', failed: 'var(--rose-text)', upcoming: 'var(--border)' };
                    return (
                      <div key={idx} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: colors[state], color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-sm)', fontWeight: 'bold', fontSize: 'var(--fs-md)', position: 'relative', zIndex: 2 }}>
                          {state === 'completed' ? '✓' : idx}
                        </div>
                        <div style={{ fontSize: 'var(--fs-sm)', fontWeight: '600', color: state === 'upcoming' ? 'var(--text-sub)' : 'var(--text-h)' }}>{stage.label}</div>
                        {idx < arr.length - 1 && <div style={{ position: 'absolute', top: '16px', left: '50%', right: '-50%', height: '2px', background: state === 'completed' ? 'var(--emerald-text)' : 'var(--border)', zIndex: 1 }}></div>}
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px' }}>
                  <div>
                    <h4 style={{ fontSize: 'var(--fs-base)', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 'var(--space-md)', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><Info size={14} /> Requisition Profile</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)', background: 'var(--bg-subtle)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                      <div><label style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)', display: 'block' }}>PROGRAM</label><span style={{ fontSize: 'var(--fs-md)', fontWeight: '600' }}>{viewingRequestDetails.programName}</span></div>
                      <div><label style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)', display: 'block' }}>VENDOR</label><span style={{ fontSize: 'var(--fs-md)', fontWeight: '600' }}>{vendors.find(v => String(v.id) === String(viewingRequestDetails.vendorId))?.name || viewingRequestDetails.vendorId || 'N/A'}</span></div>
                      <div><label style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)', display: 'block' }}>PAYMENT</label><span style={{ fontSize: 'var(--fs-md)', fontWeight: '600' }}>{viewingRequestDetails.paymentMode}</span></div>
                      <div><label style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)', display: 'block' }}>LEAD TIME</label><span style={{ fontSize: 'var(--fs-md)', fontWeight: '600' }}>{viewingRequestDetails.deliveryValue} {viewingRequestDetails.deliveryUnit}</span></div>
                      {(() => { const ri = getReassignedInfo(viewingRequestDetails); return ri ? <div style={{ gridColumn: 'span 2', background: 'rgba(var(--accent-rgb), 0.05)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-border)' }}><label style={{ fontSize: 'var(--fs-xs)', color: 'var(--accent)', display: 'block', fontWeight: '700' }}>ACTIVE TASK ASSIGNEE</label><span style={{ fontSize: 'var(--fs-md)', fontWeight: '700' }}>{ri.username} ({ri.role})</span></div> : null; })()}
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)', display: 'block', marginBottom: 'var(--space-sm)' }}>LINE ITEMS</label>
                        <div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '5px' }}>
                          <table style={{ width: '100%', fontSize: 'var(--fs-base)', borderCollapse: 'collapse' }}>
                            <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}><th>Part Name</th><th>Qty</th><th>Price</th></tr></thead>
                            <tbody>{(viewingRequestDetails.items || []).map((item, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid var(--bg)' }}><td style={{ padding: 'var(--space-sm) 0' }}>{item.partName}</td><td>{item.qty} {item.unit}</td><td>{CURRENCY_DATA.find(c => c.code === (item.currency || 'INR'))?.symbol || '₹'}{Number(item.unitPrice).toLocaleString()}</td></tr>
                            ))}</tbody>
                          </table>
                        </div>
                      </div>
                      <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 'var(--fs-base)', color: 'var(--text-sub)', marginRight: 'var(--space-sm)', fontWeight: '700' }}>GRAND TOTAL:</span>
                        <span style={{ fontSize: 'var(--fs-xl)', fontWeight: '900', color: 'var(--accent)' }}>{CURRENCY_DATA.find(c => c.code === (viewingRequestDetails.items?.[0]?.currency || 'INR'))?.symbol || '₹'}{(viewingRequestDetails.items || []).reduce((s, i) => s + (Number(i.qty) * Number(i.unitPrice)), 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 style={{ fontSize: 'var(--fs-base)', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 'var(--space-md)', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><Clock size={14} /> Workflow History</h4>
                    <div className="history-timeline" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', maxHeight: '420px', overflowY: 'auto', paddingRight: 'var(--space-sm)' }}>
                      {(() => {
                        const historyData = [...(viewingRequestDetails.history || [])];
                        if (historyData.length === 0 && viewingRequestDetails.createdAt) historyData.push({ date: viewingRequestDetails.createdAt, action: 'Request Submitted', user: viewingRequestDetails.requestedBy, role: 'Requester', remarks: 'Initial submission' });
                        return historyData.reverse().map((h, idx) => (
                          <div key={idx} style={{ paddingLeft: 'var(--space-sm)', borderLeft: '2px solid var(--accent)', position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '-6px', top: '0', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--bg-card)' }}></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}><span style={{ fontSize: 'var(--fs-base)', fontWeight: '700' }}>{h.action}</span><span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)' }}>{formatDate(h.date)}</span></div>
                            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', marginTop: '2px' }}>Executed by <span style={{ color: 'var(--text-h)', fontWeight: '600' }}>{h.user}</span></div>
                            {h.remarks && <div style={{ fontSize: 'var(--fs-sm)', fontStyle: 'italic', marginTop: 'var(--space-xs)', color: 'var(--accent)' }}>"{h.remarks}"</div>}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 'var(--space-xl)', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                   <button className="btn-primary" style={{ width: 'auto', padding: '0.7rem var(--space-xl)' }} onClick={() => setViewingRequestDetails(null)}>Close Preview</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PurchaseOrder;
