const EmptyState = ({ icon, message = 'No data found', style = {} }) => {
  return (
    <div style={{ padding: 'var(--space-xl)', textAlign: 'center', ...style }}>
      {icon && <div style={{ margin: '0 auto var(--space-md)', color: 'var(--text-sub)', opacity: 0.3 }}>{icon}</div>}
      <p className="empty-msg" style={{ color: 'var(--text-sub)', fontSize: 'var(--fs-md)' }}>{message}</p>
    </div>
  );
};

export default EmptyState;
