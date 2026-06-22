import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const iconMap = {
  success: <CheckCircle2 size={18} />,
  error: <AlertCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />
};

const colorMap = {
  success: { bg: 'var(--emerald-bg)', text: 'var(--emerald-text)', border: 'var(--emerald-text)' },
  error: { bg: 'var(--rose-bg)', text: 'var(--rose-text)', border: 'var(--rose-text)' },
  warning: { bg: 'var(--amber-bg)', text: 'var(--amber-text)', border: 'var(--amber-text)' },
  info: { bg: 'var(--blue-bg)', text: 'var(--blue-text)', border: 'var(--blue-text)' }
};

const Toast = ({ visible, message, type = 'info', onClose }) => {
  const colors = colorMap[type] || colorMap.info;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: '-50%', scale: 0.9 }}
          animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
          exit={{ opacity: 0, y: 20, x: '-50%', scale: 0.9 }}
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 20px',
            borderRadius: 'var(--radius-lg)',
            background: colors.bg,
            color: colors.text,
            border: `1.5px solid ${colors.border}`,
            boxShadow: 'var(--shadow-lg)',
            fontWeight: 600,
            fontSize: 'var(--fs-md)',
            maxWidth: '90vw'
          }}
        >
          {iconMap[type]}
          <span>{message}</span>
          {onClose && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.text, padding: '2px', display: 'flex', marginLeft: '4px' }}>
              <X size={16} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
