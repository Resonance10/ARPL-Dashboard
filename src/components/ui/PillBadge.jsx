const PillBadge = ({ children, variant = 'default', style = {} }) => {
  const variants = {
    default: { background: 'var(--bg-subtle)', color: 'var(--text)' },
    accent: { background: 'var(--accent)', color: '#fff' },
    blue: { background: 'var(--blue-bg)', color: 'var(--blue-text)' },
    emerald: { background: 'var(--emerald-bg)', color: 'var(--emerald-text)' },
    amber: { background: 'var(--amber-bg)', color: 'var(--amber-text)' },
    rose: { background: 'var(--rose-bg)', color: 'var(--rose-text)' }
  };

  return (
    <span
      className={`pill-badge ${variant}`}
      style={{
        ...variants[variant],
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-xs)',
        padding: '2px var(--space-sm)',
        borderRadius: '15px',
        fontSize: 'var(--fs-base)',
        fontWeight: 600,
        ...style
      }}
    >
      {children}
    </span>
  );
};

export default PillBadge;
