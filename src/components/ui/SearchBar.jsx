import { Search } from 'lucide-react';

const SearchBar = ({ value, onChange, placeholder = 'Search...', style = {} }) => {
  return (
    <div style={{ position: 'relative', ...style }}>
      <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-sub)', pointerEvents: 'none' }} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '8px 12px 8px 32px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          background: 'var(--bg-card)',
          color: 'var(--text)',
          fontSize: 'var(--fs-base)',
          outline: 'none',
          transition: 'border-color 0.2s'
        }}
      />
    </div>
  );
};

export default SearchBar;
