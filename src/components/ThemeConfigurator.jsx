import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, X, Moon, Sun, Palette, Type, Ruler, RotateCcw, Check, Sparkles,
  CreditCard, Table2, Square, PanelLeft, Navigation, Zap, LayoutDashboard,
  ChevronRight, FileText
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import {
  THEME_PRESETS, FONT_OPTIONS, SPACING_OPTIONS, FONT_SIZE_OPTIONS,
  SHADOW_OPTIONS, BORDER_STYLE_OPTIONS, LINE_HEIGHT_OPTIONS,
  SIDEBAR_WIDTH_OPTIONS, ANIMATION_SPEED_OPTIONS, CARD_PADDING_OPTIONS,
  CARD_RADIUS_OPTIONS, CARD_SHADOW_OPTIONS, CARD_BORDER_WIDTH_OPTIONS,
  CARD_HOVER_EFFECT_OPTIONS, TABLE_DENSITY_OPTIONS, TABLE_RADIUS_OPTIONS,
  BTN_STYLE_OPTIONS, BTN_RADIUS_OPTIONS, INPUT_STYLE_OPTIONS,
  INPUT_RADIUS_OPTIONS, INPUT_HEIGHT_OPTIONS, SIDEBAR_STYLE_OPTIONS,
  SIDEBAR_ACTIVE_INDICATOR_OPTIONS, SIDEBAR_ITEM_SPACING_OPTIONS,
  NAV_STYLE_OPTIONS, NAV_ACTIVE_INDICATOR_OPTIONS, BADGE_STYLE_OPTIONS,
  PAGE_TRANSITION_OPTIONS, HOVER_SCALE_OPTIONS, FOCUS_RING_OPTIONS,
  CONTENT_MAX_WIDTH_OPTIONS, HEADER_HEIGHT_OPTIONS, SECTION_GAP_OPTIONS,
  MODAL_RADIUS_OPTIONS, FORM_LABEL_STYLE_OPTIONS, FORM_LAYOUT_OPTIONS,
  FORM_ERROR_STYLE_OPTIONS, FORM_CHECKBOX_STYLE_OPTIONS,
  FORM_REQUIRED_STYLE_OPTIONS, FORM_FIELD_GAP_OPTIONS, FORM_VALIDATION_STYLE_OPTIONS,
  INPUT_PADDING_OPTIONS, INPUT_BG_OPTIONS, INPUT_BORDER_STYLE_OPTIONS,
  SCROLLBAR_STYLE_OPTIONS, TOOLTIP_STYLE_OPTIONS, TOAST_STYLE_OPTIONS,
  AVATAR_STYLE_OPTIONS, AVATAR_SIZE_OPTIONS, BADGE_RADIUS_OPTIONS, INPUT_FONT_SIZE_OPTIONS
} from '../utils/themePresets';

const ThemeConfigurator = ({ isOpen, onClose }) => {
  const { config, updateConfig, applyPreset, resetToDefaults } = useTheme();
  const [activeTab, setActiveTab] = useState('appearance');

  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: <Palette size={14} /> },
    { id: 'colors', label: 'Colors', icon: <Palette size={14} /> },
    { id: 'typography', label: 'Typography', icon: <Type size={14} /> },
    { id: 'spacing', label: 'Spacing', icon: <Ruler size={14} /> },
    { id: 'cards', label: 'Cards', icon: <CreditCard size={14} /> },
    { id: 'tables', label: 'Tables', icon: <Table2 size={14} /> },
    { id: 'forms', label: 'Forms', icon: <FileText size={14} /> },
    { id: 'inputFields', label: 'Inputs', icon: <Square size={14} /> },
    { id: 'buttons', label: 'Buttons', icon: <Square size={14} /> },
    { id: 'sidebar', label: 'Sidebar', icon: <PanelLeft size={14} /> },
    { id: 'nav', label: 'Navigation', icon: <Navigation size={14} /> },
    { id: 'effects', label: 'Effects', icon: <Sparkles size={14} /> },
    { id: 'layout', label: 'Layout', icon: <LayoutDashboard size={14} /> },
    { id: 'components', label: 'Components', icon: <Settings size={14} /> }
  ];

  const SectionLabel = ({ children }) => (
    <label style={{ fontWeight: 700, fontSize: 'var(--fs-md)', color: 'var(--text)', marginBottom: 'var(--space-sm)', display: 'block' }}>{children}</label>
  );

  const OptionButton = ({ selected, onClick, children, style = {} }) => (
    <button
      onClick={onClick}
      style={{
        padding: 'var(--space-sm)',
        borderRadius: 'var(--radius-md)',
        border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        background: selected ? 'var(--accent-bg)' : 'var(--bg)',
        cursor: 'pointer',
        fontSize: 'var(--fs-sm)',
        fontWeight: 600,
        color: selected ? 'var(--accent)' : 'var(--text)',
        textAlign: 'center',
        transition: 'all 0.2s',
        ...style
      }}
    >
      {children}
    </button>
  );

  const ToggleSwitch = ({ checked, onChange, label }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text)' }}>{label}</span>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: '40px',
          height: '22px',
          borderRadius: '11px',
          border: 'none',
          background: checked ? 'var(--accent)' : 'var(--border)',
          cursor: 'pointer',
          position: 'relative',
          transition: 'background 0.2s'
        }}
      >
        <div style={{
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          background: '#fff',
          position: 'absolute',
          top: '2px',
          left: checked ? '20px' : '2px',
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
        }} />
      </button>
    </div>
  );

  const ColorPicker = ({ label, value, onChange }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
      <input
        type="color"
        value={value}
        onChange={(e) => {
          const hex = e.target.value;
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          onChange(hex, `${r}, ${g}, ${b}`);
        }}
        style={{ width: '32px', height: '32px', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', padding: 0 }}
      />
      <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)' }}>{label}</span>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 9998, backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: '400px',
              height: '100vh',
              background: 'var(--bg-card)',
              borderLeft: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{ padding: 'var(--space-lg)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <Settings size={18} color="var(--accent)" />
                <h3 style={{ margin: 0, fontSize: 'var(--fs-lg)', fontWeight: 800 }}>Theme Settings</h3>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-sub)', padding: '4px', display: 'flex' }}>
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 var(--space-xs)', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: '0 0 auto',
                    padding: 'var(--space-sm) var(--space-sm)',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                    color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-sub)',
                    fontWeight: activeTab === tab.id ? 700 : 500,
                    fontSize: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    transition: 'all 0.2s',
                    minWidth: '50px'
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-lg)' }}>
              {activeTab === 'appearance' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                  <div>
                    <SectionLabel>Mode</SectionLabel>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      {['light', 'dark'].map(mode => (
                        <OptionButton key={mode} selected={config.mode === mode} onClick={() => updateConfig({ mode })} style={{ flex: 1, padding: 'var(--space-sm) var(--space-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-xs)' }}>
                          {mode === 'light' ? <Sun size={14} /> : <Moon size={14} />}
                          {mode === 'light' ? 'Light' : 'Dark'}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Color Presets</SectionLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                      {Object.entries(THEME_PRESETS).map(([key, preset]) => (
                        <button
                          key={key}
                          onClick={() => applyPreset(key)}
                          style={{
                            padding: 'var(--space-sm)',
                            borderRadius: 'var(--radius-md)',
                            border: `2px solid ${config.preset === key ? preset.accent : 'var(--border)'}`,
                            background: config.preset === key ? `${preset.accent}15` : 'var(--bg)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.2s',
                            position: 'relative'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: preset.accent, flexShrink: 0 }} />
                            <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text)' }}>{preset.label}</span>
                          </div>
                          {config.preset === key && (
                            <div style={{ position: 'absolute', top: '4px', right: '4px' }}>
                              <Check size={12} color={preset.accent} />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Custom Accent</SectionLabel>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                      <input
                        type="color"
                        value={config.customAccent || THEME_PRESETS[config.preset]?.accent || '#c36e46'}
                        onChange={(e) => {
                          const hex = e.target.value;
                          const r = parseInt(hex.slice(1, 3), 16);
                          const g = parseInt(hex.slice(3, 5), 16);
                          const b = parseInt(hex.slice(5, 7), 16);
                          updateConfig({ customAccent: hex, customAccentRgb: `${r}, ${g}, ${b}` });
                        }}
                        style={{ width: '40px', height: '36px', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', padding: 0 }}
                      />
                      <input
                        type="text"
                        value={config.customAccent || THEME_PRESETS[config.preset]?.accent || ''}
                        onChange={(e) => {
                          const hex = e.target.value;
                          if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                            const r = parseInt(hex.slice(1, 3), 16);
                            const g = parseInt(hex.slice(3, 5), 16);
                            const b = parseInt(hex.slice(5, 7), 16);
                            updateConfig({ customAccent: hex, customAccentRgb: `${r}, ${g}, ${b}` });
                          }
                        }}
                        placeholder="#c36e46"
                        style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 'var(--fs-sm)', fontFamily: 'var(--font-mono)' }}
                      />
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Corner Roundness</SectionLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-sm)' }}>
                      {[
                        { label: 'Sharp', sm: '2px', md: '3px', lg: '4px', xl: '6px' },
                        { label: 'Default', sm: '6px', md: '8px', lg: '12px', xl: '16px' },
                        { label: 'Rounded', sm: '8px', md: '12px', lg: '18px', xl: '24px' },
                        { label: 'Pill', sm: '12px', md: '16px', lg: '24px', xl: '32px' }
                      ].map((opt) => (
                        <OptionButton key={opt.label} selected={config.radiusMd === opt.md} onClick={() => updateConfig({ radiusSm: opt.sm, radiusMd: opt.md, radiusLg: opt.lg, radiusXl: opt.xl })}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'colors' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                  <div>
                    <SectionLabel>Status Colors</SectionLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                      <ColorPicker
                        label="Success"
                        value={config.successColor}
                        onChange={(hex, rgb) => updateConfig({ successColor: hex, successRgb: rgb })}
                      />
                      <ColorPicker
                        label="Warning"
                        value={config.warningColor}
                        onChange={(hex, rgb) => updateConfig({ warningColor: hex, warningRgb: rgb })}
                      />
                      <ColorPicker
                        label="Error"
                        value={config.errorColor}
                        onChange={(hex, rgb) => updateConfig({ errorColor: hex, errorRgb: rgb })}
                      />
                      <ColorPicker
                        label="Info"
                        value={config.infoColor}
                        onChange={(hex, rgb) => updateConfig({ infoColor: hex, infoRgb: rgb })}
                      />
                    </div>
                  </div>

                  <div style={{ padding: 'var(--space-md)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <h4 style={{ margin: '0 0 var(--space-sm)', fontSize: 'var(--fs-sm)', fontWeight: 700 }}>Preview</h4>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '12px', background: `rgb(${config.successRgb})`, color: '#fff', fontSize: 'var(--fs-xs)', fontWeight: 600 }}>Success</span>
                      <span style={{ padding: '4px 10px', borderRadius: '12px', background: `rgb(${config.warningRgb})`, color: '#fff', fontSize: 'var(--fs-xs)', fontWeight: 600 }}>Warning</span>
                      <span style={{ padding: '4px 10px', borderRadius: '12px', background: `rgb(${config.errorRgb})`, color: '#fff', fontSize: 'var(--fs-xs)', fontWeight: 600 }}>Error</span>
                      <span style={{ padding: '4px 10px', borderRadius: '12px', background: `rgb(${config.infoRgb})`, color: '#fff', fontSize: 'var(--fs-xs)', fontWeight: 600 }}>Info</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'typography' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                  <div>
                    <SectionLabel>Font Family</SectionLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                      {FONT_OPTIONS.map(opt => (
                        <OptionButton key={opt.value} selected={config.font === opt.value} onClick={() => updateConfig({ font: opt.value })} style={{ textAlign: 'left', padding: 'var(--space-sm) var(--space-md)', fontFamily: opt.value }}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Font Size</SectionLabel>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      {Object.keys(FONT_SIZE_OPTIONS).map(key => (
                        <OptionButton key={key} selected={config.fontSize === key} onClick={() => updateConfig({ fontSize: key })} style={{ flex: 1, textTransform: 'capitalize' }}>
                          {key}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Line Height</SectionLabel>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      {Object.entries(LINE_HEIGHT_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.lineHeight === key} onClick={() => updateConfig({ lineHeight: key })} style={{ flex: 1 }}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                    <div style={{ marginTop: 'var(--space-sm)', padding: 'var(--space-sm) var(--space-md)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', lineHeight: LINE_HEIGHT_OPTIONS[config.lineHeight]?.value || '1.5' }}>
                      The quick brown fox jumps over the lazy dog. This preview shows your current line height setting.
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'spacing' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                  <div>
                    <SectionLabel>Spacing Scale</SectionLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                      {Object.entries(SPACING_OPTIONS).map(([key, values]) => (
                        <OptionButton key={key} selected={config.spacing === key} onClick={() => updateConfig({ spacing: key })} style={{ textAlign: 'left', padding: 'var(--space-sm) var(--space-md)' }}>
                          <div style={{ marginBottom: '4px', textTransform: 'capitalize' }}>{key}</div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {Object.entries(values).map(([k, v]) => (
                              <span key={k} style={{ fontSize: '10px', color: 'var(--text-sub)', fontFamily: 'var(--font-mono)' }}>
                                {k}:{v}
                              </span>
                            ))}
                          </div>
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Sidebar Width</SectionLabel>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      {Object.entries(SIDEBAR_WIDTH_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.sidebarWidth === key} onClick={() => updateConfig({ sidebarWidth: key })} style={{ flex: 1 }}>
                          {opt.label}
                          <div style={{ fontSize: '10px', color: 'var(--text-sub)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{opt.value}</div>
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div style={{ padding: 'var(--space-md)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <h4 style={{ margin: '0 0 var(--space-sm)', fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text)' }}>Preview</h4>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                      {['var(--space-xs)', 'var(--space-sm)', 'var(--space-md)', 'var(--space-lg)', 'var(--space-xl)'].map((v, i) => (
                        <div key={i} style={{ width: v, height: '24px', background: 'var(--accent)', borderRadius: 'var(--radius-sm)', opacity: 0.6 }} title={v} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'cards' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                  <div>
                    <SectionLabel>Card Padding</SectionLabel>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      {Object.entries(CARD_PADDING_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.cardPadding === key} onClick={() => updateConfig({ cardPadding: key })} style={{ flex: 1 }}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Card Radius</SectionLabel>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      {Object.entries(CARD_RADIUS_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.cardRadius === key} onClick={() => updateConfig({ cardRadius: key })} style={{ flex: 1 }}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Card Shadow</SectionLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                      {Object.entries(CARD_SHADOW_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.cardShadow === key} onClick={() => updateConfig({ cardShadow: key })}>
                          <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: opt.value, margin: '0 auto var(--space-xs)' }} />
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Card Border Width</SectionLabel>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      {Object.entries(CARD_BORDER_WIDTH_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.cardBorderWidth === key} onClick={() => updateConfig({ cardBorderWidth: key })} style={{ flex: 1 }}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Hover Effect</SectionLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                      {Object.entries(CARD_HOVER_EFFECT_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.cardHoverEffect === key} onClick={() => updateConfig({ cardHoverEffect: key })}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div style={{ padding: 'var(--space-md)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <h4 style={{ margin: '0 0 var(--space-sm)', fontSize: 'var(--fs-sm)', fontWeight: 700 }}>Preview</h4>
                    <div style={{ padding: CARD_PADDING_OPTIONS[config.cardPadding]?.value || '20px', background: 'var(--bg-card)', border: `${CARD_BORDER_WIDTH_OPTIONS[config.cardBorderWidth]?.value || '1px'} solid var(--border)`, borderRadius: CARD_RADIUS_OPTIONS[config.cardRadius]?.value || '12px', boxShadow: CARD_SHADOW_OPTIONS[config.cardShadow]?.value || 'var(--shadow-md)', transition: 'transform 0.2s, box-shadow 0.2s' }}>
                      <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text)' }}>Card Title</div>
                      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-sub)', marginTop: '4px' }}>Card content preview</div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'tables' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                  <div>
                    <SectionLabel>Table Density</SectionLabel>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      {Object.entries(TABLE_DENSITY_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.tableDensity === key} onClick={() => updateConfig({ tableDensity: key })} style={{ flex: 1 }}>
                          {opt.label}
                          <div style={{ fontSize: '10px', color: 'var(--text-sub)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{opt.fontSize}</div>
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Table Radius</SectionLabel>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      {Object.entries(TABLE_RADIUS_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.tableRadius === key} onClick={() => updateConfig({ tableRadius: key })} style={{ flex: 1 }}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <ToggleSwitch
                      label="Show Row Stripes"
                      checked={config.tableStripe}
                      onChange={(val) => updateConfig({ tableStripe: val })}
                    />
                  </div>

                  <div>
                    <ToggleSwitch
                      label="Highlight Row on Hover"
                      checked={config.tableHoverBg}
                      onChange={(val) => updateConfig({ tableHoverBg: val })}
                    />
                  </div>

                  <div style={{ padding: 'var(--space-md)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <h4 style={{ margin: '0 0 var(--space-sm)', fontSize: 'var(--fs-sm)', fontWeight: 700 }}>Preview</h4>
                    <div style={{ overflow: 'hidden', borderRadius: TABLE_RADIUS_OPTIONS[config.tableRadius]?.value || '10px', border: '1px solid var(--border)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: TABLE_DENSITY_OPTIONS[config.tableDensity]?.fontSize || '0.85rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-subtle)' }}>
                            <th style={{ padding: TABLE_DENSITY_OPTIONS[config.tableDensity]?.padding || '10px 14px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-sub)' }}>Name</th>
                            <th style={{ padding: TABLE_DENSITY_OPTIONS[config.tableDensity]?.padding || '10px 14px', textAlign: 'right', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-sub)' }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ background: config.tableStripe ? 'rgba(0,0,0,0.02)' : 'var(--bg-card)' }}>
                            <td style={{ padding: TABLE_DENSITY_OPTIONS[config.tableDensity]?.padding || '10px 14px', borderBottom: '1px solid var(--border)' }}>Item A</td>
                            <td style={{ padding: TABLE_DENSITY_OPTIONS[config.tableDensity]?.padding || '10px 14px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>$1,200</td>
                          </tr>
                          <tr style={{ background: 'var(--bg-card)' }}>
                            <td style={{ padding: TABLE_DENSITY_OPTIONS[config.tableDensity]?.padding || '10px 14px', borderBottom: '1px solid var(--border)' }}>Item B</td>
                            <td style={{ padding: TABLE_DENSITY_OPTIONS[config.tableDensity]?.padding || '10px 14px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>$800</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'forms' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                  <div>
                    <SectionLabel>Label Style</SectionLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                      {Object.entries(FORM_LABEL_STYLE_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.formLabelStyle === key} onClick={() => updateConfig({ formLabelStyle: key })}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Form Layout</SectionLabel>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      {Object.entries(FORM_LAYOUT_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.formLayout === key} onClick={() => updateConfig({ formLayout: key })} style={{ flex: 1 }}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Field Gap</SectionLabel>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      {Object.entries(FORM_FIELD_GAP_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.formFieldGap === key} onClick={() => updateConfig({ formFieldGap: key })} style={{ flex: 1 }}>
                          {opt.label}
                          <div style={{ fontSize: '10px', color: 'var(--text-sub)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{opt.value}</div>
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Error Style</SectionLabel>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      {Object.entries(FORM_ERROR_STYLE_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.formErrorStyle === key} onClick={() => updateConfig({ formErrorStyle: key })} style={{ flex: 1 }}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Checkbox / Radio Style</SectionLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                      {Object.entries(FORM_CHECKBOX_STYLE_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.formCheckboxStyle === key} onClick={() => updateConfig({ formCheckboxStyle: key })}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Required Indicator</SectionLabel>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      {Object.entries(FORM_REQUIRED_STYLE_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.formRequiredStyle === key} onClick={() => updateConfig({ formRequiredStyle: key })} style={{ flex: 1 }}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Validation Display</SectionLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                      {Object.entries(FORM_VALIDATION_STYLE_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.formValidationStyle === key} onClick={() => updateConfig({ formValidationStyle: key })}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Label Weight</SectionLabel>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      {['500', '600', '700', '800'].map(weight => (
                        <OptionButton key={weight} selected={config.formLabelWeight === weight} onClick={() => updateConfig({ formLabelWeight: weight })} style={{ flex: 1 }}>
                          {weight}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div style={{ padding: 'var(--space-md)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <h4 style={{ margin: '0 0 var(--space-md)', fontSize: 'var(--fs-sm)', fontWeight: 700 }}>Preview</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: FORM_FIELD_GAP_OPTIONS[config.formFieldGap]?.value || '1.25rem' }}>
                      <div>
                        {config.formLabelStyle === 'above' && (
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: config.formLabelWeight || '700', color: 'var(--text-sub)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Full Name {config.formRequiredStyle === 'asterisk' && <span style={{ color: 'var(--rose-text)' }}>*</span>}
                            {config.formRequiredStyle === 'dot' && <span style={{ color: 'var(--rose-text)', fontSize: '0.5rem', verticalAlign: 'super' }}>&#9679;</span>}
                          </label>
                        )}
                        <input
                          type="text"
                          placeholder={config.formLabelStyle === 'placeholder' ? 'Full Name' : 'Enter your name'}
                          style={{
                            width: '100%',
                            padding: FORM_LAYOUT_OPTIONS[config.formLayout]?.padding || '10px 14px',
                            borderRadius: 'var(--input-radius)',
                            border: '1.5px solid var(--border)',
                            background: 'var(--bg)',
                            color: 'var(--text)',
                            fontSize: 'var(--fs-sm)',
                            outline: 'none'
                          }}
                        />
                      </div>
                      <div>
                        {config.formLabelStyle === 'above' && (
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: config.formLabelWeight || '700', color: 'var(--text-sub)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Email {config.formRequiredStyle === 'asterisk' && <span style={{ color: 'var(--rose-text)' }}>*</span>}
                            {config.formRequiredStyle === 'dot' && <span style={{ color: 'var(--rose-text)', fontSize: '0.5rem', verticalAlign: 'super' }}>&#9679;</span>}
                          </label>
                        )}
                        <input
                          type="email"
                          placeholder={config.formLabelStyle === 'placeholder' ? 'Email' : 'you@example.com'}
                          style={{
                            width: '100%',
                            padding: FORM_LAYOUT_OPTIONS[config.formLayout]?.padding || '10px 14px',
                            borderRadius: 'var(--input-radius)',
                            border: '1.5px solid var(--border)',
                            background: 'var(--bg)',
                            color: 'var(--text)',
                            fontSize: 'var(--fs-sm)',
                            outline: 'none'
                          }}
                        />
                        <div style={{
                          marginTop: '4px',
                          fontSize: '0.7rem',
                          color: 'var(--rose-text)',
                          display: config.formValidationStyle === 'inline' ? 'block' : 'none'
                        }}>
                          This field is required
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--fs-sm)', color: 'var(--text)', cursor: 'pointer' }}>
                          <input type="checkbox" defaultChecked style={{ accentColor: 'var(--accent)' }} />
                          Option A
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--fs-sm)', color: 'var(--text)', cursor: 'pointer' }}>
                          <input type="radio" name="preview" defaultChecked style={{ accentColor: 'var(--accent)' }} />
                          Option B
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'inputFields' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                  <div>
                    <SectionLabel>Input Style</SectionLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                      {Object.entries(INPUT_STYLE_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.inputStyle === key} onClick={() => updateConfig({ inputStyle: key })}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Input Padding</SectionLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                      {Object.entries(INPUT_PADDING_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.inputPadding === key} onClick={() => updateConfig({ inputPadding: key })}>
                          {opt.label}
                          <div style={{ fontSize: '10px', color: 'var(--text-sub)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{opt.value}</div>
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Input Radius</SectionLabel>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      {Object.entries(INPUT_RADIUS_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.inputRadius === key} onClick={() => updateConfig({ inputRadius: key })} style={{ flex: 1 }}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Input Height</SectionLabel>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      {Object.entries(INPUT_HEIGHT_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.inputHeight === key} onClick={() => updateConfig({ inputHeight: key })} style={{ flex: 1 }}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Input Font Size</SectionLabel>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      {Object.entries(INPUT_FONT_SIZE_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.inputFontSize === key} onClick={() => updateConfig({ inputFontSize: key })} style={{ flex: 1 }}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Input Background</SectionLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                      {Object.entries(INPUT_BG_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.inputBg === key} onClick={() => updateConfig({ inputBg: key })}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Input Border Style</SectionLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                      {Object.entries(INPUT_BORDER_STYLE_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.inputBorderStyle === key} onClick={() => updateConfig({ inputBorderStyle: key })}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div style={{ padding: 'var(--space-md)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <h4 style={{ margin: '0 0 var(--space-sm)', fontSize: 'var(--fs-sm)', fontWeight: 700 }}>Preview</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                      <input
                        type="text"
                        placeholder="Text input..."
                        style={{
                          width: '100%',
                          padding: INPUT_PADDING_OPTIONS[config.inputPadding]?.value || '10px 14px',
                          borderRadius: INPUT_RADIUS_OPTIONS[config.inputRadius]?.value || '8px',
                          border: `${INPUT_BORDER_STYLE_OPTIONS[config.inputBorderStyle]?.value || 'solid'} var(--input-border-width, 1.5px) var(--border)`,
                          background: INPUT_BG_OPTIONS[config.inputBg]?.value || 'var(--bg)',
                          color: 'var(--text)',
                          fontSize: INPUT_FONT_SIZE_OPTIONS[config.inputFontSize]?.value || '0.88rem',
                          height: INPUT_HEIGHT_OPTIONS[config.inputHeight]?.value || '38px',
                          boxSizing: 'border-box',
                          outline: 'none'
                        }}
                      />
                      <select
                        style={{
                          width: '100%',
                          padding: INPUT_PADDING_OPTIONS[config.inputPadding]?.value || '10px 14px',
                          borderRadius: INPUT_RADIUS_OPTIONS[config.inputRadius]?.value || '8px',
                          border: `${INPUT_BORDER_STYLE_OPTIONS[config.inputBorderStyle]?.value || 'solid'} var(--input-border-width, 1.5px) var(--border)`,
                          background: INPUT_BG_OPTIONS[config.inputBg]?.value || 'var(--bg)',
                          color: 'var(--text)',
                          fontSize: INPUT_FONT_SIZE_OPTIONS[config.inputFontSize]?.value || '0.88rem',
                          height: INPUT_HEIGHT_OPTIONS[config.inputHeight]?.value || '38px',
                          boxSizing: 'border-box',
                          outline: 'none'
                        }}
                      >
                        <option>Select option...</option>
                        <option>Option 1</option>
                        <option>Option 2</option>
                      </select>
                      <textarea
                        placeholder="Textarea..."
                        rows={3}
                        style={{
                          width: '100%',
                          padding: INPUT_PADDING_OPTIONS[config.inputPadding]?.value || '10px 14px',
                          borderRadius: INPUT_RADIUS_OPTIONS[config.inputRadius]?.value || '8px',
                          border: `${INPUT_BORDER_STYLE_OPTIONS[config.inputBorderStyle]?.value || 'solid'} var(--input-border-width, 1.5px) var(--border)`,
                          background: INPUT_BG_OPTIONS[config.inputBg]?.value || 'var(--bg)',
                          color: 'var(--text)',
                          fontSize: INPUT_FONT_SIZE_OPTIONS[config.inputFontSize]?.value || '0.88rem',
                          boxSizing: 'border-box',
                          outline: 'none',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'buttons' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                  <div>
                    <SectionLabel>Button Style</SectionLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                      {Object.entries(BTN_STYLE_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.btnStyle === key} onClick={() => updateConfig({ btnStyle: key })}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Button Radius</SectionLabel>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      {Object.entries(BTN_RADIUS_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.btnRadius === key} onClick={() => updateConfig({ btnRadius: key })} style={{ flex: 1 }}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div style={{ padding: 'var(--space-md)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <h4 style={{ margin: '0 0 var(--space-sm)', fontSize: 'var(--fs-sm)', fontWeight: 700 }}>Preview</h4>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                      <button style={{
                        padding: '8px 16px',
                        borderRadius: BTN_RADIUS_OPTIONS[config.btnRadius]?.value || '8px',
                        border: config.btnStyle === 'outline' ? '1px solid var(--accent)' : 'none',
                        background: config.btnStyle === 'filled' || config.btnStyle === 'default' ? 'var(--accent)' : config.btnStyle === 'ghost' ? 'transparent' : 'transparent',
                        color: config.btnStyle === 'filled' || config.btnStyle === 'default' ? '#fff' : 'var(--accent)',
                        fontWeight: 600,
                        fontSize: 'var(--fs-sm)',
                        cursor: 'pointer'
                      }}>Primary</button>
                      <button style={{
                        padding: '8px 16px',
                        borderRadius: BTN_RADIUS_OPTIONS[config.btnRadius]?.value || '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-card)',
                        color: 'var(--text)',
                        fontWeight: 600,
                        fontSize: 'var(--fs-sm)',
                        cursor: 'pointer'
                      }}>Secondary</button>
                    </div>
                  </div>
                </div>
              )}



              {activeTab === 'sidebar' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                  <div>
                    <SectionLabel>Sidebar Style</SectionLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                      {Object.entries(SIDEBAR_STYLE_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.sidebarStyle === key} onClick={() => updateConfig({ sidebarStyle: key })}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Active Indicator</SectionLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                      {Object.entries(SIDEBAR_ACTIVE_INDICATOR_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.sidebarActiveIndicator === key} onClick={() => updateConfig({ sidebarActiveIndicator: key })}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Item Spacing</SectionLabel>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      {Object.entries(SIDEBAR_ITEM_SPACING_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.sidebarItemSpacing === key} onClick={() => updateConfig({ sidebarItemSpacing: key })} style={{ flex: 1 }}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div style={{ padding: 'var(--space-md)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <h4 style={{ margin: '0 0 var(--space-sm)', fontSize: 'var(--fs-sm)', fontWeight: 700 }}>Preview</h4>
                    <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: 'var(--space-sm)', display: 'flex', flexDirection: 'column', gap: SIDEBAR_ITEM_SPACING_OPTIONS[config.sidebarItemSpacing]?.value || '4px' }}>
                      {['Dashboard', 'Approvals', 'Reports'].map((item, i) => (
                        <div key={item} style={{
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: i === 0 ? (config.sidebarActiveIndicator === 'background' ? 'var(--accent-bg)' : 'transparent') : 'transparent',
                          color: i === 0 ? 'var(--accent)' : 'var(--text-sub)',
                          fontSize: 'var(--fs-sm)',
                          fontWeight: i === 0 ? 700 : 500,
                          position: 'relative',
                          borderLeft: config.sidebarActiveIndicator === 'bar' && i === 0 ? '3px solid var(--accent)' : '3px solid transparent'
                        }}>
                          {item}
                          {config.sidebarActiveIndicator === 'dot' && i === 0 && (
                            <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' }} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'nav' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                  <div>
                    <SectionLabel>Navigation Style</SectionLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                      {Object.entries(NAV_STYLE_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.navStyle === key} onClick={() => updateConfig({ navStyle: key })}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Active Indicator</SectionLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                      {Object.entries(NAV_ACTIVE_INDICATOR_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.navActiveIndicator === key} onClick={() => updateConfig({ navActiveIndicator: key })}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Badge Style</SectionLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                      {Object.entries(BADGE_STYLE_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.badgeStyle === key} onClick={() => updateConfig({ badgeStyle: key })}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div style={{ padding: 'var(--space-md)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <h4 style={{ margin: '0 0 var(--space-sm)', fontSize: 'var(--fs-sm)', fontWeight: 700 }}>Preview</h4>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                      {['Tab 1', 'Tab 2', 'Tab 3'].map((tab, i) => (
                        <div key={tab} style={{
                          padding: '8px 16px',
                          borderRadius: config.navStyle === 'pills' ? '9999px' : 'var(--radius-sm)',
                          background: i === 0 ? (config.navActiveIndicator === 'background' ? 'var(--accent-bg)' : 'transparent') : 'transparent',
                          color: i === 0 ? 'var(--accent)' : 'var(--text-sub)',
                          fontWeight: i === 0 ? 700 : 500,
                          fontSize: 'var(--fs-sm)',
                          borderBottom: config.navActiveIndicator === 'underline' && i === 0 ? '2px solid var(--accent)' : '2px solid transparent',
                          position: 'relative'
                        }}>
                          {tab}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'effects' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                  <div>
                    <SectionLabel>Shadow Intensity</SectionLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                      {Object.entries(SHADOW_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.shadow === key} onClick={() => updateConfig({ shadow: key })} style={{ padding: 'var(--space-md)' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: opt.md, margin: '0 auto var(--space-xs)' }} />
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Border Width</SectionLabel>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      {Object.entries(BORDER_STYLE_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.borderStyle === key} onClick={() => updateConfig({ borderStyle: key })} style={{ flex: 1, padding: 'var(--space-md)' }}>
                          <div style={{ width: '100%', height: opt.width, background: 'var(--accent)', borderRadius: '1px', marginBottom: 'var(--space-xs)' }} />
                          {opt.label}
                          <div style={{ fontSize: '10px', color: 'var(--text-sub)', fontFamily: 'var(--font-mono)' }}>{opt.width}</div>
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Animation Speed</SectionLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                      {Object.entries(ANIMATION_SPEED_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.animationSpeed === key} onClick={() => updateConfig({ animationSpeed: key })}>
                          {opt.label}
                          <div style={{ fontSize: '10px', color: 'var(--text-sub)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{opt.value}</div>
                        </OptionButton>
                      ))}
                    </div>
                    <div style={{ marginTop: 'var(--space-sm)', padding: 'var(--space-sm) var(--space-md)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent)', transition: `transform var(--transition-speed, 250ms)`, cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
                      <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-sub)' }}>Hover the circle to test speed</span>
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Page Transition</SectionLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                      {Object.entries(PAGE_TRANSITION_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.pageTransition === key} onClick={() => updateConfig({ pageTransition: key })}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Hover Scale</SectionLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                      {Object.entries(HOVER_SCALE_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.hoverScale === key} onClick={() => updateConfig({ hoverScale: key })}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Focus Ring</SectionLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                      {Object.entries(FOCUS_RING_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.focusRing === key} onClick={() => updateConfig({ focusRing: key })}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <ToggleSwitch
                      label="Micro-interactions"
                      checked={config.microInteractions}
                      onChange={(val) => updateConfig({ microInteractions: val })}
                    />
                  </div>

                  <div>
                    <SectionLabel>Modal Settings</SectionLabel>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                      {Object.entries(MODAL_RADIUS_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.modalRadius === key} onClick={() => updateConfig({ modalRadius: key })} style={{ flex: 1 }}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                    <ToggleSwitch
                      label="Backdrop Blur"
                      checked={config.modalBackdropBlur}
                      onChange={(val) => updateConfig({ modalBackdropBlur: val })}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'layout' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                  <div>
                    <SectionLabel>Content Max Width</SectionLabel>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      {Object.entries(CONTENT_MAX_WIDTH_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.contentMaxWidth === key} onClick={() => updateConfig({ contentMaxWidth: key })} style={{ flex: 1 }}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Header Height</SectionLabel>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      {Object.entries(HEADER_HEIGHT_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.headerHeight === key} onClick={() => updateConfig({ headerHeight: key })} style={{ flex: 1 }}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Section Gap</SectionLabel>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      {Object.entries(SECTION_GAP_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.sectionGap === key} onClick={() => updateConfig({ sectionGap: key })} style={{ flex: 1 }}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'components' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                  <div>
                    <SectionLabel>Scrollbar Style</SectionLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                      {Object.entries(SCROLLBAR_STYLE_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.scrollbarStyle === key} onClick={() => updateConfig({ scrollbarStyle: key })}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Tooltip Style</SectionLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                      {Object.entries(TOOLTIP_STYLE_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.tooltipStyle === key} onClick={() => updateConfig({ tooltipStyle: key })}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Toast Style</SectionLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                      {Object.entries(TOAST_STYLE_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.toastStyle === key} onClick={() => updateConfig({ toastStyle: key })}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Avatar Shape</SectionLabel>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      {Object.entries(AVATAR_STYLE_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.avatarStyle === key} onClick={() => updateConfig({ avatarStyle: key })} style={{ flex: 1 }}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Avatar Size</SectionLabel>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      {Object.entries(AVATAR_SIZE_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.avatarSize === key} onClick={() => updateConfig({ avatarSize: key })} style={{ flex: 1 }}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>Badge Radius</SectionLabel>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      {Object.entries(BADGE_RADIUS_OPTIONS).map(([key, opt]) => (
                        <OptionButton key={key} selected={config.badgeRadius === key} onClick={() => updateConfig({ badgeRadius: key })} style={{ flex: 1 }}>
                          {opt.label}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div style={{ padding: 'var(--space-md)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <h4 style={{ margin: '0 0 var(--space-sm)', fontSize: 'var(--fs-sm)', fontWeight: 700 }}>Preview</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                      <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                        <div style={{
                          width: AVATAR_SIZE_OPTIONS[config.avatarSize]?.value || '36px',
                          height: AVATAR_SIZE_OPTIONS[config.avatarSize]?.value || '36px',
                          borderRadius: AVATAR_STYLE_OPTIONS[config.avatarStyle]?.value || '50%',
                          background: 'linear-gradient(135deg, var(--accent), rgba(var(--accent-rgb), 0.7))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '0.75rem'
                        }}>JD</div>
                        <div style={{
                          width: AVATAR_SIZE_OPTIONS[config.avatarSize]?.value || '36px',
                          height: AVATAR_SIZE_OPTIONS[config.avatarSize]?.value || '36px',
                          borderRadius: AVATAR_STYLE_OPTIONS[config.avatarStyle]?.value || '50%',
                          background: 'var(--emerald-text)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '0.75rem'
                        }}>AB</div>
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: BADGE_RADIUS_OPTIONS[config.badgeRadius]?.value || '9999px',
                          background: 'var(--accent)',
                          color: '#fff',
                          fontSize: 'var(--fs-xs)',
                          fontWeight: 600
                        }}>Accent</span>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: BADGE_RADIUS_OPTIONS[config.badgeRadius]?.value || '9999px',
                          background: 'var(--emerald-bg)',
                          color: 'var(--emerald-text)',
                          fontSize: 'var(--fs-xs)',
                          fontWeight: 600
                        }}>Success</span>
                      </div>
                      <div
                        data-tooltip="This is a tooltip"
                        data-tooltip-style={config.tooltipStyle}
                        style={{
                          padding: '8px 16px',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          fontSize: 'var(--fs-sm)',
                          color: 'var(--text)',
                          display: 'inline-block',
                          width: 'fit-content'
                        }}
                      >
                        Hover for tooltip
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: 'var(--space-md) var(--space-lg)', borderTop: '1px solid var(--border)', display: 'flex', gap: 'var(--space-sm)' }}>
              <button
                onClick={resetToDefaults}
                style={{
                  flex: 1,
                  padding: 'var(--space-sm)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontWeight: 600,
                  fontSize: 'var(--fs-sm)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--space-xs)'
                }}
              >
                <RotateCcw size={14} /> Reset
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 2,
                  padding: 'var(--space-sm)',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 'var(--fs-sm)',
                  cursor: 'pointer'
                }}
              >
                Done
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export const ThemeToggleButton = ({ onClick }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.1, rotate: 15 }}
      whileTap={{ scale: 0.9 }}
      className="theme-toggle"
      onClick={onClick}
      title="Theme Settings"
      style={{
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        color: 'var(--text)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Settings size={16} />
    </motion.button>
  );
};

export default ThemeConfigurator;
