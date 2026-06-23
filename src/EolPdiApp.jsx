import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import html2pdf from "html2pdf.js";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import logo from "./logo.webp";
const arLogo = "/AR LOGO.png";
import { API_BASE_URL } from "./constants";

// Shared html2pdf options
const PDF_OPTS_EOL = {
  margin: 0,
  image: { type: 'jpeg', quality: 0.98 },
  html2canvas: { scale: 2, useCORS: true, logging: false, letterRendering: true, windowWidth: 1400 },
  jsPDF: { unit: 'mm', format: 'a3', orientation: 'landscape', compress: true },
  pagebreak: { mode: 'avoid-all' }
};
const PDF_OPTS_PDI = {
  margin: 5,
  image: { type: 'jpeg', quality: 0.98 },
  html2canvas: { scale: 2, useCORS: true, logging: false, letterRendering: true, windowWidth: 1400 },
  jsPDF: { unit: 'mm', format: 'a3', orientation: 'landscape', compress: true, precision: 16 },
  pagebreak: { mode: 'avoid-all' }
};

const NOT_IMPACTED_STATUS = "NOT OK, But Motor Performance Not Impacted";
const BEMF_SPEEDS = [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500];
const QI_PDI_DEFAULTS = [
  { no: 1, desc: "Spigot Seat", spec: "154,90 (0,00/-0,03) mm", method: "OD Snap gauge" },
  { no: 2, desc: "Front Mounting Thread", spec: "3x M6x1 - 6H, l 18,00 mm", method: "Plug gauge check found OK" },
  { no: 3, desc: "Shaft OD Total Runout Wrt Datum B", spec: "0,1 mm", method: "Total Indicator Reading" },
  { no: 4, desc: "Shaft Front Face to Front Mount Spigot Seating Distance", spec: "28,20 ± 0,50 mm", method: "Height Gauge" },
  { no: 5, desc: "Shaft Spline", spec: "As per Drawing", method: "Master Spline" },
  { no: 6, desc: "Dry Leak Test", spec: "at Min. 0,2 bar", method: "Pressurised air and foam water" },
  { no: 7, desc: "Thermister Fuction", spec: "Resistance at room temperature", method: "Resistance meter" },
  { no: 8, desc: "Sensor Cable Color Sequence", spec: "Pin 1 - Red (Vdd (+5V))", method: "Visual" },
  { no: 9, desc: "Sensor Cable Color Sequence", spec: "Pin 2 - White (PT 1000 +ve)", method: "Visual" },
  { no: 10, desc: "Sensor Cable Color Sequence", spec: "Pin 3 - Yellow (Sin output)", method: "Visual" },
  { no: 11, desc: "Sensor Cable Color Sequence", spec: "Pin 4 - Blue (Cos output)", method: "Visual" },
  { no: 12, desc: "Sensor Cable Color Sequence", spec: "Pin 5 - Black (Common GND)", method: "Visual" },
  { no: 13, desc: "Sensor Cable Color Sequence", spec: "Pin 6 - Green (Shield + Wire)", method: "Visual" },
  { no: 14, desc: "Motor Length", spec: "177,8 (+/- 1,5)", method: "Height Gauge" },
  { no: 15, desc: "Motor Weight", spec: "14,7 (+/- 0,15)", method: "Weight Scale" },
  { no: 16, desc: "Phase Cable Grommet", spec: "Manual Assembly", method: "Visual" },
  { no: 17, desc: "Terminal Cover", spec: "Manual Assembly", method: "Visual" },
  { no: 18, desc: "Terminal Cover Assembly Bolts", spec: "Manual Assembly", method: "Visual" },
  { no: 19, desc: "Phase Cable Assembly Bolts", spec: "Manual Assembly", method: "Visual" },
  { no: 20, desc: "Visual Defects", spec: "Free From Rust, Dust, Physical Damage", method: "Visual" },
  { no: 21, desc: "Deviations if any", spec: "Connector Push mount not provided, push mount cable tie provided as alternative", method: "—" }
];

function pct(dut, gs) {
  if (!gs || gs === 0) return null;
  return ((dut - gs) / gs * 100);
}
function fmtPct(v) {
  if (v === null || isNaN(v)) return "—";
  return (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
}

const LIGHT_THEME = {
  bg: "#f5f5f4",
  surface: "#ffffff",
  surfaceAlt: "#f0efed",
  border: "#e5e4e2",
  text: "#292524",
  textMuted: "#78716c",
  primary: "#c36e46",
  accent: "#c36e46",
  success: "#065f46",
  error: "#9f1239",
  headerGrad: "linear-gradient(135deg, #fef4ed, transparent 60%)",
  chartGrid: "#d6d3d1",
};

function readCSSVar(name, fallback = '') {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  } catch {
    return fallback;
  }
}

function resolveThemeFromCSS() {
  return {
    bg: readCSSVar('--bg', LIGHT_THEME.bg),
    surface: readCSSVar('--bg-card', LIGHT_THEME.surface),
    surfaceAlt: readCSSVar('--bg-subtle', LIGHT_THEME.surfaceAlt),
    border: readCSSVar('--border', LIGHT_THEME.border),
    text: readCSSVar('--text', LIGHT_THEME.text),
    textMuted: readCSSVar('--text-sub', LIGHT_THEME.textMuted),
    primary: readCSSVar('--accent', LIGHT_THEME.primary),
    accent: readCSSVar('--accent', LIGHT_THEME.accent),
    success: readCSSVar('--emerald-text', LIGHT_THEME.success),
    error: readCSSVar('--rose-text', LIGHT_THEME.error),
    headerGrad: `linear-gradient(135deg, ${readCSSVar('--accent-bg', '#fef4ed')}, transparent 60%)`,
    chartGrid: readCSSVar('--border-strong', LIGHT_THEME.chartGrid),
  };
}

function Badge({ pass }) {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const style = {
    padding: "2px 8px",
    fontSize: "11px",
    fontWeight: "800",
    borderRadius: "4px",
    border: `1px solid ${pass ? 'var(--emerald-text)' : 'var(--rose-text)'}`,
    background: pass ? (isDark ? '#064e3b' : 'var(--emerald-bg)') : (isDark ? '#7f1d1d' : 'var(--rose-bg)'),
    color: pass ? (isDark ? '#6ee7b7' : 'var(--emerald-text)') : (isDark ? '#fca5a5' : 'var(--rose-text)'),
    display: "inline-block",
    boxShadow: pass ? '0 0 10px var(--emerald-text)33' : '0 0 10px var(--rose-text)33',
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  };
  return <span style={style}>{pass ? "PASS" : "FAIL"}</span>;
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const getStyles = (theme) => ({
  app: {
    fontFamily: "inherit",
    background: theme.bg,
    minHeight: "100vh",
    color: theme.text,
    transition: "background 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    position: "relative",
    display: "flex",
    flexDirection: "column"
  },
  header: {
    background: theme.headerGrad,
    borderBottom: `1px solid ${theme.border}`,
    padding: "8px 16px",
    display: "flex",
    alignItems: "center",
    gap: 16,
    position: "sticky",
    top: 0,
    zIndex: 1000,
    backdropFilter: "blur(12px)"
  },
  title: { fontSize: "clamp(1.1rem, 2.2vw, 1.4rem)", fontWeight: 800, color: theme.text, letterSpacing: "-0.02em" },
  stepBar: {
    display: "flex",
    gap: 8,
    background: theme.surfaceAlt,
    borderBottom: `1px solid ${theme.border}`,
    padding: "8px 32px",
    position: "sticky",
    top: 65,
    zIndex: 999,
    backdropFilter: "blur(8px)"
  },
  stepBtn: (active, done) => ({
    padding: "10px 20px", fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: "pointer", border: "none",
    borderRadius: "8px 8px 0 0",
    borderBottom: active ? `3px solid ${theme.primary}` : "3px solid transparent",
    background: active ? `${theme.primary}10` : "transparent",
    color: active ? theme.primary : done ? theme.success : theme.textMuted,
    textTransform: "uppercase", transition: "all 0.2s ease",
    display: "flex", alignItems: "center", gap: 8
  }),
  tabBar: {
    display: "flex", alignItems: "center", gap: 2,
    padding: "8px 0", borderBottom: `1px solid ${theme.border}`,
    marginBottom: 20, flexWrap: "wrap", overflowX: "auto"
  },
  tabBtn: (active) => ({
    padding: "8px 14px", border: "none", cursor: "pointer", borderRadius: 6,
    background: active ? `${theme.primary}15` : "transparent",
    color: active ? theme.primary : theme.textMuted,
    fontSize: "0.78rem", fontWeight: active ? 700 : 600,
    letterSpacing: "0.02em", whiteSpace: "nowrap",
    display: "inline-flex", alignItems: "center", gap: 6,
    height: 36, lineHeight: 1, transition: "all 0.2s ease"
  }),
  section: {
    background: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    boxShadow: theme.bg === "#050a14" ? "0 10px 25px -5px rgba(0,0,0,0.4)" : "0 4px 12px rgba(0,0,0,0.05)",
    transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease",
    backdropFilter: "blur(10px)"
  },
  sectionTitle: { fontSize: "12px", fontWeight: 800, letterSpacing: 2, color: theme.primary, textTransform: "uppercase", marginBottom: 10, borderBottom: `1px solid ${theme.border}`, paddingBottom: 4, wordBreak: "break-word" },
  label: { fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: theme.textMuted, textTransform: "uppercase", display: "block", marginBottom: 4, wordBreak: "break-word" },
  input: { background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 8, color: theme.accent, fontSize: 12, padding: "6px 10px", width: "100%", outline: "none", transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14, border: `1px solid ${theme.border}`, fontStretch: "normal", tableLayout: "auto" },
  th: { padding: "6px 10px", textAlign: "left", fontSize: 14, fontWeight: 700, letterSpacing: 0.5, color: theme.text, textTransform: "uppercase", borderBottom: `2px solid ${theme.border}`, borderRight: `1px solid ${theme.border}`, background: theme.primary + "11", whiteSpace: "normal", wordBreak: "break-word" },
  td: { padding: "4px 8px", borderBottom: `1px solid ${theme.border}`, borderRight: `1px solid ${theme.border}`, fontStretch: "normal", wordBreak: "break-word" },
  btn: (variant = "primary") => ({
    padding: "10px 24px", fontSize: 12, fontWeight: 700, letterSpacing: 2,
    textTransform: "uppercase", border: "none", borderRadius: 6, cursor: "pointer",
    background: variant === "primary" ? theme.primary : (variant === "success" ? theme.success : (variant === "default" ? theme.border : theme.error)),
    color: "#fff", transition: "all 0.2s"
  }),
  uploadZone: (drag) => ({
    border: `2px dashed ${drag ? theme.primary : theme.border}`, borderRadius: 12,
    padding: "14px", textAlign: "center", cursor: "pointer",
    background: drag ? `${theme.primary}10` : theme.surfaceAlt, transition: "all 0.2s"
  }),
  sidebar: {
    width: 200,
    background: theme.surfaceAlt,
    borderRight: `1px solid ${theme.border}`,
    position: "sticky",
    top: 65,
    height: "calc(100vh - 65px)",
    display: "flex",
    flexDirection: "column",
    padding: "24px 0",
    flexShrink: 0,
    overflowY: "hidden",
    boxShadow: theme.bg === "#050a14" ? "10px 0 30px -15px rgba(0,0,0,0.5)" : "none"
  },
  sideBtn: (active) => ({
    padding: "8px 16px",
    fontSize: 11,
    fontWeight: active ? 700 : 600,
    letterSpacing: 0.5,
    cursor: "pointer",
    border: "none", margin: "2px 12px", borderRadius: "10px",
    background: active ? `${theme.primary}15` : "transparent",
    color: active ? theme.primary : theme.textMuted,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    textAlign: "left",
    display: "flex",
    alignItems: "center",
    gap: 12,
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: active ? `inset 4px 0 0 ${theme.primary}` : 'none'
  }),
});

// ─── File Upload Zone ────────────────────────────────────────────────────────
function UploadZone({ label, accept, onFile, parsed, fileName, S, theme, disabled }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef();
  const handle = (f) => { if (f) { onFile(f); } };
  return (
    <div>
      <div style={S.sectionTitle}>{label}</div>
      <div
        style={{ ...S.uploadZone(drag), opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
        onDragOver={e => { e.preventDefault(); !disabled && setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); if (!disabled) { setDrag(false); handle(e.dataTransfer.files[0]); } }}
        onClick={() => !disabled && ref.current.click()}
        role="button"
        aria-label="Upload data file"
      >
        <input ref={ref} type="file" accept={accept} style={{ display: "none" }} onChange={e => handle(e.target.files[0])} />
        {fileName
          ? <div>
            <div style={{ fontSize: 20, marginBottom: 6 }}>✓</div>
            <div style={{
              color: theme.success,
              fontSize: 14,
              fontWeight: 600,
              maxWidth: "260px",
              margin: "0 auto",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }} title={fileName}>{fileName}</div>
            <div style={{ color: theme.textMuted, fontSize: 12, marginTop: 4 }}>Click to replace</div>
          </div>
          : <div>
            <div style={{ fontSize: 32, marginBottom: 8, color: theme.border }}>⬆</div>
            <div style={{ color: theme.textMuted, fontSize: 13, fontWeight: 600 }}>DROP FILE OR CLICK TO BROWSE</div>
            <div style={{ color: theme.textMuted, fontSize: 12, marginTop: 4 }}>{accept}</div>
          </div>
        }
      </div>
      {parsed && parsed.length > 0 && (
        <div style={{ marginTop: 12, maxHeight: 160, overflowY: "auto", background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 6 }}>
          <table style={S.table}>
            <thead>
              <tr>{Object.keys(parsed[0]).slice(0, 6).map(k => <th key={k} style={S.th}>{k}</th>)}</tr>
            </thead>
            <tbody>
              {parsed.slice(0, 8).map((r, i) => (
                <tr key={i}>{Object.keys(r).slice(0, 6).map(k => <td key={k} style={{ ...S.td, color: theme.accent, fontSize: 12 }}>{typeof r[k] === "number" ? r[k].toFixed(3) : r[k]}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Manual Input Field ──────────────────────────────────────────────────────
function MField({ label, unit, value, onChange, passCheck, S, theme, type = "text", required, disabled }) {
  const pass = passCheck ? passCheck(parseFloat(value)) : null;
  const statusStyle = value !== "" && pass !== null ? {
    backgroundColor: pass ? (theme.bg === "#050a14" ? "#064e3b22" : "#d1fae544") : (theme.bg === "#050a14" ? "#7f1d1d22" : "#fee2e244"),
    borderColor: pass ? theme.success : theme.error
  } : {};

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <label style={S.label}>
          {label}
          {required && <span style={{ color: theme.error, marginLeft: 4 }}>*</span>}
        </label>
        {unit && <span style={{ fontSize: '11px', color: theme.accent, fontWeight: 700 }}>{unit}</span>}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type={type}
          style={{ ...S.input, ...statusStyle, padding: "6px 10px", flex: 1, minWidth: 0, opacity: disabled ? 0.6 : 1, cursor: disabled ? "not-allowed" : "text" }}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="—"
          aria-label={label}
          disabled={disabled}
        />
        {pass !== null && value !== "" && <Badge pass={pass} theme={theme} />}
      </div>
    </div>
  );
}

// ─── Report Section ──────────────────────────────────────────────────────────
function ReportTable({ title, rows, S, theme }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ ...S.sectionTitle, fontSize: 13, marginBottom: 8, background: theme.primary + "11", color: theme.primary, padding: "8px 12px", borderRadius: 6, borderBottom: 'none' }}>{title}</div>
      <table style={{ ...S.table, border: 'none' }}>
        <thead>
          <tr>
            {rows[0] && Object.keys(rows[0]).filter(k => !k.startsWith("__")).map(k => <th key={k} style={{ ...S.th, fontSize: 14, borderRight: 'none' }}>{k}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const status = r.Status || r.Compliance || "";
            const isPass = status.toUpperCase().includes("PASS") || status.toUpperCase() === "OK";
            const isFail = status.toUpperCase().includes("FAIL") || status.toUpperCase() === "NOT OK";

            return (
              <tr key={i} className="table-row-hover" style={{ background: i % 2 === 0 ? theme.surfaceAlt : theme.surface }}>
                {Object.entries(r).filter(([k]) => !k.startsWith("__")).map(([k, v], j) => {
                  let cellBg = "transparent";
                  let textColor = theme.text;
                  const successBg = "#dcfce7";
                  const successText = "#15803d";
                  const errorBg = "#fee2e2";
                  const errorText = "#b91c1c";

                  if (k === "Status" || k === "Compliance") {
                    if (isPass) {
                      cellBg = successBg;
                      textColor = successText;
                    } else if (isFail) {
                      cellBg = errorBg;
                      textColor = errorText;
                    }
                  } else if (k === "DEV (%)" || k === "Deviation") {
                    if (v !== "—" && v !== null && String(v).trim() !== "") {
                      const val = parseFloat(String(v).replace(/[^\d.-]/g, ''));
                      if (!isNaN(val)) {
                        // Use internal pass state if provided (for absolute limits like IR/Hipot), otherwise default to +/- 5% tolerance
                        const pass = r.__pass !== undefined ? r.__pass : Math.abs(val) <= 5;
                        cellBg = pass ? successBg : errorBg;
                        textColor = pass ? successText : errorText;
                      }
                    }
                  }

                  return (
                    <td key={j} style={{ ...S.td, fontSize: 14, color: textColor, background: cellBg, fontWeight: cellBg !== "transparent" ? 700 : "normal", borderRight: 'none' }}>{v}</td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Chart ───────────────────────────────────────────────────────────────────
function PerfChart({ title, data, gsKey, dutKey, unit, theme }) {
  return (
    <div style={{
      flex: '1 1 calc(33% - 16px)',
      minWidth: 320,
      background: theme.bg === "#050a14" ? theme.surfaceAlt : "#ffffff",
      padding: '16px',
      borderRadius: '12px',
      border: `1px solid ${theme.border}44`,
    }}>
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, color: theme.primary, background: theme.primary + "11", padding: "8px 12px", borderRadius: 6, textAlign: "left", marginBottom: 16, textTransform: "uppercase" }}>
        {title}
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 0, right: 15, left: -15, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.chartGrid} opacity={0.4} />
          <XAxis
            dataKey="speed"
            tick={{ fill: theme.textMuted, fontSize: 12, fontWeight: 600 }}
            axisLine={{ stroke: theme.border }}
            tickLine={false}
            label={{ value: 'RPM', position: 'insideBottomRight', offset: -10, fill: theme.textMuted, fontSize: 10, fontWeight: 700 }}
          />
          <YAxis
            tick={{ fill: theme.textMuted, fontSize: 12, fontWeight: 600 }}
            axisLine={{ stroke: theme.border }}
            tickLine={false}
            label={{ value: unit || '', angle: -90, position: 'insideLeft', offset: 25, fill: theme.textMuted, fontSize: 12, fontWeight: 700 }}
          />
          <Tooltip
            contentStyle={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '8px', fontSize: 12, boxShadow: '0 8px 16px rgba(0,0,0,0.1)', padding: '8px 12px' }}
            labelStyle={{ color: theme.primary, fontWeight: 800, marginBottom: 4 }}
            itemStyle={{ padding: '1px 0', fontSize: 12, fontWeight: 600 }}
            formatter={(value) => [value !== null ? `${value.toFixed(2)} ${unit || ''}` : '—', ""]}
          />
          <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, fontWeight: 700, paddingBottom: 15, textTransform: 'uppercase', letterSpacing: 0.5 }} />
          <Line isAnimationActive={false} type="monotone" dataKey={gsKey} name="Golden" stroke={theme.primary} dot={false} strokeDasharray="5 5" strokeWidth={2} connectNulls />
          {dutKey && <Line isAnimationActive={false} type="monotone" dataKey={dutKey} name="DUT" stroke={theme.text} dot={{ r: 3, fill: theme.text, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} strokeWidth={2.5} connectNulls />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function computeChecks(currentForm, currentAdjustedPpData, currentBemf3000, currentPeakPowerDUT_kW, currentPeakTorqueDUT, golden) {
  if (!golden) return { checks: {}, overallPass: false, encOK: () => null };
  const encFields = [
    { k: "sineMin", gs: "sineMin" }, { k: "sineMax", gs: "sineMax" },
    { k: "cosMin", gs: "cosMin" }, { k: "cosMax", gs: "cosMax" },
    { k: "sinePP", gs: "sinePP" }, { k: "cosPP", gs: "cosPP" }, { k: "offset", gs: "offset" }
  ];
  const encOK = (k) => {
    let v = parseFloat(currentForm[k]);
    if (k === "sinePP") {
      const sMin = parseFloat(currentForm.sineMin);
      const sMax = parseFloat(currentForm.sineMax);
      if (!isNaN(sMin) && !isNaN(sMax)) v = sMax - sMin;
    } else if (k === "cosPP") {
      const cMin = parseFloat(currentForm.cosMin);
      const cMax = parseFloat(currentForm.cosMax);
      if (!isNaN(cMin) && !isNaN(cMax)) v = cMax - cMin;
    }
    const g = golden.encoder?.[k];
    if (isNaN(v)) return null;
    const diff = Math.abs(v - g);
    if (["sineMin", "sineMax", "cosMin", "cosMax"].includes(k)) return diff <= 75;
    if (["sinePP", "cosPP"].includes(k)) return diff <= 150;
    if (k === "offset") return diff <= 3;
    return false;
  };

  const checks = {
    bemf: currentBemf3000 !== null && Math.abs(pct(currentBemf3000, golden.bemfAt3000)) <= 5,
    peakPower: currentAdjustedPpData.length > 0 && Math.abs(pct(currentPeakPowerDUT_kW, golden.peakPower)) <= 5,
    peakTorque: currentAdjustedPpData.length > 0 && Math.abs(pct(currentPeakTorqueDUT, golden.peakTorque)) <= 5,
    hipot: ["hipotU", "hipotV", "hipotW"].every(k => parseFloat(currentForm[k]) > 0 && parseFloat(currentForm[k]) < (golden.hipotLimit)),
    ir: ["irU", "irV", "irW"].every(k => parseFloat(currentForm[k]) >= (golden.irLimit)),
    encoder: encFields.every(({ k }) => encOK(k) === true),
  };
  const allTechnicalChecksPass = Object.values(checks).every(Boolean);
  const overallPass = allTechnicalChecksPass && !!currentForm.testedBy;
  return { checks, overallPass, encOK };
}

function computeMotorReportData(motor, goldenSamples = []) {
  const golden = goldenSamples.find(s => s.motorCode === motor.form.motorCode);
  const form = motor.form || {};
  const ppData = motor.ppData || [];
  const bemfData = motor.bemfData || [];
  const torqueAdj = motor.torqueAdj || "";

  if (!golden) return { form, dsRows: [], pdiRows: [], bemfCardRow: [], encRows: [], torqueChartData: [], powerChartData: [], effChartData: [], perfTorqueRows: [], perfPowerRows: [], perfEffRows: [], overallPass: false, checks: {} };

  const adjustedPpData = (() => {
    const adj = parseFloat(torqueAdj) || 0;
    if (adj === 0) return ppData;
    return ppData.map(r => {
      const adjTorque = r["Torque (Nm)"] + adj;
      const adjPowerW = adjTorque * r.Speed * (2 * Math.PI / 60);
      const dcPower = r["V_DC (V)"] * r["I_DC (A)"];
      return {
        ...r,
        "Torque (Nm)": +adjTorque.toFixed(2),
        "Mot Power (W)": +adjPowerW.toFixed(2),
        "Group Eff (%)": dcPower !== 0 ? +(adjPowerW / dcPower * 100).toFixed(2) : 0
      };
    });
  })();
  const ppBySpeed = {};
  adjustedPpData.forEach(r => { ppBySpeed[r.Speed] = r; });
  const bemfBySpeed = {};
  bemfData.forEach(r => { bemfBySpeed[r["Speed (RPM)"]] = r; });

  const peakTorqueDUT = adjustedPpData.reduce((mx, r) => Math.max(mx, r["Torque (Nm)"]), 0);
  const peakPowerDUT_kW = adjustedPpData.reduce((mx, r) => Math.max(mx, r["Mot Power (W)"]), 0) / 1000;
  const avgVdc = adjustedPpData.length ? adjustedPpData.reduce((s, r) => s + r["V_DC (V)"], 0) / adjustedPpData.length : 0;
  const peakCurrentDUT = adjustedPpData.reduce((mx, r) => Math.max(mx, r["I Avg (A)"]), 0);

  const bemfRow3000 = bemfData.find(r => Math.abs(r["Speed (RPM)"] - 3000) <= 50);
  const bemf3000 = bemfRow3000 ? bemfRow3000["Avg BEMF (V)"] : null;
  const avgResVal = [parseFloat(form.resU) || 0, parseFloat(form.resV) || 0, parseFloat(form.resW) || 0].reduce((s, v) => s + v, 0) / 3;
  const { checks, overallPass, encOK } = computeChecks(form, adjustedPpData, bemf3000, peakPowerDUT_kW, peakTorqueDUT, golden);

  const speeds = golden.performanceCurves ? golden.performanceCurves.map(c => c.rpm) : [500, 1000, 3000, 7000];

  const perfTorqueRows = speeds.map(spd => {
    const target = golden.performanceCurves?.find(c => c.rpm === spd)?.torque || golden.torqueCurve?.[spd] || 0;
    const meas = ppBySpeed[spd]?.["Torque (Nm)"] ?? null;
    const dev = meas !== null ? pct(meas, target) : null;
    return {
      "Speed (RPM)": Number(spd).toFixed(0),
      "Golden (Nm)": target.toFixed(2),
      "DUT (Nm)": meas !== null ? meas.toFixed(2) : "—",
      "DEV (%)": fmtPct(dev),
    };
  });
  const perfPowerRows = speeds.map(spd => {
    const target = golden.performanceCurves?.find(c => c.rpm === spd)?.power || golden.powerCurve?.[spd] || 0;
    const measW = ppBySpeed[spd]?.["Mot Power (W)"] ?? null;
    const meas = measW !== null ? measW / 1000 : null;
    const dev = meas !== null ? pct(meas, target) : null;
    return {
      "Speed (RPM)": Number(spd).toFixed(0),
      "Golden (kW)": target.toFixed(2),
      "DUT (kW)": meas !== null ? meas.toFixed(2) : "—",
      "DEV (%)": fmtPct(dev),
    };
  });
  const perfEffRows = speeds.map(spd => {
    const target = golden.performanceCurves?.find(c => c.rpm === spd)?.efficiency || golden.groupEff?.[spd] || 0;
    const meas = ppBySpeed[spd]?.["Group Eff (%)"] ?? null;
    const dev = meas !== null ? pct(meas, target) : null;
    return {
      "Speed (RPM)": Number(spd).toFixed(0),
      "Golden (%)": target.toFixed(2),
      "DUT (%)": meas !== null ? meas.toFixed(2) : "—",
      "DEV (%)": fmtPct(dev),
    };
  });

  const encRows = [
    { label: "Sine Min", key: "sineMin" }, { label: "Sine Max", key: "sineMax" },
    { label: "Cos Min", key: "cosMin" }, { label: "Cos Max", key: "cosMax" },
    { label: "Sine P-P", key: "sinePP" }, { label: "Cos P-P", key: "cosPP" },
    { label: "Offset", key: "offset" },
  ].map(({ label, key }) => {
    const gs = parseFloat(golden.encoder?.[key]) || 0;
    let v = parseFloat(form[key]);
    if (key === "sinePP") {
      const sMin = parseFloat(form.sineMin);
      const sMax = parseFloat(form.sineMax);
      if (!isNaN(sMin) && !isNaN(sMax)) v = sMax - sMin;
    } else if (key === "cosPP") {
      const cMin = parseFloat(form.cosMin);
      const cMax = parseFloat(form.cosMax);
      if (!isNaN(cMin) && !isNaN(cMax)) v = cMax - cMin;
    }
    const ok = encOK(key);
    return {
      "Parameter": label,
      "Golden Sample": gs.toFixed(0),
      "DUT": isNaN(v) ? "—" : v.toFixed(0),
      "Status": ok === null ? "—" : ok ? "OK" : "NOT OK",
    };
  });
  const getPdiAvg = (v1, v2, v3) => {
    const arr = [parseFloat(v1), parseFloat(v2), parseFloat(v3)].filter(n => !isNaN(n));
    return arr.length === 3 ? arr.reduce((a, b) => a + b, 0) / 3 : null;
  };

  const targetRes = parseFloat(golden.resistance) || 0;
  const hipotLimit = parseFloat(golden.hipotLimit) || 0;
  const irLimit = parseFloat(golden.irLimit) || 0;

  const pdiRows = [
    { test: "Hipot Average", crit: `< ${hipotLimit.toFixed(2)} mA`, val: getPdiAvg(form.hipotU, form.hipotV, form.hipotW), pass: checks.hipot },
    { test: "IR Average", crit: `≥ ${irLimit.toFixed(2)} MΩ`, val: getPdiAvg(form.irU, form.irV, form.irW), pass: checks.ir },
    { test: "Resistance Average", crit: `≈ ${targetRes.toFixed(2)} mΩ`, val: getPdiAvg(form.resU, form.resV, form.resW), pass: Math.abs((getPdiAvg(form.resU, form.resV, form.resW) || 0) - targetRes) <= 5 },
  ].map(r => ({
    "Test": r.test,
    "Acceptance": r.crit,
    "DUT Value": r.val !== null ? r.val.toFixed(2) : "—",
    "Status": r.val !== null ? (r.pass ? "OK" : "NOT OK") : "—"
  }));
  const bemfCardRow = [{
    "Parameter": "Avg BEMF @ 3000 RPM",
    "Golden (V)": (parseFloat(golden.bemfAt3000) || 0).toFixed(2),
    "DUT (V)": bemf3000 !== null ? bemf3000.toFixed(2) : "—",
    "DEV (%)": bemf3000 !== null ? fmtPct(pct(bemf3000, golden.bemfAt3000)) : "—",
  }];
  const dsRows = [
    { param: "Model", gs: golden.motorModel || "—", dut: form.motorModel || "—", dev: null },
    { param: "Nominal DC Voltage", gs: (parseFloat(golden.nominalVoltage) || 0).toFixed(2) + " V", dut: avgVdc > 0 ? avgVdc.toFixed(2) + " V" : "—", dev: avgVdc > 0 ? pct(avgVdc, golden.nominalVoltage) : null },
    { param: "Peak Power", gs: (parseFloat(golden.peakPower) || 0).toFixed(2) + " kW", dut: peakPowerDUT_kW > 0 ? peakPowerDUT_kW.toFixed(2) + " kW" : "—", dev: adjustedPpData.length ? pct(peakPowerDUT_kW, golden.peakPower) : null },
    { param: "Peak Torque", gs: (parseFloat(golden.peakTorque) || 0).toFixed(2) + " Nm", dut: peakTorqueDUT > 0 ? peakTorqueDUT.toFixed(2) + " Nm" : "—", dev: adjustedPpData.length ? pct(peakTorqueDUT, golden.peakTorque) : null },
    { param: "Peak Current AC", gs: (parseFloat(golden.peakCurrentAC) || 0).toFixed(2) + " A", dut: peakCurrentDUT > 0 ? peakCurrentDUT.toFixed(2) + " A" : "—", dev: adjustedPpData.length ? pct(peakCurrentDUT, golden.peakCurrentAC) : null },
    { param: "Motor Max Speed", gs: (parseFloat(golden.maxSpeed) || 0).toFixed(0) + " RPM", dut: "7200 RPM", dev: 0 },
  ].map(r => ({
    "Parameter": r.param, "Golden Sample": r.gs,
    "DUT": r.dut,
    "DEV (%)": r.dev !== null ? fmtPct(r.dev) : "—",
  }));

  const torqueChartData = speeds.map(spd => {
    const target = golden.performanceCurves?.find(c => c.rpm === spd)?.torque || golden.torqueCurve?.[spd] || 0;
    return { speed: +spd, Golden: target, DUT: ppBySpeed[+spd]?.["Torque (Nm)"] ?? null };
  });
  const powerChartData = speeds.map(spd => {
    const target = golden.performanceCurves?.find(c => c.rpm === spd)?.power || golden.powerCurve?.[spd] || 0;
    return { speed: +spd, Golden: target, DUT: ppBySpeed[+spd] ? +(ppBySpeed[+spd]["Mot Power (W)"] / 1000).toFixed(2) : null };
  });
  const effChartData = speeds.map(spd => {
    const target = golden.performanceCurves?.find(c => c.rpm === spd)?.efficiency || golden.groupEff?.[spd] || 0;
    return { speed: +spd, Golden: target, DUT: ppBySpeed[+spd]?.["Group Eff (%)"] ?? null };
  });

  return {
    form, adjustedPpData, ppBySpeed, bemfData,
    bemf3000, checks, overallPass, encOK, dsRows,
    perfTorqueRows, perfPowerRows, perfEffRows, encRows,
    pdiRows, bemfCardRow, torqueChartData, powerChartData, effChartData,
    peakPowerDUT_kW, peakTorqueDUT
  };
}

// ── Report Content component (Unified) ──────────────────────────────────────
function ReportContent({ motor, reportRef, S, goldenSamples = [] }) {
  const {
    form, dsRows, pdiRows, bemfCardRow, encRows,
    torqueChartData, powerChartData, effChartData,
    perfTorqueRows, perfPowerRows, perfEffRows, overallPass
  } = computeMotorReportData(motor, goldenSamples);

  // Always use light theme styling for report bodies to ensure PDF readability
  const reportTheme = LIGHT_THEME;
  const RS = getStyles(reportTheme); // Report Styles based on light theme

  const reportCardStyle = {
    background: reportTheme.surface,
    border: `3px solid ${reportTheme.border}`,
    borderRadius: 16,
    padding: 10,
    boxShadow: `0 2px 8px rgba(0,0,0,0.05)`,
    marginBottom: 10,
  };

  return (
    <div ref={reportRef} style={{ background: '#fff', padding: "10px", color: '#000', fontFamily: "'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* Header Section */}
      <div style={{ padding: "0px 0", marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid #ddd`, paddingBottom: 8, marginBottom: 10 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: reportTheme.primary }}>END OF LINE REPORT</div>
          <div style={{ fontSize: 14, color: "#ef4444", textAlign: "left", fontStyle: "italic", flex: 1, padding: "0 40px", lineHeight: 1.2 }}>
            Confidentiality Note: This report contains proprietary and confidential information intended solely for the use of authorized personnel.
            Any unauthorized disclosure, distribution, or reproduction of this document or its contents is strictly prohibited.
          </div>
          <img src={logo} alt="Logo" style={{ height: 48 }} />
        </div>
        <div style={{ ...reportCardStyle, background: reportTheme.primary + "08", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 8 }}>
          {[["Program Name", form.programName], ["Part No.", form.motorCode || "—"], ["Motor Model", form.motorModel || "—"], ["Serial No", form.serialNo || "—"]].map(([l, v]) => (
            <div key={l}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#64748b", marginRight: 8 }}>{l}:</span>
              <span style={{ fontSize: 14, color: "#000", fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 0 }}>
        <div style={reportCardStyle}>
          <ReportTable title="Datasheet" rows={dsRows} S={RS} theme={reportTheme} />
        </div>
        <div style={reportCardStyle}>
          <ReportTable title="PDI (Electrical)" rows={pdiRows} S={RS} theme={reportTheme} />
          <div style={{ marginTop: 0 }}>
            <ReportTable title="Back-EMF Analysis" rows={bemfCardRow} S={RS} theme={reportTheme} />
          </div>
        </div>
        <div style={reportCardStyle}>
          <ReportTable title="Position Sensor Parameters" rows={encRows} S={RS} theme={reportTheme} />
        </div>
      </div>      {/* Performance Charts */}
      <div style={{ ...reportCardStyle, padding: 4, marginBottom: 8 }}>
        <div style={{ ...RS.sectionTitle, marginBottom: 0, background: reportTheme.primary + "11", color: reportTheme.primary, padding: "8px 12px", borderRadius: 6, borderBottom: 'none' }}>Performance Curves — Golden Sample vs DUT</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <PerfChart title="Torque vs Speed" unit="Nm" data={torqueChartData} gsKey="Golden" dutKey="DUT" theme={reportTheme} />
          <PerfChart title="Power vs Speed" unit="kW" data={powerChartData} gsKey="Golden" dutKey="DUT" theme={reportTheme} />
          <PerfChart title="Efficiency Profile" unit="%" data={effChartData} gsKey="Golden" dutKey="DUT" theme={reportTheme} />
        </div>
      </div>      {/* Performance Data Tables */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 10 }}>
        <div style={reportCardStyle}>
          <ReportTable title="Torque vs Speed" rows={perfTorqueRows} S={RS} theme={reportTheme} />
        </div>
        <div style={reportCardStyle}>
          <ReportTable title="Power vs Speed" rows={perfPowerRows} S={RS} theme={reportTheme} />
        </div>
        <div style={reportCardStyle}>
          <ReportTable title="Efficiency vs Speed" rows={perfEffRows} S={RS} theme={reportTheme} />
        </div>
      </div>

      {/* Footer Signature Block */}
      <div style={{ borderTop: `2px solid ${overallPass ? reportTheme.success : reportTheme.error}`, padding: "8px 0", marginTop: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {/* Left: Note */}
          <div style={{ fontSize: 14, color: "#0a3e88ff", fontStyle: "italic", maxWidth: 260 }}>
            ⓘ This is a system-approved document; signatures are not required.
          </div>
          {/* Center: Result */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#64748b", letterSpacing: 1 }}>END OF LINE RESULT:</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: overallPass ? "#15803d" : "#b91c1c", letterSpacing: 2, background: overallPass ? "#dcfce7" : "#fee2e2", padding: "4px 20px", borderRadius: 6 }}>
              {overallPass ? "PASSED" : "FAILED"}
            </span>
          </div>
          {/* Right: Tested By + Date */}
          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <div>
              <span style={{ fontSize: 14, color: "#64748b", fontWeight: 700 }}>TESTED BY: </span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{form.testedBy || "—"}</span>
            </div>
            <div>
              <span style={{ fontSize: 14, color: "#64748b", fontWeight: 700 }}>TEST DATE: </span>
              <span style={{ fontSize: 14, color: reportTheme.primary, fontWeight: 700 }}>{form.testDate}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QiPdiReportContent({ report, reportRef, S }) {
  const reportTheme = LIGHT_THEME;
  const RS = getStyles(reportTheme);

  // Calculate if all inspection items passed
  const overallPass = report.data && report.data.filter(i => i.no !== 21).every(item => item.status === "OK" || item.status === "NOT OK, But Motor Performance Not Impacted");
  const reportCardStyle = {
    background: reportTheme.surface,
    border: `3px solid ${reportTheme.border}`,
    borderRadius: 16,
    padding: 10,
    boxShadow: `0 2px 8px rgba(0,0,0,0.05)`,
    marginBottom: 10,
  };

  return (
    <div ref={reportRef} style={{ background: '#fff', padding: "10px", color: '#000', fontFamily: "'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", width: '1360px', margin: '0 auto', boxSizing: 'border-box' }}>
      <div style={{ padding: "0px 0", marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid #ddd`, paddingBottom: 8, marginBottom: 10 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: reportTheme.primary }}>QI / PDI REPORT</div>
          <div style={{ fontSize: 14, color: "#ef4444", textAlign: "left", fontStyle: "italic", flex: 1, padding: "0 40px", lineHeight: 1.2 }}>
            Confidentiality Note: This report contains proprietary and confidential information intended solely for the use of authorized personnel.
            Any unauthorized disclosure, distribution, or reproduction of this document or its contents is strictly prohibited.
          </div>
          <img src={logo} alt="Logo" style={{ height: 48 }} />
        </div>
        <div style={{ ...reportCardStyle, background: reportTheme.primary + "08", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginTop: 8 }}>
          {[["Part No.", report.motorCode || "—"], ["Motor Model", report.motorModel || "—"], ["Serial No", report.serialNo || "—"], ["Tested By", report.testedBy || "—"], ["Test Date", report.testDate || report.timestamp?.slice(0, 10) || "—"]].map(([l, v]) => (
            <div key={l}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#64748b", marginRight: 8 }}>{l}:</span>
              <span style={{ fontSize: 14, color: "#000", fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={reportCardStyle}>
        <div style={{ ...RS.sectionTitle, fontSize: 13, marginBottom: 8, background: reportTheme.primary + "11", color: reportTheme.primary, padding: "8px 12px", borderRadius: 6, borderBottom: 'none' }}>Inspection Checklist</div>
        <table style={{ ...S.table, border: 'none', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ ...S.th, width: 50, fontSize: 12, borderRight: 'none', padding: '6px' }}>S.No</th>
              <th style={{ ...S.th, width: 220, fontSize: 12, borderRight: 'none', padding: '6px' }}>Description</th>
              <th style={{ ...S.th, width: 220, fontSize: 12, borderRight: 'none', padding: '6px' }}>Specification</th>
              <th style={{ ...S.th, width: 220, fontSize: 12, borderRight: 'none', padding: '6px' }}>Method of Check</th>
              <th style={{ ...S.th, fontSize: 12, borderRight: 'none', padding: '6px' }}>Observed</th>
              <th style={{ ...S.th, width: 110, fontSize: 12, borderRight: 'none', padding: '6px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {report.data.map((item, idx) => {
              const isPass = item.status === "OK";
              const isFail = item.status === "NOT OK";
              const isPerfOk = item.status === "NOT OK, But Motor Performance Not Impacted";
              const isLastRow = idx === report.data.length - 1;
              return (
                <tr key={idx} style={{ background: idx % 2 === 0 ? reportTheme.surfaceAlt : reportTheme.surface }}>
                  <td style={{ ...S.td, fontSize: 11, borderRight: 'none', padding: '3px 6px' }}>{item.no}</td>
                  <td style={{ ...S.td, fontSize: 11, borderRight: 'none', padding: '3px 6px' }}>{item.desc}</td>
                  {isLastRow ? (
                    <td colSpan={4} style={{ ...S.td, fontSize: 11, borderRight: 'none', whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: '3px 6px' }}>{item.observed || "—"}</td>
                  ) : (
                    <>
                      <td style={{ ...S.td, fontSize: 11, borderRight: 'none', padding: '3px 6px' }}>{item.spec}</td>
                      <td style={{ ...S.td, fontSize: 11, borderRight: 'none', padding: '3px 6px' }}>{item.method}</td>
                      <td style={{ ...S.td, fontSize: 11, borderRight: 'none', whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: '3px 6px' }}>{item.observed || "—"}</td>
                      <td style={{
                        ...S.td,
                        fontSize: 11,
                        borderRight: 'none',
                        padding: '3px 6px',
                        color: isPass ? "#15803d" : (isFail ? "#b91c1c" : (isPerfOk ? "#854d0e" : "#000")),
                        background: isPass ? "#dcfce7" : (isFail ? "#fee2e2" : (isPerfOk ? "#fef9c3" : "transparent")),
                        fontWeight: 700
                      }}>{item.status || "—"}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ borderTop: `2px solid ${overallPass ? reportTheme.success : reportTheme.error}`, padding: "8px 0", marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
          <div style={{ fontSize: 14, color: "#0a3e88ff", fontStyle: "italic", maxWidth: 260 }}>
            ⓘ This is a system-approved document; signatures are not required.
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#64748b", letterSpacing: 1 }}>INSPECTION RESULT:</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: overallPass ? "#15803d" : "#b91c1c", letterSpacing: 2, background: overallPass ? "#dcfce7" : "#fee2e2", padding: "4px 20px", borderRadius: 6 }}>
              {overallPass ? "PASSED" : "FAILED"}
            </span>
          </div>

          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <div>
              <span style={{ fontSize: 14, color: "#64748b", fontWeight: 700 }}>INSPECTED BY: </span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{report.testedBy || "—"}</span>
            </div>
            <div>
              <span style={{ fontSize: 14, color: "#64748b", fontWeight: 700 }}>INSPECTION DATE: </span>
              <span style={{ fontSize: 14, color: reportTheme.primary, fontWeight: 700 }}>{report.testDate || report.timestamp?.slice(0, 10) || "—"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QiPdiPreviewModal({ report, show, onClose, onDownload, reportRef, S, theme }) {
  useEffect(() => {
    if (!show) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [show, onClose]);
  if (!show || !report) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.72)', padding: 24, overflowY: 'auto' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', background: theme.surface, borderRadius: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.35)', padding: 20, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: theme.primary }}>QI / PDI Report Preview</div>
            <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>Review inspection details and download as PDF.</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button style={S.btn('default')} onClick={onClose}>Close</button>
            <button style={S.btn('success')} onClick={() => onDownload(report)}>⬇ Download PDF</button>
          </div>
        </div>
        <QiPdiReportContent report={report} reportRef={reportRef} S={S} />
      </div>
    </div>
  );
}

// ── Report Preview Modal ───────────────────────────────────────────────────
function ReportPreviewModal({ motor, show, onClose, onStatusUpdate, onRequestCorrection, onDownload, reportRef, S, theme, currentUser, goldenSamples }) {
  useEffect(() => {
    if (!show) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [show, onClose]);
  if (!show || !motor) return null;

  const { overallPass } = computeMotorReportData(motor, goldenSamples);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.72)', padding: 24, overflowY: 'auto' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', background: theme.surface, borderRadius: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.35)', padding: 20, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: theme.primary }}>Report Preview</div>
            <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>Review workflow status and generated output below.</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button style={S.btn('default')} onClick={onClose}>Close</button>
            <button style={S.btn(motor.status === 'APPROVED' ? 'success' : 'default')} onClick={() => onDownload(motor)} disabled={motor.status !== 'APPROVED'}>
              ⬇ Download PDF
            </button>
          </div>
        </div>

        <ReportContent motor={motor} reportRef={reportRef} S={S} goldenSamples={goldenSamples} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: overallPass ? theme.success : theme.error }}>
            Verification: {overallPass ? 'COMPLIANT' : 'NON-COMPLIANT'}
          </div>
        </div>
        {motor.comment && (
          <div style={{ marginTop: 14, padding: 12, background: theme.error + '11', borderRadius: 8, border: `1px solid ${theme.error}33` }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: theme.error, marginBottom: 4 }}>CORRECTION NOTE:</div>
            <div style={{ fontSize: 13 }}>{motor.comment}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sidebar Navigation Icons ─────────────────────────────────────────────
const NavIcon = ({ type, color }) => {
  const size = 16;
  switch (type) {
    case 'new': return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="12" y1="18" x2="12" y2="12"></line>
        <line x1="9" y1="15" x2="15" y2="15"></line>
      </svg>
    );
    case 'dashboard': return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9"></rect>
        <rect x="14" y="3" width="7" height="5"></rect>
        <rect x="14" y="11" width="7" height="10"></rect>
        <rect x="3" y="15" width="7" height="6"></rect>
      </svg>
    );
    case 'golden': return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
      </svg>
    );
    case 'archive': return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="21 8 21 21 3 21 3 8"></polyline>
        <rect x="1" y="3" width="22" height="5"></rect>
        <line x1="10" y1="12" x2="14" y2="12"></line>
      </svg>
    );
    case 'qi': return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    );
    default: return null;
  }
};

const SectionIcon = ({ type, color }) => {
  const size = 16;
  switch (type) {
    case 'identity': return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    );
    case 'pdi': return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
      </svg>
    );
    case 'encoder': return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    );
    case 'upload': return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="17 8 12 3 7 8"></polyline>
        <line x1="12" y1="3" x2="12" y2="15"></line>
      </svg>
    );
    default: return null;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
export default function EolPdiApp({ user, workOrders = [], programs = [], traceabilityData = [], setTraceabilityData, syncToDisk, showToast, addNotification, goldenSamples = [], setGoldenSamples, qiPdiRefSamples = [], setQiPdiRefSamples, theme: siteTheme = "light", embedded = false, embeddedView, onEmbeddedViewChange }) {
  const [step, setStep] = useState(0);
  const [theme, setTheme] = useState(siteTheme);
  const currentUser = user;

  const [view, setView] = useState("new_report"); // 'new_report', 'dashboard', 'history', 'motor_log'
  const [selectedMotor, setSelectedMotor] = useState(null);
  const [previewMotor, setPreviewMotor] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [archiveSubTab, setArchiveSubTab] = useState("summary"); // 'summary' or 'log'
  const [archiveMode, setArchiveMode] = useState("eol"); // 'eol' or 'pdi'
  const [pendingDownloadMotor, setPendingDownloadMotor] = useState(null);
  const [filterSerial, setFilterSerial] = useState("");
  const [filterModel, setFilterModel] = useState("");
  const [qiPdiData, setQiPdiData] = useState(
    QI_PDI_DEFAULTS.map(item => ({
      ...item,
      observed: item.no === 21 ? "Connector push mount not provided, push mount cable tie provided as alternative" : "",
      status: ""
    }))
  );
  const [filterProgram, setFilterProgram] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const reportRef = useRef(null);
  const hiddenEolRef = useRef(null);
  const hiddenPdiRef = useRef(null);
  const activeTheme = useMemo(() => resolveThemeFromCSS(), [theme]);
  const S = useMemo(() => getStyles(activeTheme), [activeTheme]);

  useEffect(() => {
    if (siteTheme) setTheme(siteTheme);
  }, [siteTheme]);

  useEffect(() => {
    if (embeddedView && embeddedView !== view) setView(embeddedView);
  }, [embeddedView, view]);

  const updateView = (nextView) => {
    setView(nextView);
    if (onEmbeddedViewChange) onEmbeddedViewChange(nextView);
  };

  // Pending traceability PDF upload (set after report save, consumed by useEffect)
  const [pendingUpload, setPendingUpload] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null); // null | 'uploading' | 'success' | 'error'
  const [pdiUploadStatus, setPdiUploadStatus] = useState(null); // null | 'uploading' | 'success' | 'error'
  const [pdiStep, setPdiStep] = useState(0);

  // Golden Samples State
  const [goldenSubTab, setGoldenSubTab] = useState("entry"); // "entry" or "list"
  const [editingGoldenId, setEditingGoldenId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [previewGolden, setPreviewGolden] = useState(null);
  const initialPerformanceCurves = [
    { rpm: "500", torque: "", power: "", efficiency: "" },
    { rpm: "1000", torque: "", power: "", efficiency: "" },
    { rpm: "3000", torque: "", power: "", efficiency: "" },
    { rpm: "7000", torque: "", power: "", efficiency: "" }
  ];

  const [goldenForm, setGoldenForm] = useState({
    motorCode: "", motorModel: "", nominalVoltage: "", peakPower: "", peakTorque: "", peakCurrentAC: "", maxSpeed: "",
    bemfAt3000: "", resistance: "", hipotLimit: "", irLimit: "",
    encoder: { sineMin: "", sineMax: "", cosMin: "", cosMax: "", sinePP: "", cosPP: "", offset: "" },
    performanceCurves: [...initialPerformanceCurves],
  });

  // QI/PDI Reference State
  const [qiPdiRefSubTab, setQiPdiRefSubTab] = useState("entry");
  const [editingQiPdiRefId, setEditingQiPdiRefId] = useState(null);
  const [qiPdiRefForm, setQiPdiRefForm] = useState({
    motorCode: "",
    motorModel: "",
    checklist: QI_PDI_DEFAULTS.map(i => ({ ...i })),
  });

  // QI/PDI Reports State
  const [qiPdiReports, setQiPdiReports] = useState([]);
  const [filterQiPdiSerial, setFilterQiPdiSerial] = useState("");
  const [filterQiPdiModel, setFilterQiPdiModel] = useState("");
  const [filterQiPdiDateFrom, setFilterQiPdiDateFrom] = useState("");
  const [filterQiPdiDateTo, setFilterQiPdiDateTo] = useState("");
  const [deleteQiPdiConfirmId, setDeleteQiPdiConfirmId] = useState(null);

  const qiPdiReportRef = useRef(null);
  const [previewQiPdi, setPreviewQiPdi] = useState(null);
  const [showQiPdiModal, setShowQiPdiModal] = useState(false);
  const [pendingDownloadQiPdi, setPendingDownloadQiPdi] = useState(null);

  // Escape-to-close all preview modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (previewGolden) setPreviewGolden(null);
      if (showPreviewModal) setShowPreviewModal(false);
      if (showQiPdiModal) setShowQiPdiModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewGolden, showPreviewModal, showQiPdiModal]);

  const resetGoldenForm = () => {
    setGoldenForm({
      motorCode: "", motorModel: "", nominalVoltage: "", peakPower: "", peakTorque: "", peakCurrentAC: "", maxSpeed: "",
      bemfAt3000: "", resistance: "", hipotLimit: "", irLimit: "",
      encoder: { sineMin: "", sineMax: "", cosMin: "", cosMax: "", sinePP: "", cosPP: "", offset: "" },
      performanceCurves: [...initialPerformanceCurves],
    });
    setEditingGoldenId(null);
  };

  const fetchQiPdiReports = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/qi-pdi-reports`);
      if (res.ok) {
        const data = await res.json();
        setQiPdiReports(data);
      }
    } catch (err) { console.error("QI/PDI Reports fetch failed:", err); }
  };

  const saveGoldenSample = async () => {
    const isEmpty = (v) => v === undefined || v === null || String(v).trim() === "";

    // 1. Basic Info Validation
    const requiredFields = [
      'motorCode', 'motorModel', 'nominalVoltage', 'peakPower', 'peakTorque', 'peakCurrentAC', 'maxSpeed',
      'bemfAt3000', 'resistance', 'hipotLimit', 'irLimit'
    ];
    const missing = requiredFields.filter(key => isEmpty(goldenForm[key]));

    // 2. Nested Object Validation
    const encoderFields = ['sineMin', 'sineMax', 'cosMin', 'cosMax', 'sinePP', 'cosPP', 'offset'];
    const missingEncoder = encoderFields.filter(key => isEmpty(goldenForm.encoder[key]));

    const missingCurves = goldenForm.performanceCurves.some(row =>
      isEmpty(row.rpm) || isEmpty(row.torque) || isEmpty(row.power) || isEmpty(row.efficiency)
    );

    if (missing.length > 0 || missingEncoder.length > 0 || missingCurves) {
      let errorMessage = "Please fill all required fields:\n";
      if (missing.length > 0) errorMessage += `\nBasic Info: ${missing.join(', ')}`;
      if (missingEncoder.length > 0) errorMessage += `\nEncoder: ${missingEncoder.join(', ')}`;
      if (missingCurves) errorMessage += `\nPerformance Curves: Ensure all RPM, Torque, Power, and Eff fields are filled.`;
      return alert(errorMessage);
    }

    if (!window.confirm(`Save configuration for "${goldenForm.motorCode}"?`)) return;

    // Prepare payload by parsing strings to numbers where necessary, ensuring all fields are numbers
    const payload = {
      ...goldenForm,
      nominalVoltage: parseFloat(goldenForm.nominalVoltage) || 0,
      peakPower: parseFloat(goldenForm.peakPower) || 0,
      peakTorque: parseFloat(goldenForm.peakTorque) || 0,
      peakCurrentAC: parseFloat(goldenForm.peakCurrentAC) || 0,
      maxSpeed: parseFloat(goldenForm.maxSpeed) || 0,
      bemfAt3000: parseFloat(goldenForm.bemfAt3000) || 0,
      resistance: parseFloat(goldenForm.resistance) || 0,
      hipotLimit: parseFloat(goldenForm.hipotLimit) || 0,
      irLimit: parseFloat(goldenForm.irLimit) || 0,
      encoder: Object.fromEntries(Object.entries(goldenForm.encoder).map(([k, v]) => [k, parseFloat(v) || 0])),
      performanceCurves: goldenForm.performanceCurves.map(row => ({
        rpm: parseFloat(row.rpm) || 0,
        torque: parseFloat(row.torque) || 0,
        power: parseFloat(row.power) || 0,
        efficiency: parseFloat(row.efficiency) || 0
      }))
    };

    try {
      if (!editingGoldenId) {
        const existing = goldenSamples.find(s =>
          s.motorCode === goldenForm.motorCode && s.motorModel === goldenForm.motorModel
        );
        if (existing) {
          if (!window.confirm(`A configuration already exists for "${goldenForm.motorCode} / ${goldenForm.motorModel}". Update it instead of creating a duplicate?`)) {
            setIsSaving(false);
            return;
          }
          const updateRes = await fetch(`${API_BASE_URL}/api/golden-samples/${existing.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          if (updateRes.ok) {
            await syncGoldenSamples();
            resetGoldenForm();
            alert(`Updated configuration for ${goldenForm.motorModel}`);
          }
          setIsSaving(false);
          return;
        }
      }

      setIsSaving(true);
      const url = editingGoldenId ? `${API_BASE_URL}/api/golden-samples/${editingGoldenId}` : `${API_BASE_URL}/api/golden-samples`;
      const res = await fetch(url, {
        method: editingGoldenId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        await syncGoldenSamples();
        resetGoldenForm();
        alert(`Successfully saved configuration for ${data.motorModel}`);
      } else {
        const errData = await res.json();
        alert("Failed to save: " + (errData.message || "Server Error"));
      }
    } catch (err) {
      console.error(err);
      alert("Connection error: Could not reach the server.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditGolden = (s) => {
    // Handle legacy object-based curves by converting them to the new array structure
    let performanceCurves = s.performanceCurves;
    if (!performanceCurves && s.torqueCurve) {
      performanceCurves = Object.keys(s.torqueCurve).map(rpm => ({
        rpm: rpm,
        torque: s.torqueCurve[rpm],
        power: s.powerCurve[rpm],
        efficiency: s.groupEff[rpm]
      }));
    }

    setGoldenForm({
      ...s,
      encoder: { ...s.encoder },
      performanceCurves: performanceCurves || [...initialPerformanceCurves]
    });
    setEditingGoldenId(s.id);
    setGoldenSubTab('entry');
  };

  const handleDeleteGolden = async (id) => {
    if (!window.confirm("Are you sure you want to delete this configuration?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/golden-samples/${id}`, { method: "DELETE" });
      if (res.ok) {
        await syncGoldenSamples();
      }
    } catch (err) { console.error(err); }
  };

  // File data
  const [ppFile, setPpFile] = useState(null);
  const [ppName, setPpName] = useState("");
  const [ppData, setPpData] = useState([]);
  const [torqueAdj, setTorqueAdj] = useState("");
  const [bemfFile, setBemfFile] = useState(null);
  const [bemfName, setBemfName] = useState("");
  const [bemfData, setBemfData] = useState([]);

  // ── Global data sync helpers ────────────────────────────────────────────
  const syncGoldenSamples = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/golden-samples`);
      if (res.ok) {
        const data = await res.json();
        if (setGoldenSamples) setGoldenSamples(data);
      }
    } catch (e) { console.error(e); }
  };

  const syncQiPdiRefSamples = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/qi-pdi-ref`);
      if (res.ok) {
        const data = await res.json();
        if (setQiPdiRefSamples) setQiPdiRefSamples(data);
      }
    } catch (e) { console.error(e); }
  };
  // ────────────────────────────────────────────────────────────────────────

  // Manual fields
  const [form, setForm] = useState({
    programName: "", motorCode: "", motorModel: "",
    serialNo: "", testDate: "", testedBy: "",
    hipotU: "", hipotV: "", hipotW: "",
    irU: "", irV: "", irW: "",
    resU: "", resV: "", resW: "",
    sineMin: "", sineMax: "", cosMin: "", cosMax: "", sinePP: "", cosPP: "", offset: "",
    workOrderId: "", itemIdx: "",
  });
  const F = (k) => (v) => setForm(f => {
    const next = { ...f, [k]: v };
    if (k === "sineMin" || k === "sineMax") {
      const sMin = parseFloat(next.sineMin);
      const sMax = parseFloat(next.sineMax);
      if (!isNaN(sMin) && !isNaN(sMax)) next.sinePP = (sMax - sMin).toString();
      else next.sinePP = "";
    }
    if (k === "cosMin" || k === "cosMax") {
      const cMin = parseFloat(next.cosMin);
      const cMax = parseFloat(next.cosMax);
      if (!isNaN(cMin) && !isNaN(cMax)) next.cosPP = (cMax - cMin).toString();
      else next.cosPP = "";
    }
    return next;
  });

  const selectedWO = useMemo(() =>
    workOrders.find(wo => String(wo.id) === String(form.workOrderId)),
    [form.workOrderId, workOrders]
  );

  const selectedItem = useMemo(() =>
    selectedWO && form.itemIdx !== '' ? selectedWO.items[form.itemIdx] : null,
    [selectedWO, form.itemIdx]
  );

  const handleWorkOrderChange = (woId) => {
    const wo = workOrders.find(w => String(w.id) === String(woId));
    const prog = programs.find(p => p.id === wo?.programId);
    setForm(f => ({
      ...f,
      workOrderId: woId,
      itemIdx: "",
      programName: prog ? prog.name : "",
      motorModel: "",
    }));
  };

  const handleItemChange = (idx) => {
    const item = selectedWO?.items[idx];
    setForm(f => ({
      ...f,
      itemIdx: idx,
      motorModel: item ? item.modelNumber : f.motorModel,
      motorCode: item ? item.partNumber : "",
    }));
    // Auto-select matching golden sample by motorCode (partNo) + motorModel (modelNo)
    if (item && item.partNumber) {
      const match = goldenSamples.find(s =>
        s.motorCode === item.partNumber && s.motorModel === item.modelNumber
      );
      if (match) {
        setForm(f => ({ ...f, motorCode: match.motorCode, motorModel: match.motorModel }));
      }
      // Auto-select matching QI/PDI ref (for PDI reports)
      if (qiPdiRefSamples.length > 0) {
        const refMatch = qiPdiRefSamples.find(s =>
          s.motorCode === item.partNumber && s.motorModel === item.modelNumber
        );
        if (refMatch) {
          setQiPdiData(refMatch.checklist.map(i => ({ ...i, observed: "", status: "" })));
          if (!goldenSamples.some(s => s.motorCode === item.partNumber && s.motorModel === item.modelNumber)) {
            setForm(f => ({ ...f, motorCode: refMatch.motorCode, motorModel: refMatch.motorModel }));
          }
        }
      }
    }
  };

  // Compute unique model+part combinations across all work orders
  const uniqueModelPartOptions = useMemo(() => {
    const seen = new Set();
    const result = [];
    workOrders.forEach(wo => {
      (wo.items || []).forEach(item => {
        const key = `${item.modelNumber}|${item.partNumber}`;
        if (!seen.has(key)) {
          seen.add(key);
          result.push({ modelNumber: item.modelNumber, partNumber: item.partNumber });
        }
      });
    });
    return result;
  }, [workOrders]);

  const [motors, setMotors] = useState([]);
  useEffect(() => {
    fetchMotors();

    // Set document title and favicon
    document.title = "EOL & PDI Report Generator";
    const favicon = document.querySelector("link[rel*='icon']");
    if (favicon) {
      favicon.href = arLogo;
    } else {
      const link = document.createElement("link");
      link.rel = "icon";
      link.href = arLogo;
      document.head.appendChild(link);
    }
  }, []);

  // Auto-upload EOL report PDF to traceability when step 1 renders the report
  useEffect(() => {
    if (pendingUpload?.type === 'EOL' && step === 1 && reportRef.current) {
      setUploadStatus('uploading');
      (async () => {
        try {
          const opt = { ...PDF_OPTS_EOL, filename: `EOL_Report_${form.serialNo || "Motor"}.pdf` };
          const blob = await html2pdf().from(reportRef.current).set(opt).outputPdf('blob');
          const formData = new FormData();
          formData.append('file', blob, `EOL_Report_${form.serialNo || "Motor"}.pdf`);
          const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', body: formData });
          const uploadData = await uploadRes.json();
          if (uploadData.fileName) {
            const updated = traceabilityData.map(e =>
              e.id === pendingUpload.id ? { ...e, eolReport: uploadData.fileName } : e
            );
            setTraceabilityData(updated);
            syncToDisk({ key: 'traceability', data: updated });
            setUploadStatus('success');
          } else {
            setUploadStatus('error');
          }
        } catch (err) { console.error('EOL PDF auto-upload failed:', err); setUploadStatus('error'); }
        setPendingUpload(null);
      })();
    }
  }, [pendingUpload, step, reportRef.current]);

  // Auto-upload PDI report PDF to traceability when hidden ref is ready
  useEffect(() => {
    if (pendingUpload?.type === 'PDI' && hiddenPdiRef.current) {
      setPdiUploadStatus('uploading');
      (async () => {
        try {
          const opt = { ...PDF_OPTS_PDI, filename: `QI_PDI_Report_${form.serialNo || "Motor"}.pdf` };
          const blob = await html2pdf().from(hiddenPdiRef.current).set(opt).outputPdf('blob');
          const formData = new FormData();
          formData.append('file', blob, `QI_PDI_Report_${form.serialNo || "Motor"}.pdf`);
          const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', body: formData });
          const uploadData = await uploadRes.json();
          if (uploadData.fileName) {
            const updated = traceabilityData.map(e =>
              e.id === pendingUpload.id ? { ...e, pdiReport: uploadData.fileName } : e
            );
            setTraceabilityData(updated);
            syncToDisk({ key: 'traceability', data: updated });
            setPdiUploadStatus('success');
          } else {
            setPdiUploadStatus('error');
          }
        } catch (err) { console.error('PDI PDF auto-upload failed:', err); setPdiUploadStatus('error'); }
        setPendingUpload(null);
      })();
    }
  }, [pendingUpload, hiddenPdiRef.current]);

  // Fetch QI/PDI reports whenever the view switches to Archive or on mount
  useEffect(() => {
    if (view === 'archive') {
      fetchQiPdiReports();
    }
  }, [view]);

  const resetForm = () => {
    if (window.confirm("Are you sure you want to clear all data?")) {
      setForm({
        programName: "", motorCode: "", motorModel: "",
        serialNo: "", testDate: "", testedBy: "",
        hipotU: "", hipotV: "", hipotW: "",
        irU: "", irV: "", irW: "",
        resU: "", resV: "", resW: "",
        sineMin: "", sineMax: "", cosMin: "", cosMax: "", sinePP: "", cosPP: "", offset: "",
        workOrderId: "", itemIdx: "",
      });
      setPpData([]);
      setPpName("");
      setBemfData([]);
      setBemfName("");
      setTorqueAdj("");
      setSelectedMotor(null);
      setUploadStatus(null);
      setStep(0); // Reset to data entry step
    }
  };
  // ── Backend Integration ──────────────────────────────────────────────────
  const fetchMotors = async () => {
    try {
      // Ensure the backend is running and accessible
      // For a full solution, this would involve proper error handling and potentially a fallback
      const res = await fetch(`${API_BASE_URL}/api/motors`);
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`Server Error (${res.status}): Backend route not found or server is not running for /api/motors. Expected JSON but received HTML.`);
      }
      const data = await res.json();
      setMotors(data);
    } catch (err) {
      console.error("Failed to fetch motor log:", err);
    }
  };

  const filteredMotors = useMemo(() => {
    return motors.filter(m => {
      const serialMatch = m.form.serialNo.toLowerCase().includes(filterSerial.toLowerCase());
      const modelMatch = m.form.motorModel.toLowerCase().includes(filterModel.toLowerCase());
      const programMatch = m.form.programName.toLowerCase().includes(filterProgram.toLowerCase());

      const entryDate = m.timestamp?.split('T')[0] || "";
      const fromMatch = !filterDateFrom || entryDate >= filterDateFrom;
      const toMatch = !filterDateTo || entryDate <= filterDateTo;

      return serialMatch && modelMatch && programMatch && fromMatch && toMatch;
    });
  }, [motors, filterSerial, filterModel, filterProgram, filterDateFrom, filterDateTo]);

  const filteredQiPdiReports = useMemo(() => {
    return qiPdiReports.filter(r => {
      const serialMatch = r.serialNo.toLowerCase().includes(filterQiPdiSerial.toLowerCase());
      const modelMatch = r.motorModel.toLowerCase().includes(filterQiPdiModel.toLowerCase());
      const entryDate = r.timestamp?.split('T')[0] || "";
      const fromMatch = !filterQiPdiDateFrom || entryDate >= filterQiPdiDateFrom;
      const toMatch = !filterQiPdiDateTo || entryDate <= filterQiPdiDateTo;
      return serialMatch && modelMatch && fromMatch && toMatch;
    });
  }, [qiPdiReports, filterQiPdiSerial, filterQiPdiModel, filterQiPdiDateFrom, filterQiPdiDateTo]);

  const approvedMotors = useMemo(() => motors.filter(m => m.status === 'APPROVED'), [motors]);

  useEffect(() => {
    if (showPreviewModal && pendingDownloadMotor && previewMotor?.id === pendingDownloadMotor.id) {
      setTimeout(() => {
        handleDownloadPDF();
        setPendingDownloadMotor(null);
      }, 500); // Add a small delay to ensure charts are rendered
    }
  }, [showPreviewModal, pendingDownloadMotor, previewMotor]);

  // Visibility check for Dashboard and Motor Log
  const canSeeRestrictedTabs = useMemo(() => {
    const privilegedRoles = ["Admin", "Program Owner"];
    return currentUser?.roles?.some(role => privilegedRoles.includes(role) || role.toLowerCase().includes("head") || role.toLowerCase().includes("owner"));
  }, [currentUser]);

  const userPerms = useMemo(() => {
    const p = currentUser?.permissions || {};
    // Legacy Support: Convert string permissions to granular object if necessary
    const v = typeof p.validation === 'string' ? { dashboard: p.validation, report: p.validation, golden: p.validation, archive: p.validation } : (p.validation || {});
    const q = typeof p.qipdi === 'string' ? { dashboard: p.qipdi, report: p.qipdi, reference: p.qipdi, archive: p.qipdi } : (p.qipdi || {});

    return {
      validation: {
        dashboard: v.dashboard || "edit", report: v.report || "edit", golden: v.golden || "edit", archive: v.archive || "edit"
      },
      qipdi: {
        dashboard: q.dashboard || "edit", report: q.report || "edit", reference: q.reference || "edit", archive: q.archive || "edit"
      }
    };
  }, [currentUser]);

  const isEngineerValidationOnly = useMemo(() => {
    const engineerRoles = ["Engineer", "Sr. Engineer"];
    return currentUser?.roles?.some(role => engineerRoles.includes(role)) && currentUser?.domains?.includes("Validation") && !currentUser?.domains?.includes("Prototype");
  }, [currentUser]);

  const isEngineerPrototypeOnly = useMemo(() => {
    const engineerRoles = ["Engineer", "Sr. Engineer"];
    return currentUser?.roles?.some(role => engineerRoles.includes(role)) && currentUser?.domains?.includes("Prototype") && !currentUser?.domains?.includes("Validation");
  }, [currentUser]);

  const showValidationSection = useMemo(() => {
    if (isEngineerValidationOnly) return true;
    if (isEngineerPrototypeOnly) return false;
    return canSeeRestrictedTabs || Object.values(userPerms.validation).some(v => v !== "none");
  }, [canSeeRestrictedTabs, userPerms, isEngineerValidationOnly, isEngineerPrototypeOnly]);

  const showQiPdiSection = useMemo(() => {
    if (isEngineerPrototypeOnly) return true;
    if (isEngineerValidationOnly) return false;
    return canSeeRestrictedTabs || Object.values(userPerms.qipdi).some(v => v !== "none");
  }, [canSeeRestrictedTabs, userPerms, isEngineerValidationOnly, isEngineerPrototypeOnly]);

  const canEditValidation = useMemo(() => canSeeRestrictedTabs || userPerms.validation.report === "edit", [canSeeRestrictedTabs, userPerms.validation.report]);
  const canEditGolden = useMemo(() => canSeeRestrictedTabs || userPerms.validation.golden === "edit", [canSeeRestrictedTabs, userPerms.validation.golden]);
  const canEditQiPdi = useMemo(() => canSeeRestrictedTabs || userPerms.qipdi.report === "edit", [canSeeRestrictedTabs, userPerms.qipdi.report]);
  const canEditQiRef = useMemo(() => canSeeRestrictedTabs || userPerms.qipdi.reference === "edit", [canSeeRestrictedTabs, userPerms.qipdi.reference]);

  const handleEditMotor = (motor) => {
    setForm(motor.form);
    setPpData(motor.ppData || []);
    setPpName("Data from Log");
    setBemfData(motor.bemfData || []);
    setBemfName("Data from Log");
    setTorqueAdj(motor.torqueAdj || "");
    setSelectedMotor(motor);
    updateView("new_report");
    setStep(0);
  };

  const saveMotorToLog = async () => {
    setIsSaving(true);
    const payload = { // `checks` and `overallPass` are computed below and will be available here
      form: { ...form, creator: currentUser.user },
      ppData, bemfData, torqueAdj,
      status: "APPROVED",
      overallPass: overallPass,
      timestamp: new Date().toISOString(),
      comment: "" // Clear correction notes upon resubmission
    };
    try {
      const url = selectedMotor ? `${API_BASE_URL}/api/motors/${selectedMotor.id}` : `${API_BASE_URL}/api/motors`;
      const method = selectedMotor ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedMotor(data);
        await fetchMotors();

        if (setTraceabilityData && showToast && syncToDisk) {
          const normalizedSerial = (form.serialNo || '').toString().trim().toUpperCase();
          const existing = traceabilityData.find(e =>
            String(e.workOrderId) === String(form.workOrderId) &&
            (e.actualSerialNo || '').toString().trim().toUpperCase() === normalizedSerial &&
            e.type === 'EOL'
          );
          if (!existing) {
            const entry = {
              id: Date.now(),
              type: 'EOL',
              modelNumber: selectedItem?.modelNumber || form.motorModel || '',
              partNumber: selectedItem?.partNumber || '',
              workOrderId: form.workOrderId,
              workOrderTitle: selectedWO?.title || '',
              actualSerialNo: form.serialNo,
              eolReport: '',
              photo: '',
              status: 'Pending Validation Functional Head',
              submittedBy: currentUser.user || '',
              createdAt: new Date().toISOString(),
              history: [{
                date: new Date().toISOString(),
                user: currentUser.user || '',
                action: 'EOL Report Generated',
                remarks: 'Auto-created from EOL Report Generator'
              }]
            };
            const updated = [entry, ...traceabilityData];
            setTraceabilityData(updated);
            syncToDisk({ key: 'traceability', data: updated });
            if (addNotification) {
              addNotification('Validation Functional Head', `New EOL traceability record auto-created from EOL Report Generator for ${form.motorModel} (SN: ${form.serialNo})`, entry.id);
            }
            setPendingUpload({ id: entry.id, type: 'EOL' });
          }
        }

        return true;
      } else {
        alert("Failed to save report to server.");
        return false;
      }
    } catch (err) {
      console.error("Failed to save motor:", err);
      alert("Network error: Could not save report.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const saveQiPdiRef = async () => {
    if (!qiPdiRefForm.motorCode || !qiPdiRefForm.motorModel) return alert("Part No. and Model Name are required.");
    try {
      // Duplicate check
      if (!editingQiPdiRefId) {
        const existing = qiPdiRefSamples.find(s =>
          s.motorCode === qiPdiRefForm.motorCode && s.motorModel === qiPdiRefForm.motorModel
        );
        if (existing) {
          if (!window.confirm(`A reference already exists for "${qiPdiRefForm.motorCode} / ${qiPdiRefForm.motorModel}". Update it instead?`)) return;
          const updateRes = await fetch(`${API_BASE_URL}/api/qi-pdi-ref/${existing.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(qiPdiRefForm)
          });
          if (updateRes.ok) {
            await syncQiPdiRefSamples();
            setQiPdiRefForm({ motorCode: "", motorModel: "", checklist: QI_PDI_DEFAULTS.map(i => ({ ...i })) });
            setEditingQiPdiRefId(null);
            alert("QI/PDI Reference Updated.");
          }
          setIsSaving(false);
          return;
        }
      }

      setIsSaving(true);
      const url = editingQiPdiRefId ? `${API_BASE_URL}/api/qi-pdi-ref/${editingQiPdiRefId}` : `${API_BASE_URL}/api/qi-pdi-ref`;
      const method = editingQiPdiRefId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(qiPdiRefForm)
      });
      if (res.ok) {
        await syncQiPdiRefSamples();
        setQiPdiRefForm({ motorCode: "", motorModel: "", checklist: QI_PDI_DEFAULTS.map(i => ({ ...i })) });
        setEditingQiPdiRefId(null);
        alert("QI/PDI Reference Saved.");
      } else {
        const errData = await res.json();
        alert("Failed to save: " + (errData.message || "Server Error"));
      }
    } catch (err) {
      console.error(err);
      alert("Connection error: Could not reach the server.");
    } finally { setIsSaving(false); }
  };

  // Handle Model Change in QI/PDI Report to load custom checklist
  const handleQiPdiRefSelection = (code) => {
    const ref = qiPdiRefSamples.find(s => s.motorCode === code);
    if (ref) {
      setForm(f => ({ ...f, motorCode: ref.motorCode, motorModel: ref.motorModel }));
      setQiPdiData(ref.checklist.map(i => ({ ...i, observed: "", status: "" })));
    } else {
      setQiPdiData(QI_PDI_DEFAULTS.map(i => ({
        ...i,
        observed: i.no === 21 ? "Connector push mount not provided, push mount cable tie provided as alternative" : "",
        status: ""
      })));
    }
  };

  const handleEditQiPdiRef = (s) => {
    setQiPdiRefForm({ ...s });
    setEditingQiPdiRefId(s.id);
    setQiPdiRefSubTab('entry');
  };

  const handleDeleteQiPdiRef = async (id) => {
    if (!window.confirm("Delete this reference?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/qi-pdi-ref/${id}`, { method: "DELETE" });
      if (res.ok) await syncQiPdiRefSamples();
    } catch (err) { console.error(err); }
  };

  const openQiPdiPreview = (report) => {
    setPreviewQiPdi(report);
    setShowQiPdiModal(true);
  };

  const openQiPdiDownload = (report) => {
    setPreviewQiPdi(report);
    setPendingDownloadQiPdi(report);
    setShowQiPdiModal(true);
  };

  const handleDownloadQiPdiPDF = (report) => {
    const element = qiPdiReportRef.current;
    if (!element) return;
    const reportName = `QI_PDI_Report_${report.serialNo || "Motor"}_${report.timestamp?.slice(0, 10) || ""}`;
    const opt = { ...PDF_OPTS_PDI, filename: `${reportName}.pdf` };
    html2pdf().from(element).set(opt).save();
  };

  useEffect(() => {
    if (showQiPdiModal && pendingDownloadQiPdi && previewQiPdi?.id === pendingDownloadQiPdi.id) {
      setTimeout(() => {
        handleDownloadQiPdiPDF(previewQiPdi);
        setPendingDownloadQiPdi(null);
      }, 500);
    }
  }, [showQiPdiModal, pendingDownloadQiPdi, previewQiPdi]);

  const handleSaveQiPdi = async () => {
    if (!form.serialNo || !form.motorModel || !form.testedBy) {
      return alert("Please fill Serial No, Motor Model, and Tested By.");
    }

    setPdiUploadStatus(null);
    setIsSaving(true);
    const payload = {
      serialNo: form.serialNo,
      testDate: form.testDate,
      motorModel: form.motorModel,
      motorCode: form.motorCode,
      testedBy: form.testedBy,
      data: qiPdiData,
      timestamp: new Date().toISOString()
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/qi-pdi-reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        if (setTraceabilityData && showToast && syncToDisk) {
          const normalizedSerial = (form.serialNo || '').toString().trim().toUpperCase();
          const existing = traceabilityData.find(e =>
            String(e.workOrderId) === String(form.workOrderId) &&
            (e.actualSerialNo || '').toString().trim().toUpperCase() === normalizedSerial &&
            e.type === 'PDI'
          );
          if (!existing) {
            const entry = {
              id: Date.now(),
              type: 'PDI',
              modelNumber: selectedItem?.modelNumber || form.motorModel || '',
              partNumber: selectedItem?.partNumber || '',
              workOrderId: form.workOrderId,
              workOrderTitle: selectedWO?.title || '',
              actualSerialNo: form.serialNo,
              pdiReport: '',
              photo: '',
              status: 'Pending Proto Functional Head',
              submittedBy: currentUser.user || '',
              createdAt: new Date().toISOString(),
              history: [{
                date: new Date().toISOString(),
                user: currentUser.user || '',
                action: 'PDI Report Generated',
                remarks: 'Auto-created from QI/PDI Report'
              }]
            };
            const updated = [entry, ...traceabilityData];
            setTraceabilityData(updated);
            syncToDisk({ key: 'traceability', data: updated });
            if (addNotification) {
              addNotification('Proto Functional Head', `New PDI traceability record auto-created from QI/PDI Report for ${form.motorModel} (SN: ${form.serialNo})`, entry.id);
            }
            setPendingUpload({ id: entry.id, type: 'PDI' });
            setPreviewQiPdi({
              id: entry.id,
              serialNo: form.serialNo,
              motorModel: form.motorModel,
              motorCode: form.motorCode,
              testedBy: form.testedBy,
              testDate: form.testDate,
              data: qiPdiData,
              timestamp: new Date().toISOString()
            });
          }
        }
        showToast ? showToast("QI/PDI Report saved and traceability entry created.") : alert("QI/PDI Report saved successfully.");
        fetchQiPdiReports();
        setPdiStep(1);
      } else {
        alert("Failed to save report.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving report.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportMotorLog = () => {
    const dataToExport = filteredMotors.filter(m => m.status === 'APPROVED');
    if (dataToExport.length === 0) return alert("No approved records to export.");

    const excelData = dataToExport.map(m => {
      const d = computeMotorReportData(m, goldenSamples);
      return {
        "Serial No": m.form.serialNo,
        "Date": m.form.testDate,
        "Program": m.form.programName,
        "Model": m.form.motorModel,
        "Part No.": m.form.motorCode,
        "Tested By": m.form.testedBy,
        "Peak Torque (Nm)": d.peakTorqueDUT,
        "Peak Power (kW)": d.peakPowerDUT_kW,
        "BEMF 3000 (V)": d.bemf3000,
        "Torque Adj (Nm)": m.torqueAdj,
        "Hipot U (mA)": m.form.hipotU,
        "Hipot V (mA)": m.form.hipotV,
        "Hipot W (mA)": m.form.hipotW,
        "IR U (MΩ)": m.form.irU,
        "IR V (MΩ)": m.form.irV,
        "IR W (MΩ)": m.form.irW,
        "Res U (mΩ)": m.form.resU,
        "Res V (mΩ)": m.form.resV,
        "Res W (mΩ)": m.form.resW,
        "Sine Min": m.form.sineMin,
        "Sine Max": m.form.sineMax,
        "Cos Min": m.form.cosMin,
        "Cos Max": m.form.cosMax,
        "Sine PP": m.form.sinePP,
        "Cos PP": m.form.cosPP,
        "Offset": m.form.offset,
        "Result": d.overallPass ? "PASS" : "FAIL"
      };
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Motor Log");
    XLSX.writeFile(wb, `Approved_Motor_Log_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDelete = async (motor) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/motors/${motor.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setDeleteConfirmId(null);
        fetchMotors();
      }
    } catch (err) {
      console.error("Failed to delete motor:", err);
    }
  };

  const handleDeleteQiPdi = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/qi-pdi-reports/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setDeleteQiPdiConfirmId(null);
        fetchQiPdiReports();
      }
    } catch (err) {
      console.error("Failed to delete QI/PDI report:", err);
    }
  };

  const openReportPreview = (motor) => {
    setPreviewMotor(motor);
    setShowPreviewModal(true);
  };

  const openReportDownload = (motor) => {
    setPreviewMotor(motor);
    setPendingDownloadMotor(motor);
    setShowPreviewModal(true);
  };

  const sectionProgress = useMemo(() => {
    return {
      identity: [form.workOrderId, form.itemIdx, form.serialNo, form.testDate, form.motorCode, form.motorModel, form.testedBy].filter(Boolean).length,
      pdi: [form.hipotU, form.hipotV, form.hipotW, form.irU, form.irV, form.irW, form.resU, form.resV, form.resW].filter(Boolean).length,
      encoder: [form.sineMin, form.sineMax, form.cosMin, form.cosMax, form.sinePP, form.cosPP, form.offset].filter(Boolean).length,
      uploads: (ppData.length > 0 ? 1 : 0) + (bemfData.length > 0 ? 1 : 0),
    };
  }, [form, ppData, bemfData]);

  const totalProgress = useMemo(() => {
    // Identity (7) + PDI (9) + Encoder (7) + Uploads (2) = 25
    const total = 7 + 9 + 7 + 2;
    const current = sectionProgress.identity + sectionProgress.pdi + sectionProgress.encoder + sectionProgress.uploads;
    return Math.round((current / total) * 100);
  }, [sectionProgress]);

  const handleGenerate = async () => {
    setUploadStatus(null);
    const success = await saveMotorToLog();
    if (success) {
      setStep(1);
    }
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    const reportName = `EOL_Report_${form.serialNo || "Motor"}_${form.testDate || ""}`;
    document.title = reportName;
    window.print();
    document.title = originalTitle;
  };

  const handleDownloadPDF = () => {
    const element = reportRef.current;
    const reportName = `EOL_Report_${form.serialNo || "Motor"}_${form.testDate || ""}`;
    const opt = { ...PDF_OPTS_EOL, filename: `${reportName}.pdf` };
    html2pdf().from(element).set(opt).save();
  };

  const handleUploadEolReport = useCallback(async () => {
    const sourceRef = hiddenEolRef.current || reportRef.current;
    if (!sourceRef) return;
    setUploadStatus('uploading');
    try {
      const opt = { ...PDF_OPTS_EOL, filename: `EOL_Report_${form.serialNo || "Motor"}.pdf` };
      const blob = await html2pdf().from(sourceRef).set(opt).outputPdf('blob');
      const formData = new FormData();
      formData.append('file', blob, `EOL_Report_${form.serialNo || "Motor"}.pdf`);
      const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (uploadData.fileName) {
        if (selectedMotor) {
          const updated = traceabilityData.map(e =>
            e.id === selectedMotor.id ? { ...e, eolReport: uploadData.fileName } : e
          );
          setTraceabilityData(updated);
          syncToDisk({ key: 'traceability', data: updated });
        }
        setUploadStatus('success');
      } else {
        setUploadStatus('error');
      }
    } catch (err) {
      console.error('EOL PDF upload failed:', err);
      setUploadStatus('error');
    }
  }, [form.serialNo, reportRef, hiddenEolRef, selectedMotor, traceabilityData, syncToDisk]);

  const handleUploadPdiReport = useCallback(async () => {
    if (!hiddenPdiRef.current) return;
    setPdiUploadStatus('uploading');
    try {
      const opt = { ...PDF_OPTS_PDI, filename: `QI_PDI_Report_${form.serialNo || "Motor"}.pdf` };
      const blob = await html2pdf().from(hiddenPdiRef.current).set(opt).outputPdf('blob');
      const formData = new FormData();
      formData.append('file', blob, `QI_PDI_Report_${form.serialNo || "Motor"}.pdf`);
      const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (uploadData.fileName) {
        if (previewQiPdi) {
          const updated = traceabilityData.map(e =>
            e.id === previewQiPdi.id ? { ...e, pdiReport: uploadData.fileName } : e
          );
          setTraceabilityData(updated);
          syncToDisk({ key: 'traceability', data: updated });
        }
        setPdiUploadStatus('success');
      } else {
        setPdiUploadStatus('error');
      }
    } catch (err) {
      console.error('PDI PDF upload failed:', err);
      setPdiUploadStatus('error');
    }
  }, [form.serialNo, hiddenPdiRef, previewQiPdi, traceabilityData, syncToDisk]);

  // ── Parse Peak Power XLSX ─────────────────────────────────────────────────
  const parsePP = useCallback((file) => {
    setPpName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false });

      // Find header row dynamically
      let hdrIdx = raw.findIndex(r => r && r.some(cell => {
        const s = String(cell).toUpperCase();
        return s.includes("PROG") || s.includes("TQ [") || s.includes("MOT. PWR") || s.includes("I AVG");
      }));
      if (hdrIdx < 0) hdrIdx = 0;

      const headers = raw[hdrIdx].map(h => h ? String(h).toUpperCase().trim() : "");
      const findCol = (keys) => headers.findIndex(h => keys.some(k => h.includes(k.toUpperCase())));

      const tqIdx = findCol(["TQ [", "TORQUE"]);
      const pwrIdx = findCol(["MOT. PWR", "MOT POWER", "POWER [W]", "WATT"]);
      const vdcIdx = findCol(["V_DC", "VDC", "DC VOLTAGE"]);
      const idcIdx = findCol(["I_DC", "IDC", "DC CURRENT"]);
      const iavgIdx = findCol(["I AVG", "AVG CURRENT", "I_RMS"]);
      const progIdx = findCol(["PROG", "SETPOINT", "TARGET"]);

      // Only assume input is kW if explicitly stated in header, otherwise assume Watts
      const isKW = pwrIdx !== -1 && headers[pwrIdx].includes("KW");

      const rows = raw.slice(hdrIdx + 1);
      const bySpeed = {};
      rows.forEach(r => {
        if (progIdx === -1 || !r[progIdx]) return;
        const progVal = String(r[progIdx]).replace(/[^\d.-]/g, '');
        const prog = Math.round(parseFloat(progVal));
        if (TARGET_SPEEDS.includes(prog)) {
          if (!bySpeed[prog]) bySpeed[prog] = [];
          bySpeed[prog].push(r);
        }
      });

      const cleanNum = (v) => v === null ? 0 : parseFloat(String(v).replace(/[^\d.-]/g, '')) || 0;

      const parsed = TARGET_SPEEDS.map(spd => {
        const pts = bySpeed[spd];
        if (!pts || !pts.length) return null;
        const avg = (idx) => idx === -1 ? 0 : pts.reduce((s, r) => s + cleanNum(r[idx]), 0) / pts.length;

        const motPowerW = isKW ? +(avg(pwrIdx) * 1000).toFixed(1) : +avg(pwrIdx).toFixed(1);
        const vdc = +avg(vdcIdx).toFixed(3);
        const idc = +avg(idcIdx).toFixed(3);
        const inputPowerW = vdc * idc;
        const groupEff = inputPowerW !== 0 ? +(motPowerW / inputPowerW * 100).toFixed(2) : 0;

        return {
          Speed: spd,
          "Torque (Nm)": +avg(tqIdx).toFixed(2),
          "Mot Power (W)": motPowerW,
          "Group Eff (%)": groupEff,
          "V_DC (V)": +avg(vdcIdx).toFixed(2),
          "I_DC (A)": +avg(idcIdx).toFixed(2),
          "I Avg (A)": +avg(iavgIdx).toFixed(2),
        };
      }).filter(Boolean);
      setPpData(parsed);
    };
    reader.readAsArrayBuffer(file);
  }, []);

  // ── Parse BEMF CSV ────────────────────────────────────────────────────────
  const parseBEMF = useCallback((file) => {
    setBemfName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false });

      // Find header row dynamically
      let hdrIdx = raw.findIndex(r => r && r.some(cell => {
        const s = String(cell).toUpperCase();
        return (s.includes("SPEED") || s.includes("RPM")) && (s.includes("RMS") || s.includes("BEMF") || s.includes("UV"));
      }));
      if (hdrIdx < 0) hdrIdx = 0;

      const headers = raw[hdrIdx].map(h => h ? String(h).toUpperCase().trim() : "");
      const findCol = (keys) => headers.findIndex(h => keys.some(k => h.includes(k.toUpperCase())));

      const spdIdx = findCol(["SPEED", "RPM", "VELOCITY"]);
      const uvIdx = findCol(["RMS_UV", "UV", "U-V"]);
      const uwIdx = findCol(["RMS_UW", "UW", "U-W"]);
      const vwIdx = findCol(["RMS_VW", "VW", "V-W"]);
      const keIdx = findCol(["KETRMS", "KE "]);
      const isMV = headers.some(h => h.includes("RMS") && h.includes("MV"));

      const rows = raw.slice(hdrIdx + 1);
      const cleanNum = (v) => v === null ? 0 : parseFloat(String(v).replace(/[^\d.-]/g, '')) || 0;

      const parsed = rows.map(r => {
        const spd = Math.abs(cleanNum(r[spdIdx]));
        if (spd === 0) return null;
        const scale = isMV ? 0.001 : 1;
        const uv = cleanNum(r[uvIdx]) * scale;
        const uw = cleanNum(r[uwIdx]) * scale;
        const vw = cleanNum(r[vwIdx]) * scale;
        const ke = cleanNum(r[keIdx]);
        return {
          "Speed (RPM)": +spd.toFixed(0),
          "RMS_UV (V)": +uv.toFixed(3),
          "RMS_UW (V)": +uw.toFixed(3),
          "RMS_VW (V)": +vw.toFixed(3),
          "Avg BEMF (V)": +((uv + uw + vw) / 3).toFixed(3),
          "Ke (V/krpm)": +ke.toFixed(4),
        };
      }).filter(Boolean).sort((a, b) => a["Speed (RPM)"] - b["Speed (RPM)"]);
      setBemfData(parsed);
    };
    reader.readAsArrayBuffer(file);
  }, []);

  // ── Derived computations ─────────────────────────────────────────────────
  const adjustedPpData = useMemo(() => {
    const adj = parseFloat(torqueAdj) || 0;
    if (adj === 0) return ppData;
    return ppData.map(r => {
      const adjTorque = r["Torque (Nm)"] + adj;
      const adjPowerW = adjTorque * r.Speed * (2 * Math.PI / 60);
      const dcPower = r["V_DC (V)"] * r["I_DC (A)"];
      return {
        ...r,
        "Torque (Nm)": +adjTorque.toFixed(2),
        "Mot Power (W)": +adjPowerW.toFixed(2),
        "Group Eff (%)": dcPower !== 0 ? +(adjPowerW / dcPower * 100).toFixed(2) : 0
      };
    });
  }, [ppData, torqueAdj]);

  const ppBySpeed = {};
  adjustedPpData.forEach(r => { ppBySpeed[r.Speed] = r; }); // Ensure ppBySpeed is populated
  const bemfBySpeed = {};
  bemfData.forEach(r => { bemfBySpeed[r["Speed (RPM)"]] = r; });

  const peakTorqueDUT = adjustedPpData.reduce((mx, r) => Math.max(mx, r["Torque (Nm)"]), 0);
  const peakPowerDUT_kW = adjustedPpData.reduce((mx, r) => Math.max(mx, r["Mot Power (W)"]), 0) / 1000;
  const avgVdc = adjustedPpData.length ? adjustedPpData.reduce((s, r) => s + r["V_DC (V)"], 0) / adjustedPpData.length : 0;
  const peakCurrentDUT = adjustedPpData.reduce((mx, r) => Math.max(mx, r["I Avg (A)"]), 0);

  // Find value closest to 3000 RPM for robustness in case equipment isn't exactly on 3000
  const bemfRow3000 = bemfData.find(r => Math.abs(r["Speed (RPM)"] - 3000) <= 50);
  const bemf3000 = bemfRow3000 ? bemfRow3000["Avg BEMF (V)"] : null;

  const avgRes = [parseFloat(form.resU) || 0, parseFloat(form.resV) || 0, parseFloat(form.resW) || 0];
  const avgResVal = avgRes.reduce((s, v) => s + v, 0) / 3;

  // Unified Logic: Use computeMotorReportData for all derived values
  const reportData = useMemo(() => computeMotorReportData({ form, ppData, bemfData, torqueAdj }, goldenSamples), [form, ppData, bemfData, torqueAdj, goldenSamples]);
  const { checks, overallPass, encOK, dsRows, pdiRows, bemfCardRow, encRows, torqueChartData, powerChartData, effChartData } = reportData;
  const activeGolden = useMemo(() => goldenSamples.find(s => s.motorCode === form.motorCode) || null, [goldenSamples, form.motorCode]);

  const missingFieldsBySection = useMemo(() => {
    const sections = {
      "Identity": ["workOrderId", "itemIdx", "serialNo", "testDate", "motorCode", "motorModel", "testedBy"],
      "PDI": ["hipotU", "hipotV", "hipotW", "irU", "irV", "irW", "resU", "resV", "resW"],
      "Encoder": ["sineMin", "sineMax", "cosMin", "cosMax", "sinePP", "cosPP", "offset"]
    };
    const labels = {
      workOrderId: "Work Order", itemIdx: "Model/Part", serialNo: "Serial No", testDate: "Test Date", motorCode: "Part No.", motorModel: "Motor Model",
      testedBy: "Tested By", hipotU: "Hipot U", hipotV: "Hipot V", hipotW: "Hipot W",
      irU: "IR U", irV: "IR V", irW: "IR W", resU: "Res U", resV: "Res V", resW: "Res W", sineMin: "Sine Min", sineMax: "Sine Max",
      cosMin: "Cos Min", cosMax: "Cos Max", sinePP: "Sine P-P", cosPP: "Cos P-P", offset: "Offset"
    };
    const missing = {};
    Object.entries(sections).forEach(([sectionName, keys]) => {
      const sectionMissing = keys.filter(k => !form[k] || String(form[k]).trim() === "");
      if (sectionMissing.length > 0) missing[sectionName] = sectionMissing.map(k => labels[k] || k);
    });
    const uMissing = [];
    if (ppData.length === 0) uMissing.push("Peak Power File");
    if (!torqueAdj || String(torqueAdj).trim() === "") uMissing.push("Torque Adjustment");
    if (bemfData.length === 0) uMissing.push("BEMF File");
    if (uMissing.length > 0) missing["Uploads & Adjustments"] = uMissing;
    return missing;
  }, [form, torqueAdj, ppData, bemfData]);

  const canGenerate = Object.keys(missingFieldsBySection).length === 0;
  const tooltipText = !canGenerate ? `Required fields missing:\n${Object.entries(missingFieldsBySection).map(([section, fields]) => `• ${section}: ${fields.join(", ")}`).join("\n")}` : "";

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <>
      {!embedded && (
        <div style={{ display: 'flex', gap: 4, padding: '8px 16px', borderBottom: `1px solid ${activeTheme.border}`, background: activeTheme.surfaceAlt, flexWrap: 'wrap', alignItems: 'center' }}>
          {showValidationSection && (
            <>
              {userPerms.validation.report !== "none" && (
                <button style={{ ...S.sideBtn(view === 'new_report'), padding: '6px 12px', fontSize: 11, borderRadius: 6 }} onClick={() => { updateView('new_report'); setSelectedMotor(null); setStep(0); }}>
                  <NavIcon type="new" color={view === 'new_report' ? activeTheme.primary : activeTheme.textMuted} /> EOL Report
                </button>
              )}
              {userPerms.validation.dashboard !== "none" && (
                <button style={{ ...S.sideBtn(view === 'dashboard'), padding: '6px 12px', fontSize: 11, borderRadius: 6 }} onClick={() => { updateView('dashboard'); }}>
                  <NavIcon type="dashboard" color={view === 'dashboard' ? activeTheme.primary : activeTheme.textMuted} /> EOL Dashboard
                </button>
              )}
              {userPerms.validation.golden !== "none" && (
                <button style={{ ...S.sideBtn(view === 'golden_samples'), padding: '6px 12px', fontSize: 11, borderRadius: 6 }} onClick={() => updateView('golden_samples')}>
                  <NavIcon type="golden" color={view === 'golden_samples' ? activeTheme.primary : activeTheme.textMuted} /> Golden Samples
                </button>
              )}
            </>
          )}
          {showQiPdiSection && (
            <>
              {userPerms.qipdi.report !== "none" && (
                <button style={{ ...S.sideBtn(view === 'qi_pdi_report'), padding: '6px 12px', fontSize: 11, borderRadius: 6 }} onClick={() => { updateView('qi_pdi_report'); setPdiStep(0); setPdiUploadStatus(null); }}>
                  <NavIcon type="qi" color={view === 'qi_pdi_report' ? activeTheme.primary : activeTheme.textMuted} /> PDI Report
                </button>
              )}
              {userPerms.qipdi.dashboard !== "none" && (
                <button style={{ ...S.sideBtn(view === 'qi_pdi_dashboard'), padding: '6px 12px', fontSize: 11, borderRadius: 6 }} onClick={() => updateView('qi_pdi_dashboard')}>
                  <NavIcon type="dashboard" color={view === 'qi_pdi_dashboard' ? activeTheme.primary : activeTheme.textMuted} /> PDI Dashboard
                </button>
              )}
              {userPerms.qipdi.reference !== "none" && (
                <button style={{ ...S.sideBtn(view === 'qi_pdi_ref_samples'), padding: '6px 12px', fontSize: 11, borderRadius: 6 }} onClick={() => updateView('qi_pdi_ref_samples')}>
                  <NavIcon type="golden" color={view === 'qi_pdi_ref_samples' ? activeTheme.primary : activeTheme.textMuted} /> Ref Samples
                </button>
              )}
            </>
          )}
          {(userPerms.validation.archive !== "none" || userPerms.qipdi.archive !== "none") && (
            <button style={{ ...S.sideBtn(view === 'archive'), padding: '6px 12px', fontSize: 11, borderRadius: 6 }} onClick={() => { updateView('archive'); setArchiveSubTab('summary'); setArchiveMode('eol'); }}>
              <NavIcon type="archive" color={view === 'archive' ? activeTheme.primary : activeTheme.textMuted} /> Archive
            </button>
          )}
      </div>
      )}

            <main style={{ flex: 1, minWidth: 0 }} className={embedded ? 'embedded-eol-main' : ''}>
              {view === "new_report" && (
                <>
                  <div style={{ ...S.stepBar, background: 'transparent', borderBottom: 'none', padding: "8px 24px", gap: 12 }}>
                    {["01 // Data Entry", "02 // Report", "03 // Upload Report"].map((label, i) => (
                      <button key={i}
                        style={{
                          padding: "8px 20px", fontSize: 10, fontWeight: 800, letterSpacing: 1, cursor: "pointer", border: "none",
                          borderRadius: 30,
                          background: step === i ? activeTheme.primary : activeTheme.surfaceAlt,
                          color: step === i ? "#fff" : activeTheme.textMuted,
                          boxShadow: step === i ? `0 4px 12px ${activeTheme.primary}44` : 'none',
                          transition: "all 0.3s ease",
                          textTransform: "uppercase"
                        }}
                        onClick={() => setStep(i)}
                      >
                        {step > i && "✓ "}{label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <div style={{ padding: "16px 0px", maxWidth: 1600, margin: "0 auto" }}>
                {/* ── DASHBOARD VIEW ── */}
                {view === "dashboard" && (
                  <div>
                    <div style={{ ...S.sectionTitle, marginBottom: 24, fontSize: 16 }}>Performance Dashboard</div>
                    <div className="dashboard-grid">
                      <div style={{ ...S.section, textAlign: 'center' }} className="entrance-fade">
                        <div style={S.label}>Total Tested</div>
                        <div style={{ fontSize: 42, fontWeight: 900, color: activeTheme.primary, margin: '10px 0' }}>{approvedMotors.length}</div>
                        <div style={{ fontSize: 9, color: activeTheme.textMuted }}>APPROVED RECORDS</div>
                      </div>
                      <div style={{ ...S.section, textAlign: 'center', borderLeft: `4px solid ${activeTheme.success}`, animationDelay: '0.1s' }} className="entrance-fade">
                        <div style={S.label}>Passed</div>
                        <div style={{ fontSize: 42, fontWeight: 900, color: activeTheme.success, margin: '10px 0' }}>{approvedMotors.filter(m => m.overallPass).length}</div>
                        <div style={{ fontSize: 9, color: activeTheme.textMuted }}>COMPLIANT (APPROVED)</div>
                      </div>
                      <div style={{ ...S.section, textAlign: 'center', borderLeft: `4px solid ${activeTheme.error}`, animationDelay: '0.2s' }} className="entrance-fade">
                        <div style={S.label}>Failed</div>
                        <div style={{ fontSize: 42, fontWeight: 900, color: activeTheme.error, margin: '10px 0' }}>{approvedMotors.filter(m => !m.overallPass).length}</div>
                        <div style={{ fontSize: 9, color: activeTheme.textMuted }}>NON-COMPLIANT (APPROVED)</div>
                      </div>
                      <div style={{ ...S.section, textAlign: 'center', background: `linear-gradient(135deg, ${activeTheme.surface} 0%, ${activeTheme.surfaceAlt} 100%)`, animationDelay: '0.4s' }} className="entrance-fade">
                        <div style={S.label}>Pass Rate</div>
                        <div style={{ fontSize: 42, fontWeight: 900, color: activeTheme.accent, margin: '10px 0' }}>
                          {approvedMotors.length ? ((approvedMotors.filter(m => m.overallPass).length / approvedMotors.length) * 100).toFixed(1) : 0}%
                        </div>
                        <div style={{
                          height: 4, width: '100%', background: activeTheme.border, borderRadius: 2, marginTop: 10, overflow: 'hidden'
                        }}>
                          <div style={{ height: '100%', width: approvedMotors.length ? `${(approvedMotors.filter(m => m.overallPass).length / approvedMotors.length) * 100}%` : '0%', background: activeTheme.accent }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── QI/PDI DASHBOARD VIEW ── */}
                {view === "qi_pdi_dashboard" && (
                  <div className="entrance-fade">
                    <div style={{ ...S.sectionTitle, marginBottom: 24, fontSize: 16 }}>QI / PDI Performance Dashboard</div>
                    <div className="dashboard-grid">
                      <div style={{ ...S.section, textAlign: 'center' }}>
                        <div style={S.label}>Total Inspections</div>
                        <div style={{ fontSize: 42, fontWeight: 900, color: activeTheme.primary, margin: '10px 0' }}>{qiPdiReports.length}</div>
                        <div style={{ fontSize: 9, color: activeTheme.textMuted }}>COMPLETED REPORTS</div>
                      </div>
                      <div style={{ ...S.section, textAlign: 'center' }}>
                        <div style={S.label}>Motor Models</div>
                        <div style={{ fontSize: 42, fontWeight: 900, color: activeTheme.accent, margin: '10px 0' }}>{[...new Set(qiPdiReports.map(r => r.motorModel))].length}</div>
                        <div style={{ fontSize: 9, color: activeTheme.textMuted }}>UNIQUE MODELS INSPECTED</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── GOLDEN SAMPLES VIEW ── */}
                {view === "golden_samples" && (
                  <div className="entrance-fade">
                    <div style={{ ...S.sectionTitle, marginBottom: 24, fontSize: 16 }}>Golden Sample Configuration Management</div>

                    {/* Golden Sub Tabs */}
                    <div style={S.tabBar}>
                      <button style={S.tabBtn(goldenSubTab === 'entry')} onClick={() => setGoldenSubTab('entry')}>Golden Sample Data Entry</button>
                      <button style={S.tabBtn(goldenSubTab === 'list')} onClick={() => setGoldenSubTab('list')}>Configured Motor Models</button>
                    </div>

                    {goldenSubTab === 'entry' ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, alignItems: 'start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                          <div style={S.section}>
                            <div style={S.sectionTitle}>1. Basic Motor Identity & Limits</div>
                            <div>
                              <label style={S.label}>Model / Part No. <span style={{ color: activeTheme.error }}>*</span></label>
                              <select
                                style={{ ...S.input, padding: "8px 10px", flex: 1, opacity: uniqueModelPartOptions.length === 0 ? 0.6 : 1 }}
                                value={uniqueModelPartOptions.findIndex(o => o.partNumber === goldenForm.motorCode && o.modelNumber === goldenForm.motorModel)}
                                disabled={uniqueModelPartOptions.length === 0}
                                onChange={e => {
                                  const idx = parseInt(e.target.value, 10);
                                  const opt = uniqueModelPartOptions[idx];
                                  if (opt) {
                                    // Check if a golden sample already exists for this part+model
                                    const existing = goldenSamples.find(s =>
                                      s.motorCode === opt.partNumber && s.motorModel === opt.modelNumber
                                    );
                                    if (existing) {
                                      const pc = existing.performanceCurves && Array.isArray(existing.performanceCurves)
                                        ? existing.performanceCurves : existing.performanceCurves
                                          ? Object.keys(existing.performanceCurves).map(rpm => ({
                                              rpm, torque: existing.performanceCurves[rpm],
                                              power: existing.powerCurve?.[rpm] || "",
                                              efficiency: existing.groupEff?.[rpm] || ""
                                            }))
                                          : [...initialPerformanceCurves];
                                      setGoldenForm({
                                        motorCode: opt.partNumber,
                                        motorModel: opt.modelNumber,
                                        nominalVoltage: existing.nominalVoltage || "",
                                        peakPower: existing.peakPower || "",
                                        peakTorque: existing.peakTorque || "",
                                        peakCurrentAC: existing.peakCurrentAC || "",
                                        maxSpeed: existing.maxSpeed || "",
                                        bemfAt3000: existing.bemfAt3000 || "",
                                        resistance: existing.resistance || "",
                                        hipotLimit: existing.hipotLimit || "",
                                        irLimit: existing.irLimit || "",
                                        encoder: existing.encoder ? { ...existing.encoder } : { sineMin: "", sineMax: "", cosMin: "", cosMax: "", sinePP: "", cosPP: "", offset: "" },
                                        performanceCurves: pc,
                                      });
                                      setEditingGoldenId(existing.id);
                                    } else {
                                      setGoldenForm(f => ({ ...f, motorCode: opt.partNumber, motorModel: opt.modelNumber }));
                                      setEditingGoldenId(null);
                                    }
                                  }
                                }}
                              >
                                <option value={-1}>{uniqueModelPartOptions.length === 0 ? "No parts available" : "Select Model / Part No."}</option>
                                {uniqueModelPartOptions.map((opt, i) =>
                                  <option key={i} value={i}>{opt.modelNumber} — {opt.partNumber}</option>
                                )}
                              </select>
                            </div>
                            <MField label="Motor Model Name" required value={goldenForm.motorModel} onChange={v => setGoldenForm({ ...goldenForm, motorModel: v })} S={S} theme={activeTheme} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                              <MField label="Nominal VDC" unit="V" required value={goldenForm.nominalVoltage} onChange={v => setGoldenForm({ ...goldenForm, nominalVoltage: v })} S={S} theme={activeTheme} />
                              <MField label="Max Power" unit="kW" required value={goldenForm.peakPower} onChange={v => setGoldenForm({ ...goldenForm, peakPower: v })} S={S} theme={activeTheme} />
                              <MField label="Max Torque" unit="Nm" required value={goldenForm.peakTorque} onChange={v => setGoldenForm({ ...goldenForm, peakTorque: v })} S={S} theme={activeTheme} />
                              <MField label="Max Current" unit="A" required value={goldenForm.peakCurrentAC} onChange={v => setGoldenForm({ ...goldenForm, peakCurrentAC: v })} S={S} theme={activeTheme} />
                              <MField label="Max Speed" unit="RPM" required value={goldenForm.maxSpeed} onChange={v => setGoldenForm({ ...goldenForm, maxSpeed: v })} S={S} theme={activeTheme} />
                            </div>

                            <div style={{ ...S.sectionTitle, fontSize: 11, marginTop: 18, borderBottom: 'none' }}>2. Electrical & Insulation Targets</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                              <MField label="BEMF @ 3000" unit="V" required value={goldenForm.bemfAt3000} onChange={v => setGoldenForm({ ...goldenForm, bemfAt3000: v })} S={S} theme={activeTheme} />
                              <MField label="Resistance" unit="mΩ" required value={goldenForm.resistance} onChange={v => setGoldenForm({ ...goldenForm, resistance: v })} S={S} theme={activeTheme} />
                              <MField label="Hipot Limit" unit="mA" required value={goldenForm.hipotLimit} onChange={v => setGoldenForm({ ...goldenForm, hipotLimit: v })} S={S} theme={activeTheme} />
                              <MField label="IR Min Limit" unit="MΩ" required value={goldenForm.irLimit} onChange={v => setGoldenForm({ ...goldenForm, irLimit: v })} S={S} theme={activeTheme} />
                            </div>

                            <div style={{ ...S.sectionTitle, fontSize: 11, marginTop: 18, borderBottom: 'none' }}>3. Resolver/Encoder Calibration Targets</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                              <MField label="Sine Min" value={goldenForm.encoder.sineMin} onChange={v => setGoldenForm({ ...goldenForm, encoder: { ...goldenForm.encoder, sineMin: v } })} S={S} theme={activeTheme} required />
                              <MField label="Sine Max" value={goldenForm.encoder.sineMax} onChange={v => setGoldenForm({ ...goldenForm, encoder: { ...goldenForm.encoder, sineMax: v } })} S={S} theme={activeTheme} required />
                              <MField label="Cos Min" value={goldenForm.encoder.cosMin} onChange={v => setGoldenForm({ ...goldenForm, encoder: { ...goldenForm.encoder, cosMin: v } })} S={S} theme={activeTheme} required />
                              <MField label="Cos Max" value={goldenForm.encoder.cosMax} onChange={v => setGoldenForm({ ...goldenForm, encoder: { ...goldenForm.encoder, cosMax: v } })} S={S} theme={activeTheme} required />
                              <MField label="Sine P-P" value={goldenForm.encoder.sinePP} onChange={v => setGoldenForm({ ...goldenForm, encoder: { ...goldenForm.encoder, sinePP: v } })} S={S} theme={activeTheme} required />
                              <MField label="Cos P-P" value={goldenForm.encoder.cosPP} onChange={v => setGoldenForm({ ...goldenForm, encoder: { ...goldenForm.encoder, cosPP: v } })} S={S} theme={activeTheme} required />
                              <MField label="Calib Offset" value={goldenForm.encoder.offset} onChange={v => setGoldenForm({ ...goldenForm, encoder: { ...goldenForm.encoder, offset: v } })} S={S} theme={activeTheme} required />
                            </div>
                          </div>
                        </div>

                        <div style={S.section}>
                          <div style={S.sectionTitle}>4. Performance Curve Reference Points</div>
                          <table style={{ ...S.table, marginBottom: 15 }}>
                            <thead>
                              <tr>
                                <th style={S.th}>RPM</th>
                                <th style={S.th}>Torque (Nm)</th>
                                <th style={S.th}>Power (kW)</th>
                                <th style={S.th}>Eff (%)</th>
                                <th style={S.th}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {goldenForm.performanceCurves.map((row, idx) => (
                                <tr key={idx}>
                                  <td style={S.td}><input style={S.input} type="number" value={row.rpm} onChange={e => {
                                    const newList = [...goldenForm.performanceCurves];
                                    newList[idx].rpm = e.target.value;
                                    setGoldenForm({ ...goldenForm, performanceCurves: newList });
                                  }} /></td>
                                  <td style={S.td}><input style={S.input} type="number" value={row.torque} onChange={e => {
                                    const newList = [...goldenForm.performanceCurves];
                                    newList[idx].torque = e.target.value;
                                    setGoldenForm({ ...goldenForm, performanceCurves: newList });
                                  }} /></td>
                                  <td style={S.td}><input style={S.input} type="number" value={row.power} onChange={e => {
                                    const newList = [...goldenForm.performanceCurves];
                                    newList[idx].power = e.target.value;
                                    setGoldenForm({ ...goldenForm, performanceCurves: newList });
                                  }} /></td>
                                  <td style={S.td}><input style={S.input} type="number" value={row.efficiency} onChange={e => {
                                    const newList = [...goldenForm.performanceCurves];
                                    newList[idx].efficiency = e.target.value;
                                    setGoldenForm({ ...goldenForm, performanceCurves: newList });
                                  }} /></td>
                                  <td style={S.td}>
                                    <button style={{ ...S.btn('error'), padding: '4px 8px', fontSize: 10 }} onClick={() => {
                                      const newList = goldenForm.performanceCurves.filter((_, i) => i !== idx);
                                      setGoldenForm({ ...goldenForm, performanceCurves: newList });
                                    }}>Remove</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <button style={{ ...S.btn('default'), width: '100%', marginBottom: 20 }} onClick={() => setGoldenForm({ ...goldenForm, performanceCurves: [...goldenForm.performanceCurves, { rpm: "", torque: "", power: "", efficiency: "" }] })}>+ Add Row</button>
                          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                            <button style={{ ...S.btn("primary"), flex: 1 }} onClick={saveGoldenSample}>💾 Save Configuration</button>
                            <button style={{ ...S.btn("default"), flex: 1 }} onClick={resetGoldenForm}>🔄 Reset Form</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={S.section}>
                        <div style={{ ...S.sectionTitle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>QI/PDI Reference Checklists</span>
                          <button onClick={syncQiPdiRefSamples} style={{ ...S.btn('default'), padding: '4px 8px', fontSize: 10 }}>Refresh List</button>
                        </div>
                        <table style={S.table}>
                          <thead>
                            <tr>
                              <th style={S.th}>Part No.</th>
                              <th style={S.th}>Model Name</th>
                              <th style={S.th}>Power (kW)</th>
                              <th style={S.th}>Torque (Nm)</th>
                              <th style={S.th}>BEMF (V)</th>
                              <th style={S.th}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {goldenSamples.length === 0 ? (
                              <tr><td colSpan="4" style={{ ...S.td, textAlign: 'center', color: activeTheme.textMuted }}>No models configured yet.</td></tr>
                            ) : (
                              goldenSamples.map((s) => (
                                <tr key={s.id || s.motorModel} style={{ background: activeTheme.surface }}>
                                  <td style={S.td}>{s.motorCode || 'N/A'}</td>
                                  <td style={S.td}>{s.motorModel || 'N/A'}</td>
                                  <td style={S.td}>{s.peakPower || 'N/A'} kW</td>
                                  <td style={S.td}>{s.peakTorque || 'N/A'} Nm</td>
                                  <td style={S.td}>{s.bemfAt3000 || 'N/A'} V</td>
                                  <td style={{ ...S.td, display: 'flex', gap: 8 }}>
                                    {canEditGolden && <button style={{ ...S.btn('primary'), padding: '4px 8px', fontSize: 10 }} onClick={() => handleEditGolden(s)}>Edit</button>}
                                    <button style={{ ...S.btn('default'), padding: '4px 8px', fontSize: 10 }} onClick={() => setPreviewGolden(s)}>Preview</button>
                                    {canEditGolden && <button style={{ ...S.btn('error'), padding: '4px 8px', fontSize: 10 }} onClick={() => handleDeleteGolden(s.id)}>Delete</button>}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* ── QI/PDI REFERENCE SAMPLES VIEW ── */}
                {view === "qi_pdi_ref_samples" && (
                  <div className="entrance-fade">
                    <div style={{ ...S.sectionTitle, marginBottom: 24, fontSize: 16 }}>QI/PDI Reference Samples (Checklists)</div>
                    <div style={S.tabBar}>
                      <button style={S.tabBtn(qiPdiRefSubTab === 'entry')} onClick={() => setQiPdiRefSubTab('entry')}>Setup Checklist</button>
                      <button style={S.tabBtn(qiPdiRefSubTab === 'list')} onClick={() => setQiPdiRefSubTab('list')}>Configured Models</button>
                    </div>

                    {qiPdiRefSubTab === 'entry' ? (
                      <div style={S.section}>
                        <div>
                          <label style={S.label}>Model / Part No. <span style={{ color: activeTheme.error }}>*</span></label>
                          <select
                            style={{ ...S.input, padding: "8px 10px", flex: 1, opacity: uniqueModelPartOptions.length === 0 ? 0.6 : 1 }}
                            value={uniqueModelPartOptions.findIndex(o => o.partNumber === qiPdiRefForm.motorCode && o.modelNumber === qiPdiRefForm.motorModel)}
                            disabled={uniqueModelPartOptions.length === 0}
                            onChange={e => {
                              const idx = parseInt(e.target.value, 10);
                              const opt = uniqueModelPartOptions[idx];
                              if (opt) {
                                const existing = qiPdiRefSamples.find(s =>
                                  s.motorCode === opt.partNumber && s.motorModel === opt.modelNumber
                                );
                                if (existing) {
                                  setQiPdiRefForm({
                                    motorCode: opt.partNumber,
                                    motorModel: opt.modelNumber,
                                    checklist: existing.checklist.map(i => ({ ...i })),
                                  });
                                  setEditingQiPdiRefId(existing.id);
                                } else {
                                  setQiPdiRefForm(f => ({ ...f, motorCode: opt.partNumber, motorModel: opt.modelNumber }));
                                  setEditingQiPdiRefId(null);
                                }
                              }
                            }}
                          >
                            <option value={-1}>{uniqueModelPartOptions.length === 0 ? "No parts available" : "Select Model / Part No."}</option>
                            {uniqueModelPartOptions.map((opt, i) =>
                              <option key={i} value={i}>{opt.modelNumber} — {opt.partNumber}</option>
                            )}
                          </select>
                        </div>
                        <MField label="Motor Model Name" required value={qiPdiRefForm.motorModel} onChange={v => setQiPdiRefForm({ ...qiPdiRefForm, motorModel: v })} S={S} theme={activeTheme} />
                        <div style={{ ...S.sectionTitle, fontSize: 12, marginTop: 20 }}>Checklist Configuration</div>
                        <table style={S.table}>
                          <thead>
                            <tr>
                              <th style={S.th}>Description</th>
                              <th style={S.th}>Spec</th>
                              <th style={S.th}>Method</th>
                            </tr>
                          </thead>
                          <tbody>
                            {qiPdiRefForm.checklist.map((item, idx) => (
                              <tr key={idx}>
                                <td style={S.td}><input style={{ ...S.input, fontSize: 11 }} value={item.desc} onChange={e => {
                                  const newList = [...qiPdiRefForm.checklist];
                                  newList[idx] = { ...newList[idx], desc: e.target.value };
                                  setQiPdiRefForm({ ...qiPdiRefForm, checklist: newList });
                                }} /></td>
                                <td style={S.td}><input style={{ ...S.input, fontSize: 11 }} value={item.spec} onChange={e => {
                                  const newList = [...qiPdiRefForm.checklist];
                                  newList[idx] = { ...newList[idx], spec: e.target.value };
                                  setQiPdiRefForm({ ...qiPdiRefForm, checklist: newList });
                                }} /></td>
                                <td style={S.td}><input style={{ ...S.input, fontSize: 11 }} value={item.method} onChange={e => {
                                  const newList = [...qiPdiRefForm.checklist];
                                  newList[idx] = { ...newList[idx], method: e.target.value };
                                  setQiPdiRefForm({ ...qiPdiRefForm, checklist: newList });
                                }} /></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                          <button
                            style={{ ...S.btn(isSaving ? "default" : "primary"), flex: 1 }}
                            onClick={saveQiPdiRef}
                            disabled={isSaving}
                          >
                            {isSaving ? "Saving..." : "💾 Save Reference Checklist"}
                          </button>
                          <button style={{ ...S.btn("default"), flex: 1 }} onClick={() => {
                            setQiPdiRefForm({ motorCode: "", motorModel: "", checklist: QI_PDI_DEFAULTS.map(i => ({ ...i })) });
                            setEditingQiPdiRefId(null);
                          }}>🔄 Reset</button>
                        </div>
                      </div>
                    ) : (
                      <div style={S.section}>
                        <table style={S.table}>
                          <thead>
                            <tr>
                              <th style={S.th}>Part No.</th>
                              <th style={S.th}>Model Name</th>
                              <th style={S.th}>Checks Count</th>
                              <th style={S.th}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {qiPdiRefSamples.length === 0 ? (
                              <tr><td colSpan="3" style={{ ...S.td, textAlign: 'center', color: activeTheme.textMuted }}>No reference checklists found.</td></tr>
                            ) : (
                              qiPdiRefSamples.map((s) => (
                                <tr key={s.id} style={{ background: activeTheme.surface }}>
                                  <td style={S.td}>{s.motorCode}</td>
                                  <td style={S.td}>{s.motorModel}</td>
                                  <td style={S.td}>{s.checklist.length} items</td>
                                  <td style={{ ...S.td, display: 'flex', gap: 8 }}>
                                    {canEditQiRef && <button style={{ ...S.btn('primary'), padding: '4px 8px', fontSize: 10 }} onClick={() => handleEditQiPdiRef(s)}>Edit</button>}
                                    {canEditQiRef && <button style={{ ...S.btn('error'), padding: '4px 8px', fontSize: 10 }} onClick={() => handleDeleteQiPdiRef(s.id)}>Delete</button>}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* ── GOLDEN SAMPLE PREVIEW MODAL ── */}
                {previewGolden && (
                  <div style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ ...S.section, maxWidth: 900, width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                      <button style={{ position: 'absolute', top: 15, right: 15, ...S.btn('default'), padding: '5px 10px' }} onClick={() => setPreviewGolden(null)}>✕</button>
                      <div style={{ ...S.sectionTitle, fontSize: 16 }}>Configuration Preview: {previewGolden.motorCode}</div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        <div>
                          <div style={S.label}>Basic Reference</div>
                          <div style={{ fontSize: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 15px', background: activeTheme.surfaceAlt, padding: 12, borderRadius: 8 }}>
                            <span>Part No.: <b>{previewGolden.motorCode}</b></span>
                            <span>Nominal VDC: <b>{previewGolden.nominalVoltage} V</b></span>
                            <span>Max Power: <b>{previewGolden.peakPower} kW</b></span>
                            <span>Max Torque: <b>{previewGolden.peakTorque} Nm</b></span>
                            <span>Max Current: <b>{previewGolden.peakCurrentAC} A</b></span>
                            <span>Max Speed: <b>{previewGolden.maxSpeed} RPM</b></span>
                            <span>BEMF @ 3000: <b>{previewGolden.bemfAt3000} V</b></span>
                          </div>
                        </div>
                        <div>
                          <div style={S.label}>Encoder Limits</div>
                          <div style={{ fontSize: 11, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px' }}>
                            {previewGolden.encoder ? Object.entries(previewGolden.encoder).map(([k, v]) => (
                              <span key={k}>{k}: <b>{v}</b></span>
                            )) : <span style={{ gridColumn: '1 / -1', color: activeTheme.textMuted }}>No encoder data</span>}
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: 20 }}>
                        <div style={S.label}>Reference Curves</div>
                        <div style={{ display: 'flex', gap: 16 }}>
                          <PerfChart
                            title="Torque Reference"
                            unit="Nm"
                            data={previewGolden.performanceCurves
                              ? previewGolden.performanceCurves.map(c => ({ speed: c.rpm, Golden: c.torque }))
                              : Object.entries(previewGolden.torqueCurve || {}).map(([s, v]) => ({ speed: s, Golden: v }))
                            }
                            gsKey="Golden"
                            theme={activeTheme}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── CONSOLIDATED ARCHIVE VIEW (History + Log + PDI Reports) ── */}
                {view === "archive" && (
                  <div className="entrance-fade">
                    <div style={{ ...S.sectionTitle, marginBottom: 24, fontSize: 16 }}>Reports Archive</div>

                    {/* Sub-navigation tabs for Archive */}
                    <div style={{ display: 'flex', gap: 4, alignItems: 'stretch', borderBottom: `1px solid ${activeTheme.border}`, paddingBottom: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                      {/* EOL Archive Group */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: 1.5, color: activeTheme.primary, textTransform: 'uppercase', padding: '0 4px', lineHeight: '12px' }}>EOL</div>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <button style={S.tabBtn(archiveSubTab === 'summary')} onClick={() => { setArchiveSubTab('summary'); setArchiveMode('eol'); }}>History Summary</button>
                          <button style={S.tabBtn(archiveSubTab === 'log')} onClick={() => { setArchiveSubTab('log'); setArchiveMode('eol'); }}>Detailed Parameter Log</button>
                        </div>
                      </div>

                      <div style={{ width: 3, background: activeTheme.textMuted, borderRadius: 2, margin: '0 8px', flexShrink: 0 }} />

                      {/* PDI Archive Group */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: 1.5, color: activeTheme.primary, textTransform: 'uppercase', padding: '0 4px', lineHeight: '12px' }}>PDI</div>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <button style={S.tabBtn(archiveSubTab === 'pdi')} onClick={() => { setArchiveSubTab('pdi'); setArchiveMode('pdi'); }}>PDI Reports Log</button>
                        </div>
                      </div>
                    </div>

                    {archiveSubTab === 'summary' && (
                      <div style={S.section}>
                        <div style={{ marginBottom: 20 }}>
                          <div style={{ ...S.sectionTitle, marginBottom: 15, border: 'none' }}>Approved Summary</div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", background: activeTheme.surfaceAlt, padding: "5px 8px", borderRadius: 6 }}>
                            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, color: activeTheme.primary, textTransform: 'uppercase' }}>Filter</span>
                            <div style={{ width: 1, height: 16, background: activeTheme.border, margin: '0 2px' }} />
                            <input style={{ ...S.input, width: 110, padding: '4px 8px', fontSize: 10 }} placeholder="Serial" value={filterSerial} onChange={e => setFilterSerial(e.target.value)} />
                            <input style={{ ...S.input, width: 100, padding: '4px 8px', fontSize: 10 }} placeholder="Model" value={filterModel} onChange={e => setFilterModel(e.target.value)} />
                            <input style={{ ...S.input, width: 100, padding: '4px 8px', fontSize: 10 }} placeholder="Program" value={filterProgram} onChange={e => setFilterProgram(e.target.value)} />
                            <input type="date" style={{ ...S.input, width: 110, padding: '4px 8px', fontSize: 10 }} value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
                            <span style={{ fontSize: 9, color: activeTheme.textMuted }}>to</span>
                            <input type="date" style={{ ...S.input, width: 110, padding: '4px 8px', fontSize: 10 }} value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
                          </div>
                        </div>
                        <table style={S.table}>
                          <thead>
                            <tr>
                              <th style={S.th}>Date</th>
                              <th style={S.th}>Serial No</th>
                              <th style={S.th}>Model</th>
                              <th style={S.th}>Status</th>
                              <th style={S.th}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredMotors.filter(m => m.status === 'APPROVED').slice().reverse().map((m, i) => (
                              <tr key={i} className="table-row-hover">
                                <td style={S.td}>{m.timestamp.slice(0, 10)}</td>
                                <td style={S.td}>{m.form.serialNo}</td>
                                <td style={S.td}>{m.form.motorModel}</td>
                                <td style={S.td}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <Badge pass={m.overallPass} theme={activeTheme} />
                                    <span style={{ fontSize: 9, color: activeTheme.textMuted }}>{m.status?.replace('_', ' ') || 'Pending'}</span>
                                  </div>
                                </td>
                                <td style={{ ...S.td, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                  {deleteConfirmId === m.id ? (
                                    <>
                                      <span style={{ fontSize: 9, fontWeight: 700, color: activeTheme.error }}>Are you sure?</span>
                                      <button
                                        className="btn-interact"
                                        style={{ ...S.btn("error"), padding: "6px 12px", fontSize: 9, borderRadius: 20 }}
                                        onClick={() => handleDelete(m)}
                                      >
                                        Confirm
                                      </button>
                                      <button
                                        className="btn-interact"
                                        style={{ ...S.btn("default"), padding: "6px 12px", fontSize: 9, borderRadius: 20 }}
                                        onClick={() => setDeleteConfirmId(null)}
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button className="btn-interact" style={{ ...S.btn("primary"), padding: "6px 12px", fontSize: 9, borderRadius: 20 }} onClick={() => openReportPreview(m)}>
                                        Preview
                                      </button>
                                      <button className="btn-interact" style={{ ...S.btn(m.status === 'APPROVED' ? "success" : "default"), padding: "6px 12px", fontSize: 9, borderRadius: 20 }} disabled={m.status !== 'APPROVED'} onClick={() => openReportDownload(m)}>
                                        Download
                                      </button>
                                      <button
                                        className="btn-interact"
                                        style={{ ...S.btn("error"), padding: "6px 12px", fontSize: 9, borderRadius: 20 }}
                                        onClick={() => setDeleteConfirmId(m.id)}
                                      >
                                        Delete
                                      </button>
                                    </>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {archiveSubTab === 'log' && (
                      <div style={{ ...S.section, overflowX: "auto" }}>
                        <div style={{ marginBottom: 20 }}>
                          <div style={{ ...S.sectionTitle, marginBottom: 15, border: 'none' }}>Detailed Parameter Log</div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 15 }}>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", background: activeTheme.surfaceAlt, padding: "5px 8px", borderRadius: 6, flex: 1 }}>
                              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, color: activeTheme.primary, textTransform: 'uppercase' }}>Filter</span>
                              <div style={{ width: 1, height: 16, background: activeTheme.border, margin: '0 2px' }} />
                              <input style={{ ...S.input, width: 110, padding: '4px 8px', fontSize: 10 }} placeholder="Serial" value={filterSerial} onChange={e => setFilterSerial(e.target.value)} />
                              <input style={{ ...S.input, width: 100, padding: '4px 8px', fontSize: 10 }} placeholder="Model" value={filterModel} onChange={e => setFilterModel(e.target.value)} />
                              <input style={{ ...S.input, width: 100, padding: '4px 8px', fontSize: 10 }} placeholder="Program" value={filterProgram} onChange={e => setFilterProgram(e.target.value)} />
                              <input type="date" style={{ ...S.input, width: 110, padding: '4px 8px', fontSize: 10 }} value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
                              <span style={{ fontSize: 9, color: activeTheme.textMuted }}>to</span>
                              <input type="date" style={{ ...S.input, width: 110, padding: '4px 8px', fontSize: 10 }} value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
                            </div>
                            <button
                              className="btn-interact"
                              style={{ ...S.btn("success"), padding: "8px 16px", fontSize: 11, borderRadius: 20 }}
                              onClick={handleExportMotorLog}
                            >
                              📊 Export to Excel
                            </button>
                          </div>
                        </div>
                        <table style={{ ...S.table, minWidth: 3200 }}>
                          <thead>
                            <tr>
                              <th style={S.th}>Serial No</th>
                              <th style={S.th}>Date</th>
                              <th style={S.th}>Program</th>
                              <th style={S.th}>Model</th>
                              <th style={S.th}>Part No.</th>
                              <th style={S.th}>Tested By</th>
                              <th style={S.th}>Peak Torque (Nm)</th>
                              <th style={S.th}>Peak Power (kW)</th>
                              <th style={S.th}>BEMF 3000 (V)</th>
                              <th style={S.th}>Torque Adj (Nm)</th>
                              <th style={S.th}>Hipot U (mA)</th>
                              <th style={S.th}>Hipot V (mA)</th>
                              <th style={S.th}>Hipot W (mA)</th>
                              <th style={S.th}>IR U (MΩ)</th>
                              <th style={S.th}>IR V (MΩ)</th>
                              <th style={S.th}>IR W (MΩ)</th>
                              <th style={S.th}>Res U (mΩ)</th>
                              <th style={S.th}>Res V (mΩ)</th>
                              <th style={S.th}>Res W (mΩ)</th>
                              <th style={S.th}>Sine Min</th>
                              <th style={S.th}>Sine Max</th>
                              <th style={S.th}>Cos Min</th>
                              <th style={S.th}>Cos Max</th>
                              <th style={S.th}>Sine PP</th>
                              <th style={S.th}>Cos PP</th>
                              <th style={S.th}>Offset</th>
                              <th style={S.th}>Result</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredMotors.filter(m => m.status === 'APPROVED').slice().reverse().map((m, i) => {
                              const d = computeMotorReportData(m, goldenSamples);
                              return (
                                <tr key={m.id} className="table-row-hover" style={{ background: i % 2 === 0 ? activeTheme.surfaceAlt : activeTheme.surface }}>
                                  <td style={S.td}>{m.form.serialNo}</td>
                                  <td style={S.td}>{m.form.testDate}</td>
                                  <td style={S.td}>{m.form.programName}</td>
                                  <td style={S.td}>{m.form.motorModel}</td>
                                  <td style={S.td}>{m.form.motorCode}</td>
                                  <td style={S.td}>{m.form.testedBy}</td>
                                  <td style={{ ...S.td, fontWeight: 700, color: activeTheme.primary }}>{d.peakTorqueDUT.toFixed(2)}</td>
                                  <td style={{ ...S.td, fontWeight: 700, color: activeTheme.primary }}>{d.peakPowerDUT_kW.toFixed(2)}</td>
                                  <td style={S.td}>{d.bemf3000 !== null ? d.bemf3000.toFixed(2) : "—"}</td>
                                  <td style={S.td}>{m.torqueAdj || "0"}</td>
                                  <td style={S.td}>{m.form.hipotU}</td>
                                  <td style={S.td}>{m.form.hipotV}</td>
                                  <td style={S.td}>{m.form.hipotW}</td>
                                  <td style={S.td}>{m.form.irU}</td>
                                  <td style={S.td}>{m.form.irV}</td>
                                  <td style={S.td}>{m.form.irW}</td>
                                  <td style={S.td}>{m.form.resU}</td>
                                  <td style={S.td}>{m.form.resV}</td>
                                  <td style={S.td}>{m.form.resW}</td>
                                  <td style={S.td}>{m.form.sineMin}</td>
                                  <td style={S.td}>{m.form.sineMax}</td>
                                  <td style={S.td}>{m.form.cosMin}</td>
                                  <td style={S.td}>{m.form.cosMax}</td>
                                  <td style={S.td}>{m.form.sinePP}</td>
                                  <td style={S.td}>{m.form.cosPP}</td>
                                  <td style={S.td}>{m.form.offset}</td>
                                  <td style={S.td}>
                                    <Badge pass={d.overallPass} theme={activeTheme} />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {archiveSubTab === 'pdi' && (
                      <div style={S.section}>
                        <div style={{ marginBottom: 20 }}>
                          <div style={{ ...S.sectionTitle, marginBottom: 15, border: 'none' }}>QI / PDI Reports Archive</div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", background: activeTheme.surfaceAlt, padding: "5px 8px", borderRadius: 6 }}>
                            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, color: activeTheme.primary, textTransform: 'uppercase' }}>Filter</span>
                            <div style={{ width: 1, height: 16, background: activeTheme.border, margin: '0 2px' }} />
                            <input style={{ ...S.input, width: 110, padding: '4px 8px', fontSize: 10 }} placeholder="Serial" value={filterQiPdiSerial} onChange={e => setFilterQiPdiSerial(e.target.value)} />
                            <input style={{ ...S.input, width: 100, padding: '4px 8px', fontSize: 10 }} placeholder="Model" value={filterQiPdiModel} onChange={e => setFilterQiPdiModel(e.target.value)} />
                            <input type="date" style={{ ...S.input, width: 110, padding: '4px 8px', fontSize: 10 }} value={filterQiPdiDateFrom} onChange={e => setFilterQiPdiDateFrom(e.target.value)} />
                            <span style={{ fontSize: 9, color: activeTheme.textMuted }}>to</span>
                            <input type="date" style={{ ...S.input, width: 110, padding: '4px 8px', fontSize: 10 }} value={filterQiPdiDateTo} onChange={e => setFilterQiPdiDateTo(e.target.value)} />
                          </div>
                        </div>
                        <table style={S.table}>
                          <thead>
                            <tr>
                              <th style={S.th}>Date</th>
                              <th style={S.th}>Serial No</th>
                              <th style={S.th}>Model</th>
                              <th style={S.th}>Tested By</th>
                              <th style={S.th}>Result</th>
                              <th style={S.th}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredQiPdiReports.length === 0 ? (
                              <tr><td colSpan="5" style={{ ...S.td, textAlign: 'center', color: activeTheme.textMuted }}>No reports found.</td></tr>
                            ) : (
                              filteredQiPdiReports.slice().reverse().map((r, i) => (
                                <tr key={r.id} className="table-row-hover">
                                  <td style={S.td}>{r.timestamp?.slice(0, 10) || "—"}</td>
                                  <td style={S.td}>{r.serialNo}</td>
                                  <td style={S.td}>{r.motorModel}</td>
                                  <td style={S.td}>{r.testedBy}</td>
                                  <td style={S.td}>
                                    <Badge pass={r.data && r.data.filter(i => i.no !== 21).every(item => item.status === "OK" || item.status === "NOT OK, But Motor Performance Not Impacted")} theme={activeTheme} />
                                  </td>
                                  <td style={{ ...S.td, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                    {deleteQiPdiConfirmId === r.id ? (
                                      <>
                                        <span style={{ fontSize: 9, fontWeight: 700, color: activeTheme.error }}>Are you sure?</span>
                                        <button className="btn-interact" style={{ ...S.btn("error"), padding: "6px 12px", fontSize: 9, borderRadius: 20 }} onClick={() => handleDeleteQiPdi(r.id)}>Confirm</button>
                                        <button className="btn-interact" style={{ ...S.btn("default"), padding: "6px 12px", fontSize: 9, borderRadius: 20 }} onClick={() => setDeleteQiPdiConfirmId(null)}>Cancel</button>
                                      </>
                                    ) : (
                                      <>
                                        <button className="btn-interact" style={{ ...S.btn("primary"), padding: "6px 12px", fontSize: 9, borderRadius: 20 }} onClick={() => openQiPdiPreview(r)}>Preview</button>
                                        <button className="btn-interact" style={{ ...S.btn("success"), padding: "6px 12px", fontSize: 9, borderRadius: 20 }} onClick={() => openQiPdiDownload(r)}>Download</button>
                                        <button className="btn-interact" style={{ ...S.btn("error"), padding: "6px 12px", fontSize: 9, borderRadius: 20 }} onClick={() => setDeleteQiPdiConfirmId(r.id)}>Delete</button>
                                      </>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* ── STEP 0: Data Entry (Merged Upload & Manual) ── */}
                {view === "new_report" && step === 0 && (
                  <div>
                    {/* Progress Bar & Actions */}
                    <div style={{ ...S.section, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px", marginBottom: 20, borderLeft: `6px solid ${activeTheme.primary}` }} className="entrance-fade">
                      <div style={{ flex: 1 }}>
                        <div style={{ ...S.label, color: activeTheme.primary, fontSize: 11 }}>Report Completion Progress</div>
                        <div style={{ height: 6, background: activeTheme.border, borderRadius: 3, marginTop: 8, position: "relative", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${totalProgress}%`, background: `linear-gradient(90deg, ${activeTheme.primary}, ${activeTheme.accent})`, transition: "width 0.8s cubic-bezier(0.65, 0, 0.35, 1)" }}></div>
                        </div>
                      </div>
                      <div style={{ marginLeft: 32, display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ fontSize: 24, fontWeight: 900, color: activeTheme.primary, fontVariantNumeric: "tabular-nums" }}>{totalProgress}%</div>
                        <button onClick={resetForm} style={{ ...S.btn("default"), padding: "6px 12px", fontSize: 11 }}>Reset Form</button>
                      </div>
                    </div>

                    {/* Correction Note Display */}
                    {selectedMotor && selectedMotor.comment && (
                      <div style={{ ...S.section, borderLeft: `4px solid ${activeTheme.error}`, background: activeTheme.error + '08', padding: '16px 24px', marginBottom: 20 }} className="entrance-fade">
                        <div style={{ fontSize: 11, fontWeight: 800, color: activeTheme.error, letterSpacing: 1, marginBottom: 4 }}>CORRECTION REQUIRED:</div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: activeTheme.text }}>{selectedMotor.comment}</div>
                        <div style={{ fontSize: 10, color: activeTheme.textMuted, marginTop: 8 }}>Please update the fields below and regenerate the report to resubmit for check.</div>
                      </div>
                    )}

                    {/* Manual Entry Section */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 16, marginBottom: 20 }}>
                      {/* Motor Identity */}
                      <div className="entrance-fade" style={{ ...S.section, animationDelay: '0.1s', marginBottom: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                          <div style={{ ...S.sectionTitle, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <SectionIcon type="identity" color={activeTheme.primary} />
                            Motor Identity
                          </div>
                          {sectionProgress.identity === 7 && <span style={{ color: activeTheme.success, fontSize: 10, fontWeight: 800 }}>✓ COMPLETE</span>}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
                          <div style={{ gridColumn: "1 / -1", marginBottom: 4 }}>
                            <label style={S.label}>Work Order <span style={{ color: activeTheme.error }}>*</span></label>
                            <select
                              style={{ ...S.input, padding: "8px 10px", flex: 1, opacity: workOrders.length === 0 ? 0.6 : 1 }}
                              value={form.workOrderId}
                              disabled={workOrders.length === 0}
                              onChange={e => handleWorkOrderChange(e.target.value)}
                            >
                              <option value="">{workOrders.length === 0 ? "No work orders available" : "Select Work Order"}</option>
                              {workOrders.map(wo => {
                                const prog = programs.find(p => p.id === wo.programId);
                                return <option key={wo.id} value={wo.id}>{wo.refId} - {wo.title} {prog ? `(${prog.name})` : ''}</option>;
                              })}
                            </select>
                          </div>
                          <div style={{ gridColumn: "1 / -1", marginBottom: 4 }}>
                            <label style={S.label}>Model / Part <span style={{ color: activeTheme.error }}>*</span></label>
                            <select
                              style={{ ...S.input, padding: "8px 10px", flex: 1, opacity: !selectedWO ? 0.6 : 1 }}
                              value={form.itemIdx}
                              disabled={!selectedWO}
                              onChange={e => handleItemChange(e.target.value)}
                            >
                              <option value="">{selectedWO ? "Select Model/Part" : "Select a Work Order first"}</option>
                              {selectedWO && selectedWO.items.map((item, idx) =>
                                <option key={idx} value={idx}>{item.modelNumber} - {item.partNumber}</option>
                              )}
                            </select>
                          </div>
                          <MField label="Serial No" required value={form.serialNo} onChange={F("serialNo")} S={S} theme={activeTheme} disabled={!canEditValidation} />
                          <MField label="Test Date" required type="date" value={form.testDate} onChange={F("testDate")} S={S} theme={activeTheme} disabled={!canEditValidation} />
                          <div style={{ marginBottom: 10 }}>
                            <label style={S.label}>Part No. <span style={{ color: activeTheme.error }}>*</span></label>
                            <select
                              style={{ ...S.input, padding: "8px 10px", flex: 1, opacity: !canEditValidation ? 0.6 : 1 }}
                              value={form.motorCode}
                              disabled={!canEditValidation}
                              onChange={e => {
                                const sample = goldenSamples.find(s => s.motorCode === e.target.value);
                                if (sample) {
                                  setForm(f => ({ ...f, motorCode: sample.motorCode, motorModel: sample.motorModel }));
                                } else {
                                  setForm(f => ({ ...f, motorCode: "", motorModel: "" }));
                                }
                              }}
                            >
                              <option value="">Select Part No.</option>
                              {goldenSamples.map(s => <option key={s.motorCode} value={s.motorCode}>{s.motorCode}</option>)}
                            </select>
                          </div>
                          <MField label="Motor Model" required value={form.motorModel} onChange={F("motorModel")} S={S} theme={activeTheme} disabled={!canEditValidation} />
                          <MField label="Tested By" required value={form.testedBy} onChange={F("testedBy")} S={S} theme={activeTheme} disabled={!canEditValidation} />
                        </div>
                      </div>

                      {/* PDI */}
                      <div className="entrance-fade" style={{ ...S.section, animationDelay: '0.2s', marginBottom: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                          <div style={{ ...S.sectionTitle, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <SectionIcon type="pdi" color={activeTheme.primary} />
                            PDI // Electrical
                          </div>
                          {sectionProgress.pdi === 9 && <span style={{ color: activeTheme.success, fontSize: 10, fontWeight: 800 }}>✓ COMPLETE</span>}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 10px" }}>
                          <MField label="Hipot U" required unit="mA" value={form.hipotU} onChange={F("hipotU")} passCheck={activeGolden ? v => v > 0 && v < (activeGolden.hipotLimit) : null} S={S} theme={activeTheme} disabled={!canEditValidation} />
                          <MField label="Hipot V" required unit="mA" value={form.hipotV} onChange={F("hipotV")} passCheck={activeGolden ? v => v > 0 && v < (activeGolden.hipotLimit) : null} S={S} theme={activeTheme} disabled={!canEditValidation} />
                          <MField label="Hipot W" required unit="mA" value={form.hipotW} onChange={F("hipotW")} passCheck={activeGolden ? v => v > 0 && v < (activeGolden.hipotLimit) : null} S={S} theme={activeTheme} disabled={!canEditValidation} />
                          <MField label="IR U" required unit="MΩ" value={form.irU} onChange={F("irU")} passCheck={activeGolden ? v => v >= (activeGolden.irLimit) : null} S={S} theme={activeTheme} disabled={!canEditValidation} />
                          <MField label="IR V" required unit="MΩ" value={form.irV} onChange={F("irV")} passCheck={activeGolden ? v => v >= (activeGolden.irLimit) : null} S={S} theme={activeTheme} disabled={!canEditValidation} />
                          <MField label="IR W" required unit="MΩ" value={form.irW} onChange={F("irW")} passCheck={activeGolden ? v => v >= (activeGolden.irLimit) : null} S={S} theme={activeTheme} disabled={!canEditValidation} />
                          <MField label="Res U" required unit="mΩ" value={form.resU} onChange={F("resU")} passCheck={activeGolden ? v => Math.abs(v - (activeGolden.resistance)) <= 3 : null} S={S} theme={activeTheme} disabled={!canEditValidation} />
                          <MField label="Res V" required unit="mΩ" value={form.resV} onChange={F("resV")} passCheck={activeGolden ? v => Math.abs(v - (activeGolden.resistance)) <= 3 : null} S={S} theme={activeTheme} disabled={!canEditValidation} />
                          <MField label="Res W" required unit="mΩ" value={form.resW} onChange={F("resW")} passCheck={activeGolden ? v => Math.abs(v - (activeGolden.resistance)) <= 3 : null} S={S} theme={activeTheme} disabled={!canEditValidation} />
                        </div>
                      </div>
                      {/* Encoder */}
                      <div className="entrance-fade" style={{ ...S.section, animationDelay: '0.3s', marginBottom: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                          <div style={{ ...S.sectionTitle, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <SectionIcon type="encoder" color={activeTheme.primary} />
                            Encoder
                          </div>
                          {sectionProgress.encoder === 7 && <span style={{ color: activeTheme.success, fontSize: 10, fontWeight: 800 }}>✓ COMPLETE</span>}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
                          <MField label="Sine Min" required unit="cts" value={form.sineMin} onChange={F("sineMin")} passCheck={activeGolden ? v => Math.abs(v - (activeGolden.encoder?.sineMin || 0)) <= 75 : null} S={S} theme={activeTheme} disabled={!canEditValidation} />
                          <MField label="Sine Max" required unit="cts" value={form.sineMax} onChange={F("sineMax")} passCheck={activeGolden ? v => Math.abs(v - (activeGolden.encoder?.sineMax || 0)) <= 75 : null} S={S} theme={activeTheme} disabled={!canEditValidation} />
                          <MField label="Cos Min" required unit="cts" value={form.cosMin} onChange={F("cosMin")} passCheck={activeGolden ? v => Math.abs(v - (activeGolden.encoder?.cosMin || 0)) <= 75 : null} S={S} theme={activeTheme} disabled={!canEditValidation} />
                          <MField label="Cos Max" required unit="cts" value={form.cosMax} onChange={F("cosMax")} passCheck={activeGolden ? v => Math.abs(v - (activeGolden.encoder?.cosMax || 0)) <= 75 : null} S={S} theme={activeTheme} disabled={!canEditValidation} />
                          <MField label="Sine P-P" required unit="cts" value={form.sinePP} onChange={F("sinePP")} passCheck={activeGolden ? v => Math.abs(v - (activeGolden.encoder?.sinePP || 0)) <= 150 : null} S={S} theme={activeTheme} disabled />
                          <MField label="Cos P-P" required unit="cts" value={form.cosPP} onChange={F("cosPP")} passCheck={activeGolden ? v => Math.abs(v - (activeGolden.encoder?.cosPP || 0)) <= 150 : null} S={S} theme={activeTheme} disabled />
                          <MField label="Offset" required unit="cts" value={form.offset} onChange={F("offset")} passCheck={activeGolden ? v => Math.abs(v - (activeGolden.encoder?.offset || 0)) <= 3 : null} S={S} theme={activeTheme} disabled={!canEditValidation} />
                        </div>
                      </div>

                      {/* Zone A Upload */}
                      <div className="entrance-fade" style={{ ...S.section, animationDelay: '0.4s', marginBottom: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                          <div style={{ ...S.sectionTitle, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <SectionIcon type="upload" color={activeTheme.primary} />
                            Peak Power Data
                          </div>
                          {ppData.length > 0 && <span style={{ color: activeTheme.success, fontSize: 10, fontWeight: 800 }}>✓ UPLOADED</span>}
                        </div>
                        <UploadZone
                          label=""
                          accept=".xlsx,.csv"
                          onFile={parsePP}
                          parsed={adjustedPpData}
                          fileName={ppName}
                          S={S}
                          theme={activeTheme}
                          disabled={!canEditValidation}
                        />
                        <div style={{ marginTop: 16 }}>
                          <MField label="Torque Adjustment" required unit="Nm" value={torqueAdj} onChange={setTorqueAdj} S={S} theme={activeTheme} disabled={!canEditValidation} />
                        </div>
                      </div>

                      {/* Zone B Upload */}
                      <div className="entrance-fade" style={{ ...S.section, animationDelay: '0.5s', marginBottom: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                          <div style={{ ...S.sectionTitle, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <SectionIcon type="upload" color={activeTheme.primary} />
                            BEMF Test Data
                          </div>
                          {bemfData.length > 0 && <span style={{ color: activeTheme.success, fontSize: 10, fontWeight: 800 }}>✓ UPLOADED</span>}
                        </div>
                        <UploadZone
                          label=""
                          accept=".xlsx,.csv"
                          onFile={parseBEMF}
                          parsed={bemfData}
                          fileName={bemfName}
                          S={S}
                          theme={activeTheme}
                          disabled={!canEditValidation}
                        />
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
                      <button
                        className="btn-interact"
                        style={S.btn(canGenerate && canEditValidation ? "primary" : "default")}
                        onClick={handleGenerate}
                        disabled={!canGenerate || isSaving || !canEditValidation}
                        title={tooltipText}
                      >
                        {isSaving ? "Saving..." : "Save & Generate →"}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP 1: Report ── */}
                {view === "new_report" && step === 1 && (
                  <div>
                    <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
                      <button style={S.btn("default")} onClick={() => setStep(0)}>← Edit Data</button>
                      <button style={S.btn(selectedMotor ? "default" : "default")} disabled={!selectedMotor} onClick={handlePrint}>⎙ Print Report</button>
                      <button style={S.btn(selectedMotor ? "success" : "default")} disabled={!selectedMotor} onClick={handleDownloadPDF}>⬇ Download PDF Report</button>
                      <div style={{ flex: 1 }} />
                      <button style={S.btn("primary")} onClick={() => setStep(2)}>
                        {uploadStatus === 'success' ? '✓ Report Uploaded →' : 'Upload Report →'}
                      </button>
                    </div>
                    <ReportContent motor={{ form, ppData, bemfData, torqueAdj, status: selectedMotor?.status }} reportRef={reportRef} S={S} goldenSamples={goldenSamples} />
                  </div>
                )}

                {/* ── STEP 2: Upload Report ── */}
                {view === "new_report" && step === 2 && (
                  <div className="entrance-fade">
                    <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
                      <button style={S.btn("default")} onClick={() => setStep(1)}>← Back to Report</button>
                      <div style={{ flex: 1 }} />
                      {uploadStatus === 'success' && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: activeTheme.success, fontSize: 13, fontWeight: 800 }}>
                          <span style={{ fontSize: 20 }}>✓</span> Report Uploaded Successfully
                        </span>
                      )}
                      {uploadStatus === 'error' && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: activeTheme.error, fontSize: 13, fontWeight: 800 }}>
                          <span style={{ fontSize: 20 }}>✗</span> Upload Failed
                        </span>
                      )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                      <div style={{ ...S.section }}>
                        <div style={{ ...S.sectionTitle, marginBottom: 16 }}>Report Summary</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", fontSize: 13 }}>
                          <span style={{ color: activeTheme.textMuted }}>Serial No:</span>
                          <span style={{ fontWeight: 600, color: activeTheme.text }}>{form.serialNo || "—"}</span>
                          <span style={{ color: activeTheme.textMuted }}>Motor Model:</span>
                          <span style={{ fontWeight: 600, color: activeTheme.text }}>{form.motorModel || "—"}</span>
                          <span style={{ color: activeTheme.textMuted }}>Part No.:</span>
                          <span style={{ fontWeight: 600, color: activeTheme.text }}>{form.motorCode || "—"}</span>
                          <span style={{ color: activeTheme.textMuted }}>Test Date:</span>
                          <span style={{ fontWeight: 600, color: activeTheme.text }}>{form.testDate || "—"}</span>
                          <span style={{ color: activeTheme.textMuted }}>Tested By:</span>
                          <span style={{ fontWeight: 600, color: activeTheme.text }}>{form.testedBy || "—"}</span>
                        </div>
                      </div>

                      <div style={{ ...S.section, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, textAlign: "center" }}>
                        {uploadStatus === null && (
                          <>
                            <div style={{ fontSize: 40 }}>📄</div>
                            <div style={{ fontWeight: 700, color: activeTheme.text }}>Ready to Upload</div>
                            <div style={{ fontSize: 12, color: activeTheme.textMuted, maxWidth: 280 }}>
                              Upload the generated report to the traceability system for approval.
                            </div>
                            <button className="btn-interact" style={S.btn("primary")} onClick={handleUploadEolReport}>
                              Upload Report
                            </button>
                          </>
                        )}
                        {uploadStatus === 'uploading' && (
                          <>
                            <div style={{ width: 48, height: 48, borderRadius: '50%', border: `4px solid ${activeTheme.border}`, borderTopColor: activeTheme.primary, animation: 'spin 0.8s linear infinite' }} />
                            <div style={{ fontWeight: 700, color: activeTheme.primary }}>Uploading Report...</div>
                            <div style={{ fontSize: 12, color: activeTheme.textMuted }}>Please wait while the report is being uploaded.</div>
                          </>
                        )}
                        {uploadStatus === 'success' && (
                          <>
                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: activeTheme.success + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: 32, color: activeTheme.success }}>✓</span>
                            </div>
                            <div style={{ fontWeight: 700, fontSize: 16, color: activeTheme.success }}>Report Uploaded!</div>
                            <div style={{ fontSize: 12, color: activeTheme.textMuted, maxWidth: 300 }}>
                              The EOL report has been successfully uploaded and linked to the traceability record for <strong>{form.serialNo}</strong>.
                            </div>
                            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                              <button className="btn-interact" style={S.btn("default")} onClick={() => setStep(1)}>← Back to Report</button>
                              <button className="btn-interact" style={S.btn("default")} onClick={handleUploadEolReport}>Upload Again</button>
                            </div>
                          </>
                        )}
                        {uploadStatus === 'error' && (
                          <>
                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: activeTheme.error + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: 32, color: activeTheme.error }}>✗</span>
                            </div>
                            <div style={{ fontWeight: 700, fontSize: 16, color: activeTheme.error }}>Upload Failed</div>
                            <div style={{ fontSize: 12, color: activeTheme.textMuted, maxWidth: 300 }}>
                              The report could not be uploaded. Please check your connection and try again.
                            </div>
                            <button className="btn-interact" style={S.btn("error")} onClick={handleUploadEolReport}>Retry Upload</button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Hidden report for upload purposes */}
                    <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '1360px' }}>
                      <ReportContent motor={{ form, ppData, bemfData, torqueAdj, status: selectedMotor?.status }} reportRef={hiddenEolRef} S={S} goldenSamples={goldenSamples} />
                    </div>
                  </div>
                )}

                {/* ── QI/PDI New Report View ── */}
                {view === "qi_pdi_report" && (
                  <>
                    <div style={{ ...S.stepBar, background: 'transparent', borderBottom: 'none', padding: "8px 24px", gap: 12 }}>
                      {["01 // Data Entry", "02 // Report", "03 // Upload Report"].map((label, i) => (
                        <button key={i}
                          style={{
                            padding: "8px 20px", fontSize: 10, fontWeight: 800, letterSpacing: 1, cursor: "pointer", border: "none",
                            borderRadius: 30,
                            background: pdiStep === i ? activeTheme.primary : activeTheme.surfaceAlt,
                            color: pdiStep === i ? "#fff" : activeTheme.textMuted,
                            boxShadow: pdiStep === i ? `0 4px 12px ${activeTheme.primary}44` : 'none',
                            transition: "all 0.3s ease",
                            textTransform: "uppercase"
                          }}
                          onClick={() => setPdiStep(i)}
                        >
                          {pdiStep > i && "✓ "}{label}
                        </button>
                      ))}
                    </div>

                    {/* ── PDI STEP 0: Data Entry ── */}
                    {pdiStep === 0 && (
                      <div className="entrance-fade">
                        <div style={S.section}>
                          <div style={S.sectionTitle}>Motor Identity</div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                            <div style={{ gridColumn: "1 / -1", marginBottom: 4 }}>
                              <label style={S.label}>Work Order <span style={{ color: activeTheme.error }}>*</span></label>
                              <select
                                style={{ ...S.input, padding: "8px 10px", flex: 1, opacity: workOrders.length === 0 ? 0.6 : 1 }}
                                value={form.workOrderId}
                                disabled={workOrders.length === 0}
                                onChange={e => handleWorkOrderChange(e.target.value)}
                              >
                                <option value="">{workOrders.length === 0 ? "No work orders available" : "Select Work Order"}</option>
                                {workOrders.map(wo => {
                                  const prog = programs.find(p => p.id === wo.programId);
                                  return <option key={wo.id} value={wo.id}>{wo.refId} - {wo.title} {prog ? `(${prog.name})` : ''}</option>;
                                })}
                              </select>
                            </div>
                            <div style={{ gridColumn: "1 / -1", marginBottom: 4 }}>
                              <label style={S.label}>Model / Part <span style={{ color: activeTheme.error }}>*</span></label>
                              <select
                                style={{ ...S.input, padding: "8px 10px", flex: 1, opacity: !selectedWO ? 0.6 : 1 }}
                                value={form.itemIdx}
                                disabled={!selectedWO}
                                onChange={e => handleItemChange(e.target.value)}
                              >
                                <option value="">{selectedWO ? "Select Model/Part" : "Select a Work Order first"}</option>
                                {selectedWO && selectedWO.items.map((item, idx) =>
                                  <option key={idx} value={idx}>{item.modelNumber} - {item.partNumber}</option>
                                )}
                              </select>
                            </div>
                            <MField label="Serial No" value={form.serialNo} onChange={F("serialNo")} S={S} theme={activeTheme} disabled={!canEditQiPdi} />
                            <MField label="Test Date" type="date" value={form.testDate} onChange={F("testDate")} S={S} theme={activeTheme} disabled={!canEditQiPdi} />
                            <div style={{ marginBottom: 10 }}>
                              <label style={S.label}>Part No.</label>
                              <select
                                style={{ ...S.input, padding: "8px 10px", flex: 1, opacity: !canEditQiPdi ? 0.6 : 1 }}
                                value={form.motorCode}
                                disabled={!canEditQiPdi}
                                onChange={e => handleQiPdiRefSelection(e.target.value)}
                              >
                                <option value="">Select Part No.</option>
                                {qiPdiRefSamples.map(s => <option key={s.motorCode} value={s.motorCode}>{s.motorCode}</option>)}
                              </select>
                            </div>
                            <MField label="Motor Model" value={form.motorModel} onChange={F("motorModel")} S={S} theme={activeTheme} disabled={!canEditQiPdi} />
                            <MField label="Tested By" value={form.testedBy} onChange={F("testedBy")} S={S} theme={activeTheme} disabled={!canEditQiPdi} />
                          </div>
                        </div>

                        <div style={S.section}>
                          <div style={S.sectionTitle}>Inspection Checklist</div>
                          <table style={{ ...S.table, tableLayout: 'fixed' }}>
                            <thead>
                              <tr>
                                <th style={{ ...S.th, width: 60 }}>S.No</th>
                                <th style={{ ...S.th, width: 240 }}>Description</th>
                                <th style={{ ...S.th, width: 240 }}>Specification</th>
                                <th style={{ ...S.th, width: 240 }}>Method of Check</th>
                                <th style={S.th}>Observed</th>
                                <th style={{ ...S.th, width: 120 }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {qiPdiData.map((item, idx) => {
                                const isLastRow = idx === qiPdiData.length - 1;
                                return (
                                  <tr key={item.no} style={{ background: idx % 2 === 0 ? activeTheme.surfaceAlt : activeTheme.surface }}>
                                    <td style={S.td}>{item.no}</td>
                                    <td style={S.td}>{item.desc}</td>
                                    {isLastRow ? (
                                      <td colSpan={4} style={S.td}>
                                        <textarea
                                          style={{ ...S.input, padding: "4px 8px", fontSize: 12, minHeight: "40px", resize: "vertical", fontFamily: "inherit" }}
                                          value={item.observed}
                                          onChange={e => {
                                            const newData = [...qiPdiData];
                                            newData[idx].observed = e.target.value;
                                            setQiPdiData(newData);
                                          }}
                                          placeholder="Enter deviations or general comments..."
                                        />
                                      </td>
                                    ) : (
                                      <>
                                        <td style={S.td}>{item.spec}</td>
                                        <td style={S.td}>{item.method}</td>
                                        <td style={S.td}>
                                          <textarea
                                            style={{ ...S.input, padding: "4px 8px", fontSize: 12, minHeight: "40px", resize: "vertical", fontFamily: "inherit" }}
                                            value={item.observed}
                                            onChange={e => {
                                              const newData = [...qiPdiData];
                                              newData[idx].observed = e.target.value;
                                              setQiPdiData(newData);
                                            }}
                                          />
                                        </td>
                                        <td style={S.td}>
                                          <select
                                            style={{
                                              ...S.input,
                                              padding: "4px 8px",
                                              fontSize: 12,
                                              background: item.status === "OK" ? "#dcfce7" : (item.status === "NOT OK" ? "#fee2e2" : (item.status === "NOT OK, But Motor Performance Not Impacted" ? "#fef9c3" : activeTheme.surfaceAlt)),
                                              color: item.status === "OK" ? "#15803d" : (item.status === "NOT OK" ? "#b91c1c" : (item.status === "NOT OK, But Motor Performance Not Impacted" ? "#854d0e" : activeTheme.text))
                                            }}
                                            value={item.status}
                                            onChange={e => {
                                              const newData = [...qiPdiData];
                                              newData[idx].status = e.target.value;
                                              setQiPdiData(newData);
                                            }}
                                          >
                                            <option value="">Select</option>
                                            <option value="OK">OK</option>
                                            <option value="NOT OK">NOT OK</option>
                                            <option value="NOT OK, But Motor Performance Not Impacted">NOT OK, But Motor Performance Not Impacted</option>
                                          </select>
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20, gap: 10, alignItems: "center" }}>
                            <div style={{ marginRight: "auto", display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: 11, fontWeight: 800, color: activeTheme.textMuted, letterSpacing: 1 }}>INSPECTION RESULT:</span>
                              <Badge pass={qiPdiData.filter(i => i.no !== 21).every(i => i.status === "OK" || i.status === "NOT OK, But Motor Performance Not Impacted")} theme={activeTheme} />
                            </div>
                            <button style={S.btn("default")} onClick={() => {
                              setQiPdiData(QI_PDI_DEFAULTS.map(i => ({
                                ...i,
                                observed: i.no === 21 ? "Connector push mount not provided, push mount cable tie provided as alternative" : "",
                                status: ""
                              })));
                              setPdiUploadStatus(null);
                            }}>
                              Clear Table
                            </button>
                            <button style={S.btn("success")} onClick={handleSaveQiPdi} disabled={isSaving}>{isSaving ? "Saving..." : "💾 Save & Generate"}</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── PDI STEP 1: Report Preview ── */}
                    {pdiStep === 1 && (
                      previewQiPdi ? (
                        <div>
                          <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
                            <button style={S.btn("default")} onClick={() => { setPdiStep(0); setPdiUploadStatus(null); }}>← Edit Data</button>
                            <button
                              style={S.btn("success")}
                              onClick={() => openQiPdiDownload({ serialNo: form.serialNo, motorModel: form.motorModel, testedBy: form.testedBy, data: qiPdiData, testDate: form.testDate })}
                            >
                              ⬇ Download PDF
                            </button>
                            <button style={S.btn("primary")} onClick={() => window.print()}>⎙ Print Report</button>
                            <div style={{ flex: 1 }} />
                            {pdiUploadStatus === 'success' && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: activeTheme.success, fontSize: 11, fontWeight: 700 }}>
                                <span style={{ fontSize: 16 }}>✓</span> Uploaded
                              </span>
                            )}
                            <button style={S.btn("primary")} onClick={() => setPdiStep(2)}>
                              {pdiUploadStatus === 'success' ? '✓ Report Uploaded →' : 'Upload Report →'}
                            </button>
                          </div>
                          <div style={{ overflowX: 'auto' }}>
                            <QiPdiReportContent report={previewQiPdi} reportRef={hiddenPdiRef} S={S} />
                          </div>
                        </div>
                      ) : (
                        <div style={{ ...S.section, textAlign: 'center', padding: 40 }}>
                          <div style={{ fontSize: 24, marginBottom: 12 }}>📋</div>
                          <div style={{ fontWeight: 700, fontSize: 16, color: activeTheme.text, marginBottom: 8 }}>No Report Yet</div>
                          <div style={{ fontSize: 13, color: activeTheme.textMuted, marginBottom: 20 }}>
                            Please fill in the data and click <strong>"Save & Generate"</strong> first.
                          </div>
                          <button style={S.btn("primary")} onClick={() => setPdiStep(0)}>← Go to Data Entry</button>
                        </div>
                      )
                    )}

                    {/* ── PDI STEP 2: Upload Report ── */}
                    {pdiStep === 2 && (
                      previewQiPdi ? (
                        <div className="entrance-fade">
                          <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
                            <button style={S.btn("default")} onClick={() => setPdiStep(1)}>← Back to Report</button>
                            <div style={{ flex: 1 }} />
                            {pdiUploadStatus === 'success' && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: activeTheme.success, fontSize: 13, fontWeight: 800 }}>
                                <span style={{ fontSize: 20 }}>✓</span> Report Uploaded Successfully
                              </span>
                            )}
                            {pdiUploadStatus === 'error' && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: activeTheme.error, fontSize: 13, fontWeight: 800 }}>
                                <span style={{ fontSize: 20 }}>✗</span> Upload Failed
                              </span>
                            )}
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                            <div style={{ ...S.section }}>
                              <div style={{ ...S.sectionTitle, marginBottom: 16 }}>Report Summary</div>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", fontSize: 13 }}>
                                <span style={{ color: activeTheme.textMuted }}>Serial No:</span>
                                <span style={{ fontWeight: 600, color: activeTheme.text }}>{form.serialNo || "—"}</span>
                                <span style={{ color: activeTheme.textMuted }}>Motor Model:</span>
                                <span style={{ fontWeight: 600, color: activeTheme.text }}>{form.motorModel || "—"}</span>
                                <span style={{ color: activeTheme.textMuted }}>Part No.:</span>
                                <span style={{ fontWeight: 600, color: activeTheme.text }}>{form.motorCode || "—"}</span>
                                <span style={{ color: activeTheme.textMuted }}>Test Date:</span>
                                <span style={{ fontWeight: 600, color: activeTheme.text }}>{form.testDate || "—"}</span>
                                <span style={{ color: activeTheme.textMuted }}>Tested By:</span>
                                <span style={{ fontWeight: 600, color: activeTheme.text }}>{form.testedBy || "—"}</span>
                              </div>
                            </div>

                            <div style={{ ...S.section, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, textAlign: "center" }}>
                              {pdiUploadStatus === null && (
                                <>
                                  <div style={{ fontSize: 40 }}>📄</div>
                                  <div style={{ fontWeight: 700, color: activeTheme.text }}>Ready to Upload</div>
                                  <div style={{ fontSize: 12, color: activeTheme.textMuted, maxWidth: 280 }}>
                                    Upload the PDI report to the traceability system for approval.
                                  </div>
                                  <button className="btn-interact" style={S.btn("primary")} onClick={handleUploadPdiReport}>
                                    Upload Report
                                  </button>
                                </>
                              )}
                              {pdiUploadStatus === 'uploading' && (
                                <>
                                  <div style={{ width: 48, height: 48, borderRadius: '50%', border: `4px solid ${activeTheme.border}`, borderTopColor: activeTheme.primary, animation: 'spin 0.8s linear infinite' }} />
                                  <div style={{ fontWeight: 700, color: activeTheme.primary }}>Uploading PDI Report...</div>
                                  <div style={{ fontSize: 12, color: activeTheme.textMuted }}>Please wait while the report is being uploaded.</div>
                                </>
                              )}
                              {pdiUploadStatus === 'success' && (
                                <>
                                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: activeTheme.success + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ fontSize: 32, color: activeTheme.success }}>✓</span>
                                  </div>
                                  <div style={{ fontWeight: 700, fontSize: 16, color: activeTheme.success }}>PDI Report Uploaded!</div>
                                  <div style={{ fontSize: 12, color: activeTheme.textMuted, maxWidth: 300 }}>
                                    The PDI report has been successfully uploaded and linked to the traceability record for <strong>{form.serialNo}</strong>.
                                  </div>
                                  <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                                    <button className="btn-interact" style={S.btn("default")} onClick={() => setPdiStep(1)}>← Back to Report</button>
                                    <button className="btn-interact" style={S.btn("default")} onClick={handleUploadPdiReport}>Upload Again</button>
                                  </div>
                                </>
                              )}
                              {pdiUploadStatus === 'error' && (
                                <>
                                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: activeTheme.error + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ fontSize: 32, color: activeTheme.error }}>✗</span>
                                  </div>
                                  <div style={{ fontWeight: 700, fontSize: 16, color: activeTheme.error }}>Upload Failed</div>
                                  <div style={{ fontSize: 12, color: activeTheme.textMuted, maxWidth: 300 }}>
                                    The PDI report could not be uploaded. Please check your connection and try again.
                                  </div>
                                  <button className="btn-interact" style={S.btn("error")} onClick={handleUploadPdiReport}>Retry Upload</button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Hidden PDI report for upload purposes */}
                          <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '1360px' }}>
                            <QiPdiReportContent report={previewQiPdi} reportRef={hiddenPdiRef} S={S} />
                          </div>
                        </div>
                      ) : (
                        <div style={{ ...S.section, textAlign: 'center', padding: 40 }}>
                          <div style={{ fontSize: 24, marginBottom: 12 }}>📋</div>
                          <div style={{ fontWeight: 700, fontSize: 16, color: activeTheme.text, marginBottom: 8 }}>No Report to Upload</div>
                          <div style={{ fontSize: 13, color: activeTheme.textMuted, marginBottom: 20 }}>
                            Please fill in the data and click <strong>"Save & Generate"</strong> first.
                          </div>
                          <button style={S.btn("primary")} onClick={() => setPdiStep(0)}>← Go to Data Entry</button>
                        </div>
                      )
                    )}
                  </>
                )}
              </div>
            </main>
          <ReportPreviewModal
            motor={previewMotor}
            show={showPreviewModal}
            onClose={() => setShowPreviewModal(false)}
            onDownload={openReportDownload}
            reportRef={reportRef}
            S={S}
            theme={activeTheme}
            currentUser={currentUser}
            goldenSamples={goldenSamples}
          />

          <QiPdiPreviewModal
            report={previewQiPdi}
            show={showQiPdiModal}
            onClose={() => setShowQiPdiModal(false)}
            onDownload={handleDownloadQiPdiPDF}
            reportRef={qiPdiReportRef}
            S={S}
            theme={activeTheme}
          />

        <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse-glow {
          0% { transform: scale(1); box-shadow: 0 0 0 0 ${activeTheme.primary}44; }
          70% { transform: scale(1.05); box-shadow: 0 0 0 8px ${activeTheme.primary}00; }
          100% { transform: scale(1); box-shadow: 0 0 0 0 ${activeTheme.primary}00; }
        }
        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
          100% { transform: translateY(0px); }
        }

        .entrance-fade {
          animation: fadeInUp 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          opacity: 0;
        }
        .sidebar-animate {
          animation: slideInLeft 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .notification-pulse {
          animation: pulse-glow 2s infinite;
        }
        .modal-overlay {
          animation: fadeInOverlay 0.3s ease-out forwards;
        }
        .float-logo {
          animation: float 3s ease-in-out infinite;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .generator-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }
        .upload-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 20px;
        }
        .sidebar-nav-item:hover {
          transform: translateX(6px);
          background: ${activeTheme.primary}12 !important;
        }
        
        .table-row-hover {
          transition: background 0.2s ease, transform 0.2s ease;
        }
        
        .table-row-hover:hover {
          background: ${activeTheme.primary}08 !important;
          filter: contrast(1.02);
        }

        .btn-interact:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px ${activeTheme.primary}44;
          filter: brightness(1.1);
        }

        .btn-interact:active {
          transform: translateY(0);
        }

        .noise-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          pointer-events: none; opacity: 0.03; z-index: 9999;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }
        .gradient-mesh {
          position: fixed; top: -50%; left: -50%; width: 200%; height: 200%;
          pointer-events: none; z-index: -1;
          background: radial-gradient(circle at 50% 50%, ${activeTheme.primary}11 0%, transparent 50%),
                      radial-gradient(circle at 80% 20%, ${activeTheme.accent}08 0%, transparent 40%);
        }

        input:hover {
          border-color: ${activeTheme.primary}88 !important;
        }

        input:focus { 
          border-color: ${activeTheme.primary} !important; 
          box-shadow: 0 0 0 3px ${activeTheme.primary}22 !important;
          transform: scale(1.01);
        }
        .section:hover {
          border-color: ${activeTheme.primary}66 !important;
          box-shadow: 0 15px 35px -12px rgba(0,0,0,0.5) !important;
        }
        .report-pdf-container {
          background: #ffffff !important;
          padding: 10mm !important;
          width: 850px;
          margin: 0 auto;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        @media print {
          body { background: #fff !important; color: #000 !important; }
          button { display: none !important; }
          @page {
            size: A3 landscape;
            margin: 5mm;
          }
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${activeTheme.border}; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: ${activeTheme.primary}; }
      `}</style>
    </>
  );
}
