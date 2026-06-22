const Card = ({ children, header, headerIcon, headerSubtitle, headerActions, className = '', style = {}, bodyStyle = {} }) => {
  return (
    <div className={`card ${className}`} style={style}>
      {header && (
        <div className="card-header gradient">
          <div>
            <h3 style={{ margin: 0, fontSize: 'var(--fs-lg)', fontWeight: '700', color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              {headerIcon}
              {header}
            </h3>
            {headerSubtitle && <p style={{ margin: 'var(--space-xs) 0 0 0', fontSize: 'var(--fs-base)', color: 'var(--text-sub)' }}>{headerSubtitle}</p>}
          </div>
          {headerActions && <div>{headerActions}</div>}
        </div>
      )}
      <div className="card-body" style={{ padding: 'var(--space-lg) var(--space-lg) 0', ...bodyStyle }}>
        {children}
      </div>
    </div>
  );
};

export default Card;
