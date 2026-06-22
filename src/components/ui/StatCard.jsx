const StatCard = ({ label, value, icon, color = 'var(--text-sub)', style = {} }) => {
  return (
    <div className="stat-card" style={{ borderLeft: `4px solid ${color}`, background: 'var(--bg-card)', padding: 'var(--space-lg)', ...style }}>
      <span className="stat-label" style={{ fontSize: 'var(--fs-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
        {icon}
        {label}
      </span>
      <div className="stat-value" style={{ fontSize: 'var(--fs-xl)', color }}>{value}</div>
    </div>
  );
};

export default StatCard;
