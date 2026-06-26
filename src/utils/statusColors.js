// Single source of truth for mapping a request status to UI colors.
// Keeps prototype + production PO screens (and the dashboard) consistent.

/**
 * Maps a request status to a PillBadge / .pill-badge variant class.
 * Variants correspond to the themeable status tokens (.pill-badge.<variant>).
 */
export const getStatusVariant = (status) => {
  if (!status) return 'gray';
  if (status === 'Approved') return 'emerald';
  if (status === 'Rejected' || status === 'Cancelled') return 'rose';
  if (status === 'Correction Required') return 'amber';
  if (String(status).includes('Pending')) return 'amber';
  return 'gray';
};

/**
 * Status-stepper node colors, keyed to the themeable status tokens so they
 * adapt to light/dark mode. Used by the prototype and production steppers.
 */
export const STEPPER_COLORS = {
  done: 'var(--emerald-text)',
  active: 'var(--accent)',
  correction: 'var(--amber-text)',
  terminal: 'var(--rose-text)',
  idle: 'var(--border)',
  iconOn: '#ffffff',
};
