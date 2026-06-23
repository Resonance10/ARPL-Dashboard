import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, RotateCcw } from 'lucide-react';

/**
 * Reusable FilterSection component with consistent styling:
 * - Toggle button showing active filter count
 * - Animated expand/collapse
 * - Optional "Clear All" button
 * - Slot-based children for filter controls
 */
const FilterSection = ({
  show,
  onToggle,
  label = 'Filters',
  activeCount = 0,
  onClear,
  children
}) => {
  return (
    <div className="filter-bar" style={{ marginBottom: 'var(--space-md)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
        <button
          className="btn-small"
          onClick={onToggle}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-xs)',
            position: 'relative'
          }}
        >
          <Filter size={14} />
          <span>{show ? 'Hide' : 'Show'} {label}</span>
          {activeCount > 0 && !show && (
            <span
              style={{
                background: 'var(--accent)',
                color: '#fff',
                borderRadius: '50%',
                width: '16px',
                height: '16px',
                fontSize: '10px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1
              }}
            >
              {activeCount}
            </span>
          )}
        </button>
        {activeCount > 0 && onClear && (
          <button
            className="btn-ghost-small"
            onClick={onClear}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-xs)',
              color: 'var(--rose-text, #e11d48)',
              fontSize: 'var(--fs-sm)'
            }}
          >
            <RotateCcw size={12} />
            Clear All
          </button>
        )}
      </div>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                display: 'flex',
                gap: 'var(--space-sm)',
                flexWrap: 'wrap',
                alignItems: 'center',
                marginTop: 'var(--space-sm)',
                padding: 'var(--space-sm) var(--space-md)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FilterSection;

/**
 * Styled filter input with consistent sizing
 * - Wider min-width, compact padding for shorter height
 */
export const FilterInput = (props) => (
  <input
    type="text"
    placeholder="Search..."
    style={{
      fontSize: 'var(--fs-sm)',
      padding: '4px 8px',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--text)',
      minWidth: '150px',
      width: 'auto',
      lineHeight: '1.4'
    }}
    {...props}
  />
);

/**
 * Styled filter select with consistent sizing
 * - Uses appearance: none to avoid double-arrow issues with native select
 * - Wider min-width, compact padding
 */
export const FilterSelect = (props) => (
  <select
    style={{
      fontSize: 'var(--fs-sm)',
      padding: '4px 24px 4px 8px',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--text)',
      minWidth: '130px',
      width: 'auto',
      lineHeight: '1.4',
      appearance: 'auto',
      WebkitAppearance: 'auto',
      MozAppearance: 'auto',
      backgroundImage: 'none',
      cursor: 'pointer'
    }}
    {...props}
  />
);

/**
 * Styled date input for filter use
 * - Wider min-width, compact padding
 */
export const FilterDateInput = (props) => (
  <input
    type="date"
    style={{
      fontSize: 'var(--fs-sm)',
      padding: '4px 8px',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--text)',
      minWidth: '135px',
      width: 'auto',
      lineHeight: '1.4'
    }}
    {...props}
  />
);
