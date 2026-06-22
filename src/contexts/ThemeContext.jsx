// eslint-disable-next-line react-refresh/only-export-components
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  THEME_PRESETS, SPACING_OPTIONS, FONT_SIZE_OPTIONS, SHADOW_OPTIONS,
  BORDER_STYLE_OPTIONS, LINE_HEIGHT_OPTIONS, SIDEBAR_WIDTH_OPTIONS,
  ANIMATION_SPEED_OPTIONS, CARD_PADDING_OPTIONS, CARD_RADIUS_OPTIONS,
  CARD_SHADOW_OPTIONS, CARD_BORDER_WIDTH_OPTIONS, CARD_HOVER_EFFECT_OPTIONS,
  TABLE_DENSITY_OPTIONS, TABLE_RADIUS_OPTIONS, BTN_STYLE_OPTIONS,
  BTN_RADIUS_OPTIONS, INPUT_STYLE_OPTIONS, INPUT_RADIUS_OPTIONS,
  INPUT_HEIGHT_OPTIONS, SIDEBAR_STYLE_OPTIONS, SIDEBAR_ACTIVE_INDICATOR_OPTIONS,
  SIDEBAR_ITEM_SPACING_OPTIONS, NAV_STYLE_OPTIONS, NAV_ACTIVE_INDICATOR_OPTIONS,
  BADGE_STYLE_OPTIONS, PAGE_TRANSITION_OPTIONS, HOVER_SCALE_OPTIONS,
  FOCUS_RING_OPTIONS, CONTENT_MAX_WIDTH_OPTIONS, HEADER_HEIGHT_OPTIONS,
  SECTION_GAP_OPTIONS, MODAL_RADIUS_OPTIONS, FORM_LABEL_STYLE_OPTIONS,
  FORM_LAYOUT_OPTIONS, FORM_ERROR_STYLE_OPTIONS, FORM_CHECKBOX_STYLE_OPTIONS,
  FORM_REQUIRED_STYLE_OPTIONS, FORM_FIELD_GAP_OPTIONS, FORM_VALIDATION_STYLE_OPTIONS,
  INPUT_PADDING_OPTIONS, INPUT_BG_OPTIONS, INPUT_BORDER_STYLE_OPTIONS,
  SCROLLBAR_STYLE_OPTIONS, TOOLTIP_STYLE_OPTIONS, TOAST_STYLE_OPTIONS,
  AVATAR_STYLE_OPTIONS, AVATAR_SIZE_OPTIONS, BADGE_RADIUS_OPTIONS, INPUT_FONT_SIZE_OPTIONS
} from '../utils/themePresets';

const ThemeContext = createContext();

const STORAGE_KEY = 'arpl_theme_config';

const defaultConfig = {
  mode: 'light',
  preset: 'default',
  customAccent: '',
  customAccentRgb: '',
  font: THEME_PRESETS.default.font,
  radiusSm: THEME_PRESETS.default.radiusSm,
  radiusMd: THEME_PRESETS.default.radiusMd,
  radiusLg: THEME_PRESETS.default.radiusLg,
  radiusXl: THEME_PRESETS.default.radiusXl,
  spacing: 'default',
  fontSize: 'default',
  shadow: 'default',
  borderStyle: 'default',
  lineHeight: 'default',
  sidebarWidth: 'default',
  animationSpeed: 'default',
  cardPadding: 'default',
  cardRadius: 'default',
  cardShadow: 'default',
  cardBorderWidth: 'default',
  cardHoverEffect: 'default',
  tableDensity: 'default',
  tableStripe: false,
  tableHoverBg: true,
  tableRadius: 'default',
  btnStyle: 'default',
  btnRadius: 'default',
  inputStyle: 'default',
  inputRadius: 'default',
  inputHeight: 'default',
  sidebarStyle: 'default',
  sidebarActiveIndicator: 'bar',
  sidebarItemSpacing: 'default',
  navStyle: 'default',
  navActiveIndicator: 'underline',
  badgeStyle: 'default',
  pageTransition: 'fade',
  hoverScale: 'none',
  focusRing: 'default',
  microInteractions: true,
  contentMaxWidth: 'default',
  headerHeight: 'default',
  sectionGap: 'default',
  modalRadius: 'default',
  modalBackdropBlur: true,
  successColor: '#10b981',
  successRgb: '16, 185, 129',
  warningColor: '#f59e0b',
  warningRgb: '245, 158, 11',
  errorColor: '#ef4444',
  errorRgb: '239, 68, 68',
  infoColor: '#3b82f6',
  infoRgb: '59, 130, 246',
  formLabelStyle: 'above',
  formLayout: 'default',
  formErrorStyle: 'border',
  formCheckboxStyle: 'default',
  formRequiredStyle: 'asterisk',
  formFieldGap: 'default',
  formValidationStyle: 'inline',
  formLabelWeight: '700',
  inputPadding: 'default',
  inputBg: 'transparent',
  inputBorderStyle: 'solid',
  inputFontSize: 'default',
  scrollbarStyle: 'default',
  tooltipStyle: 'default',
  toastStyle: 'default',
  avatarStyle: 'circle',
  avatarSize: 'default',
  badgeRadius: 'pill'
};

export function ThemeProvider({ children }) {
  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...defaultConfig, ...JSON.parse(saved) } : defaultConfig;
    } catch {
      return defaultConfig;
    }
  });

  const applyTheme = useCallback((cfg) => {
    const root = document.documentElement;
    root.setAttribute('data-theme', cfg.mode);

    const preset = THEME_PRESETS[cfg.preset] || THEME_PRESETS.default;
    const accent = cfg.customAccent || preset.accent;
    const accentRgb = cfg.customAccentRgb || preset.accentRgb;

    // Accent
    root.style.setProperty('--accent', accent);
    root.style.setProperty('--accent-rgb', accentRgb);

    // Font
    if (cfg.font) root.style.setProperty('--font-sans', cfg.font);

    // Border radius
    if (cfg.radiusSm) root.style.setProperty('--radius-sm', cfg.radiusSm);
    if (cfg.radiusMd) root.style.setProperty('--radius-md', cfg.radiusMd);
    if (cfg.radiusLg) root.style.setProperty('--radius-lg', cfg.radiusLg);
    if (cfg.radiusXl) root.style.setProperty('--radius-xl', cfg.radiusXl);

    // Spacing
    const spacing = SPACING_OPTIONS[cfg.spacing] || SPACING_OPTIONS.default;
    Object.entries(spacing).forEach(([key, val]) => {
      root.style.setProperty(`--space-${key}`, val);
    });

    // Font sizes
    const fontSizes = FONT_SIZE_OPTIONS[cfg.fontSize] || FONT_SIZE_OPTIONS.default;
    Object.entries(fontSizes).forEach(([key, val]) => {
      root.style.setProperty(`--fs-${key}`, val);
    });

    // Shadows
    const shadows = SHADOW_OPTIONS[cfg.shadow] || SHADOW_OPTIONS.default;
    root.style.setProperty('--shadow-xs', shadows.xs);
    root.style.setProperty('--shadow-sm', shadows.sm);
    root.style.setProperty('--shadow-md', shadows.md);
    root.style.setProperty('--shadow-lg', shadows.lg);

    // Border style
    const border = BORDER_STYLE_OPTIONS[cfg.borderStyle] || BORDER_STYLE_OPTIONS.default;
    root.style.setProperty('--border-width', border.width);
    root.style.setProperty('--input-border-width', border.inputWidth);

    // Line height
    const lh = LINE_HEIGHT_OPTIONS[cfg.lineHeight] || LINE_HEIGHT_OPTIONS.default;
    root.style.setProperty('--line-height', lh.value);

    // Sidebar width
    const sidebar = SIDEBAR_WIDTH_OPTIONS[cfg.sidebarWidth] || SIDEBAR_WIDTH_OPTIONS.default;
    root.style.setProperty('--sidebar-width', sidebar.value);
    root.style.setProperty('--sidebar-collapsed-width', sidebar.collapsed);

    // Animation speed
    const anim = ANIMATION_SPEED_OPTIONS[cfg.animationSpeed] || ANIMATION_SPEED_OPTIONS.default;
    root.style.setProperty('--transition-speed', anim.value);

    // Card settings
    const cardPad = CARD_PADDING_OPTIONS[cfg.cardPadding] || CARD_PADDING_OPTIONS.default;
    root.style.setProperty('--card-padding', cardPad.value);

    const cardRad = CARD_RADIUS_OPTIONS[cfg.cardRadius] || CARD_RADIUS_OPTIONS.default;
    root.style.setProperty('--card-radius', cardRad.value);

    const cardShad = CARD_SHADOW_OPTIONS[cfg.cardShadow] || CARD_SHADOW_OPTIONS.default;
    root.style.setProperty('--card-shadow', cardShad.value);

    const cardBw = CARD_BORDER_WIDTH_OPTIONS[cfg.cardBorderWidth] || CARD_BORDER_WIDTH_OPTIONS.default;
    root.style.setProperty('--card-border-width', cardBw.value);

    root.style.setProperty('--card-hover-effect', cfg.cardHoverEffect || 'default');

    // Table settings
    const tableDensity = TABLE_DENSITY_OPTIONS[cfg.tableDensity] || TABLE_DENSITY_OPTIONS.default;
    root.style.setProperty('--table-cell-padding', tableDensity.padding);
    root.style.setProperty('--table-font-size', tableDensity.fontSize);
    root.style.setProperty('--table-stripe', cfg.tableStripe ? 'true' : 'false');
    root.style.setProperty('--table-hover-bg', cfg.tableHoverBg ? 'true' : 'false');

    const tableRad = TABLE_RADIUS_OPTIONS[cfg.tableRadius] || TABLE_RADIUS_OPTIONS.default;
    root.style.setProperty('--table-radius', tableRad.value);

    // Button settings
    root.style.setProperty('--btn-style', cfg.btnStyle || 'default');

    const btnRad = BTN_RADIUS_OPTIONS[cfg.btnRadius] || BTN_RADIUS_OPTIONS.default;
    root.style.setProperty('--btn-radius', btnRad.value);

    // Input settings
    root.style.setProperty('--input-style', cfg.inputStyle || 'default');

    const inputRad = INPUT_RADIUS_OPTIONS[cfg.inputRadius] || INPUT_RADIUS_OPTIONS.default;
    root.style.setProperty('--input-radius', inputRad.value);

    const inputH = INPUT_HEIGHT_OPTIONS[cfg.inputHeight] || INPUT_HEIGHT_OPTIONS.default;
    root.style.setProperty('--input-height', inputH.value);

    // Sidebar settings
    root.style.setProperty('--sidebar-style', cfg.sidebarStyle || 'default');
    root.style.setProperty('--sidebar-active-indicator', cfg.sidebarActiveIndicator || 'bar');

    const sidebarItemSp = SIDEBAR_ITEM_SPACING_OPTIONS[cfg.sidebarItemSpacing] || SIDEBAR_ITEM_SPACING_OPTIONS.default;
    root.style.setProperty('--sidebar-item-spacing', sidebarItemSp.value);

    // Nav settings
    root.style.setProperty('--nav-style', cfg.navStyle || 'default');
    root.style.setProperty('--nav-active-indicator', cfg.navActiveIndicator || 'underline');

    // Badge settings
    root.style.setProperty('--badge-style', cfg.badgeStyle || 'default');

    // Animation settings
    root.style.setProperty('--page-transition', cfg.pageTransition || 'fade');
    root.style.setProperty('--hover-scale', cfg.hoverScale === 'none' ? '1' : cfg.hoverScale);
    root.style.setProperty('--micro-interactions', cfg.microInteractions ? '1' : '0');

    // Focus ring
    root.style.setProperty('--focus-ring-style', cfg.focusRing || 'default');

    // Layout settings
    const contentMw = CONTENT_MAX_WIDTH_OPTIONS[cfg.contentMaxWidth] || CONTENT_MAX_WIDTH_OPTIONS.default;
    root.style.setProperty('--content-max-width', contentMw.value);

    const headerH = HEADER_HEIGHT_OPTIONS[cfg.headerHeight] || HEADER_HEIGHT_OPTIONS.default;
    root.style.setProperty('--header-height', headerH.value);

    const sectionG = SECTION_GAP_OPTIONS[cfg.sectionGap] || SECTION_GAP_OPTIONS.default;
    root.style.setProperty('--section-gap', sectionG.value);

    // Modal settings
    const modalRad = MODAL_RADIUS_OPTIONS[cfg.modalRadius] || MODAL_RADIUS_OPTIONS.default;
    root.style.setProperty('--modal-radius', modalRad.value);
    root.style.setProperty('--modal-backdrop-blur', cfg.modalBackdropBlur ? 'blur(4px)' : 'none');

    // Color variants
    root.style.setProperty('--emerald-text', cfg.successColor || '#10b981');
    root.style.setProperty('--emerald-rgb', cfg.successRgb || '16, 185, 129');
    root.style.setProperty('--amber-text', cfg.warningColor || '#f59e0b');
    root.style.setProperty('--amber-rgb', cfg.warningRgb || '245, 158, 11');
    root.style.setProperty('--rose-text', cfg.errorColor || '#ef4444');
    root.style.setProperty('--rose-rgb', cfg.errorRgb || '239, 68, 68');
    root.style.setProperty('--blue-text', cfg.infoColor || '#3b82f6');
    root.style.setProperty('--blue-rgb', cfg.infoRgb || '59, 130, 246');

    // Form settings
    root.style.setProperty('--form-label-style', cfg.formLabelStyle || 'above');
    root.style.setProperty('--form-label-weight', cfg.formLabelWeight || '700');

    const formLayout = FORM_LAYOUT_OPTIONS[cfg.formLayout] || FORM_LAYOUT_OPTIONS.default;
    root.style.setProperty('--form-field-gap', FORM_FIELD_GAP_OPTIONS[cfg.formFieldGap]?.value || '1.25rem');
    root.style.setProperty('--form-input-padding', formLayout.padding);

    root.style.setProperty('--form-error-style', cfg.formErrorStyle || 'border');
    root.style.setProperty('--form-checkbox-style', cfg.formCheckboxStyle || 'default');
    root.style.setProperty('--form-required-style', cfg.formRequiredStyle || 'asterisk');
    root.style.setProperty('--form-validation-style', cfg.formValidationStyle || 'inline');

    // Input field settings
    const inputPad = INPUT_PADDING_OPTIONS[cfg.inputPadding] || INPUT_PADDING_OPTIONS.default;
    root.style.setProperty('--form-input-padding', inputPad.value);

    const inputBgVal = INPUT_BG_OPTIONS[cfg.inputBg] || INPUT_BG_OPTIONS.transparent;
    root.style.setProperty('--input-bg', inputBgVal.value);

    const inputBs = INPUT_BORDER_STYLE_OPTIONS[cfg.inputBorderStyle] || INPUT_BORDER_STYLE_OPTIONS.solid;
    root.style.setProperty('--input-border-style', inputBs.value);

    const inputFs = INPUT_FONT_SIZE_OPTIONS[cfg.inputFontSize] || INPUT_FONT_SIZE_OPTIONS.default;
    root.style.setProperty('--input-font-size', inputFs.value);

    // Scrollbar
    root.style.setProperty('--scrollbar-style', cfg.scrollbarStyle || 'default');

    // Tooltip
    root.style.setProperty('--tooltip-style', cfg.tooltipStyle || 'default');

    // Toast
    root.style.setProperty('--toast-style', cfg.toastStyle || 'default');

    // Avatar
    root.style.setProperty('--avatar-style', AVATAR_STYLE_OPTIONS[cfg.avatarStyle]?.value || '50%');
    root.style.setProperty('--avatar-size', AVATAR_SIZE_OPTIONS[cfg.avatarSize]?.value || '36px');

    // Badge
    root.style.setProperty('--badge-radius', BADGE_RADIUS_OPTIONS[cfg.badgeRadius]?.value || '9999px');

    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  }, []);

  useEffect(() => {
    applyTheme(config);
  }, [config, applyTheme]);

  const updateConfig = (updates) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const applyPreset = (presetKey) => {
    const preset = THEME_PRESETS[presetKey];
    if (!preset) return;
    setConfig(prev => ({
      ...prev,
      preset: presetKey,
      customAccent: '',
      customAccentRgb: '',
      accent: preset.accent,
      accentRgb: preset.accentRgb,
      font: preset.font,
      radiusSm: preset.radiusSm,
      radiusMd: preset.radiusMd,
      radiusLg: preset.radiusLg,
      radiusXl: preset.radiusXl,
      spacing: preset.spacing,
      fontSize: preset.fontSize,
      shadow: preset.shadow,
      borderStyle: preset.borderStyle,
      lineHeight: preset.lineHeight,
      sidebarWidth: preset.sidebarWidth,
      animationSpeed: preset.animationSpeed,
      cardPadding: preset.cardPadding,
      cardRadius: preset.cardRadius,
      cardShadow: preset.cardShadow,
      cardBorderWidth: preset.cardBorderWidth,
      cardHoverEffect: preset.cardHoverEffect,
      tableDensity: preset.tableDensity,
      tableStripe: preset.tableStripe,
      tableHoverBg: preset.tableHoverBg,
      tableRadius: preset.tableRadius,
      btnStyle: preset.btnStyle,
      btnRadius: preset.btnRadius,
      inputStyle: preset.inputStyle,
      inputRadius: preset.inputRadius,
      inputHeight: preset.inputHeight,
      sidebarStyle: preset.sidebarStyle,
      sidebarActiveIndicator: preset.sidebarActiveIndicator,
      sidebarItemSpacing: preset.sidebarItemSpacing,
      navStyle: preset.navStyle,
      navActiveIndicator: preset.navActiveIndicator,
      badgeStyle: preset.badgeStyle,
      pageTransition: preset.pageTransition,
      hoverScale: preset.hoverScale,
      focusRing: preset.focusRing,
      microInteractions: preset.microInteractions,
      contentMaxWidth: preset.contentMaxWidth,
      headerHeight: preset.headerHeight,
      sectionGap: preset.sectionGap,
      modalRadius: preset.modalRadius,
      modalBackdropBlur: preset.modalBackdropBlur,
      successColor: preset.successColor,
      successRgb: preset.successRgb,
      warningColor: preset.warningColor,
      warningRgb: preset.warningRgb,
      errorColor: preset.errorColor,
      errorRgb: preset.errorRgb,
      infoColor: preset.infoColor,
      infoRgb: preset.infoRgb,
      formLabelStyle: preset.formLabelStyle || 'above',
      formLayout: preset.formLayout || 'default',
      formErrorStyle: preset.formErrorStyle || 'border',
      formCheckboxStyle: preset.formCheckboxStyle || 'default',
      formRequiredStyle: preset.formRequiredStyle || 'asterisk',
      formFieldGap: preset.formFieldGap || 'default',
      formValidationStyle: preset.formValidationStyle || 'inline',
      formLabelWeight: preset.formLabelWeight || '700',
      inputPadding: preset.inputPadding || 'default',
      inputBg: preset.inputBg || 'transparent',
      inputBorderStyle: preset.inputBorderStyle || 'solid',
      inputFontSize: preset.inputFontSize || 'default',
      scrollbarStyle: preset.scrollbarStyle || 'default',
      tooltipStyle: preset.tooltipStyle || 'default',
      toastStyle: preset.toastStyle || 'default',
      avatarStyle: preset.avatarStyle || 'circle',
      avatarSize: preset.avatarSize || 'default',
      badgeRadius: preset.badgeRadius || 'pill'
    }));
  };

  const resetToDefaults = () => {
    setConfig(defaultConfig);
  };

  const toggleMode = () => {
    setConfig(prev => ({
      ...prev,
      mode: prev.mode === 'light' ? 'dark' : 'light'
    }));
  };

  return (
    <ThemeContext.Provider value={{ config, updateConfig, applyPreset, resetToDefaults, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
