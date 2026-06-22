const Button = ({ children, variant = 'primary', size = 'md', icon, disabled, className = '', style = {}, ...props }) => {
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-sm)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    transition: 'all 0.2s',
    fontFamily: 'inherit',
    fontWeight: 600,
    ...style
  };

  const variants = {
    primary: {
      background: 'linear-gradient(135deg, var(--accent), rgba(var(--accent-rgb), 0.8))',
      color: '#fff',
      border: 'none',
      borderRadius: 'var(--radius-md)',
      ...baseStyle
    },
    secondary: {
      background: 'var(--bg-card)',
      color: 'var(--text)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      ...baseStyle
    },
    ghost: {
      background: 'none',
      color: 'var(--accent)',
      border: 'none',
      borderRadius: 'var(--radius-md)',
      ...baseStyle
    },
    danger: {
      background: 'var(--rose-bg)',
      color: 'var(--rose-text)',
      border: '1px solid var(--rose-text)',
      borderRadius: 'var(--radius-md)',
      ...baseStyle
    }
  };

  const sizes = {
    sm: { padding: '6px 12px', fontSize: 'var(--fs-sm)' },
    md: { padding: '10px 20px', fontSize: 'var(--fs-md)' },
    lg: { padding: '12px 24px', fontSize: 'var(--fs-lg)' },
    icon: { padding: '6px', width: '32px', height: '32px' }
  };

  return (
    <button
      className={`btn-${variant} ${className}`}
      style={{ ...variants[variant], ...sizes[size] }}
      disabled={disabled}
      {...props}
    >
      {icon && icon}
      {children}
    </button>
  );
};

export default Button;
