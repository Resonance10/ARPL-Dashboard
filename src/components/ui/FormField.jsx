const FormField = ({ label, required, error, icon, children, className = '', style = {} }) => {
  return (
    <div className={`form-group ${className}`} style={style}>
      {label && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
          {icon}
          {label} {required && <span className="mandatory">*</span>}
        </label>
      )}
      {children}
      {error && <p className="error-message">{error}</p>}
    </div>
  );
};

export default FormField;
