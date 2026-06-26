/* eslint-disable no-dupe-keys */
import { useState, useEffect, useMemo, useRef } from 'react'
import { LayoutDashboard, FileText, Users, Settings, Package, PieChart, Bell, Moon, Sun, LogOut, ChevronRight, ChevronLeft, MoreHorizontal, Download, Printer, Plus, Search, Filter, History, Calendar, CheckCircle2, Clock, AlertCircle, CreditCard, Truck, ShieldCheck, Info, Briefcase, Layers, FileUp, MessageSquare, Trash2, X, Wrench, Eye, ChevronUp, ChevronDown, Lock, Key, HelpCircle, EyeOff } from 'lucide-react'
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion'
import './App.css'
import PurchaseOrderProduction from './PurchaseOrderProduction'
import PurchaseOrder from './PurchaseOrder'
import PartTraceability from './PartTraceability'
import EolPdiApp from './EolPdiApp.jsx'
import { API_BASE_URL } from "./constants"
import { formatDate } from './utils/formatDate'
import { CURRENCY_DATA } from './utils/currency'
import { generateRefId } from './utils/refId'
import { getReassignedInfo } from './utils/reassignment'
import { StatusStepper, Toast, FilterSection, FilterInput, FilterSelect } from './components/ui'
import ThemeConfigurator, { ThemeToggleButton } from './components/ThemeConfigurator'

const FEATURE_LABELS = {
  po_prototype: "Proto Purchase Request",
  po_production: "Production Purchase Request",
  monthly_planning: "Production Target Planning",
  motor_traceability: "Part Traceability",
  mt_reports: "MT Reports & Export",
  user_management: "User & Role Management",
  program_management: "Programs & Work Orders",
  eol_reports: "EOL & PDI Reports"
};

/* Chart palettes — kept in sync with the PO module dashboards for consistency */
const CHART_STAGE_COLORS = ['#c36e46', '#f59e0b', '#3b82f6', '#10b981'];
const CHART_PROGRAM_COLORS = ['#c36e46', '#6366f1', '#ec4899', '#14b8a6', '#f97316'];

const FEATURE_DESCRIPTIONS = {
  po_prototype: "Controls access to Prototype Purchase Requests, allowing users to submit quotations and manage approvals.",
  po_production: "Controls access to the Production PR module and the creation of formal Purchase Orders from approved PRs.",
  monthly_planning: "Allows users to set and modify monthly production targets for specific work orders and models.",
  motor_traceability: "Enables recording and managing quality tracking data (PDI/EOL) for parts and components.",
  mt_reports: "Grants access to the high-level reporting dashboard and bulk export of traceability data.",
  user_management: "Access to approve new users, delete accounts, and modify global role/domain assignments.",
  program_management: "Central management of project programs, platforms, categories, and associated work orders.",
  eol_reports: "Controls access to EOL & PDI report generation, dashboards, golden samples, reference samples, and archived reports."
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [currentPage, setCurrentPage] = useState('po')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [theme, setTheme] = useState(localStorage.getItem('arpl_theme') || 'light')

  const [loginForm, setLoginForm] = useState({
    username: '',
    password: ''
  })
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [rememberMe, setRememberMe] = useState(localStorage.getItem('arpl_remember_me') === 'true')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const loginUsernameRef = useRef(null)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false)

  const [registerForm, setRegisterForm] = useState({
    username: '',
    fullName: '',
    roles: ['Engineer'],
    domain: 'Architecture',
    securityQuestion: 'What was your first pet\'s name?',
    securityAnswer: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerErrors, setRegisterErrors] = useState({});
  const [resetForm, setResetForm] = useState({
    username: '',
    securityAnswer: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState([])
  const [vendors, setVendors] = useState([])
  const [vendorSearch, setVendorSearch] = useState('')
  const [selectedVendorIds, setSelectedVendorIds] = useState([])
  const [showProgramFilters, setShowProgramFilters] = useState(false)
  const [showWorkOrderFilters, setShowWorkOrderFilters] = useState(false)
  const [showUserFilters, setShowUserFilters] = useState(false)

  // Centralized Permissions State
  const [permissions, setPermissions] = useState({
    po_prototype: { roles: ['Administrator', 'Developer', 'Program Admin', 'Program Owner', 'Program Head', 'Production Head', 'Mechanical Head', 'Electrical Head', 'Functional Head', 'Engineer', 'Sr. Engineer'], domains: [], viewRoles: [], viewDomains: [] },
    po_production: { roles: ['Administrator', 'Developer', 'Program Admin', 'Program Owner', 'Program Head', 'Production Head', 'Mechanical Head', 'Electrical Head'], domains: ['Program', 'Production', 'Engineering', 'Electrical', 'Technology'], viewRoles: [], viewDomains: [] },
    monthly_planning: { roles: ['Administrator', 'Developer', 'Program Owner', 'Program Head', 'Program Admin'], domains: ['Program'], viewRoles: ['Mechanical Head', 'Electrical Head', 'Engineer', 'Sr. Engineer', 'Functional Head', 'Production Head'], viewDomains: [] },
    motor_traceability: { roles: ['Functional Head', 'Mechanical Head', 'Electrical Head', 'Program Admin', 'Program Head', 'Program Owner'], domains: ['Program', 'Prototyping', 'Validation', 'Mechanical Engineering'], viewRoles: [], viewDomains: [] },
    mt_reports: { roles: ['Program Admin', 'Program Head', 'Mechanical Head', 'Electrical Head'], domains: ['Program'], viewRoles: [], viewDomains: [] },
    user_management: { roles: ['Administrator', 'Developer', 'Program Admin', 'Program Owner', 'Program Head'], domains: [], viewRoles: [], viewDomains: [] },
    program_management: { roles: ['Administrator', 'Developer', 'Program Owner', 'Program Head', 'Program Admin'], domains: ['Program'], viewRoles: ['Mechanical Head', 'Electrical Head', 'Engineer', 'Sr. Engineer', 'Functional Head', 'Production Head'], viewDomains: [] },
    eol_reports: { roles: ['Administrator', 'Developer', 'Functional Head', 'Mechanical Head', 'Electrical Head', 'Program Admin', 'Program Owner', 'Program Head'], domains: ['Program', 'Validation', 'Quality'], viewRoles: ['Engineer', 'Sr. Engineer', 'Production Head'], viewDomains: [] }
  })
  const [parts, setParts] = useState([])
  const [poRequests, setPoRequests] = useState([])
  const [editingRequestId, setEditingRequestId] = useState(null)
  const [poRequestForm, setPoRequestForm] = useState({
    title: '',
    vendorId: '',
    type: 'PO',
    category: 'Prototypes (BO & Machining)',
    workOrderId: '',
    programName: '',
    programOwner: '',
    programAdmin: 'Program Admin',
    budgetCode: '',
    items: [{ partDrawing: '', partName: '', unit: 'Nos.', qty: '', unitPrice: '', currency: 'INR' }],
    paymentMode: 'Credit',
    paymentComments: '',
    deliveryValue: '',
    deliveryUnit: 'Days',
    qualityAssurance: false,
    qualityTC: false,
    remarks: '',
    fileName: ''
  })
  const [showPartForm, setShowPartForm] = useState(false)
  const [editPartId, setEditPartId] = useState(null)
  const [partForm, setPartForm] = useState({
    drawing: '',
    name: '',
    units: 'Nos.'
  })
  const [showVendorForm, setShowVendorForm] = useState(false)
  const [editVendorId, setEditVendorId] = useState(null)
  const [vendorForm, setVendorForm] = useState({
    name: '',
    email: '',
    contactPerson: '',
    phone: '',
    gstin: '',
    address: ''
  })

  // Dashboard Data State
  const [stats, setStats] = useState({
    totalRequests: 0, pending: 0, completed: 0, cancelled: 0, avgTime: 0
  })

  // Notification State
  const [notifications, setNotifications] = useState([])
  const [showNotificationPanel, setShowNotificationPanel] = useState(false)
  const [notifStatus, setNotifStatus] = useState('loading')
  const [viewingRequestDetails, setViewingRequestDetails] = useState(null)
  const [isReassigning, setIsReassigning] = useState(false)
  const [targetReassignUser, setTargetReassignUser] = useState('')
  const [reviewingRequest, setReviewingRequest] = useState(null)
  const [previewFile, setPreviewFile] = useState(null)

  const [reportFilters, setReportFilters] = useState({
    startDate: '',
    endDate: '',
    program: '',
    vendor: '',
    status: ''
  })
  const [programFilters, setProgramFilters] = useState({
    search: '',
    category: '',
    platform: ''
  })
  const [workOrderFilters, setWorkOrderFilters] = useState({
    search: '',
    programId: '',
    type: '',
    stage: ''
  })
  const [userFilters, setUserFilters] = useState({
    search: '',
    role: '',
    domain: '',
    status: ''
  })
  const [myRequestFilters, setMyRequestFilters] = useState({
    status: '',
    program: '',
    vendor: ''
  })

  const [programs, setPrograms] = useState([])

  const [showProgramForm, setShowProgramForm] = useState(false)
  const [activePOTab, setActivePOTab] = useState('dashboard')
  const [editProgramId, setEditProgramId] = useState(null)
  const [programForm, setProgramForm] = useState({
    name: '',
    category: 'Motor',
    platform: 'Platform T',
    owner: '',
    admin: 'Program Admin'
  })

  // Work Order State
  const [activeProgramTab, setActiveProgramTab] = useState('programs')
  const [workOrders, setWorkOrders] = useState([])
  const [expandedUserRoles, setExpandedUserRoles] = useState({})
  const [traceabilityData, setTraceabilityData] = useState([])
  const [deliveryPlanning, setDeliveryPlanning] = useState([])
  const [goldenSamples, setGoldenSamples] = useState([])
  const [qiPdiRefSamples, setQiPdiRefSamples] = useState([])
  const [showWorkOrderForm, setShowWorkOrderForm] = useState(false)
  const [editWorkOrderId, setEditWorkOrderId] = useState(null)
  const [planningModelNo, setPlanningModelNo] = useState('');
  const [planningPartNo, setPlanningPartNo] = useState('');
  const [planningWoId, setPlanningWoId] = useState('')
  const [planningProgramId, setPlanningProgramId] = useState('')
  const [workOrderForm, setWorkOrderForm] = useState({
    title: '',
    programId: '',
    samples: 1,
    type: 'Internal',
    budgetCode: '',
    stage: 'Sample A',
    customerName: '',
    poFileName: '',
    poComments: '',
    items: [{ modelNumber: '', partNumber: '', qty: 1 }]
  })

  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [profileMode, setProfileMode] = useState('view') // 'view' or 'edit'
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    roles: [],
    domain: '',
    securityQuestion: '',
    securityAnswer: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [accessFeature, setAccessFeature] = useState('po_prototype');
  const [accessView, setAccessView] = useState('manage'); // 'manage' or 'summary'
  const [eolView, setEolView] = useState('new_report');
  const [showThemeConfigurator, setShowThemeConfigurator] = useState(false);

  const AVAILABLE_ROLES = [
    "Engineer", "Sr. Engineer", "Functional Head", "Mechanical Head", "Electrical Head",
    "Program Owner", "Program Admin", "Program Head", "Production Head", "Head of Technology"
  ];

  // Ref to track current view state for the polling interval to prevent overwriting unsaved UI changes
  const pollingContextRef = useRef({ currentPage, activeProgramTab });
  useEffect(() => {
    pollingContextRef.current = { currentPage, activeProgramTab };
  }, [currentPage, activeProgramTab]);

  // Tracks in-flight local writes so the 3s poll never overwrites optimistic UI
  // state with stale server data while (or just after) a save is happening.
  const pendingWritesRef = useRef(0);
  const lastWriteAtRef = useRef(0);

  // Global Escape-to-close for modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (previewFile) setPreviewFile(null);
      if (showProfileModal) setShowProfileModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewFile, showProfileModal]);

  // Custom Toast State
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [uploadProgress, setUploadProgress] = useState(0);
  const toastTimerRef = useRef(null);
  const showToast = (message, type = 'info') => {
    // Clear any pending auto-close so a previous timer can't dismiss this toast early
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast({ visible: true, message, type });
    // Auto close for non-critical info
    if (type !== 'error' && type !== 'warning') {
      toastTimerRef.current = setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
        toastTimerRef.current = null;
      }, 3000);
    }
  };

  // Notification Permission & Service Worker Registration
  const setupPushNotifications = async (usernameOverride) => {
    const targetUser = usernameOverride || loginForm.username;

    if (!("Notification" in window)) {
      setNotifStatus('unsupported');
      showToast("This browser does not support desktop notifications. Real-time alerts will be disabled.", "warning");
      return;
    }

    if (Notification.permission === "denied") {
      setNotifStatus('denied');
      showToast("Notifications are blocked! Please enable them in your browser settings to receive real-time approval updates.", "warning");
      return;
    }

    if (Notification.permission === "default") {
      setNotifStatus('default');
      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        setNotifStatus('denied');
        showToast("Notification permission denied. You will not receive real-time alerts.", "warning");
        return;
      }
    }

    setNotifStatus('granted');
    if (!targetUser) return;

    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: '/' });
        await navigator.serviceWorker.ready;

        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          const vapidPublicKey = 'BFE2x7TC9j4DjHQkIwXJuXShxjIi-xALHRilDohnBdNEvrM3OzOQKOeNe-QCgM9w6sqiw9cbku9nxYAFiXtI3II';
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapidPublicKey
          });
        }

        // Send subscription to server
        await fetch(`${API_BASE_URL}/api/subscribe`, {
          method: 'POST',
          body: JSON.stringify({ userId: targetUser, subscription }),
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (err) {
        console.error("Push subscription failed:", err);
      }
    }
  };

  /**
   * Reference ID Generator
   * Format: [TYPE]-[MM][YY]-[SERIAL]
   * Updated format: [TYPE][MM][YYYY][SERIAL]
   */

  // Check for existing session on load
  useEffect(() => {
    // Load data immediately so registeredUsers is populated for login validation
    const initialLoad = async () => {
      await loadDataFromDisk(true);
      try {
        const [gsRes, qiRefRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/golden-samples`),
          fetch(`${API_BASE_URL}/api/qi-pdi-ref`)
        ]);
        if (gsRes.ok) setGoldenSamples(await gsRes.json());
        if (qiRefRes.ok) setQiPdiRefSamples(await qiRefRes.json());
      } catch (e) { /* silent */ }
    };
    initialLoad();

    // Setup auto-refresh polling every 3 seconds to keep data dynamic only when logged in
    let pollInterval;
    const pollAll = async () => {
      // Skip the refresh while a local write is in flight or just settled, so we
      // don't clobber optimistic state before the server has persisted it.
      if (pendingWritesRef.current > 0 || (Date.now() - lastWriteAtRef.current) < 2000) {
        return;
      }
      await loadDataFromDisk();
      try {
        const [gsRes, qiRefRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/golden-samples`),
          fetch(`${API_BASE_URL}/api/qi-pdi-ref`)
        ]);
        if (gsRes.ok) setGoldenSamples(await gsRes.json());
        if (qiRefRes.ok) setQiPdiRefSamples(await qiRefRes.json());
      } catch (e) { /* silent */ }
    };
    if (isLoggedIn) {
      pollInterval = setInterval(pollAll, 3000);
    }

    const token = localStorage.getItem('arpl_token')
    const savedUser = localStorage.getItem('arpl_username')
    if (token && savedUser) {
      setIsLoggedIn(true)
      setLoginForm(prev => ({ ...prev, username: savedUser }))
      setupPushNotifications(savedUser)
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn])

  useEffect(() => {
    if (!isLoggedIn && !isRegistering && !isForgotPassword && loginUsernameRef.current) {
      loginUsernameRef.current.focus();
    }
  }, [isLoggedIn, isRegistering, isForgotPassword]);

  // Theme persistence effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('arpl_theme', theme);
  }, [theme]);

  const loadDataFromDisk = async (showError = false) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/data`);
      if (!response.ok) throw new Error(`Server responded ${response.status}`);
      const data = await response.json();
      if (data.programs) setPrograms(data.programs)
      if (data.workOrders) setWorkOrders(data.workOrders)
      if (data.vendors) setVendors(data.vendors)
      if (data.parts) setParts(data.parts)
      if (data.poRequests) setPoRequests(data.poRequests)
      if (data.users) setRegisteredUsers(data.users)
      if (data.stats) setStats(data.stats)
      if (data.traceability) setTraceabilityData(data.traceability)
      if (data.deliveryPlanning) setDeliveryPlanning(data.deliveryPlanning)
      // Only update permissions state if the user is NOT currently editing them on the Access Control tab
      if (data.permissions && !(pollingContextRef.current.currentPage === 'program' && pollingContextRef.current.activeProgramTab === 'access')) {
        setPermissions(prev => ({
          ...prev,
          ...data.permissions
        }))
      }
      if (data.notifications) setNotifications(data.notifications)
    } catch (error) {
      console.error("Could not load data from local server. Using defaults.", error);
      if (showError) {
        showToast("Cannot reach the server. Please ensure the backend is running, then reload.", "error");
      }
    }
  }

  // Move currentUserInfo UP so it can be used by userScope without crashing
  const currentUserInfo = useMemo(() => {
    if (loginForm.username === 'Admin') {
      return {
        username: 'Admin',
        fullName: 'System Administrator',
        roles: ['Administrator'],
        domain: 'Management',
        isApproved: true
      };
    }
    if (loginForm.username === 'DEV') {
      return {
        username: 'DEV',
        fullName: 'System Developer',
        roles: ['Developer'],
        domain: 'IT/Systems',
        isApproved: true
      };
    }
    if (loginForm.username === 'Program Admin') {
      return {
        username: 'Program Admin',
        fullName: 'Program Administrator',
        roles: ['Program Admin'],
        domain: 'Program',
        isApproved: true
      };
    }
    return registeredUsers.find(u => u.username === loginForm.username) || {}
  }, [registeredUsers, loginForm.username])

  /**
   * Dynamic Access Checker
   * level: 'full' (Edit/Approve) or 'view' (Read-only)
   */
  const checkAccess = (featureKey, level = 'full') => {
    // Admins and Developers always have access to everything
    const userRoles = currentUserInfo.roles || [];
    if (userRoles.some(r => ['Administrator', 'Developer'].includes(r))) return true;

    const config = permissions[featureKey];
    if (!config) return false; // Default to deny if no config found (fail-closed)

    const hasFull = config.roles.some(r => userRoles.includes(r)) || config.domains.includes(currentUserInfo.domain);
    if (level === 'full') return hasFull;

    const hasView = config.viewRoles?.some(r => userRoles.includes(r)) || config.viewDomains?.includes(currentUserInfo.domain);
    return hasFull || hasView;
  };

  /**
   * Role Access Helper: Determines which PO tabs are visible to the user
   */
  const allowedPOTabs = useMemo(() => {
    const roles = currentUserInfo.roles || [];
    const allTabs = ['dashboard', 'po_request', 'my_request', 'vendor', 'part', 'approvals', 'report'];

    if (roles.some(r => ['Administrator', 'Developer', 'Program Admin', 'Program Owner', 'Program Head'].includes(r))) {
      return allTabs;
    }
    if (roles.some(r => ['Production Head', 'Mechanical Head', 'Electrical Head'].includes(r))) {
      return ['dashboard', 'po_request', 'my_request', 'vendor', 'part', 'approvals'];
    }
    if (roles.includes('Functional Head')) {
      return ['po_request', 'my_request', 'vendor', 'part'];
    }
    if (roles.some(r => ['Engineer', 'Sr. Engineer'].includes(r))) {
      return ['po_request', 'my_request'];
    }
    return [];
  }, [currentUserInfo.roles]);

  // Redirect to first allowed tab if current is restricted
  useEffect(() => {
    if (isLoggedIn && !allowedPOTabs.includes(activePOTab) && allowedPOTabs.length > 0) {
      setActivePOTab(allowedPOTabs[0]);
    }
  }, [isLoggedIn, allowedPOTabs, activePOTab]);

  /**
   * Helper component to render a compact 4-stage status stepper in tables
   */
  const StatusStepperInline = ({ status }) => <StatusStepper status={status} />;

  /**
   * Helper to generate CSS conic-gradient string for Pie Charts based on data
   */
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

  /** 
   * Data Scoping Logic: Filters all raw data based on user identity and role.
   */
  const userScope = useMemo(() => {
    // Ensure we don't crash if login data is still being processed
    if (!loginForm.username) return { requests: [], programs: [], stats: { totalRequests: 0, pending: 0, completed: 0, cancelled: 0, avgTime: 0 } };

    const userRoles = currentUserInfo.roles || [];
    const isAdmin = ['DEV', 'Admin'].includes(loginForm.username) || userRoles.some(r => ['Administrator', 'Program Head', 'Developer'].includes(r));

    // Filter for Prototype Requests ONLY (Exclude Production PRs and generated Production POs)
    const protoRequests = poRequests.filter(req => !req.isProduction && !req.prId);

    const scopedRequests = isAdmin ? [...protoRequests] : protoRequests.filter(req =>
      req.requestedBy === loginForm.username ||
      req.programOwner === loginForm.username ||
      req.programAdmin === loginForm.username
    );

    // Updated to include roles with view access to program_management
    const canViewAllPrograms = isAdmin || permissions.program_management.roles.some(r => userRoles.includes(r)) || permissions.program_management.viewRoles.some(r => userRoles.includes(r));
    const finalScopedPrograms = canViewAllPrograms ? programs : programs.filter(p => p.owner === loginForm.username || p.admin === loginForm.username);

    const calculatedStats = {
      totalRequests: scopedRequests.length,
      pending: scopedRequests.filter(r => r.status?.includes('Pending')).length,
      completed: scopedRequests.filter(r => r.status === 'Approved').length,
      cancelled: scopedRequests.filter(r => r.status === 'Cancelled' || r.status === 'Rejected').length,
      avgTime: stats.avgTime // Static for now
    };

    // Dynamic Pie Chart Data
    const stageCounts = [
      { label: 'Pending Owner', value: scopedRequests.filter(r => r.status === 'Pending Owner').length },
      { label: 'Pending Admin', value: scopedRequests.filter(r => r.status === 'Pending Admin').length },
      { label: 'Pending Head', value: scopedRequests.filter(r => r.status === 'Pending Head').length },
      { label: 'Correction', value: scopedRequests.filter(r => r.status === 'Correction Required').length }
    ];

    const progCounts = [...new Set(scopedRequests.map(r => r.programName))].map(name => ({
      label: name,
      value: scopedRequests.filter(r => r.programName === name).length
    })).slice(0, 5);

    const stageChartGradient = generatePieGradient(stageCounts, CHART_STAGE_COLORS);
    const programChartGradient = generatePieGradient(progCounts, CHART_PROGRAM_COLORS);

    return {
      requests: scopedRequests,
      programs: finalScopedPrograms,
      stats: calculatedStats,
      stageCounts,
      progCounts,
      stageChartGradient,
      programChartGradient
    };
  }, [poRequests, programs, loginForm.username, currentUserInfo, stats.avgTime, permissions.program_management]);

  const filteredProgramsList = useMemo(() => {
    return userScope.programs.filter(p => {
      const searchLower = programFilters.search.toLowerCase();
      const matchSearch = !programFilters.search || p.name.toLowerCase().includes(searchLower);
      const matchCategory = !programFilters.category || p.category === programFilters.category;
      const matchPlatform = !programFilters.platform || p.platform === programFilters.platform;
      return matchSearch && matchCategory && matchPlatform;
    });
  }, [userScope.programs, programFilters]);

  const programSummaryStats = useMemo(() => {
    return {
      total: userScope.programs.length,
      categories: [...new Set(userScope.programs.map(p => p.category))].length,
      platforms: [...new Set(userScope.programs.map(p => p.platform))].length
    };
  }, [userScope.programs]);

  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter(wo => {
      const matchSearch = !workOrderFilters.search || wo.title.toLowerCase().includes(workOrderFilters.search.toLowerCase());
      const matchProgram = !workOrderFilters.programId || String(wo.programId) === String(workOrderFilters.programId);
      const matchType = !workOrderFilters.type || wo.type === workOrderFilters.type;
      const matchStage = !workOrderFilters.stage || wo.stage === workOrderFilters.stage;
      return matchSearch && matchProgram && matchType && matchStage;
    });
  }, [workOrders, workOrderFilters]);

  const filteredUsersList = useMemo(() => {
    return registeredUsers.filter(user => {
      const searchLower = userFilters.search.toLowerCase();
      const matchSearch = !userFilters.search ||
        user.username.toLowerCase().includes(searchLower) ||
        (user.fullName || '').toLowerCase().includes(searchLower);

      const matchRole = !userFilters.role || (user.roles || []).includes(userFilters.role);
      const matchDomain = !userFilters.domain || user.domain === userFilters.domain;

      let matchStatus = true;
      if (userFilters.status === 'Approved') matchStatus = user.isApproved === true;
      else if (userFilters.status === 'Pending') matchStatus = user.isApproved === false;

      return matchSearch && matchRole && matchDomain && matchStatus;
    });
  }, [registeredUsers, userFilters]);

  /**
   * Report Filtering Logic
   */
  const filteredReportData = useMemo(() => {
    return poRequests.filter(req => !req.isProduction && !req.prId).filter(req => {
      const matchProgram = !reportFilters.program || req.programName === reportFilters.program;
      const matchVendor = !reportFilters.vendor || String(req.vendorId) === String(reportFilters.vendor);
      const matchStatus = !reportFilters.status || req.status === reportFilters.status;

      let matchDate = true;
      if (reportFilters.startDate || reportFilters.endDate) {
        const reqDate = new Date(req.createdAt);
        if (reportFilters.startDate) {
          const start = new Date(reportFilters.startDate);
          start.setHours(0, 0, 0, 0);
          if (reqDate < start) matchDate = false;
        }
        if (reportFilters.endDate) {
          const endDateObj = new Date(reportFilters.endDate);
          endDateObj.setHours(23, 59, 59, 999);
          if (reqDate > endDateObj) matchDate = false;
        }
      }

      return matchProgram && matchVendor && matchStatus && matchDate;
    });
  }, [poRequests, reportFilters]);

  const reportStats = useMemo(() => {
    const total = filteredReportData.reduce((sum, req) => {
      const reqAmount = req.items
        ? req.items.reduce((s, i) => s + (Number(i.qty || 0) * Number(i.unitPrice || 0)), 0)
        : (Number(req.qty || 0) * Number(req.unitPrice || 0));
      return sum + reqAmount;
    }, 0);
    return {
      count: filteredReportData.length,
      totalValue: total,
      avgValue: filteredReportData.length > 0 ? total / filteredReportData.length : 0
    };
  }, [filteredReportData]);

  /** 
   * Automatically syncs the current state to the local json.storage file 
   * via the Node.js backend server.
   */
  const syncToDisk = async (data) => {
    pendingWritesRef.current += 1;
    try {
      await fetch(`${API_BASE_URL}/api/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          updatedAt: new Date().toISOString(),
          source: 'ARPL-Dashboard-AutoSync'
        })
      })
      console.log('Auto-sync: json.storage updated.')
    } catch (error) {
      console.error('Auto-sync failed. Ensure server.js is running.', error)
    } finally {
      lastWriteAtRef.current = Date.now();
      pendingWritesRef.current = Math.max(0, pendingWritesRef.current - 1);
    }
  }

  const selectedWOForPlanning = useMemo(() =>
    workOrders.find(wo => String(wo.id) === String(planningWoId))
    , [planningWoId, workOrders]);

  const availableModels = useMemo(() => {
    if (!selectedWOForPlanning) return [];
    return [...new Set(selectedWOForPlanning.items.map(item => item.modelNumber))];
  }, [selectedWOForPlanning]);

  const availableParts = useMemo(() => {
    if (!selectedWOForPlanning || !planningModelNo) return [];
    return selectedWOForPlanning.items
      .filter(item => item.modelNumber === planningModelNo)
      .map(item => item.partNumber);
  }, [selectedWOForPlanning, planningModelNo]);

  const filteredPlanningEntries = useMemo(() => {
    return deliveryPlanning.filter(p => {
      // Ensure we only show detailed entries (Model & Part assigned) 
      // to avoid legacy WO-total rows showing up in the breakdown matrix.
      if (!p.modelNumber || !p.partNumber) return false;

      const wo = workOrders.find(w => String(w.id) === String(p.workOrderId));
      if (!wo) return false;

      const matchProgram = !planningProgramId || String(wo.programId) === String(planningProgramId);
      const matchWo = !planningWoId || String(p.workOrderId) === String(planningWoId);
      const matchModel = !planningModelNo || p.modelNumber === planningModelNo;
      const matchPart = !planningPartNo || p.partNumber === planningPartNo;

      return matchProgram && matchWo && matchModel && matchPart;
    });
  }, [deliveryPlanning, workOrders, planningProgramId, planningWoId, planningModelNo, planningPartNo]);

  const handleUpdatePlanned = (monthId, value) => {
    if (!planningWoId || !planningModelNo || !planningPartNo) return;

    const selectedWO = workOrders.find(wo => String(wo.id) === String(planningWoId));
    const selectedItem = selectedWO?.items.find(item => item.modelNumber === planningModelNo && item.partNumber === planningPartNo);

    if (!selectedItem) {
      showToast("Selected item not found in Work Order.", "error");
      return;
    }

    const itemTotalQty = Number(selectedItem.qty);

    const newValue = Math.max(0, parseInt(value) || 0);

    const existingPlanningEntryIndex = deliveryPlanning.findIndex(p =>
      String(p.workOrderId) === String(planningWoId) &&
      p.modelNumber === planningModelNo &&
      p.partNumber === planningPartNo
    );

    let currentItemPlanning = existingPlanningEntryIndex > -1
      ? deliveryPlanning[existingPlanningEntryIndex].planning
      : {};

    const otherMonthsPlanned = Object.entries(currentItemPlanning)
      .filter(([m]) => m !== monthId)
      .reduce((sum, [_, v]) => sum + (Number(v) || 0), 0);

    if (otherMonthsPlanned + newValue > itemTotalQty) {
      showToast(`Total planned (${otherMonthsPlanned + newValue}) exceeds item quantity (${itemTotalQty}).`, "warning");
      return;
    }

    const updatedPlanningForThisItem = { ...currentItemPlanning, [monthId]: newValue };
    const newDeliveryPlanning = [...deliveryPlanning];

    if (existingPlanningEntryIndex > -1) {
      newDeliveryPlanning[existingPlanningEntryIndex] = { ...newDeliveryPlanning[existingPlanningEntryIndex], planning: updatedPlanningForThisItem };
    } else {
      newDeliveryPlanning.push({ workOrderId: planningWoId, modelNumber: planningModelNo, partNumber: planningPartNo, planning: updatedPlanningForThisItem });
    }

    setDeliveryPlanning(newDeliveryPlanning);
    syncToDisk({ key: 'deliveryPlanning', data: newDeliveryPlanning });
  };

  const notificationSound = useRef(null);

  const playNotificationSound = () => {
    try {
      if (!notificationSound.current) {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        notificationSound.current = ctx;
      }
      const ctx = notificationSound.current;
      if (ctx.state === 'suspended') ctx.resume();

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.setValueAtTime(1108, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
      // Release the nodes once playback ends so they don't accumulate on the shared context
      oscillator.onended = () => {
        try {
          oscillator.disconnect();
          gain.disconnect();
        } catch { /* already disconnected */ }
      };
    } catch {
      // Audio not supported, silently skip
    }
  };

  const notificationTitle = (message) => {
    if (message.toLowerCase().includes('approved')) return '✅ Approved';
    if (message.toLowerCase().includes('reject')) return '❌ Rejected';
    if (message.toLowerCase().includes('new')) return '📥 New Update';
    if (message.toLowerCase().includes('reassign')) return '🔄 Reassigned';
    return '🔔 ARPL Update';
  };

  const addNotification = (userId, message, requestId, page = '') => {
    const newNotif = {
      id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId,
      message,
      requestId,
      page,
      isRead: false,
      time: new Date().toISOString()
    }

    playNotificationSound();

    // Trigger Browser Push via Server
    fetch(`${API_BASE_URL}/api/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userId,
        title: 'ARPL Dashboard Update',
        body: message,
        url: `/po/${requestId || ''}`
      })
    }).catch(err => console.error("Push notification trigger failed", err));

    if (Notification.permission === "granted") {
      try {
        new Notification(notificationTitle(message), {
          body: message,
          icon: "/AR LOGO.png",
          tag: requestId ? `req-${requestId}` : 'general',
          silent: false,
          requireInteraction: true
        });
        // eslint-disable-next-line no-unused-vars
      } catch (e) {
        console.warn("Local notification failed, falling back to push service.");
      }
    }

    setNotifications(prev => {
      const updated = [newNotif, ...prev].slice(0, 50);
      syncToDisk({ key: 'notifications', data: updated });
      return updated;
    });
  }

  const markAsRead = (id) => {
    const updated = notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
    setNotifications(updated);
    syncToDisk({ key: 'notifications', data: updated });
  };

  const markAllAsRead = () => {
    const updated = notifications.map(n => {
      if (n.userId === loginForm.username || (currentUserInfo.roles || []).includes(n.userId)) {
        return { ...n, isRead: true };
      }
      return n;
    });
    setNotifications(updated);
    syncToDisk({ key: 'notifications', data: updated });
  };

  const clearAllNotifications = () => {
    const updated = notifications.filter(n => n.userId !== loginForm.username && !(currentUserInfo.roles || []).includes(n.userId));
    setNotifications(updated);
    syncToDisk({ key: 'notifications', data: updated });
  };

  const handleNotificationClick = (n) => {
    markAsRead(n.id);
    setShowNotificationPanel(false);

    if (!n.requestId) return;

    const req = poRequests.find(r => r.id === n.requestId);
    if (req) {
      const isProduction = req.isProduction === true;
      const userRoles = currentUserInfo.roles || [];
      setCurrentPage(isProduction ? 'po_production' : 'po');

      // Determine if user is the approver for this request's current stage
      const isOwnerApprover = req.status === 'Pending Owner' && (req.programOwner === loginForm.username || userRoles.includes('Program Head'));
      const isAdminApprover = req.status === 'Pending Admin' && req.programAdmin === loginForm.username;
      const isHeadApprover = req.status === 'Pending Head' && userRoles.includes('Program Head');
      const isProdHeadApprover = req.status === 'Pending Production Head' && userRoles.includes('Production Head');
      const isProgHeadApprover = req.status === 'Pending Program Head' && userRoles.includes('Program Head');

      if (isOwnerApprover || isAdminApprover || isHeadApprover || isProdHeadApprover || isProgHeadApprover) {
        setReviewingRequest({ ...req });
        if (!isProduction) setActivePOTab('approvals');
      } else if (req.requestedBy === loginForm.username) {
        setViewingRequestDetails(req);
        if (!isProduction) setActivePOTab('my_request');
      }
      return;
    }

    // Check Traceability Data
    const trace = traceabilityData.find(t => t.id === n.requestId);
    if (trace) {
      setCurrentPage('motor_traceability');
      return;
    }
  };

  const unreadCount = useMemo(() => {
    return notifications.filter(n =>
      !n.isRead &&
      (n.userId === loginForm.username || (currentUserInfo.roles || []).includes(n.userId))
    ).length;
  }, [notifications, loginForm.username, currentUserInfo.role]);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);

    // Validate against server-stored users
    const userMatch = registeredUsers.find(
      u => u.username === loginForm.username && u.password === loginForm.password
    );

    const isDev = loginForm.username === 'DEV' && loginForm.password === 'DEV';
    const isSysAdmin = loginForm.username === 'Admin' && loginForm.password === 'Admin';
    const isProgAdmin = loginForm.username === 'Program Admin' && loginForm.password === '123456';
    const isValidUser = userMatch || isDev || isSysAdmin || isProgAdmin;

    // Simulate network delay for better UX feel
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      if (isValidUser) {
        if (userMatch && userMatch.isApproved === false) {
          showToast('Your account is pending approval from Head/Admin/Owner.', 'warning');
          setIsLoggingIn(false);
          return;
        }

        const session = {
          token: 'mock-jwt-token-xyz',
          username: loginForm.username,
          createdAt: new Date().toISOString()
        }

        localStorage.setItem('arpl_token', session.token)
        localStorage.setItem('arpl_username', loginForm.username)
        localStorage.setItem('arpl_remember_me', rememberMe ? 'true' : 'false')

        localStorage.setItem('arpl_full_data', JSON.stringify(session))

        setIsLoggedIn(true)
        setupPushNotifications()
      } else {
        showToast('Please enter valid credentials.', 'error')
      }
    } finally {
      setIsLoggingIn(false);
    }
  }

  const handleRegister = async () => {
    const errors = {};
    if (!registerForm.username) errors.username = 'Username is required.';
    else if (['Admin', 'DEV', 'Program Admin'].includes(registerForm.username) ||
             registeredUsers.some(u => u.username.toLowerCase() === registerForm.username.toLowerCase())) {
      errors.username = 'This username is already taken.';
    }
    if (!registerForm.fullName) errors.fullName = 'Full Name is required.';
    if (registerForm.roles.length === 0) errors.roles = 'At least one role must be assigned.';
    if (!registerForm.domain) errors.domain = 'Domain is required.';
    if (!registerForm.securityQuestion) errors.securityQuestion = 'Security Question is required.';
    if (!registerForm.securityAnswer) errors.securityAnswer = 'Security Answer is required.';
    if (!registerForm.password) errors.password = 'Password is required.';
    if (registerForm.password.length < 6) errors.password = 'Password must be at least 6 characters long.';
    if (!registerForm.confirmPassword) errors.confirmPassword = 'Confirm Password is required.';
    if (registerForm.password !== registerForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }
    setRegisterErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const needsApproval = registerForm.roles.some(r => ['Engineer', 'Sr. Engineer', 'Functional Head', 'Mechanical Head', 'Electrical Head', 'Program Owner', 'Program Head', 'Program Admin', 'Production Head', 'Head of Technology'].includes(r));
    const newUser = {
      username: registerForm.username,
      fullName: registerForm.fullName,
      roles: registerForm.roles,
      domain: registerForm.domain,
      securityQuestion: registerForm.securityQuestion,
      securityAnswer: registerForm.securityAnswer,
      password: registerForm.password,
      isApproved: !needsApproval
    };

    const updatedUsers = [...registeredUsers, newUser];
    setRegisteredUsers(updatedUsers);
    syncToDisk({ key: 'users', data: updatedUsers });

    if (needsApproval) {
      const isProgramRole = registerForm.roles.some(r => ['Program Owner', 'Program Head', 'Program Admin'].includes(r));

      addNotification('Program Head', `New registration request: ${newUser.username} (${newUser.roles.join(', ')})`, null);

      if (!isProgramRole) {
        addNotification('Program Admin', `New registration request: ${newUser.username} (${newUser.roles.join(', ')})`, null);
        addNotification('Program Owner', `New registration request: ${newUser.username} (${newUser.roles.join(', ')})`, null);
        showToast('Registration submitted. Pending approval from Head/Admin/Owner.', 'info');
      } else {
        showToast(`Registration for ${newUser.roles.join(', ')} submitted. Pending approval from Program Head.`, 'info');
      }
    } else {
      showToast('Account created successfully! Please login.')
    }
    setIsRegistering(false)
  }

  const getPasswordStrength = (password) => {
    let strength = 0;
    if (password.length > 5) strength++;
    if (password.match(/[a-z]/)) strength++;
    if (password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;
    return strength; // 0-5
  };

  const handleApproveUser = (username) => {
    const updatedUsers = registeredUsers.map(u =>
      u.username === username ? { ...u, isApproved: true } : u
    );
    setRegisteredUsers(updatedUsers);
    syncToDisk({ key: 'users', data: updatedUsers });
    addNotification(username, "Your account has been approved. You can now login.", null);
    showToast(`User ${username} approved.`);
  };

  // eslint-disable-next-line no-unused-vars
  const handleRejectUser = (username) => {
    const updatedUsers = registeredUsers.filter(u => u.username !== username);
    setRegisteredUsers(updatedUsers);
    syncToDisk({ key: 'users', data: updatedUsers });
    // System log notification
    addNotification(username, "Your registration request was rejected.", null);
    showToast(`User ${username} rejected and removed.`);
  };

  const handleDeleteUser = (username) => {
    if (window.confirm(`Are you sure you want to delete user ${username}?`)) {
      const updatedUsers = registeredUsers.filter(u => u.username !== username);
      setRegisteredUsers(updatedUsers);
      syncToDisk({ key: 'users', data: updatedUsers });
      showToast(`User ${username} deleted and removed.`);
    }
  };

  const handleUpdateUser = (username, field, value) => {
    const updatedUsers = registeredUsers.map(u =>
      u.username === username ? { ...u, [field]: value } : u
    );
    setRegisteredUsers(updatedUsers);
    syncToDisk({ key: 'users', data: updatedUsers });
    showToast(`${field} updated for ${username}.`);
  };

  const handleResetPassword = () => {
    if (resetForm.newPassword !== resetForm.confirmPassword) {
      showToast('Passwords do not match!', 'error')
      return
    }

    const user = registeredUsers.find(u => u.username === resetForm.username)
    if (!user) {
      showToast('Username not found.', 'error')
      return
    }

    if (user.securityAnswer.toLowerCase() !== resetForm.securityAnswer.toLowerCase()) {
      alert('Incorrect security answer. Access denied.')
      return
    }

    const updatedUsers = [...registeredUsers]
    const userIndex = registeredUsers.indexOf(user)
    updatedUsers[userIndex] = { ...user, password: resetForm.newPassword }

    setRegisteredUsers(updatedUsers)
    syncToDisk({ key: 'users', data: updatedUsers })

    showToast('Password reset successfully! Please login.')
    setIsForgotPassword(false)
    setResetForm({ username: '', newPassword: '', confirmPassword: '' })
  }

  const logout = () => {
    setIsLoggedIn(false)
    localStorage.removeItem('arpl_token')
    localStorage.removeItem('arpl_username')
    setLoginForm({ username: '', password: '' })
    setCurrentPage('po')
  }

  const handleWorkflowAction = (requestId, action, remarks, extraData = {}) => {
    const request = poRequests.find(r => r.id === requestId)
    if (!request) return

    let newStatus = request.status
    const userRoles = currentUserInfo.roles || [];
    let targetUser = request.requestedBy
    let msg = ""

    // Authorization: confirm the acting user is the designated approver for this stage.
    const actingUser = loginForm.username;
    const isSuperUser = ['Admin', 'DEV'].includes(actingUser) ||
      userRoles.some(r => ['Administrator', 'Developer'].includes(r));
    const isReassignedToMe = request.isReassigned && request.reassignedTo === actingUser;
    const stageApprover = {
      'Pending Owner': () => request.programOwner === actingUser || userRoles.includes('Program Owner'),
      'Pending Production Head': () => userRoles.includes('Production Head'),
      'Pending Admin': () => request.programAdmin === actingUser || userRoles.includes('Program Admin'),
      'Pending Head': () => userRoles.includes('Program Head'),
      'Pending Program Head': () => userRoles.includes('Program Head'),
    }[request.status];
    const isAuthorizedApprover = isSuperUser || isReassignedToMe || (stageApprover ? stageApprover() : false);
    if (!isAuthorizedApprover) {
      showToast("You are not authorized to act on this request at its current stage.", "error");
      return;
    }

    let historyAction = '';
    if (action === 'approve') {
      if (request.status === 'Pending Owner' || request.status === 'Pending Production Head') historyAction = 'Approval Granted';
      else if (request.status === 'Pending Admin') historyAction = 'PO Uploaded by Admin';
      else if (request.status === 'Pending Head' || request.status === 'Pending Program Head') historyAction = 'Final Approval Granted';
    } else if (action === 'reject') {
      historyAction = 'Request Rejected';
    } else if (action === 'rollback') {
      if (request.status === 'Pending Owner' || request.status === 'Pending Production Head') historyAction = 'Sent back for Correction';
      else if (request.status === 'Pending Admin') historyAction = 'Rolled back to Owner';
      else if (request.status === 'Pending Head' || request.status === 'Pending Program Head') historyAction = 'Rolled back to Admin';
      else historyAction = `Rolled Back from ${request.status}`;
    }

    const historyEntry = {
      date: new Date().toISOString(),
      user: loginForm.username,
      role: userRoles.join(', '),
      action: historyAction,
      remarks: remarks || ''
    };

    if (action === 'approve') {
      // Production Workflow vs Prototype Workflow
      const isProduction = request.isProduction === true;

      if (request.status === 'Pending Owner' || request.status === 'Pending Production Head') {
        if (isProduction) {
          newStatus = 'Pending Program Head';
          targetUser = 'Program Head';
          msg = `Production Request "${request.title}" approved by Production Head. Pending final approval.`;
        } else {
          newStatus = 'Pending Admin'
          targetUser = request.programAdmin
          msg = `Request "${request.title}" approved by Technical Head. Pending PO upload.`
        }
      } else if (request.status === 'Pending Admin') {
        if (!extraData.poFile) {
          showToast("Please upload the PO file first.", "warning")
          return
        }
        newStatus = isProduction ? 'Pending Program Head' : 'Pending Head';
        targetUser = 'Program Head' // Generic notification for heads
        msg = `PO file uploaded for "${request.title}". Pending final approval.`
      } else if (request.status === 'Pending Head' || request.status === 'Pending Program Head') {
        newStatus = 'Approved'
        targetUser = request.requestedBy
        msg = `Your PO Request "${request.title}" has been fully approved.`
      }
    } else if (action === 'reject') {
      newStatus = 'Rejected'
      msg = `Your PO Request "${request.title}" was rejected. Reason: ${remarks}`
    } else if (action === 'rollback') {
      if (request.status === 'Pending Owner' || request.status === 'Pending Production Head') newStatus = 'Correction Required'
      else if (request.status === 'Pending Admin') newStatus = request.isProduction ? 'Pending Production Head' : 'Pending Owner'
      else if (request.status === 'Pending Head' || request.status === 'Pending Program Head') {
        newStatus = request.isProduction ? 'Pending Production Head' : 'Pending Admin';
      }
      msg = `Your PO Request "${request.title}" was rolled back for corrections.`
    }

    const updatedRequests = poRequests.map(r => {
      if (r.id === requestId) {
        return {
          ...r,
          status: newStatus,
          remarks,
          isReassigned: false,
          reassignedTo: null,
          reassignedRole: null,
          ...extraData,
          history: [...(r.history || []), historyEntry]
        }
      }
      return r
    })

    setPoRequests(updatedRequests)
    syncToDisk({ key: 'poRequests', data: updatedRequests })
    addNotification(targetUser, msg, requestId, 'po')
    setReviewingRequest(null)
    showToast(`Request ${action}ed successfully.`)
  }

  const handleReassignRequest = (requestId, newUser) => {
    const request = poRequests.find(r => r.id === requestId)
    if (!request || !newUser) return

    const userRoles = currentUserInfo.roles || [];
    const targetUser = registeredUsers.find(u => u.username === newUser)
    if (!targetUser) return

    let fieldToUpdate = ''
    if (request.status === 'Pending Owner' || request.status === 'Pending Production Head') fieldToUpdate = request.isProduction ? 'productionHead' : 'programOwner'
    else if (request.status === 'Pending Admin') fieldToUpdate = 'programAdmin'
    else if (request.status === 'Pending Head' || request.status === 'Pending Program Head') fieldToUpdate = 'programOwner'

    if (!fieldToUpdate) fieldToUpdate = 'programOwner'

    const historyEntry = {
      date: new Date().toISOString(),
      user: loginForm.username,
      role: userRoles.join(', '),
      action: 'Request Reassigned',
      reassignedTo: targetUser.username,
      reassignedRole: (targetUser.roles || []).join(', '),
      remarks: `Approval reassigned to ${targetUser.username} (${(targetUser.roles || []).join(', ')})`
    }

    const updated = poRequests.map(r => r.id === requestId ? {
      ...r,
      [fieldToUpdate]: newUser,
      isReassigned: true,
      reassignedTo: targetUser.username,
      reassignedRole: (targetUser.roles || []).join(', '),
      history: [...(r.history || []), historyEntry]
    } : r)

    setPoRequests(updated)
    syncToDisk({ key: 'poRequests', data: updated })
    addNotification(newUser, `A request "${request.title}" has been reassigned to you for approval.`, requestId, 'po')
    setReviewingRequest(null)
    setIsReassigning(false)
    setTargetReassignUser('')
    showToast(`Request reassigned to ${targetUser.username}.`)
  }

  const handleCancelRequest = (requestId) => {
    const req = poRequests.find(r => r.id === requestId)
    if (!req) {
      showToast('This request no longer exists.', 'warning')
      return
    }
    if (window.confirm("Are you sure you want to cancel this request?")) {
      const updated = poRequests.map(r => {
        if (r.id === requestId) return { ...r, status: 'Cancelled' }
        return r
      })
      setPoRequests(updated)
      syncToDisk({ key: 'poRequests', data: updated })

      // Notify Admin/Owner if they were involved
      if (req.programOwner) {
        addNotification(req.programOwner, `User cancelled request: ${req.title}`, requestId, 'po')
      }
    }
  }

  // Program Handlers
  const handleSaveProgram = () => {
    if (!programForm.name || !programForm.owner) {
      showToast('Please fill in Name and Owner', 'warning')
      return
    }

    let updatedPrograms;
    if (editProgramId) {
      updatedPrograms = programs.map(p =>
        p.id === editProgramId ? { ...p, ...programForm } : p
      )
    } else {
      const newProgram = {
        ...programForm,
        id: Date.now(),
      }
      updatedPrograms = [...programs, newProgram]
    }

    setPrograms(updatedPrograms)
    syncToDisk({ key: 'programs', data: updatedPrograms })
    resetProgramForm()
  }

  const resetProgramForm = () => {
    setProgramForm({ name: '', category: 'Motor', platform: 'Platform T', owner: '', admin: 'Program Admin' })
    setEditProgramId(null)
    setShowProgramForm(false)
  }

  const handleEditProgram = (program) => {
    setProgramForm({
      name: program.name,
      category: program.category,
      platform: program.platform,
      owner: program.owner,
      admin: program.admin || ''
    })
    setEditProgramId(program.id)
    setShowProgramForm(true)
  }

  const handleDeleteProgram = (id) => {
    if (window.confirm('Are you sure you want to delete this program?')) {
      const updatedPrograms = programs.filter(p => p.id !== id)
      setPrograms(updatedPrograms)
      syncToDisk({ key: 'programs', data: updatedPrograms })
    }
  }

  // Work Order Handlers
  const handleSaveWorkOrder = () => {
    if (!workOrderForm.title || !workOrderForm.programId) {
      showToast('Please fill in Title and Select a Program', 'warning')
      return
    }

    if (workOrderForm.type === 'Customer' && !workOrderForm.customerName) {
      showToast('Customer Name is required for Customer type work orders.', 'warning')
      return
    }

    if (workOrderForm.items.some(i => !i.modelNumber || !i.partNumber || !i.qty)) {
      showToast('Please fill in Model Number, Part Number, and Qty for all items.', 'warning')
      return
    }

    const totalSamples = workOrderForm.items.reduce((sum, item) => sum + Number(item.qty), 0);

    let updatedOrders;
    if (editWorkOrderId) {
      updatedOrders = workOrders.map(wo =>
        wo.id === editWorkOrderId ? { ...wo, ...workOrderForm, samples: totalSamples, programId: Number(workOrderForm.programId) } : wo
      )
    } else {
      updatedOrders = [...workOrders, {
        ...workOrderForm,
        samples: totalSamples,
        id: Date.now(),
        refId: generateRefId('WO', workOrders),
        programId: Number(workOrderForm.programId)
      }]
    }

    setWorkOrders(updatedOrders)
    syncToDisk({ key: 'workOrders', data: updatedOrders })
    resetWorkOrderForm()
  }

  const resetWorkOrderForm = () => {
    setWorkOrderForm({
      title: '',
      programId: '',
      samples: 1,
      type: 'Internal',
      budgetCode: '',
      stage: 'Sample A',
      customerName: '',
      poFileName: '',
      poComments: '',
      items: [{ modelNumber: '', partNumber: '', qty: 1 }]
    })
    setEditWorkOrderId(null)
    setShowWorkOrderForm(false)
  }

  const handleEditWorkOrder = (wo) => {
    setWorkOrderForm({
      title: wo.title,
      programId: wo.programId,
      samples: wo.samples,
      type: wo.type,
      budgetCode: wo.budgetCode,
      stage: wo.stage,
      customerName: wo.customerName || '',
      poFileName: wo.poFileName || '',
      poComments: wo.poComments || '',
      items: wo.items || [{ modelNumber: wo.modelNumber || '', partNumber: wo.partNumber || '', qty: wo.samples || 1 }]
    })
    setEditWorkOrderId(wo.id)
    setShowWorkOrderForm(true)
  }

  const handleDeleteWorkOrder = (id) => {
    if (window.confirm('Delete this Work Order?')) {
      const updated = workOrders.filter(wo => wo.id !== id)
      setWorkOrders(updated)
      syncToDisk({ key: 'workOrders', data: updated })
    }
  }

  // Vendor Handlers
  const handleSaveVendor = () => {
    if (!vendorForm.name) {
      showToast('Vendor Name is required.', 'warning')
      return
    }

    const isEditing = !!editVendorId;
    let updatedVendors;
    if (editVendorId) {
      updatedVendors = vendors.map(v => v.id === editVendorId ? { ...v, ...vendorForm } : v)
    } else {
      updatedVendors = [...vendors, { ...vendorForm, id: Date.now() + Math.random() }]
    }

    setVendors(updatedVendors)
    syncToDisk({ key: 'vendors', data: updatedVendors })
    resetVendorForm()
    showToast(isEditing ? 'Vendor updated!' : 'Vendor added!')
  }

  const resetVendorForm = () => {
    setVendorForm({ name: '', email: '', contactPerson: '', phone: '', gstin: '', address: '' })
    setEditVendorId(null)
    setShowVendorForm(false)
  }

  const handleEditVendor = (vendor) => {
    setVendorForm({ ...vendor })
    setEditVendorId(vendor.id)
    setShowVendorForm(true)
  }

  const handleDeleteVendor = (id) => {
    if (window.confirm('Delete this vendor?')) {
      const updated = vendors.filter(v => v.id !== id)
      setVendors(updated)
      syncToDisk({ key: 'vendors', data: updated })
    }
  }

  const filteredVendors = useMemo(() => {
    const query = vendorSearch.toLowerCase().trim();
    if (!query) return vendors;

    return vendors.filter(v =>
      v.name.toLowerCase().includes(query) ||
      v.gstin.toLowerCase().includes(query) ||
      (v.contactPerson && v.contactPerson.toLowerCase().includes(query)) ||
      (v.email && v.email.toLowerCase().includes(query)) ||
      (v.phone && v.phone.toLowerCase().includes(query)) ||
      (v.address && v.address.toLowerCase().includes(query))
    );
  }, [vendors, vendorSearch]);

  const toggleSelectVendor = (id) => {
    setSelectedVendorIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVendors = () => {
    const filteredIds = filteredVendors.map(v => v.id);
    const allAreSelected = filteredIds.length > 0 && filteredIds.every(id => selectedVendorIds.includes(id));

    if (allAreSelected) {
      // Unselect only the currently filtered ones
      setSelectedVendorIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      // Add missing filtered ones to selection
      setSelectedVendorIds(prev => {
        const newIds = filteredIds.filter(id => !prev.includes(id));
        return [...prev, ...newIds];
      });
    }
  };

  const handleDeleteSelectedVendors = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedVendorIds.length} selected vendors?`)) {
      const updated = vendors.filter(v => !selectedVendorIds.includes(v.id));
      setVendors(updated);
      syncToDisk({ key: 'vendors', data: updated });
      setSelectedVendorIds([]);
      showToast(`${selectedVendorIds.length} vendors deleted.`);
    }
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      const lines = text.split('\n').filter(line => line.trim() !== '')
      const newVendors = lines.slice(1).map(line => {
        const [name, email, contactPerson, phone, gstin, address] = line.split(',').map(s => s?.trim() || '')
        return { id: Date.now() + Math.random(), name, email, contactPerson, phone, gstin, address }
      }).filter(v => v.name && v.gstin)

      const updated = [...vendors, ...newVendors]
      setVendors(updated)
      syncToDisk({ key: 'vendors', data: updated })
      showToast(`Imported ${newVendors.length} vendors.`)
    }
    reader.readAsText(file)
  }

  const handleExportVendorTemplate = () => {
    const headers = ["name", "email", "contactPerson", "phone", "gstin", "address"];
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "arpl_vendor_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Vendor import template downloaded.");
  };

  // Part Handlers
  const handleSavePart = () => {
    if (!partForm.drawing || !partForm.name) {
      showToast('Part Drawing and Name are required.', 'warning')
      return
    }

    const isEditing = !!editPartId;
    let updatedParts;
    if (editPartId) {
      updatedParts = parts.map(p => p.id === editPartId ? { ...p, ...partForm } : p)
    } else {
      updatedParts = [...parts, { ...partForm, id: Date.now() }]
    }

    setParts(updatedParts)
    syncToDisk({ key: 'parts', data: updatedParts })
    resetPartForm()
    showToast(isEditing ? 'Part updated!' : 'Part added!')
  }

  const resetPartForm = () => {
    setPartForm({ drawing: '', name: '', units: 'Nos.' })
    setEditPartId(null)
    setShowPartForm(false)
  }

  const handleEditPart = (part) => {
    setPartForm({ ...part })
    setEditPartId(part.id)
    setShowPartForm(true)
  }

  const handleDeletePart = (id) => {
    if (window.confirm('Delete this part?')) {
      const updated = parts.filter(p => p.id !== id)
      setParts(updated)
      syncToDisk({ key: 'parts', data: updated })
    }
  }

  const handleFollowUp = (req) => {
    let targetUser = '';
    if (req.status === 'Pending Owner') targetUser = req.programOwner;
    else if (req.status === 'Pending Admin') targetUser = req.programAdmin;
    else if (req.status === 'Pending Head') targetUser = 'Program Head';

    if (targetUser) {
      addNotification(targetUser, `Follow-up request for "${req.title}" from ${loginForm.username}`, req.id, 'po');
      showToast(`Follow-up notification sent to ${targetUser}`);
    } else {
      showToast("No pending approver found.", "error");
    }
  };

  const handleEditOwnRequest = (req) => {
    setPoRequestForm({
      title: req.title,
      vendorId: req.vendorId,
      type: req.type,
      category: req.category,
      workOrderId: req.workOrderId,
      programName: req.programName,
      programOwner: req.programOwner,
      programAdmin: req.programAdmin,
      budgetCode: req.budgetCode,
      items: req.items || [{
        partDrawing: req.partDrawing,
        partName: req.partName,
        unit: req.unit,
        qty: req.qty,
        unitPrice: req.unitPrice
      }],
      paymentMode: req.paymentMode,
      paymentComments: req.paymentComments,
      deliveryValue: req.deliveryValue,
      deliveryUnit: req.deliveryUnit,
      qualityAssurance: req.qualityAssurance,
      qualityTC: req.qualityTC,
      remarks: req.remarks,
      fileName: req.fileName || '',
      lastRemarks: req.remarks // approver remarks
    })
    setEditingRequestId(req.id)
    setActivePOTab('po_request')
  }

  const addPOItemRow = () => {
    setPoRequestForm(prev => ({
      ...prev,
      items: [...prev.items, { partDrawing: '', partName: '', unit: 'Nos.', qty: '', unitPrice: '', currency: 'INR' }]
    }));
  };

  const removePOItemRow = (index) => {
    if (poRequestForm.items.length <= 1) return;
    const updated = poRequestForm.items.filter((_, i) => i !== index);
    setPoRequestForm(prev => ({ ...prev, items: updated }));
  };

  const updatePOItem = (index, field, value) => {
    setPoRequestForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  };

  const handleSavePORequest = () => {
    if (!poRequestForm.title || !poRequestForm.programName || poRequestForm.items.some(i => !i.partDrawing || !i.partName)) {
      showToast('Please fill in all required fields', 'warning')
      return
    }

    let updated;
    if (editingRequestId) {
      const historyEntry = {
        date: new Date().toISOString(),
        user: loginForm.username,
        role: (currentUserInfo.roles || []).join(', '),
        action: 'Request Resubmitted',
        remarks: 'Corrected as per reviewer feedback'
      };

      updated = poRequests.map(r => r.id === editingRequestId ? {
        ...r,
        ...poRequestForm,
        status: 'Pending Owner',
        updatedAt: new Date().toISOString(),
        history: [...(r.history || []), historyEntry]
      } : r)
    } else {
      const historyEntry = {
        date: new Date().toISOString(),
        user: loginForm.username,
        role: (currentUserInfo.roles || []).join(', '),
        action: 'Request Submitted',
        remarks: poRequestForm.remarks || 'Initial submission'
      };

      const newRequest = {
        ...poRequestForm,
        id: Date.now(),
        refId: generateRefId(poRequestForm.type, poRequests),
        status: 'Pending Owner',
        createdAt: new Date().toISOString(),
        requestedBy: loginForm.username,
        remarks: '',
        poFile: null,
        history: [historyEntry]
      }
      updated = [newRequest, ...poRequests]
      addNotification(poRequestForm.programOwner, `New PO Request from ${loginForm.username}: ${poRequestForm.title}`, newRequest.id, 'po')
      addNotification('Program Head', `New PO Request from ${loginForm.username} (Requires Owner Approval): ${poRequestForm.title}`, newRequest.id, 'po')
    }

    setPoRequests(updated)
    syncToDisk({ key: 'poRequests', data: updated })

    // Reset Form
    setPoRequestForm({
      title: '', vendorId: '', type: 'PO', category: 'Prototypes (BO & Machining)',
      workOrderId: '', programName: '', programOwner: '', programAdmin: 'Program Admin', budgetCode: '',
      items: [{ partDrawing: '', partName: '', unit: 'Nos.', qty: '', unitPrice: '', currency: 'INR' }],
      paymentMode: 'Credit', paymentComments: '', deliveryValue: '', deliveryUnit: 'Days',
      qualityAssurance: false, qualityTC: false, remarks: '', fileName: ''
    })
    setEditingRequestId(null)

    showToast(editingRequestId ? 'Request updated and resubmitted!' : 'PO Request submitted successfully!')
    setActivePOTab('my_request')
  }

  const uploadFile = async (file) => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/api/upload`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText).fileName);
        } else {
          reject(new Error('Upload failed'));
        }
      };

      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send(formData);
    });
  };

  const handleWOFileChange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      try {
        setUploadProgress(1);
        const fileName = await uploadFile(file);
        setWorkOrderForm(prev => ({ ...prev, poFileName: fileName }))
        setTimeout(() => setUploadProgress(0), 1500);
      } catch (error) {
        console.error("WO PO Upload failed", error);
        setUploadProgress(0);
        showToast("Failed to upload PO.", "error");
      }
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      try {
        setUploadProgress(1);
        const fileName = await uploadFile(file);
        setPoRequestForm(prev => ({ ...prev, fileName }))
        setTimeout(() => setUploadProgress(0), 1500);
      } catch (error) {
        console.error("Upload failed", error);
        setUploadProgress(0);
        showToast("Failed to upload quotation.", "error");
      }
    }
  }

  const handleFilePreview = (fileName) => {
    if (!fileName) return;
    const fileUrl = `${API_BASE_URL}/uploads/${fileName}`;
    setPreviewFile(fileUrl);
  };

  const handleFileDownload = async (fileName) => {
    if (!fileName) return;
    try {
      const response = await fetch(`${API_BASE_URL}/uploads/${fileName}`);
      if (!response.ok) throw new Error(`Server responded with ${response.status}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      let displayFileName = fileName;
      // Regex to match a leading timestamp (10+ digits) or UUID, followed by an optional non-alphanumeric separator
      // and capture the rest of the filename.
      const leadingIdPattern = /^(\d{10,}[_.-]?|[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}[_.-]?)(.*)/i;
      const match = displayFileName.match(leadingIdPattern);

      if (match && match[2]) {
        displayFileName = match[2];
      } else {
        // If the above pattern doesn't match, try to remove a leading long sequence of digits
        // that might not have a separator, e.g., "1715000000000.pdf"
        const bareLeadingDigitsPattern = /^(\d{10,})(.*)/;
        const bareMatch = displayFileName.match(bareLeadingDigitsPattern);
        if (bareMatch && bareMatch[2]) {
          displayFileName = bareMatch[2];
        }
      }

      // Trim any leading non-alphanumeric characters that might remain after stripping the ID
      if (displayFileName.length > 0 && !/^[a-zA-Z0-9]/.test(displayFileName)) {
        displayFileName = displayFileName.substring(1);
      }
      link.setAttribute('download', displayFileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed", error);
      showToast("Failed to download file.", "error");
    }
  };

  const handleExportReport = () => {
    if (filteredReportData.length === 0) {
      showToast("No data to export", "warning");
      return;
    }

    const headers = ["Date", "Title", "Program", "Vendor", "Qty", "Unit Price", "Total Amount", "Status"];
    const rows = filteredReportData.map(req => {
      const vendorName = vendors.find(v => String(v.id) === String(req.vendorId))?.name || req.vendorId || 'N/A';
      let qty = req.qty;
      let unitPrice = req.unitPrice;
      if (req.items && req.items.length > 0) {
        qty = req.items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
        unitPrice = req.items.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.unitPrice) || 0), 0);
      }
      const total = Number(qty) * Number(unitPrice);
      return [
        formatDate(req.createdAt),
        `"${req.title.replace(/"/g, '""')}"`,
        `"${req.programName}"`,
        `"${vendorName}"`,
        qty || 0,
        unitPrice || 0,
        total || 0,
        req.status
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ARPL_PO_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sanitizeHTML = (str) => {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  const handleExportPDF = (req) => {
    const isProdPR = req.isProduction && !req.prId;
    const vendor = vendors.find(v => String(v.id) === String(req.vendorId));
    const vendorName = vendor?.name || req.vendorId || 'N/A';
    const s = sanitizeHTML;

    let pdfFilenamePrefix = 'Summary';
    if (req.prId) { // This is a generated PO
      pdfFilenamePrefix = 'Purchase_Order';
    } else if (req.isProduction) { // This is a Production PR
      pdfFilenamePrefix = 'Production_Request';
    } else { // This is a regular PO Request (Quotation)
      pdfFilenamePrefix = 'Quotation_Request';
    }

    let itemsContent = '';
    let grandTotal = 0;
    const currency = (req.items && req.items[0]?.currency) || 'INR';
    const symbol = CURRENCY_DATA.find(c => c.code === currency)?.symbol || '₹';

    if (isProdPR) {
      grandTotal = Number(req.totalPrice || 0);
      itemsContent = `
        <div style="background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 15px 0;">
          <h3 style="margin: 0 0 10px 0; color: #c36e46; font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Production Run BOM Details</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
              <span style="font-size: 10px; color: #64748b; text-transform: uppercase; display: block;">Total Budget Value</span>
              <strong style="font-size: 20px; color: #1e293b;">${symbol}${grandTotal.toLocaleString()}</strong>
            </div>
            <div>
              <span style="font-size: 12px; color: #64748b; text-transform: uppercase; display: block;">BOM Reference</span>
              <strong style="font-size: 14px; color: #1e293b;">${s(req.fileName || 'Linked Electronic BOM')}</strong>
            </div>
          </div>
          ${req.remarks ? `<div style="margin-top: 15px; font-size: 13px; color: #475569; border-top: 1px dashed #cbd5e1; padding-top: 10px;"><strong>Remarks:</strong> ${s(req.remarks)}</div>` : ''}
        </div>
      `;
    } else {
      const items = req.items || [{ partName: req.partName, partDrawing: req.partDrawing, qty: req.qty, unit: req.unit, unitPrice: req.unitPrice }];
      grandTotal = items.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.unitPrice || 0)), 0);

      const itemRows = items.map(item => `
        <tr>
          <td><strong>${s(item.partName)}</strong><br/><small style="color: #64748b">Drawing No: ${s(item.partDrawing)}</small></td>
          <td style="text-align: center;">${item.qty} ${item.unit}</td>
          <td style="text-align: right;">${symbol}${Number(item.unitPrice || 0).toLocaleString()}</td>
          <td style="text-align: right;">${symbol}${(Number(item.qty || 0) * Number(item.unitPrice || 0)).toLocaleString()}</td>
        </tr>
      `).join('');

      itemsContent = `
        <table>
          <thead>
            <tr>
              <th>Part Details / Drawing</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
            <tr class="total-row">
              <td colspan="3" style="text-align: right;">Grand Total</td>
              <td style="text-align: right;">${symbol}${grandTotal.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      `;
    }

    let statusClass = 'status-pending';
    if (req.status === 'Approved') statusClass = 'status-approved';
    else if (['Rejected', 'Cancelled'].includes(req.status)) statusClass = 'status-rejected';

    // Synthesize history for legacy data if the history array is empty
    let historyData = [...(req.history || [])];
    if (historyData.length === 0 && req.createdAt) {
      historyData.push({
        date: req.createdAt,
        action: 'Request Submitted',
        user: req.requestedBy,
        role: 'Requester',
        remarks: 'Initial submission (Legacy Record)'
      });
    }

    const historyTimeline = historyData.reverse().map(h => `
      <div class="history-item">
        <div class="history-item-header">
          <span class="history-item-action">${s(h.action)}</span>
          <span class="history-item-date">${formatDate(h.date)}</span>
        </div>
        <div class="history-item-user">By ${s(h.user)} (${s(h.role || 'N/A')})</div>
        ${h.remarks ? `<div class="history-item-remarks">"${s(h.remarks)}"</div>` : ''}
      </div>
    `).join('');

    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      showToast('Unable to open the PDF window. Please allow pop-ups for this site and try again.', 'warning');
      return;
    }
    newWindow.document.write(`
      <html>
        <head>
          <title>${s(req.refId || 'PR')}: ${s(req.title)}</title>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 0; color: #1e293b; line-height: 1.25; background: #fff; margin: 0; }
            #pdf-content { padding: 5mm; width: 180mm; box-sizing: border-box; margin: 0; background: #fff; overflow-x: hidden; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #c36e46; padding-bottom: 12px; margin-bottom: 20px; }
            .company-info h1 { margin: 0; color: #c36e46; font-size: 24px; font-weight: 800; }
            .company-info p { margin: 5px 0; color: #64748b; font-size: 14px; }
            .doc-type { text-align: right; }
            .ref-badge { background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-family: monospace; border: 1px solid #e2e8f0; font-size: 14px; margin-bottom: 4px; display: inline-block; }
            .doc-type h2 { margin: 0; font-size: 18px; text-transform: uppercase; color: #1e293b; }
            
            .main-content-grid { display: flex; gap: 5mm; align-items: flex-start; margin-top: 10px; width: 100%; } /* Adjusted for 180mm total width */
            .left-column { width: 110mm; flex-shrink: 0; } /* 110mm + 55mm + 5mm gap = 170mm, fits in 180mm - 10mm padding */
            .right-column { width: 55mm; flex-shrink: 0; }
            
            .section-card { background: #ffffff; padding: 10px; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 10px; page-break-inside: avoid; }
            .section-card h4 { font-size: 11px; text-transform: uppercase; color: #c36e46; margin: 0 0 12px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; letter-spacing: 0.05em; }
            
            .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .detail-item { font-size: 11px; margin-bottom: 5px; }
            .detail-item strong { display: block; font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 2px; }
            .detail-item span { font-weight: 600; color: #1e293b; font-size: 11px; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 10px; }
            th { background: #f8fafc; color: #475569; font-weight: 700; text-transform: uppercase; border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
            td { border: 1px solid #e2e8f0; padding: 6px 8px; vertical-align: top; }
            .total-row { background: #f8fafc; font-weight: 800; font-size: 12px; }
            
            .history-item { padding-left: 12px; border-left: 2px solid #c36e46; position: relative; margin-bottom: 8px; } /* Reduced margin */
            .history-item::before { content: ''; position: absolute; left: -5px; top: 0; width: 8px; height: 8px; border-radius: 50%; background: #c36e46; }
            .history-item-header { display: flex; justify-content: space-between; margin-bottom: 2px; }
            .history-item-action { font-size: 11px; font-weight: 700; color: #1e293b; }
            .history-item-date { font-size: 10px; color: #64748b; }
            .history-item-user { font-size: 10px; color: #64748b; margin-bottom: 3px; }
            .history-item-remarks { font-size: 10px; font-style: italic; color: #c36e46; background: #fdf0ea; padding: 4px 8px; border-radius: 4px; display: inline-block; }
            
            .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; text-transform: uppercase; margin-top: 5px; }
            .status-approved { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
            .status-pending { background: #fef9c3; color: #854d0e; border: 1px solid #fef08a; }
            .status-rejected { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
            .footer { margin-top: 25px; padding-top: 10px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #94a3b8; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div id="pdf-content">
            <div class="header">
              <div class="company-info">
                <h1>ABHINAVA RIZEL PVT. LTD.</h1>
              </div>
              <div class="doc-type">
                <h2>${isProdPR ? 'Production Purchase Request' : 'Purchase Order Request'}</h2>
                <div class="ref-badge">${s(req.refId || '#' + req.id)}</div>
                <div class="status-badge ${statusClass}">${s(req.status)}</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 5px;">Date: ${formatDate(req.createdAt)}</div>
              </div>
            </div>
            
            <div class="main-content-grid">
              <div class="left-column">
                <div class="section-card">
                  <h4>Requester & Program Information</h4>
                  <div class="details-grid">
                    <div class="detail-item"><strong>Requested By</strong><span>${s(req.requestedBy)}</span></div>
                    <div class="detail-item"><strong>Program Name</strong><span>${s(req.programName)}</span></div>
                    <div class="detail-item"><strong>Admin</strong><span>${s(req.programAdmin || 'N/A')}</span></div>
                    <div class="detail-item"><strong>Budget Code</strong><span>${s(req.budgetCode || 'N/A')}</span></div>
                    ${(() => {
        const reassignedInfo = getReassignedInfo(req);
        return reassignedInfo ? `
                        <div class="detail-item" style="grid-column: span 2; background: #fef9c3; padding: 6px; border-radius: 4px; margin-top: 5px;">
                          <strong>Reassigned Approver</strong>
                          <span>${reassignedInfo.username} (${reassignedInfo.role})</span>
                        </div>
                      ` : '';
      })()}
                  </div>
                </div>

                <div class="section-card">
                  <h4>Vendor Information</h4>
                  <div class="details-grid">
                    <div class="detail-item"><strong>Vendor Name</strong><span>${isProdPR ? 'Multiple (See BOM)' : s(vendorName)}</span></div>
                    <div class="detail-item"><strong>GSTIN</strong><span>${s(vendor?.gstin || 'N/A')}</span></div>
                    <div class="detail-item"><strong>Email Address</strong><span>${s(vendor?.email || 'N/A')}</span></div>
                  </div>
                </div>

                <div class="section-card">
                  <h4>Items / BOM Details</h4>
                  ${itemsContent}
                </div>

                <div class="section-card">
                  <h4>Payment & Delivery Terms</h4>
                  <div class="details-grid">
                    <div class="detail-item"><strong>Payment Mode</strong><span>${s(req.paymentMode)}</span></div>
                    <div class="detail-item"><strong>Lead Time</strong><span>${s(req.deliveryValue)} ${s(req.deliveryUnit)}</span></div>
                    <div class="detail-item"><strong>Comments</strong><span>${s(req.paymentComments || 'No specific comments')}</span></div>
                    <div class="detail-item"><strong>Quality TC</strong><span>${req.qualityTC ? 'Required' : 'Not Required'}</span></div>
                  </div>
                </div>
              </div>

              <div class="right-column">
                <div class="section-card">
                  <h4>Audit Trail</h4>
                  <div class="history-timeline">
                    ${historyTimeline || '<div style="font-size:11px;color:#94a3b8">No history recorded</div>'}
                  </div>
                </div>
              </div>
            </div>
            
          </div>
          <script>
            window.onload = function() {
              const element = document.getElementById('pdf-content');
              const opt = {
                margin:       [10, 10, 10, 10],
                filename:     '${String(req.refId || 'PR').replace(/[^a-zA-Z0-9_-]/g, '_')}_${String(pdfFilenamePrefix).replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf',
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
              };
              html2pdf().set(opt).from(element).save().then(() => {
                setTimeout(() => window.close(), 1500);
              });
            };
          </script>
        </body>
      </html>
    `);
    newWindow.document.close();
  };

  const openProfileModal = (mode = 'view') => {
    setProfileMode(mode)
    setProfileForm({
      fullName: currentUserInfo.fullName || '',
      roles: currentUserInfo.roles || ['Engineer'],
      domain: currentUserInfo.domain || 'Architecture',
      securityQuestion: currentUserInfo.securityQuestion || "What was your first pet's name?",
      securityAnswer: currentUserInfo.securityAnswer || '',
      newPassword: '',
      confirmPassword: ''
    })
    setShowProfileModal(true)
    setShowProfileDropdown(false)
  }

  const handleUpdateProfile = () => {
    if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
      showToast('Passwords do not match!', 'error')
      return
    }

    const updatedUsers = registeredUsers.map(u => {
      if (u.username === loginForm.username) {
        const updated = {
          ...u,
          fullName: profileForm.fullName,
          roles: profileForm.roles,
          domain: profileForm.domain,
          securityQuestion: profileForm.securityQuestion,
          securityAnswer: profileForm.securityAnswer
        }
        if (profileForm.newPassword) updated.password = profileForm.newPassword
        return updated
      }
      return u
    })

    setRegisteredUsers(updatedUsers)
    syncToDisk({ key: 'users', data: updatedUsers })

    setShowProfileModal(false)
    showToast('Profile updated successfully!')
  }

  const userForReset = useMemo(() => {
    return registeredUsers.find(u => u.username === resetForm.username)
  }, [registeredUsers, resetForm.username])

  const pageTitle = useMemo(() => {
    const titles = {
      dashboard: 'Dashboard Overview',
      po: 'Purchase Request - Proto',
      po_production: 'Purchase Request - Production',
      motor_traceability: 'Part Traceability',
      program: 'Program Tracking',
      delivery: 'Delivery Management',
      eol_reports: 'EOL & PDI Reports'
    }
    return titles[currentPage] || 'Dashboard'
  }, [currentPage])

  const eolNavItems = [
    { id: 'new_report', label: 'EOL Report', icon: <FileText size={16} /> },
    { id: 'dashboard', label: 'EOL Dashboard', icon: <PieChart size={16} /> },
    { id: 'golden_samples', label: 'Golden Samples', icon: <Layers size={16} /> },
    { id: 'qi_pdi_report', label: 'PDI Report', icon: <FileText size={16} /> },
    { id: 'qi_pdi_dashboard', label: 'PDI Dashboard', icon: <PieChart size={16} /> },
    { id: 'qi_pdi_ref_samples', label: 'Reference Samples', icon: <ShieldCheck size={16} /> },
    { id: 'approvals', label: 'Approvals', icon: <CheckCircle2 size={16} /> },
    { id: 'archive', label: 'Reports Archive', icon: <History size={16} /> }
  ]

  // Calculate pending tasks for Sidebar Badges
  const sidebarBadges = useMemo(() => {
    const roles = currentUserInfo.roles || [];

    // Badges from PO requests pending approval — route prototype vs production to the right page
    const isPendingForMe = (req) => {
      if (req.status === 'Pending Owner') return req.programOwner === loginForm.username || roles.includes('Program Head');
      if (req.status === 'Pending Admin') return req.programAdmin === loginForm.username;
      if (req.status === 'Pending Head') return roles.includes('Program Head');
      if (req.status === 'Pending Production Head') return roles.includes('Production Head');
      if (req.status === 'Pending Program Head') return roles.includes('Program Head');
      return false;
    };
    const pendingPOs = poRequests.filter(req => !req.isProduction && isPendingForMe(req)).length;
    const pendingProdPOs = poRequests.filter(req => req.isProduction && isPendingForMe(req)).length;

    // Badges from notifications per page
    const notifCounts = { po: 0, po_production: 0, motor_traceability: 0, eol_reports: 0, program: 0 };
    notifications.forEach(n => {
      if (n.isRead) return;
      if (n.userId !== loginForm.username && !roles.includes(n.userId)) return;
      if (n.page && notifCounts.hasOwnProperty(n.page)) {
        notifCounts[n.page]++;
      }
    });

    return { po: pendingPOs + notifCounts.po, po_production: pendingProdPOs + notifCounts.po_production, motor_traceability: notifCounts.motor_traceability, eol_reports: notifCounts.eol_reports, program: notifCounts.program };
  }, [poRequests, currentUserInfo, loginForm.username, notifications]);

  const addWOItemRow = () => {
    setWorkOrderForm(prev => ({
      ...prev,
      items: [...prev.items, { modelNumber: '', partNumber: '', qty: 1 }]
    }));
  };
  const removeWOItemRow = (index) => {
    if (workOrderForm.items.length <= 1) return;
    setWorkOrderForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };
  const updateWOItem = (index, field, value) => {
    setWorkOrderForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  };

  // Determine who approved the previous stage for the reviewingRequest modal
  const previousApproverInfoForReview = useMemo(() => {
    if (!reviewingRequest || !reviewingRequest.history || reviewingRequest.history.length === 0) return null;

    // Find the last entry in the history that signifies a completed action (not just submission or correction)
    // and is not the current pending status.
    const reversedHistory = [...reviewingRequest.history].reverse();
    for (const entry of reversedHistory) {
      if (entry.action.includes('Approval Granted') || entry.action.includes('PO Uploaded by Admin')) {
        return entry;
      }
    }
    return null;
  }, [reviewingRequest]);

  return (
    <div className={`app-container ${theme}-theme`}>
      <style>{`
        /* Hide browser-native password reveal icons in Edge/Chrome to prevent "2 eyes" conflict */
        input::-ms-reveal,
        input::-ms-clear {
          display: none;
        }
      `}</style>

      {!isLoggedIn ? (
        <div className="auth-wrapper">
          <div className={`auth-center ${isRegistering ? 'wide' : ''}`}>
            <div className="auth-brand">
              <div className="auth-brand-logo">
                <img src="/AR LOGO.png" alt="Company Logo" />
              </div>
              <h1>ARPL Approval &amp; Report Generator</h1>
              <p>Streamline your workflow with automated report generation, traceability tracking, and approval management.</p>
              <div className="auth-brand-features">
                <div className="auth-brand-feature">
                  <div className="auth-brand-feature-icon"><FileText size={18} /></div>
                  <span>Automated EOL &amp; PDI Reports</span>
                </div>
                <div className="auth-brand-feature">
                  <div className="auth-brand-feature-icon"><Layers size={18} /></div>
                  <span>Full Traceability Tracking</span>
                </div>
                <div className="auth-brand-feature">
                  <div className="auth-brand-feature-icon"><CheckCircle2 size={18} /></div>
                  <span>Approval Workflow Management</span>
                </div>
              </div>
            </div>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={`auth-card ${isRegistering ? 'wide' : ''}`}
              >
                {isForgotPassword ? (
                  <div>
                    <button className="btn-ghost-small" onClick={() => setIsForgotPassword(false)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', color: 'var(--text-sub)', marginBottom: 'var(--space-md)' }}><ChevronLeft size={16} /> Back to Login</button>
                    <h2 style={{ fontSize: 'var(--fs-xl)', fontWeight: 800, marginBottom: 'var(--space-xs)', letterSpacing: '-0.02em' }}>Reset Password</h2>
                    <p className="subtitle">Enter your username to reset your password</p>
                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}><Users size={13} /> Username <span className="mandatory">*</span></label>
                      <input
                        value={resetForm.username}
                        onChange={(e) => setResetForm({ ...resetForm, username: e.target.value })}
                        type="text"
                        placeholder="Enter your username"
                      />
                    </div>
                    {userForReset && (
                      <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}><HelpCircle size={13} /> Security Question</label>
                        <div style={{ padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-md)', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', color: 'var(--accent)', fontSize: 'var(--fs-base)', fontWeight: 600 }}>
                          {userForReset.securityQuestion}
                        </div>
                      </div>
                    )}
                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}><Key size={13} /> Security Answer <span className="mandatory">*</span></label>
                      <input
                        value={resetForm.securityAnswer}
                        onChange={(e) => setResetForm({ ...resetForm, securityAnswer: e.target.value })}
                        type="text"
                        placeholder="Enter your answer"
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}><Lock size={13} /> New Password <span className="mandatory">*</span></label>
                      <div style={{ position: 'relative' }}>
                        <input
                          value={resetForm.newPassword}
                          onChange={(e) => setResetForm({ ...resetForm, newPassword: e.target.value })}
                          type={showResetPassword ? 'text' : 'password'}
                          placeholder="Enter new password"
                          style={{ paddingRight: 'var(--space-xl)' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowResetPassword(!showResetPassword)}
                          style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-sub)', padding: '5px', display: 'flex', opacity: 0.6, transition: 'opacity 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
                        >
                          {showResetPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}><Lock size={13} /> Confirm New Password <span className="mandatory">*</span></label>
                      <div style={{ position: 'relative' }}>
                        <input
                          value={resetForm.confirmPassword}
                          onChange={(e) => setResetForm({ ...resetForm, confirmPassword: e.target.value })}
                          type={showResetConfirmPassword ? 'text' : 'password'}
                          placeholder="Repeat new password"
                          style={{ paddingRight: 'var(--space-xl)' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                          style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-sub)', padding: '5px', display: 'flex', opacity: 0.6, transition: 'opacity 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
                        >
                          {showResetConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <button onClick={handleResetPassword} className="btn-primary" style={{ marginTop: '0.5rem' }}>Reset Password</button>
                  </div>
                ) : !isRegistering ? (
                  <div>
                    <div className="auth-logo" style={{ display: 'none' }}>
                      <img src="/AR LOGO.png" alt="Company Logo" />
                    </div>
                    <h2 style={{ fontSize: 'var(--fs-xl)', fontWeight: 800, marginBottom: 'var(--space-xs)', letterSpacing: '-0.02em' }}>Welcome Back</h2>
                    <p className="subtitle">Sign in to your account to continue</p>
                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}><Users size={13} /> Username <span className="mandatory">*</span></label>
                      <input
                        ref={loginUsernameRef}
                        value={loginForm.username}
                        onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                        type="text"
                        placeholder="Enter your username"
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        disabled={isLoggingIn}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}><Lock size={13} /> Password <span className="mandatory">*</span></label>
                      <div style={{ position: 'relative' }}>
                        <input
                          value={loginForm.password}
                          onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                          type={showLoginPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                          disabled={isLoggingIn}
                          style={{ paddingRight: 'var(--space-xl)' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-sub)', padding: '5px', display: 'flex', opacity: 0.6, transition: 'opacity 0.15s' }}
                          disabled={isLoggingIn}
                          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
                        >
                          {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer', fontSize: 'var(--fs-base)', color: 'var(--text-sub)', fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--accent)', borderRadius: 'var(--radius-sm)' }}
                        />
                        Remember Me
                      </label>
                      <a onClick={() => setIsForgotPassword(true)} style={{ fontSize: 'var(--fs-base)', color: 'var(--accent)', cursor: 'pointer', fontWeight: 700, transition: 'opacity 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                      >Forgot Password?</a>
                    </div>

                    <button onClick={handleLogin} className="btn-primary" disabled={isLoggingIn} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-sm)' }}>
                      {isLoggingIn && (
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ display: 'flex' }}><Clock size={18} /></motion.div>
                      )}
                      <span>{isLoggingIn ? 'Signing In...' : 'Sign In'}</span>
                    </button>

                    <div style={{ position: 'relative', marginTop: 'var(--space-lg)', textAlign: 'center' }}>
                      <div style={{ borderTop: '1px solid var(--border)', marginBottom: 'var(--space-md)' }} />
                      <p className="auth-footer" style={{ marginTop: '-0.5rem' }}>
                        Don't have an account?{' '}
                        <a onClick={() => setIsRegistering(true)}>Create account</a>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <button className="btn-ghost-small" onClick={() => setIsRegistering(false)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', color: 'var(--text-sub)', marginBottom: 'var(--space-md)' }}><ChevronLeft size={16} /> Back to Login</button>
                    <h2 style={{ fontSize: 'var(--fs-xl)', fontWeight: 800, marginBottom: 'var(--space-xs)', letterSpacing: '-0.02em' }}>Create Account</h2>
                    <p className="subtitle">Join the ARPL Approval platform</p>

                    <section className="form-section">
                      <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><Key size={14} /> Account Credentials</h3>
                      <div className="form-grid auth-grid">
                        <div className="form-group">
                          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}><Users size={13} /> Username <span className="mandatory">*</span></label>
                          <input
                            value={registerForm.username}
                            onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                            type="text"
                            placeholder="Choose a username"
                          />
                          {registerErrors.username && <p className="error-message">{registerErrors.username}</p>}
                        </div>
                        <div className="form-group">
                          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}><Briefcase size={13} /> Domain <span className="mandatory">*</span></label>
                          <select
                            value={registerForm.domain}
                            onChange={(e) => setRegisterForm({ ...registerForm, domain: e.target.value })}
                          >
                            <option value="Architecture">Architecture</option>
                            <option value="Structures">Structures</option>
                            <option value="EM">EM</option>
                            <option value="NVH">NVH</option>
                            <option value="E&E">E&E</option>
                            <option value="Purchase">Purchase</option>
                            <option value="Business">Business</option>
                            <option value="Quality">Quality</option>
                            <option value="Stores">Stores</option>
                            <option value="Validation">Validation</option>
                            <option value="Prototyping">Prototyping</option>
                            <option value="Production">Production</option>
                            <option value="Thermal">Thermal</option>
                            <option value="Program">Program</option>
                            <option value="Engineering">Engineering</option>
                            <option value="Electrical">Electrical</option>
                            <option value="Technology">Technology</option>
                            <option value="Mechanical Engineering">Mechanical Engineering</option>
                          </select>
                          {registerErrors.domain && <p className="error-message">{registerErrors.domain}</p>}
                        </div>
                        <div className="form-group">
                          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}><FileText size={13} /> Full Name <span className="mandatory">*</span></label>
                          <input
                            value={registerForm.fullName}
                            onChange={(e) => setRegisterForm({ ...registerForm, fullName: e.target.value })}
                            type="text"
                            placeholder="Enter your full name"
                          />
                          {registerErrors.fullName && <p className="error-message">{registerErrors.fullName}</p>}
                        </div>
                        <div className="form-group span-2" style={{ alignItems: 'flex-start' }}>
                          <label style={{ paddingTop: 'var(--space-sm)', fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Assign Roles <span className="mandatory">*</span></label>
                          <div className="multi-select-container">
                            <div className="selected-chips">
                              {registerForm.roles.length > 0 ? registerForm.roles.map(role => (
                                <span key={role} className="pill-badge accent">
                                  {role} <X size={10} style={{ cursor: 'pointer', opacity: 0.8 }} onClick={() => setRegisterForm({ ...registerForm, roles: registerForm.roles.filter(r => r !== role) })} />
                                </span>
                              )) : <span className="empty-roles">No roles selected</span>}
                            </div>
                            <button
                              className="btn-ghost-small roles-toggle"
                              onClick={() => setShowRoleSelection(!showRoleSelection)}
                            >
                              {showRoleSelection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              {showRoleSelection ? 'Close Selection' : 'Select Roles'}
                            </button>
                            <AnimatePresence>
                              {showRoleSelection && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="roles-grid"
                                >
                                  {AVAILABLE_ROLES.map(role => (
                                    <label key={role} className={`role-option ${registerForm.roles.includes(role) ? 'selected' : ''}`}>
                                      <input
                                        type="checkbox"
                                        checked={registerForm.roles.includes(role)}
                                        onChange={(e) => {
                                          const updated = e.target.checked
                                            ? [...registerForm.roles, role]
                                            : registerForm.roles.filter(r => r !== role);
                                          setRegisterForm({ ...registerForm, roles: updated });
                                        }}
                                        style={{ display: 'none' }}
                                      />
                                      <span className={`role-checkbox ${registerForm.roles.includes(role) ? 'checked' : ''}`}>
                                        {registerForm.roles.includes(role) && '✓'}
                                      </span>
                                      {role}
                                    </label>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                            {registerErrors.roles && <p className="error-message">{registerErrors.roles}</p>}
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="form-section">
                      <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><ShieldCheck size={14} /> Security & Recovery</h3>
                      <div className="form-grid auth-grid">
                        <div className="form-group">
                          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}><HelpCircle size={13} /> Security Question <span className="mandatory">*</span></label>
                          <select
                            value={registerForm.securityQuestion}
                            onChange={(e) => setRegisterForm({ ...registerForm, securityQuestion: e.target.value })}
                          >
                            <option value="What was your first pet's name?">What was your first pet's name?</option>
                            <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                            <option value="What was the name of your elementary school?">What was your elementary school?</option>
                            <option value="In what city were you born?">In what city were you born?</option>
                          </select>
                          {registerErrors.securityQuestion && <p className="error-message">{registerErrors.securityQuestion}</p>}
                        </div>
                        <div className="form-group">
                          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}><Key size={13} /> Security Answer <span className="mandatory">*</span></label>
                          <input
                            value={registerForm.securityAnswer}
                            onChange={(e) => setRegisterForm({ ...registerForm, securityAnswer: e.target.value })}
                            type="text"
                            placeholder="Enter your answer"
                          />
                          {registerErrors.securityAnswer && <p className="error-message">{registerErrors.securityAnswer}</p>}
                        </div>
                        <div className="form-group">
                          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}><Lock size={13} /> Password <span className="mandatory">*</span></label>
                          <div style={{ position: 'relative' }}>
                            <input
                              value={registerForm.password}
                              onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Create a strong password"
                              style={{ paddingRight: 'var(--space-xl)' }}
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="eye-toggle">
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                          {registerErrors.password && <p className="error-message">{registerErrors.password}</p>}
                        </div>
                        <div className="form-group">
                          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}><Lock size={13} /> Confirm Password <span className="mandatory">*</span></label>
                          <div style={{ position: 'relative' }}>
                            <input
                              value={registerForm.confirmPassword}
                              onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                              type={showConfirmPassword ? 'text' : 'password'}
                              placeholder="Repeat your password"
                              style={{ paddingRight: 'var(--space-xl)' }}
                            />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="eye-toggle">
                              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                          {registerErrors.confirmPassword && <p className="error-message">{registerErrors.confirmPassword}</p>}
                        </div>
                        <div className="password-strength-row span-2">
                          <div className="password-strength-indicator">
                            {[1, 2, 3, 4, 5].map(level => (
                              <div key={level} className={`strength-bar ${getPasswordStrength(registerForm.password) >= level ? (level < 3 ? 'weak' : 'strong') : ''}`} />
                            ))}
                          </div>
                          {registerForm.password && (
                            <span className="strength-label">
                              {getPasswordStrength(registerForm.password) <= 2 ? 'Weak' : getPasswordStrength(registerForm.password) <= 3 ? 'Fair' : getPasswordStrength(registerForm.password) <= 4 ? 'Good' : 'Strong'}
                            </span>
                          )}
                        </div>
                      </div>
                    </section>
                    <button onClick={handleRegister} className="btn-primary" style={{ marginTop: 'var(--space-md)' }}>Create Account</button>
                    <div style={{ position: 'relative', marginTop: 'var(--space-lg)', textAlign: 'center' }}>
                      <div style={{ borderTop: '1px solid var(--border)', marginBottom: 'var(--space-md)' }} />
                      <p className="auth-footer" style={{ marginTop: '-0.5rem' }}>Already have an account? <a onClick={() => setIsRegistering(false)}>Login</a></p>
                    </div>
                  </div>
                )}
              </motion.div>
          </div>
        </div>
      ) : (
        <div className={`dashboard-layout ${isSidebarCollapsed ? 'sidebar-minified' : ''}`}>
          <aside
            className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}
            style={{ backdropFilter: 'blur(12px)', backgroundColor: 'rgba(var(--bg-card-rgb), 0.8)' }}
          >
            <div className="sidebar-header">
              <div className="logo-box">
                <img src="/AR LOGO.png" alt="Logo" className="logo-icon" />
                {!isSidebarCollapsed && <span className="logo-text" style={{ fontWeight: 700, letterSpacing: '-0.02em' }}>ARPL Dashboard</span>}
              </div>
              <button
                className="sidebar-toggle"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <motion.div
                  animate={{ rotate: isSidebarCollapsed ? 180 : 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <ChevronLeft size={18} />
                </motion.div>
              </button>
            </div>

            {!isSidebarCollapsed && <div className="sidebar-section-label">Main Menu</div>}

            <motion.nav
              className="nav-menu"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.05 } } }}
            >
              {checkAccess('po_prototype', 'view') && (
                <motion.button
                  variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.96 }}
                  className={`nav-item ${currentPage === 'po' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('po')}
                  title="Purchase Request - Proto"
                >
                  {currentPage === 'po' && <motion.div layoutId="sidebar-active" className="active-pill" />}
                  <Package size={20} className="nav-icon" />
                  {!isSidebarCollapsed && <span>Purchase Request - Proto</span>}
                  {sidebarBadges.po > 0 && (
                    <span className={`nav-badge ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                      {sidebarBadges.po}
                    </span>
                  )}
                </motion.button>
              )}

              {checkAccess('po_production', 'view') && (
                <motion.button
                  variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.96 }}
                  className={`nav-item ${currentPage === 'po_production' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('po_production')}
                  title="Purchase Request - Production"
                >
                  {currentPage === 'po_production' && <motion.div layoutId="sidebar-active" className="active-pill" />}
                  <Briefcase size={20} className="nav-icon" />
                  {!isSidebarCollapsed && <span>Purchase Request - Production</span>}
                  {sidebarBadges.po_production > 0 && (
                    <span className={`nav-badge ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                      {sidebarBadges.po_production}
                    </span>
                  )}
                </motion.button>
              )}

              {checkAccess('program_management', 'view') && (
                <motion.button
                  variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.96 }}
                  className={`nav-item ${currentPage === 'program' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('program')}
                  title="Program Management"
                >
                  {currentPage === 'program' && <motion.div layoutId="sidebar-active" className="active-pill" />}
                  <LayoutDashboard size={20} className="nav-icon" />
                  {!isSidebarCollapsed && <span>Programs</span>}
                  {sidebarBadges.program > 0 && (
                    <span className={`nav-badge ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                      {sidebarBadges.program}
                    </span>
                  )}
                </motion.button>
              )}

              {checkAccess('motor_traceability', 'view') && (
                <motion.button
                  variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.96 }}
                  className={`nav-item ${currentPage === 'motor_traceability' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('motor_traceability')}
                  title="Part Traceability"
                >
                  {currentPage === 'motor_traceability' && <motion.div layoutId="sidebar-active" className="active-pill" />}
                  <Wrench size={20} className="nav-icon" />
                  {!isSidebarCollapsed && <span>Part Traceability</span>}
                  {sidebarBadges.motor_traceability > 0 && (
                    <span className={`nav-badge ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                      {sidebarBadges.motor_traceability}
                    </span>
                  )}
                </motion.button>
              )}

              {checkAccess('eol_reports', 'view') && (
              <motion.button
                variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.96 }}
                className={`nav-item ${currentPage === 'eol_reports' ? 'active' : ''}`}
                onClick={() => setCurrentPage('eol_reports')}
                title="EOL & PDI Reports"
              >
                {currentPage === 'eol_reports' && <motion.div layoutId="sidebar-active" className="active-pill" />}
                <FileText size={20} className="nav-icon" />
                {!isSidebarCollapsed && <span>EOL & PDI Reports</span>}
                {sidebarBadges.eol_reports > 0 && (
                  <span className={`nav-badge ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                    {sidebarBadges.eol_reports}
                  </span>
                )}
              </motion.button>
              )}
            </motion.nav>


          </aside>

          <main className="main-content">
            <header className="top-bar">
              <div className="breadcrumb">
                <span className="bc-root">Management</span>
                <ChevronRight size={14} className="bc-sep" />
                <span className="bc-current">{pageTitle}</span>
              </div>
              <div className="header-actions">
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 15 }}
                  whileTap={{ scale: 0.9 }}
                  className="theme-toggle"
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                >
                  {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                </motion.button>

                {(currentUserInfo.roles || []).includes('Developer') && (
                  <ThemeToggleButton onClick={() => setShowThemeConfigurator(true)} />
                )}
                <ThemeConfigurator isOpen={showThemeConfigurator} onClose={() => setShowThemeConfigurator(false)} />
                {(currentUserInfo.roles || []).some(r => ['Administrator', 'Developer', 'Program Admin', 'Program Owner', 'Program Head'].includes(r)) && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="header-action-btn"
                    onClick={() => { setCurrentPage('program'); setActiveProgramTab('users'); }}
                    title="User Approvals"
                  >
                    <Users size={18} />
                    {registeredUsers.filter(u => !u.isApproved).length > 0 && (
                      <span className="notification-unread-badge approvals-badge">{registeredUsers.filter(u => !u.isApproved).length}</span>
                    )}
                  </motion.button>
                )}

                <div className="notification-wrapper">
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="header-action-btn" onClick={() => setShowNotificationPanel(!showNotificationPanel)}>
                    <Bell size={18} />
                    <span
                      className={`notif-status-dot ${notifStatus}`}
                      title={
                        notifStatus === 'granted' ? 'Desktop notifications enabled' :
                        notifStatus === 'denied' ? 'Desktop notifications blocked' :
                        notifStatus === 'default' ? 'Click to enable desktop notifications' :
                        notifStatus === 'unsupported' ? 'Desktop notifications not supported' : ''
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        if (notifStatus === 'denied') {
                          showToast('Enable notifications in your browser settings (Site Settings > Notifications)', 'info');
                        } else if (notifStatus === 'default' || notifStatus === 'loading') {
                          Notification.requestPermission().then(p => {
                            setNotifStatus(p);
                            if (p === 'granted') setupPushNotifications();
                          });
                        }
                      }}
                    />
                    {unreadCount > 0 && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="notification-unread-badge">
                        {unreadCount}
                      </motion.span>
                    )}
                  </motion.button>
                  {showNotificationPanel && (
                    <motion.div
                      initial={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(4px)" }}
                      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="notification-panel card"
                    >
                      <div className="panel-header">
                        <span>Notifications</span>
                        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                          <button className="btn-ghost-small" onClick={markAllAsRead}>Mark all read</button>
                          <button className="btn-ghost-small destructive" onClick={clearAllNotifications}>Clear</button>
                        </div>
                      </div>
                      <div className="notification-list">
                        {notifications.filter(n => n.userId === loginForm.username || (currentUserInfo.roles || []).includes(n.userId)).length > 0 ? (
                          notifications.filter(n => n.userId === loginForm.username || (currentUserInfo.roles || []).includes(n.userId)).map(n => (
                            <div
                              key={n.id}
                              className={`notification-item ${!n.isRead ? 'unread' : ''}`}
                              onClick={() => handleNotificationClick(n)}
                            >
                              <p>{n.message}</p>
                              <small>{new Date(n.time).toLocaleTimeString()}</small>
                            </div>
                          ))
                        ) : <p className="empty-msg">No new notifications</p>}
                      </div>
                    </motion.div>
                  )}
                </div>
                <motion.div
                  whileHover={{ backgroundColor: 'rgba(var(--text-rgb), 0.05)' }}
                  className="user-badge"
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                >
                  <div className="avatar">
                    {(currentUserInfo.fullName || currentUserInfo.username || 'U').split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="user-info-text">
                    <span className="user-name">{currentUserInfo.fullName || currentUserInfo.username}</span>
                    <span className="user-role">{currentUserInfo.roles?.slice(0, 2).join(', ')}{currentUserInfo.roles?.length > 2 ? '...' : ''}</span>
                    <span className="user-domain">{currentUserInfo.domain}</span>
                  </div>
                  <motion.div
                    animate={{ rotate: showProfileDropdown ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="dropdown-chevron"
                  >
                    <ChevronDown size={14} />
                  </motion.div>
                  <AnimatePresence>
                    {showProfileDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="profile-dropdown"
                      >
                        <div className="dropdown-header">
                          <div className="dropdown-avatar">
                            {(currentUserInfo.fullName || currentUserInfo.username || 'U').split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="dropdown-name">{currentUserInfo.fullName || currentUserInfo.username}</div>
                            <div className="dropdown-role">{currentUserInfo.roles?.join(', ') || 'No roles'}</div>
                          </div>
                        </div>
                        <div className="dropdown-divider" />
                        <button className="dropdown-item" onClick={() => openProfileModal('view')}>
                          <Eye size={15} /> View Profile
                        </button>
                        <button className="dropdown-item" onClick={() => openProfileModal('edit')}>
                          <Settings size={15} /> Edit Profile
                        </button>
                        <div className="dropdown-divider" />
                        <button className="dropdown-item logout-item" onClick={logout}>
                          <LogOut size={15} /> Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            </header>

            <motion.section
              key={currentPage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="content-body"
              style={{ padding: 'var(--space-lg) var(--space-xl)' }}
            >
              {currentPage === 'po' && (
                <PurchaseOrder
                  programs={programs}
                  workOrders={workOrders}
                  registeredUsers={registeredUsers}
                  currentUser={currentUserInfo}
                  poRequests={poRequests}
                  setPoRequests={setPoRequests}
                  handleWorkflowAction={handleWorkflowAction}
                  addNotification={addNotification}
                  showToast={showToast}
                  generateRefId={generateRefId}
                  syncToDisk={syncToDisk}
                  handleFilePreview={handleFilePreview}
                  handleFileDownload={handleFileDownload}
                  handleExportPDF={handleExportPDF}
                  loginForm={loginForm}
                  setReviewingRequest={setReviewingRequest}
                  reviewingRequest={reviewingRequest}
                  setViewingRequestDetails={setViewingRequestDetails}
                  viewingRequestDetails={viewingRequestDetails}
                  previewFile={previewFile}
                  setPreviewFile={setPreviewFile}
                  setCurrentPage={setCurrentPage}
                  setActiveProgramTab={setActiveProgramTab}
                  vendors={vendors}
                  setVendors={setVendors}
                  parts={parts}
                  setParts={setParts}
                />
              )}

              {currentPage === 'po_production' && (
                <PurchaseOrderProduction
                  programs={programs}
                  workOrders={workOrders}
                  registeredUsers={registeredUsers}
                  currentUser={currentUserInfo}
                  poRequests={poRequests}
                  setPoRequests={setPoRequests}
                  handleWorkflowAction={handleWorkflowAction}
                  addNotification={addNotification}
                  showToast={showToast}
                  generateRefId={generateRefId}
                  syncToDisk={syncToDisk}
                  handleFilePreview={handleFilePreview}
                  handleFileDownload={handleFileDownload}
                  handleExportPDF={handleExportPDF}
                  readOnly={!checkAccess('po_production', 'full')}
                />
              )}

              {currentPage === 'program' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-view module-shell">
                  <div className="sub-navigation po-sub-nav">
                    <button className={activeProgramTab === 'programs' ? 'active' : ''} onClick={() => setActiveProgramTab('programs')}><LayoutDashboard size={16} /> Programs List</button>
                    <button className={activeProgramTab === 'workorders' ? 'active' : ''} onClick={() => setActiveProgramTab('workorders')}><FileText size={16} /> Work Orders</button>
                    {checkAccess('monthly_planning', 'view') && (
                      <button className={activeProgramTab === 'planning' ? 'active' : ''} onClick={() => setActiveProgramTab('planning')}><Calendar size={16} /> Monthly Planning</button>
                    )}
                    {checkAccess('user_management') && (
                      <button className={activeProgramTab === 'users' ? 'active' : ''} onClick={() => setActiveProgramTab('users')}><Users size={16} /> Users</button>
                    )}
                    {(currentUserInfo.roles || []).some(r => ['Administrator', 'Developer'].includes(r)) && (
                      <button className={activeProgramTab === 'access' ? 'active' : ''} onClick={() => setActiveProgramTab('access')}><ShieldCheck size={16} /> Access Control</button>
                    )}
                  </div>

                  {activeProgramTab === 'programs' && (
                    <>
                      <FilterSection
                        show={showProgramFilters}
                        onToggle={() => setShowProgramFilters(!showProgramFilters)}
                        label="Program Filters"
                        activeCount={[programFilters.search, programFilters.category, programFilters.platform].filter(Boolean).length}
                        onClear={() => setProgramFilters({ search: '', category: '', platform: '' })}
                      >
                        <FilterInput
                          placeholder="Search name..."
                          value={programFilters.search}
                          onChange={(e) => setProgramFilters({ ...programFilters, search: e.target.value })}
                        />
                        <FilterSelect
                          value={programFilters.category}
                          onChange={(e) => setProgramFilters({ ...programFilters, category: e.target.value })}
                        >
                          <option value="">All Categories</option>
                          {[...new Set(programs.map(p => p.category))].map(c => <option key={c} value={c}>{c}</option>)}
                        </FilterSelect>
                        <FilterSelect
                          value={programFilters.platform}
                          onChange={(e) => setProgramFilters({ ...programFilters, platform: e.target.value })}
                        >
                          <option value="">All Platforms</option>
                          {[...new Set(programs.map(p => p.platform))].map(pl => <option key={pl} value={pl}>{pl}</option>)}
                        </FilterSelect>
                      </FilterSection>

                      <div className="stats-grid" style={{ marginBottom: 'var(--space-lg)' }}>
                        <div className="stat-card">
                          <span className="stat-label">Total Programs</span>
                          <div className="stat-value">{programSummaryStats.total}</div>
                        </div>
                        <div className="stat-card">
                          <span className="stat-label">Active Categories</span>
                          <div className="stat-value">{programSummaryStats.categories}</div>
                        </div>
                        <div className="stat-card">
                          <span className="stat-label">Platform Variants</span>
                          <div className="stat-value">{programSummaryStats.platforms}</div>
                        </div>
                      </div>

                      <div className="action-bar" style={{ marginBottom: 'var(--space-lg)', display: 'flex', justifyContent: 'flex-end' }}>
                        {!showProgramForm && (currentUserInfo.roles || []).some(r => ['Administrator', 'Program Owner', 'Program Head'].includes(r)) && (
                          <button className="btn-primary" style={{ width: 'auto' }} onClick={() => setShowProgramForm(true)}>+ Create New Program</button>
                        )}
                      </div>

                      {showProgramForm && (
                        <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                          <div className="card-header gradient">
                            <div>
                              <h3 style={{ margin: 0, fontSize: 'var(--fs-lg)', fontWeight: '700', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                <FileText size={20} color="var(--accent)" /> {editProgramId ? 'Edit Program' : 'New Program Details'}
                              </h3>
                              <p style={{ margin: 'var(--space-xs) 0 0 0', fontSize: 'var(--fs-base)', color: 'var(--text-sub)' }}>Define program scope, ownership, and platform specifications</p>
                            </div>
                          </div>
<div className="card-body" style={{ padding: 'var(--space-lg) var(--space-lg) 0' }}>
                             <div className="form-grid">
                             <div className="form-group span-3">
                               <label>Program Name</label>
                              <input value={programForm.name} onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })} type="text" placeholder="Enter program name" />
                            </div>
                            <div className="form-group">
                              <label>Program Owner</label>
                              <select value={programForm.owner} onChange={(e) => setProgramForm({ ...programForm, owner: e.target.value })}>
                                <option value="">-- Select Owner --</option>
                                {registeredUsers.filter(u => (u.roles || []).some(r => r === 'Program Owner' || r === 'Program Head')).map((u, idx) => (
                                  <option key={idx} value={u.username}>{u.fullName} ({(u.roles || []).join(', ')})</option>
                                ))}
                              </select>
                            </div>
                            <div className="form-group">
                              <label>Program Admin</label>
                              <input value={programForm.admin} readOnly style={{ background: 'var(--bg)', cursor: 'not-allowed', opacity: 0.8 }} />
                            </div>
                            <div className="form-group">
                              <label>Category</label>
                              <select value={['Motor', 'Controller', 'Gearbox'].includes(programForm.category) ? programForm.category : 'Other'} onChange={(e) => setProgramForm({ ...programForm, category: e.target.value })}>
                                <option value="Motor">Motor</option>
                                <option value="Controller">Controller</option>
                                <option value="Gearbox">Gearbox</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                            <div className="form-group">
                              <label>Platform</label>
                              <select value={['Platform T', 'Platform F', 'Platform M', 'Platform L', 'Platform H'].includes(programForm.platform) ? programForm.platform : 'Other'} onChange={(e) => setProgramForm({ ...programForm, platform: e.target.value })}>
                                <option value="Platform T">Platform T</option>
                                <option value="Platform F">Platform F</option>
                                <option value="Platform M">Platform M</option>
                                <option value="Platform L">Platform L</option>
                                <option value="Platform H">Platform H</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                            {!['Motor', 'Controller', 'Gearbox'].includes(programForm.category) && (
                              <div className="form-group">
                                <label>Specify Category <span className="mandatory">*</span></label>
                                <input value={programForm.category === 'Other' ? '' : programForm.category} onChange={(e) => setProgramForm({ ...programForm, category: e.target.value })} type="text" placeholder="Type custom category" />
                              </div>
                            )}
                            {!['Platform T', 'Platform F', 'Platform M', 'Platform L', 'Platform H'].includes(programForm.platform) && (
                              <div className="form-group">
                                <label>Specify Platform <span className="mandatory">*</span></label>
                                <input value={programForm.platform === 'Other' ? '' : programForm.platform} onChange={(e) => setProgramForm({ ...programForm, platform: e.target.value })} type="text" placeholder="Type custom platform" />
                              </div>
                            )}
                          </div>
                          <div className="form-actions" style={{ display: 'flex', gap: 'var(--space-md)' }}>
                            <button className="btn-primary" style={{ width: 'auto' }} onClick={handleSaveProgram}>{editProgramId ? 'Update Program' : 'Save Program'}</button>
                            <button className="btn-small" onClick={resetProgramForm}>Cancel</button>
                          </div>
                        </div>
                        </div>
                      )}

                      <div className="card table-container">
                        <div className="card-header gradient">
                          <div>
                            <h3 style={{ margin: 0, fontSize: 'var(--fs-lg)', fontWeight: '700', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                              <FileText size={20} color="var(--accent)" /> Program Master List
                            </h3>
                            <p style={{ margin: 'var(--space-xs) 0 0 0', fontSize: 'var(--fs-base)', color: 'var(--text-sub)' }}>All registered programs and their configurations</p>
                          </div>
                        </div>
                        <table className="enterprise-table">
                          <thead>
                            <tr>
                              <th>Program Name</th>
                              <th>Category</th>
                              <th>Platform</th>
                              <th>Owner</th>
                              <th className="text-center">Work Orders</th>
                              <th className="text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredProgramsList.map(program => {
                              const woCount = workOrders.filter(wo => String(wo.programId) === String(program.id)).length;
                              return (
                                <tr key={program.id}>
                                  <td style={{ fontWeight: '700' }}>{program.name}</td>
                                  <td><span className="pill-badge blue">{program.category}</span></td>
                                  <td>{program.platform}</td>
                                  <td>{program.owner}</td>
                                  <td className="text-center">
                                    <span className="pill-badge" style={{ background: 'var(--bg-subtle)', color: 'var(--text)' }}>{woCount}</span>
                                  </td>
                                  <td className="text-right">
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                      {(currentUserInfo.roles || []).some(r => ['Administrator', 'Program Owner', 'Program Head'].includes(r)) && (
                                        <>
                                          <button className="btn-small" onClick={() => handleEditProgram(program)}>Edit</button>
                                          <button className="btn-small destructive" onClick={() => handleDeleteProgram(program.id)}>Delete</button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {filteredProgramsList.length === 0 && <p className="empty-msg" style={{ padding: 'var(--space-xl)' }}>No programs found matching your criteria.</p>}
                      </div>
                    </>
                  )}

                  {activeProgramTab === 'workorders' && (
                    <>
                      <FilterSection
                        show={showWorkOrderFilters}
                        onToggle={() => setShowWorkOrderFilters(!showWorkOrderFilters)}
                        label="Work Order Filters"
                        activeCount={[workOrderFilters.search, workOrderFilters.programId, workOrderFilters.type, workOrderFilters.stage].filter(Boolean).length}
                        onClear={() => setWorkOrderFilters({ search: '', programId: '', type: '', stage: '' })}
                      >
                        <FilterInput
                          placeholder="Search title..."
                          value={workOrderFilters.search}
                          onChange={(e) => setWorkOrderFilters({ ...workOrderFilters, search: e.target.value })}
                        />
                        <FilterSelect
                          value={workOrderFilters.programId}
                          onChange={(e) => setWorkOrderFilters({ ...workOrderFilters, programId: e.target.value })}
                        >
                          <option value="">All Programs</option>
                          {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </FilterSelect>
                        <FilterSelect
                          value={workOrderFilters.type}
                          onChange={(e) => setWorkOrderFilters({ ...workOrderFilters, type: e.target.value })}
                        >
                          <option value="">All Types</option>
                          <option value="Customer">Customer</option>
                          <option value="Internal">Internal</option>
                        </FilterSelect>
                        <FilterSelect
                          value={workOrderFilters.stage}
                          onChange={(e) => setWorkOrderFilters({ ...workOrderFilters, stage: e.target.value })}
                        >
                          <option value="">All Stages</option>
                          <option value="Sample A">Sample A</option>
                          <option value="Sample B">Sample B</option>
                          <option value="Sample C">Sample C</option>
                          <option value="Sample D">Sample D</option>
                        </FilterSelect>
                      </FilterSection>

                      <div className="action-bar" style={{ marginBottom: 'var(--space-lg)', display: 'flex', justifyContent: 'flex-end' }}>
                        {!showWorkOrderForm && (currentUserInfo.roles || []).some(r => ['Administrator', 'Program Owner', 'Program Head'].includes(r)) && (
                          <button className="btn-primary" style={{ width: 'auto' }} onClick={() => setShowWorkOrderForm(true)}>+ Create New Work Order</button>
                        )}
                      </div>

                      {showWorkOrderForm && (
                        <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                          <div className="card-header gradient">
                            <div>
                              <h3 style={{ margin: 0, fontSize: 'var(--fs-lg)', fontWeight: '700', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                <FileText size={20} color="var(--accent)" /> {editWorkOrderId ? 'Edit Work Order' : 'New Work Order Details'}
                              </h3>
                              <p style={{ margin: 'var(--space-xs) 0 0 0', fontSize: 'var(--fs-base)', color: 'var(--text-sub)' }}>Create and manage production work orders with detailed specifications</p>
                            </div>
                          </div>
<div className="card-body" style={{ padding: 'var(--space-lg) var(--space-lg) 0' }}>
                             <div className="form-grid">
                             <div className="form-group span-3">
                               <label>Work Order Title</label>
                              <input value={workOrderForm.title} onChange={(e) => setWorkOrderForm({ ...workOrderForm, title: e.target.value })} type="text" placeholder="Enter title" />
                            </div>
                            <div className="form-group">
                              <label>Select Program</label>
                              <select value={workOrderForm.programId} onChange={(e) => setWorkOrderForm({ ...workOrderForm, programId: e.target.value })}>
                                <option value="">-- Choose Program --</option>
                                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                            </div>
                            <div className="form-group">
                              <label>Type</label>
                              <select value={workOrderForm.type} onChange={(e) => setWorkOrderForm({ ...workOrderForm, type: e.target.value })}>
                                <option value="Customer">Customer</option>
                                <option value="Internal">Internal</option>
                              </select>
                            </div>
                            <div className="form-group">
                              <label>Budget Code</label>
                              <input value={workOrderForm.budgetCode} onChange={(e) => setWorkOrderForm({ ...workOrderForm, budgetCode: e.target.value })} type="text" placeholder="Enter code" />
                            </div>
                            <div className="form-group">
                              <label>Sample Stage</label>
                              <select value={workOrderForm.stage} onChange={(e) => setWorkOrderForm({ ...workOrderForm, stage: e.target.value })}>
                                <option value="Sample A">Sample A</option>
                                <option value="Sample B">Sample B</option>
                                <option value="Sample C">Sample C</option>
                                <option value="Sample D">Sample D</option>
                              </select>
                            </div>
                          </div>

                          <div style={{ padding: '0 var(--space-lg)', marginTop: 'var(--space-lg)' }}>
                            <h4 style={{ fontSize: 'var(--fs-base)', color: 'var(--text-sub)', marginBottom: 'var(--space-md)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Items (Model & Part Details)</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                              {workOrderForm.items.map((item, idx) => (
                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.5fr 40px', gap: 'var(--space-md)', alignItems: 'end', background: 'var(--bg-subtle)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                  <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ flex: 'none', width: 'auto', marginBottom: 'var(--space-xs)', fontSize: 'var(--fs-sm)' }}>Model No.</label>
                                    <input value={item.modelNumber} onChange={(e) => updateWOItem(idx, 'modelNumber', e.target.value)} type="text" placeholder="Model #" />
                                  </div>
                                  <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ flex: 'none', width: 'auto', marginBottom: 'var(--space-xs)', fontSize: 'var(--fs-sm)' }}>Part No.</label>
                                    <input value={item.partNumber} onChange={(e) => updateWOItem(idx, 'partNumber', e.target.value)} type="text" placeholder="Part #" />
                                  </div>
                                  <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ flex: 'none', width: 'auto', marginBottom: 'var(--space-xs)', fontSize: 'var(--fs-sm)' }}>Qty</label>
                                    <input value={item.qty} onChange={(e) => updateWOItem(idx, 'qty', e.target.value)} type="number" min="1" />
                                  </div>
                                  <button onClick={() => removeWOItemRow(idx)} style={{ background: 'none', border: 'none', color: 'var(--rose-text)', cursor: 'pointer', paddingBottom: 'var(--space-sm)' }} title="Remove Item"><Trash2 size={18} /></button>
                                </div>
                              ))}
                              <button onClick={addWOItemRow} className="btn-small" style={{ alignSelf: 'flex-start', borderStyle: 'dashed' }}>+ Add Item (Model/Part)</button>
                            </div>
                          </div>

                          <div className="form-grid" style={{ marginTop: 'var(--space-md)' }}>
                            {workOrderForm.type === 'Customer' && (
                              <>
                                <div className="form-group">
                                  <label>Customer Name <span className="mandatory">*</span></label>
                                  <input
                                    value={workOrderForm.customerName}
                                    onChange={(e) => setWorkOrderForm({ ...workOrderForm, customerName: e.target.value })}
                                    type="text"
                                    placeholder="Enter customer name"
                                  />
                                </div>
                                <div className="form-group">
                                  <label>Upload PO</label>
                                  <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                                    <input type="file" onChange={handleWOFileChange} id="wo-po-upload" style={{ display: 'none' }} />
                                    <button className="btn-small" onClick={() => document.getElementById('wo-po-upload').click()} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', justifyContent: 'center' }}>
                                      <FileUp size={16} /> {workOrderForm.poFileName ? 'Change PO' : 'Upload PO'}
                                    </button>
                                  </div>
                                  {workOrderForm.poFileName && <div style={{ fontSize: 'var(--fs-base)', color: 'var(--emerald-text)', marginTop: 'var(--space-xs)' }}>✓ {workOrderForm.poFileName}</div>}
                                </div>
                                <div className="form-group span-3">
                                  <label>PO Comments</label>
                                  <textarea value={workOrderForm.poComments} onChange={(e) => setWorkOrderForm({ ...workOrderForm, poComments: e.target.value })} placeholder="Enter PO related comments..." rows="2" style={{ width: '100%', padding: 'var(--space-sm) var(--space-md)', fontSize: 'var(--fs-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
                                </div>
                              </>
                            )}
                          </div>
                          <div className="form-actions" style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
                            <button className="btn-primary" style={{ width: 'auto' }} onClick={handleSaveWorkOrder}>{editWorkOrderId ? 'Update Order' : 'Save Work Order'}</button>
                            <button className="btn-small" onClick={resetWorkOrderForm}>Cancel</button>
                          </div>
                          </div>
                        </div>
                      )}

                      <div className="workorder-list">
                        {filteredWorkOrders.map(wo => {
                          const linkedProgram = programs.find(p => p.id === wo.programId);
                          return (
                            <div key={wo.id} className="card program-item">
                              <div className="program-info">
                                <h3>{wo.title}</h3>
                                <p>Program: <strong>{linkedProgram?.name || 'Unknown'}</strong> • Type: {wo.type}</p>
                                <div className="program-meta">
                                  Quantity: <strong>{wo.samples}</strong> | Stage: <span className="badge warning">{wo.stage}</span> | Budget Code: {wo.budgetCode}
                                  {wo.items && wo.items.length > 0 && (
                                    <div style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--fs-sm)', color: 'var(--text-sub)' }}>
                                      <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
                                        {wo.items.map((item, i) => (
                                          <li key={i}>Model: <strong>{item.modelNumber}</strong> | Part: <strong>{item.partNumber}</strong> | Qty: <strong>{item.qty}</strong></li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="program-actions">
                                {wo.poFileName && (
                                  <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                                    <button className="btn-icon-only" onClick={() => handleFilePreview(wo.poFileName)} title="Preview PO"><Eye size={14} /></button>
                                    <button className="btn-icon-only success" onClick={() => handleFileDownload(wo.poFileName)} title="Download PO"><Download size={14} /></button>
                                  </div>
                                )}
                                {(currentUserInfo.roles || []).some(r => ['Administrator', 'Program Owner', 'Program Head'].includes(r)) && (
                                  <>
                                    <button className="btn-small" onClick={() => handleEditWorkOrder(wo)}>Edit</button>
                                    <button className="btn-small destructive" onClick={() => handleDeleteWorkOrder(wo.id)}>Delete</button>
                                  </>
                                )}
                              </div>
                            </div>
                          )
                        })}
                        {filteredWorkOrders.length === 0 && <p className="empty-msg" style={{ padding: 'var(--space-xl)' }}>No work orders found matching your criteria.</p>}
                      </div>
                    </>
                  )}

                  {activeProgramTab === 'planning' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-view module-shell">
                      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                        <div className="card-header gradient">
                          <div>
                            <h3 style={{ margin: 0, fontSize: 'var(--fs-lg)', fontWeight: '700', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                              <Package size={20} color="var(--accent)" /> Production Build Target Planning
                            </h3>
                            <p style={{ margin: 'var(--space-xs) 0 0 0', fontSize: 'var(--fs-base)', color: 'var(--text-sub)' }}>Select program, work order, model and part to plan monthly targets</p>
                          </div>
                        </div>
                        <div className="card-body" style={{ padding: 'var(--space-lg)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-md)' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="step-label">1. Select Program</label>
                              <select
                                value={planningProgramId}
                                onChange={(e) => { setPlanningProgramId(e.target.value); setPlanningWoId(''); setPlanningModelNo(''); setPlanningPartNo(''); }}
                                className="form-input"
                                style={{ fontWeight: 600 }}
                              >
                                <option value="">-- Choose Program --</option>
                                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="step-label">2. Select Work Order</label>
                              <select
                                value={planningWoId}
                                onChange={(e) => { setPlanningWoId(e.target.value); setPlanningModelNo(''); setPlanningPartNo(''); }}
                                disabled={!planningProgramId}
                                className="form-input"
                                style={{ fontWeight: 600, background: planningProgramId ? 'var(--bg-card)' : 'var(--bg-subtle)', cursor: planningProgramId ? 'pointer' : 'not-allowed' }}
                              >
                                <option value="">-- Select a Work Order to Plan Targets --</option>
                                {workOrders
                                  .filter(wo => String(wo.programId) === String(planningProgramId))
                                  .map(wo => (
                                    <option key={wo.id} value={wo.id}>{wo.refId} - {wo.title}</option>
                                  ))
                                }
                              </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="step-label">3. Select Model No.</label>
                              <select
                                value={planningModelNo}
                                onChange={(e) => { setPlanningModelNo(e.target.value); setPlanningPartNo(''); }}
                                disabled={!planningWoId}
                                className="form-input"
                                style={{ fontWeight: 600, background: planningWoId ? 'var(--bg-card)' : 'var(--bg-subtle)', cursor: planningWoId ? 'pointer' : 'not-allowed' }}
                              >
                                <option value="">-- Select Model --</option>
                                {availableModels.map(model => (
                                  <option key={model} value={model}>{model}</option>
                                ))}
                              </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="step-label">4. Select Part No.</label>
                              <select
                                value={planningPartNo}
                                onChange={(e) => setPlanningPartNo(e.target.value)}
                                disabled={!planningModelNo}
                                className="form-input"
                                style={{ fontWeight: 600, background: planningModelNo ? 'var(--bg-card)' : 'var(--bg-subtle)', cursor: planningModelNo ? 'pointer' : 'not-allowed' }}
                              >
                                <option value="">-- Select Part --</option>
                                {availableParts.map(part => (
                                  <option key={part} value={part}>{part}</option>
                                ))
                                }
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Consolidated Detailed Planning Table */}
                      <div className="card table-container" style={{ marginBottom: 'var(--space-xl)', overflow: 'hidden' }}>
                        <div className="card-header gradient" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 'var(--fs-lg)', fontWeight: '700', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                              <Layers size={20} color="var(--accent)" /> Detailed Monthly Targets Matrix
                            </h3>
                            <p style={{ margin: 'var(--space-xs) 0 0 0', fontSize: 'var(--fs-base)', color: 'var(--text-sub)' }}>Month-wise production target allocation across selected scope</p>
                          </div>
                          <div className="mono" style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', fontWeight: '600' }}>Scope: {filteredPlanningEntries.length} Items</div>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                          <table className="enterprise-table" style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: '1000px' }}>
                            <thead>
                              <tr>
                                <th style={{ position: 'sticky', left: 0, background: 'var(--bg-subtle)', zIndex: 10, minWidth: '140px' }}>Project & WO</th>
                                <th style={{ position: 'sticky', left: '140px', background: 'var(--bg-subtle)', zIndex: 10, minWidth: '160px', borderRight: '2px solid var(--border)' }}>Model / Part</th>
                                {Array.from({ length: 12 }, (_, i) => (
                                  <th key={i} className="text-center" style={{ width: '60px', fontSize: 'var(--fs-xs)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{new Date(0, i).toLocaleString('default', { month: 'short' })}</th>
                                ))}
                                <th className="text-right" style={{ background: 'var(--bg-subtle)', minWidth: '90px' }}>Total Target</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredPlanningEntries.map((p, idx) => {
                                const wo = workOrders.find(w => String(w.id) === String(p.workOrderId));
                                const prog = programs.find(pr => String(pr.id) === String(wo?.programId));
                                const year = new Date().getFullYear();
                                const itemTotal = Object.values(p.planning).reduce((sum, v) => sum + (Number(v) || 0), 0);

                                return (
                                  <tr key={idx}>
                                    <td style={{ position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 5, borderRight: '1px solid var(--border)', padding: 'var(--space-sm) var(--space-md)' }}>
                                      <div className="cell-title" title={prog?.name}>{prog?.name || 'N/A'}</div>
                                      <div className="cell-subtitle">{wo?.refId || 'N/A'}</div>
                                    </td>
                                    <td style={{ position: 'sticky', left: '140px', background: 'var(--bg-card)', zIndex: 5, borderRight: '2px solid var(--border)', padding: 'var(--space-sm) var(--space-md)' }}>
                                      <div style={{ fontWeight: '600', fontSize: 'var(--fs-base)' }}>{p.modelNumber}</div>
                                      <div className="cell-subtitle">{p.partNumber}</div>
                                    </td>
                                    {Array.from({ length: 12 }, (_, i) => {
                                      const monthId = `${year}-${String(i + 1).padStart(2, '0')}`;
                                      const val = p.planning[monthId] || 0;
                                      return (
                                        <td key={i} className="text-center" style={{ color: val > 0 ? 'var(--accent)' : 'var(--text-sub)', opacity: val > 0 ? 1 : 0.35, fontWeight: val > 0 ? '700' : '400', fontSize: 'var(--fs-base)' }}>{val || '-'}</td>
                                      );
                                    })}
                                    <td className="text-right" style={{ fontWeight: '800', color: 'var(--accent)', background: 'rgba(var(--accent-rgb), 0.03)', fontSize: 'var(--fs-base)' }}>{itemTotal}</td>
                                  </tr>
                                );
                              })}
                              {filteredPlanningEntries.length === 0 && <tr><td colSpan="15" style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--text-sub)', fontSize: 'var(--fs-base)' }}>No planning entries found. Adjust filters to see detailed data.</td></tr>}
                            </tbody>
                            {filteredPlanningEntries.length > 0 && (
                              <tfoot>
                                <tr>
                                  <td style={{ position: 'sticky', left: 0, background: 'var(--bg-subtle)', zIndex: 10, fontWeight: '800', fontSize: 'var(--fs-base)', color: 'var(--text-h)', borderTop: '2px solid var(--border)' }}>Total</td>
                                  <td style={{ position: 'sticky', left: '140px', background: 'var(--bg-subtle)', zIndex: 10, borderRight: '2px solid var(--border)', fontWeight: '800', fontSize: 'var(--fs-base)', color: 'var(--text-h)', borderTop: '2px solid var(--border)' }}>All Items</td>
                                  {Array.from({ length: 12 }, (_, i) => {
                                    const year = new Date().getFullYear();
                                    const monthId = `${year}-${String(i + 1).padStart(2, '0')}`;
                                    const monthTotal = filteredPlanningEntries.reduce((sum, p) => sum + (p.planning[monthId] || 0), 0);
                                    return (
                                      <td key={i} className="text-center" style={{
                                        fontWeight: '800',
                                        fontSize: 'var(--fs-base)',
                                        color: monthTotal > 0 ? 'var(--accent)' : 'var(--text-sub)',
                                        borderTop: '2px solid var(--border)'
                                      }}>{monthTotal || '-'}</td>
                                    );
                                  })}
                                  <td className="text-right" style={{
                                    fontWeight: '900',
                                    fontSize: 'var(--fs-base)',
                                    color: 'var(--accent)',
                                    background: 'rgba(var(--accent-rgb), 0.05)',
                                    borderTop: '2px solid var(--border)'
                                  }}>{filteredPlanningEntries.reduce((sum, p) => sum + Object.values(p.planning).reduce((s, v) => s + (Number(v) || 0), 0), 0)}</td>
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>
                      </div>

                      {planningWoId && planningModelNo && planningPartNo ? (
                        <>
                          <div className="stats-grid" style={{ marginBottom: 'var(--space-xl)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-lg)' }}>
                            <div className="stat-card" style={{ borderLeft: '4px solid var(--text-sub)', background: 'var(--bg-card)', padding: 'var(--space-lg)' }}>
                              <span className="stat-label">Item Total Quantity</span>
                              <div className="stat-value">{selectedWOForPlanning?.items.find(item => item.modelNumber === planningModelNo && item.partNumber === planningPartNo)?.qty || 0}</div>
                            </div>
                            <div className="stat-card" style={{ borderLeft: '4px solid var(--accent)', background: 'var(--bg-card)', padding: 'var(--space-lg)' }}>
                              <span className="stat-label">Currently Scheduled</span>
                              <div className="stat-value" style={{ color: 'var(--accent)' }}>
                                {Object.values(
                                  deliveryPlanning.find(p =>
                                    String(p.workOrderId) === String(planningWoId) &&
                                    p.modelNumber === planningModelNo &&
                                    p.partNumber === planningPartNo
                                  )?.planning || {}
                                ).reduce((sum, val) => sum + Number(val || 0), 0)}
                              </div>
                            </div>
                          </div>

                          <div className="card table-container">
                            <table className="enterprise-table">
                              <thead>
                                <tr>
                                  <th>Month</th>
                                  <th className="text-center">Planned Target Qty</th>
                                  <th>Allocation Progress</th>
                                  <th className="text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(Array.from({ length: 12 }, (_, i) => {
                                  const d = new Date(new Date().getFullYear(), i, 1);
                                  return { id: `${d.getFullYear()}-${String(i + 1).padStart(2, '0')}`, label: `${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}` };
                                })).map(month => {
                                  const woPlanningEntry = deliveryPlanning.find(p =>
                                    String(p.workOrderId) === String(planningWoId) &&
                                    p.modelNumber === planningModelNo &&
                                    p.partNumber === planningPartNo
                                  )?.planning || {};
                                  const currentWo = workOrders.find(wo => String(wo.id) === String(planningWoId));
                                  const woTotalQty = (currentWo?.items || []).reduce((sum, item) => sum + Number(item.qty), 0);
                                  const planned = woPlanningEntry[month.id] || 0;
                                  const percentOfWo = woTotalQty > 0 ? Math.round((planned / woTotalQty) * 100) : 0;
                                  const canEditTarget = checkAccess('monthly_planning', 'full');

                                  return (
                                    <tr key={month.id}>
                                      <td style={{ fontWeight: '600' }}>{month.label}</td>
                                      <td className="text-center">
                                        {canEditTarget ? (
                                          <input
                                            type="number"
                                            min="0"
                                            className="text-center form-input"
                                            style={{ width: '90px', padding: 'var(--space-xs) var(--space-sm)', fontSize: 'var(--fs-base)', fontWeight: '700' }}
                                            value={planned}
                                            onChange={(e) => handleUpdatePlanned(month.id, e.target.value)}
                                          />
                                        ) : <span style={{ fontSize: 'var(--fs-base)', fontWeight: '700' }}>{planned}</span>}
                                      </td>
                                      <td style={{ verticalAlign: 'middle' }}>
                                        <div style={{ width: '100%', maxWidth: '180px', height: '6px', background: 'var(--bg-muted)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                                          <div style={{ width: `${percentOfWo}%`, height: '100%', background: 'var(--accent)', borderRadius: 'var(--radius-sm)', transition: 'width 0.3s ease' }}></div>
                                        </div>
                                        <small style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)', marginTop: '2px', display: 'block' }}>{percentOfWo}% of WO</small>
                                      </td>
                                      <td className="text-right">
                                        {canEditTarget && planned > 0 && (
                                          <button className="btn-ghost-small destructive" onClick={() => handleUpdatePlanned(month.id, 0)} title="Reset Month"><X size={14} /></button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </>
                      ) : (
                        <div className="card" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
                          <PieChart size={48} style={{ margin: '0 auto var(--space-md)', color: 'var(--text-sub)', opacity: 0.2 }} />
                          <p className="empty-msg">Please select a Program and Work Order above to plan monthly build targets.</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeProgramTab === 'access' && (currentUserInfo.roles || []).some(r => ['Administrator', 'Developer'].includes(r)) && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card" style={{ marginBottom: 0 }}>
                      <div className="card-header gradient" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', padding: 'var(--space-sm) var(--space-lg)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                          <ShieldCheck size={20} color="var(--accent)" />
                          <h3 style={{ margin: 0, fontSize: 'var(--fs-lg)', fontWeight: '700', color: 'var(--text-h)' }}>
                            Access Control Center
                          </h3>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-xs)', background: 'var(--bg-subtle)', padding: '2px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                          <button className={`btn-small ${accessView === 'manage' ? 'active' : ''}`} onClick={() => setAccessView('manage')} style={{ borderRadius: 'var(--radius-md)', padding: '2px var(--space-md)', background: accessView === 'manage' ? 'var(--accent)' : 'transparent', color: accessView === 'manage' ? '#fff' : 'var(--text)', border: 'none' }}>Management</button>
                          <button className={`btn-small ${accessView === 'summary' ? 'active' : ''}`} onClick={() => setAccessView('summary')} style={{ borderRadius: 'var(--radius-md)', padding: '2px var(--space-md)', background: accessView === 'summary' ? 'var(--accent)' : 'transparent', color: accessView === 'summary' ? '#fff' : 'var(--text)', border: 'none' }}>Access Matrix</button>
                        </div>
                      </div>

                      <div className="card-body" style={{ padding: 'var(--space-md)' }}>
                        {accessView === 'manage' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', alignItems: 'center' }}>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label style={{ fontWeight: '700', fontSize: 'var(--fs-md)', marginBottom: 'var(--space-xs)', color: 'var(--text-sub)' }}>Target Module</label>
                                <select
                                  value={accessFeature}
                                  onChange={(e) => setAccessFeature(e.target.value)}
                                  style={{ padding: 'var(--space-sm) var(--space-md)', fontSize: 'var(--fs-md)', fontWeight: '700', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--accent)', background: 'var(--bg-card)', color: 'var(--accent)' }}
                                >
                                  {Object.keys(permissions).map(key => (
                                    <option key={key} value={key}>{FEATURE_LABELS[key] || key.toUpperCase().replace(/_/g, ' ')}</option>
                                  ))}
                                </select>
                              </div>
                              <div style={{ padding: 'var(--space-sm) var(--space-md)', background: 'rgba(var(--accent-rgb), 0.05)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--accent)' }}>
                                <h4 style={{ margin: '0 0 2px 0', fontSize: 'var(--fs-sm)', fontWeight: '700' }}>Module Capability</h4>
                                <p style={{ margin: 0, fontSize: 'var(--fs-base)', color: 'var(--text-sub)', lineHeight: '1.3' }}>{FEATURE_DESCRIPTIONS[accessFeature] || "Configure access levels for this module."}</p>
                              </div>
                            </div>

                            <div style={{ padding: 'var(--space-md)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-sm)' }}>
                                <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', fontSize: 'var(--fs-md)', fontWeight: '700' }}>
                                  <div style={{ width: '6px', height: '20px', background: 'var(--accent)', borderRadius: 'var(--radius-sm)' }}></div>
                                  Permissions: <span style={{ color: 'var(--accent)' }}>{FEATURE_LABELS[accessFeature] || accessFeature}</span>
                                </h4>
                                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                  <button className="btn-small" onClick={() => { syncToDisk({ key: 'permissions', data: permissions }); showToast('Permissions updated successfully!'); }}>
                                    Save Changes
                                  </button>
                                </div>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                <div>
                                  <label style={{ fontWeight: '700', color: 'var(--text)', fontSize: 'var(--fs-md)' }}>Full Access Roles <span style={{ fontWeight: '400', color: 'var(--text-sub)', marginLeft: 'var(--space-xs)', fontSize: 'var(--fs-sm)' }}>(Create, Edit, Approve)</span></label>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)', background: 'var(--bg-subtle)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginTop: 'var(--space-xs)' }}>
                                    {['Program Owner', 'Program Admin', 'Program Head', 'Production Head', 'Functional Head', 'Mechanical Head', 'Electrical Head', 'Engineer', 'Sr. Engineer', 'Head of Technology'].map(role => (
                                      <label key={role} style={{ flex: 'none', width: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', fontSize: 'var(--fs-base)', cursor: 'pointer', padding: '2px var(--space-sm)', background: permissions[accessFeature].roles.includes(role) ? 'var(--accent-bg)' : 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1.5px solid', borderColor: permissions[accessFeature].roles.includes(role) ? 'var(--accent)' : 'var(--border)', transition: 'all 0.2s' }}>
                                        <input
                                          type="checkbox"
                                          checked={permissions[accessFeature].roles.includes(role)}
                                          onChange={(e) => {
                                            const updated = e.target.checked ? [...permissions[accessFeature].roles, role] : permissions[accessFeature].roles.filter(r => r !== role);
                                            setPermissions({ ...permissions, [accessFeature]: { ...permissions[accessFeature], roles: updated } });
                                          }}
                                          style={{ width: '14px', height: '14px', accentColor: 'var(--accent)' }}
                                        /> {role}
                                      </label>
                                    ))}
                                    <div style={{ width: '100%', marginTop: '2px', padding: 'var(--space-xs) var(--space-sm)', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--text-rgb), 0.05)', fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                                      <Info size={13} /> Admin & Developer have full system-level access by default.
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <label style={{ fontWeight: '700', color: 'var(--text-sub)', fontSize: 'var(--fs-md)' }}>View Only Roles <span style={{ fontWeight: '400', color: 'var(--text-sub)', marginLeft: 'var(--space-xs)', fontSize: 'var(--fs-sm)' }}>(Dashboard, Analytics & Reports)</span></label>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)', background: 'var(--bg-subtle)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginTop: 'var(--space-xs)' }}>
                                    {['Program Owner', 'Program Admin', 'Program Head', 'Production Head', 'Functional Head', 'Mechanical Head', 'Electrical Head', 'Engineer', 'Sr. Engineer', 'Head of Technology'].map(role => (
                                      <label key={role} style={{ flex: 'none', width: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', fontSize: 'var(--fs-base)', cursor: 'pointer', padding: '2px var(--space-sm)', background: permissions[accessFeature].viewRoles?.includes(role) ? 'rgba(var(--accent-rgb), 0.1)' : 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1.5px solid', borderColor: permissions[accessFeature].viewRoles?.includes(role) ? 'var(--accent)' : 'var(--border)', transition: 'all 0.2s', opacity: permissions[accessFeature].roles.includes(role) ? 0.4 : 1, pointerEvents: permissions[accessFeature].roles.includes(role) ? 'none' : 'auto' }}>
                                        <input
                                          type="checkbox"
                                          checked={permissions[accessFeature].viewRoles?.includes(role)}
                                          onChange={(e) => {
                                            const updated = e.target.checked ? [...(permissions[accessFeature].viewRoles || []), role] : (permissions[accessFeature].viewRoles || []).filter(r => r !== role);
                                            setPermissions({ ...permissions, [accessFeature]: { ...permissions[accessFeature], viewRoles: updated } });
                                          }}
                                          style={{ width: '14px', height: '14px', accentColor: 'var(--accent)' }}
                                        /> {role} {permissions[accessFeature].roles.includes(role) && "(Inherited)"}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <label style={{ fontWeight: '700', fontSize: 'var(--fs-md)' }}>Domain-Based Access <span style={{ fontWeight: '400', color: 'var(--text-sub)', marginLeft: 'var(--space-xs)', fontSize: 'var(--fs-sm)' }}>(Full Access by department)</span></label>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)', background: 'var(--bg-subtle)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginTop: 'var(--space-xs)' }}>
                                    {['Architecture', 'Structures', 'EM', 'NVH', 'E&E', 'Purchase', 'Business', 'Quality', 'Stores', 'Validation', 'Prototyping', 'Production', 'Thermal', 'Program', 'Engineering', 'Electrical', 'Technology', 'Mechanical Engineering'].map(dom => (
                                      <label key={dom} style={{ flex: 'none', width: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', fontSize: 'var(--fs-base)', cursor: 'pointer', padding: '2px var(--space-sm)', background: permissions[accessFeature].domains.includes(dom) ? 'var(--accent-bg)' : 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', transition: 'all 0.2s' }}>
                                        <input
                                          type="checkbox"
                                          checked={permissions[accessFeature].domains.includes(dom)}
                                          onChange={(e) => {
                                            const updated = e.target.checked ? [...permissions[accessFeature].domains, dom] : permissions[accessFeature].domains.filter(d => d !== dom);
                                            setPermissions({ ...permissions, [accessFeature]: { ...permissions[accessFeature], domains: updated } });
                                          }}
                                          style={{ width: '13px', height: '13px', accentColor: 'var(--accent)' }}
                                        /> {dom}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="table-container" style={{ overflowX: 'auto' }}>
                            <table className="enterprise-table access-matrix-table" style={{ minWidth: '1100px', borderCollapse: 'separate', borderSpacing: '0 2px' }}>
                              <thead>
                                <tr style={{ background: 'transparent' }}>
                                  <th style={{ position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 10, borderBottom: '2px solid var(--border)', padding: 'var(--space-sm) var(--space-sm)', fontSize: 'var(--fs-sm)' }}>Capability / Module</th>
                                  {['Administrator', 'Developer', 'Program Owner', 'Program Admin', 'Program Head', 'Production Head', 'Functional Head', 'Mechanical Head', 'Electrical Head', 'Engineer', 'Sr. Engineer', 'Head of Technology'].map(role => (
                                    <th key={role} style={{ textAlign: 'center', fontSize: 'var(--fs-xs)', verticalAlign: 'middle', borderBottom: '2px solid var(--border)', padding: 'var(--space-sm) 0.35rem', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: '600', color: 'var(--text-sub)' }}>{role}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(permissions).map(([key, config]) => (
                                  <tr key={key} style={{ transition: 'all 0.2s' }}>
                                    <td style={{ position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 5, fontWeight: '600', fontSize: 'var(--fs-base)', padding: 'var(--space-sm)', borderRight: '1px solid var(--border)', boxShadow: '2px 0 6px -2px rgba(0,0,0,0.03)' }}>
                                      <div style={{ color: 'var(--text-h)' }}>{FEATURE_LABELS[key] || key.toUpperCase()}</div>
                                      <div style={{ fontSize: 'var(--fs-xs)', fontWeight: '400', color: 'var(--text-sub)', marginTop: '1px' }}>{key.replace(/_/g, ' ')}</div>
                                    </td>
                                    {['Administrator', 'Developer', 'Program Owner', 'Program Admin', 'Program Head', 'Production Head', 'Functional Head', 'Mechanical Head', 'Electrical Head', 'Engineer', 'Sr. Engineer', 'Head of Technology'].map(role => {
                                      const isSystemRole = ['Administrator', 'Developer'].includes(role);
                                      const hasFullAccess = isSystemRole || config.roles.includes(role);
                                      const hasViewOnly = !hasFullAccess && config.viewRoles?.includes(role);
                                      return (
                                        <td key={role} style={{ textAlign: 'center', padding: 'var(--space-xs) 0.35rem' }}>
                                          <div style={{
                                            width: '22px', height: '22px', borderRadius: 'var(--radius-sm)', margin: '0 auto',
                                            background: hasFullAccess ? 'var(--emerald-text)' : hasViewOnly ? 'var(--accent)' : 'rgba(var(--text-rgb), 0.05)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: (hasFullAccess || hasViewOnly) ? 'var(--shadow-sm)' : 'none',
                                            border: (hasFullAccess || hasViewOnly) ? 'none' : '1px dashed var(--border)'
                                          }} title={hasFullAccess ? 'Full Access (Read/Write/Approve)' : hasViewOnly ? 'View Only Access' : 'No Access'}>
                                            {hasFullAccess ? <CheckCircle2 size={13} color="#fff" /> : hasViewOnly ? <Eye size={13} color="#fff" /> : null}
                                          </div>
                                        </td>
                                      )
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', border: '1px solid var(--border)', display: 'flex', gap: 'var(--space-lg)', flexWrap: 'wrap', fontSize: 'var(--fs-base)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                                <div style={{ width: '18px', height: '18px', background: 'var(--emerald-text)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle2 size={11} color="#fff" /></div>
                                <span style={{ fontWeight: '700' }}>Full Access</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                                <div style={{ width: '18px', height: '18px', background: 'var(--accent)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Eye size={11} color="#fff" /></div>
                                <span style={{ fontWeight: '700' }}>View Only</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                                <div style={{ width: '18px', height: '18px', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)' }}></div>
                                <span style={{ fontWeight: '700' }}>No Access</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {activeProgramTab === 'users' && checkAccess('user_management') && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-view module-shell">
                      <div className="stats-grid" style={{ marginBottom: 'var(--space-lg)', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                        <div className="stat-card" style={{ padding: 'var(--space-sm) var(--space-lg)' }}>
                          <span className="stat-label" style={{ fontSize: 'var(--fs-sm)' }}><Users size={14} style={{ marginRight: 'var(--space-xs)' }} /> Total Users</span>
                          <div className="stat-value" style={{ fontSize: 'var(--fs-xl)' }}>{registeredUsers.length}</div>
                        </div>
                      </div>

                      <FilterSection
                        show={showUserFilters}
                        onToggle={() => setShowUserFilters(!showUserFilters)}
                        label="User Filters"
                        activeCount={[userFilters.search, userFilters.role, userFilters.domain, userFilters.status].filter(Boolean).length}
                        onClear={() => setUserFilters({ search: '', role: '', domain: '', status: '' })}
                      >
                        <FilterInput
                          placeholder="Search username..."
                          value={userFilters.search}
                          onChange={(e) => setUserFilters({ ...userFilters, search: e.target.value })}
                        />
                        <FilterSelect
                          value={userFilters.role}
                          onChange={(e) => setUserFilters({ ...userFilters, role: e.target.value })}
                        >
                          <option value="">All Roles</option>
                          {AVAILABLE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </FilterSelect>
                        <FilterSelect
                          value={userFilters.domain}
                          onChange={(e) => setUserFilters({ ...userFilters, domain: e.target.value })}
                        >
                          <option value="">All Domains</option>
                          {['Architecture', 'Structures', 'EM', 'NVH', 'E&E', 'Purchase', 'Business', 'Quality', 'Stores', 'Validation', 'Prototyping', 'Production', 'Thermal', 'Program', 'Engineering', 'Electrical', 'Technology', 'Mechanical Engineering'].map(d => <option key={d} value={d}>{d}</option>)}
                        </FilterSelect>
                        <FilterSelect
                          value={userFilters.status}
                          onChange={(e) => setUserFilters({ ...userFilters, status: e.target.value })}
                        >
                          <option value="">All Status</option>
                          <option value="Approved">Approved</option>
                          <option value="Pending">Pending</option>
                        </FilterSelect>
                      </FilterSection>

                      <div className="card table-container">
                        <div className="card-header gradient">
                          <div>
                            <h3 style={{ margin: 0, fontSize: 'var(--fs-lg)', fontWeight: '700', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                              <Users size={20} color="var(--accent)" /> User Management ({filteredUsersList.length})
                            </h3>
                            <p style={{ margin: 'var(--space-xs) 0 0 0', fontSize: 'var(--fs-base)', color: 'var(--text-sub)' }}>Manage registered users, roles and access permissions</p>
                          </div>
                        </div>
                        <table className="enterprise-table">
                          <thead className="sticky-header">
                            <tr>
                              <th>Username</th><th>Full Name</th><th>Current Roles</th><th>Assign Role</th><th>Domain</th><th>Status</th><th className="text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredUsersList.map(user => (
                              <tr key={user.username}>
                                <td>{user.username}</td>
                                <td>{user.fullName}</td>
                                <td>
                                  <div className="selected-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)', minWidth: '150px' }}>
                                    {(user.roles || []).length > 0 ? (user.roles || []).map(role => (
                                      <span key={role} className="pill-badge accent" style={{ fontSize: 'var(--fs-base)', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', padding: 'var(--space-xs) var(--space-sm)', borderRadius: '15px', background: 'var(--accent)', color: '#fff' }}>
                                        {role} <X size={12} style={{ cursor: 'pointer', opacity: 0.8 }} onClick={() => handleUpdateUser(user.username, 'roles', (user.roles || []).filter(r => r !== role))} />
                                      </span>
                                    )) : <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)', fontStyle: 'italic' }}>No roles assigned</span>}
                                  </div>
                                </td>
                                <td>
                                  <div className="role-assignment-container" style={{ position: 'relative', minWidth: '160px' }}>
                                    <button
                                      className="btn-ghost-small"
                                      style={{ width: '100%', fontSize: 'var(--fs-sm)', padding: 'var(--space-xs)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-xs)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)' }}
                                      onClick={() => setExpandedUserRoles(prev => ({ ...prev, [user.username]: !prev[user.username] }))}
                                    >
                                      {expandedUserRoles[user.username] ? <ChevronLeft size={14} style={{ transform: 'rotate(-90deg)' }} /> : <ChevronRight size={14} style={{ transform: 'rotate(90deg)' }} />}
                                      {expandedUserRoles[user.username] ? 'Close Selection' : 'Assign New Role'}
                                    </button>
                                    <AnimatePresence>
                                      {expandedUserRoles[user.username] && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                          style={{ overflow: 'hidden', marginTop: 'var(--space-sm)', padding: 'var(--space-sm)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', maxHeight: '200px', overflowY: 'auto' }}
                                        >
                                          {AVAILABLE_ROLES.map(role => {
                                            const isSelected = (user.roles || []).includes(role);
                                            return (
                                              <label key={role} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: 'var(--space-sm) var(--space-sm)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--fs-sm)', cursor: 'pointer', transition: 'all 0.15s', background: isSelected ? 'var(--accent-bg)' : 'var(--bg-card)', color: isSelected ? 'var(--accent)' : 'var(--text)', border: '1px solid', borderColor: isSelected ? 'var(--accent)' : 'transparent' }}>
                                                <input type="checkbox" checked={isSelected} onChange={(e) => {
                                                  const current = user.roles || [];
                                                  const updated = e.target.checked ? [...current, role] : current.filter(r => r !== role);
                                                  handleUpdateUser(user.username, 'roles', updated);
                                                }} style={{ display: 'none' }} />
                                                <span style={{ width: '14px', height: '14px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--text-sub)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-sm)', background: isSelected ? 'var(--accent)' : 'transparent', color: '#fff', borderColor: isSelected ? 'var(--accent)' : 'var(--text-sub)' }}>
                                                  {isSelected && '✓'}
                                                </span>
                                                {role}
                                              </label>
                                            );
                                          })}
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </td>
                                <td>
                                  <select
                                    value={user.domain}
                                    onChange={(e) => handleUpdateUser(user.username, 'domain', e.target.value)}
                                    style={{ padding: 'var(--space-xs) var(--space-sm)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 'var(--fs-base)' }}
                                  >
                                    <option value="Architecture">Architecture</option>
                                    <option value="Structures">Structures</option>
                                    <option value="EM">EM</option>
                                    <option value="NVH">NVH</option>
                                    <option value="E&E">E&E</option>
                                    <option value="Purchase">Purchase</option>
                                    <option value="Business">Business</option>
                                    <option value="Quality">Quality</option>
                                    <option value="Stores">Stores</option>
                                    <option value="Validation">Validation</option>
                                    <option value="Prototyping">Prototyping</option>
                                    <option value="Production">Production</option>
                                    <option value="Thermal">Thermal</option>
                                    <option value="Program">Program</option>
                                    <option value="Engineering">Engineering</option>
                                    <option value="Electrical">Electrical</option>
                                    <option value="Technology">Technology</option>
                                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                                  </select>
                                </td>
                                <td>
                                  <span className={`pill-badge ${user.isApproved ? 'emerald' : 'amber'}`}>
                                    {user.isApproved ? 'Approved' : 'Pending'}
                                  </span>
                                </td>
                                <td className="text-right">
                                  <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
                                    {!user.isApproved && (
                                      <button className="btn-primary btn-small" style={{ width: 'auto', background: 'var(--emerald-text)' }} onClick={() => handleApproveUser(user.username)}>Approve</button>
                                    )}
                                    <button className="btn-small destructive" onClick={() => handleDeleteUser(user.username)}>Delete</button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {filteredUsersList.length === 0 && (
                          <p className="empty-msg">No users match your search criteria.</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {currentPage === 'motor_traceability' && checkAccess('motor_traceability') && (
                <PartTraceability
                  workOrders={workOrders}
                  programs={programs}
                  traceabilityData={traceabilityData}
                  setTraceabilityData={setTraceabilityData}
                  registeredUsers={registeredUsers}
                  currentUser={currentUserInfo}
                  addNotification={addNotification}
                  permissions={permissions}
                  showToast={showToast}
                  syncToDisk={syncToDisk}
                  deliveryPlanning={deliveryPlanning}
                  handleFileDownload={handleFileDownload}
                  handleFilePreview={handleFilePreview}
                  readOnly={!checkAccess('motor_traceability', 'full')}
                />
              )}
              {currentPage === 'eol_reports' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-view module-shell">
                  <div className="sub-navigation po-sub-nav">
                    <div style={{ display: 'flex', gap: 4, alignItems: 'stretch' }}>
                      {/* EOL Group */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: 1.5, color: 'var(--accent, #c36e46)', textTransform: 'uppercase', padding: '0 4px', lineHeight: '12px' }}>EOL</div>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          {eolNavItems.filter(i => ['new_report', 'dashboard', 'golden_samples'].includes(i.id)).map(item => (
                            <motion.button
                              key={item.id}
                              whileTap={{ scale: 0.95 }}
                              className={eolView === item.id ? 'active' : ''}
                              onClick={() => setEolView(item.id)}
                            >
                              {item.icon} {item.label}
                            </motion.button>
                          ))}
                        </div>
                      </div>

                      <div style={{ width: 3, background: 'var(--text-sub, #78716c)', borderRadius: 2, margin: '0 6px', flexShrink: 0 }} />

                      {/* PDI Group */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: 1.5, color: 'var(--accent, #c36e46)', textTransform: 'uppercase', padding: '0 4px', lineHeight: '12px' }}>PDI</div>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          {eolNavItems.filter(i => ['qi_pdi_report', 'qi_pdi_dashboard', 'qi_pdi_ref_samples'].includes(i.id)).map(item => (
                            <motion.button
                              key={item.id}
                              whileTap={{ scale: 0.95 }}
                              className={eolView === item.id ? 'active' : ''}
                              onClick={() => setEolView(item.id)}
                            >
                              {item.icon} {item.label}
                            </motion.button>
                          ))}
                        </div>
                      </div>

                      <div style={{ width: 3, background: 'var(--text-sub, #78716c)', borderRadius: 2, margin: '0 6px', flexShrink: 0 }} />

                      {/* Approvals */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: 1.5, color: 'transparent', textTransform: 'uppercase', padding: '0 4px', lineHeight: '12px' }}>&nbsp;</div>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          {eolNavItems.filter(i => ['approvals'].includes(i.id)).map(item => (
                            <motion.button
                              key={item.id}
                              whileTap={{ scale: 0.95 }}
                              className={eolView === item.id ? 'active' : ''}
                              onClick={() => setEolView(item.id)}
                            >
                              {item.icon} {item.label}
                            </motion.button>
                          ))}
                        </div>
                      </div>

                      <div style={{ width: 3, background: 'var(--text-sub, #78716c)', borderRadius: 2, margin: '0 6px', flexShrink: 0 }} />

                      {/* Archive */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: 1.5, color: 'transparent', textTransform: 'uppercase', padding: '0 4px', lineHeight: '12px' }}>&nbsp;</div>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          {eolNavItems.filter(i => i.id === 'archive').map(item => (
                            <motion.button
                              key={item.id}
                              whileTap={{ scale: 0.95 }}
                              className={eolView === item.id ? 'active' : ''}
                              onClick={() => setEolView(item.id)}
                            >
                              {item.icon} {item.label}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <EolPdiApp
                    workOrders={workOrders}
                    programs={programs}
                    registeredUsers={registeredUsers}
                    traceabilityData={traceabilityData}
                    setTraceabilityData={setTraceabilityData}
                    syncToDisk={syncToDisk}
                    showToast={showToast}
                    addNotification={addNotification}
                    goldenSamples={goldenSamples}
                    setGoldenSamples={setGoldenSamples}
                    qiPdiRefSamples={qiPdiRefSamples}
                    setQiPdiRefSamples={setQiPdiRefSamples}
                    user={{
                      user: currentUserInfo.fullName || currentUserInfo.username,
                      roles: currentUserInfo.roles || [],
                      domains: currentUserInfo.domain ? [currentUserInfo.domain] : []
                    }}
                    theme={theme}
                    embedded
                    embeddedView={eolView}
                    onEmbeddedViewChange={setEolView}
                  />
                </motion.div>
              )}
            </motion.section>
          </main>
        </div>
      )}



      <AnimatePresence>
        {showProfileModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="modal-overlay"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="auth-card modal-content" style={{ maxWidth: '450px' }}
            >
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <h3 style={{ margin: 0 }}>{profileMode === 'view' ? 'User Profile' : 'Edit Profile'}</h3>
                <button className="btn-icon-only" onClick={() => setShowProfileModal(false)} title="Close"><X size={18} /></button>
              </div>

              <div className="form-group">
                <label>Full Name</label>
                {profileMode === 'view' ? (
                  <div className="view-value">{currentUserInfo.fullName || 'Not Provided'}</div>
                ) : (
                  <input
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                    type="text"
                  />
                )}
              </div>

              <div className="form-group">
                <label>Manage Account Roles</label>
                {profileMode === 'view' ? (
                  <div className="view-value">{(currentUserInfo.roles || []).join(', ')}</div>
                ) : (
                  <div className="multi-select-container" style={{ background: 'var(--bg-subtle)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                    <div className="selected-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)', marginBottom: 'var(--space-sm)', minHeight: '30px' }}>
                      {profileForm.roles.length > 0 ? profileForm.roles.map(role => (
                        <span key={role} className="pill-badge accent" style={{ fontSize: 'var(--fs-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', padding: 'var(--space-xs) var(--space-sm)', borderRadius: 'var(--radius-xl)' }}>
                          {role} <X size={12} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => setProfileForm({ ...profileForm, roles: profileForm.roles.filter(r => r !== role) })} />
                        </span>
                      )) : <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', fontStyle: 'italic' }}>No roles assigned...</span>}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)', maxHeight: '150px', overflowY: 'auto', paddingRight: 'var(--space-xs)' }}>
                      {AVAILABLE_ROLES.map(role => {
                        const isSelected = profileForm.roles.includes(role);
                        return (
                          <label key={role} style={{
                            display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: 'var(--fs-base)', cursor: 'pointer',
                            padding: 'var(--space-sm) var(--space-sm)', borderRadius: 'var(--radius-md)', transition: 'all 0.2s',
                            background: isSelected ? 'var(--accent-bg)' : 'var(--bg-card)',
                            border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                            color: isSelected ? 'var(--accent)' : 'var(--text)'
                          }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const updated = e.target.checked
                                  ? [...profileForm.roles, role]
                                  : profileForm.roles.filter(r => r !== role);
                                setProfileForm({ ...profileForm, roles: updated });
                              }}
                              style={{ display: 'none' }}
                            />
                            <span style={{ width: '14px', height: '14px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--text-sub)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-sm)', background: isSelected ? 'var(--accent)' : 'transparent', color: '#fff', borderColor: isSelected ? 'var(--accent)' : 'var(--text-sub)' }}>
                              {isSelected && '✓'}
                            </span>
                            {role}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Domain</label>
                {profileMode === 'view' ? (
                  <div className="view-value">{currentUserInfo.domain}</div>
                ) : (
                  <select
                    value={profileForm.domain}
                    onChange={(e) => setProfileForm({ ...profileForm, domain: e.target.value })}
                  >
                    <option value="Architecture">Architecture</option>
                    <option value="Structures">Structures</option>
                    <option value="EM">EM</option>
                    <option value="NVH">NVH</option>
                    <option value="E&E">E&E</option>
                    <option value="Purchase">Purchase</option>
                    <option value="Business">Business</option>
                    <option value="Quality">Quality</option>
                    <option value="Stores">Stores</option>
                    <option value="Validation">Validation</option>
                    <option value="Prototyping">Prototyping</option>
                    <option value="Production">Production</option>
                    <option value="Thermal">Thermal</option>
                    <option value="Program">Program</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Technology">Technology</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                  </select>
                )}
              </div>

              {profileMode === 'edit' && (
                <>
                  <div className="form-group">
                    <label>Security Question</label>
                    <select
                      value={profileForm.securityQuestion}
                      onChange={(e) => setProfileForm({ ...profileForm, securityQuestion: e.target.value })}
                    >
                      <option value="What was your first pet's name?">What was your first pet's name?</option>
                      <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                      <option value="What was the name of your elementary school?">What was the name of your elementary school?</option>
                      <option value="In what city were you born?">In what city were you born?</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Security Answer</label>
                    <input
                      type="text"
                      value={profileForm.securityAnswer}
                      onChange={(e) => setProfileForm({ ...profileForm, securityAnswer: e.target.value })}
                      placeholder="Your answer"
                    />
                  </div>
                </>
              )}

              {profileMode === 'edit' && (
                <>
                  <div className="form-group">
                    <label>New Password (Optional)</label>
                    <input
                      type="password"
                      value={profileForm.newPassword}
                      onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                      placeholder="Leave blank to keep current"
                    />
                  </div>

                  {profileForm.newPassword && (
                    <div className="form-group">
                      <label>Confirm New Password</label>
                      <input
                        type="password"
                        value={profileForm.confirmPassword}
                        onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                        placeholder="Repeat new password"
                      />
                    </div>
                  )}
                </>
              )}

              <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
                {profileMode === 'view' ? (
                  <button className="btn-primary" onClick={() => setProfileMode('edit')}>Edit Profile</button>
                ) : (
                  <button className="btn-primary" onClick={handleUpdateProfile}>Save Changes</button>
                )}
                <button className="btn-small" style={{ width: '100%' }} onClick={() => setShowProfileModal(false)}>
                  {profileMode === 'view' ? 'Close' : 'Cancel'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="modal-overlay" onClick={() => setPreviewFile(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
              className="modal-content" style={{ width: '85%', height: '85%', padding: '0', position: 'relative', overflow: 'hidden' }} onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setPreviewFile(null)}
                style={{ position: 'absolute', top: '10px', right: '15px', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Close"
              >
                <X size={20} />
              </button>
              <iframe
                src={previewFile}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Document Preview"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, visible: false })}
      />
    </div>
  )
}


export default App
