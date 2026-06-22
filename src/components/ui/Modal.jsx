import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, subtitle, children, size = 'md', footer }) => {
  const sizeStyles = {
    sm: { maxWidth: '400px' },
    md: { maxWidth: '550px' },
    lg: { maxWidth: '750px' },
    xl: { maxWidth: '950px' },
    full: { width: '90%', maxWidth: '1200px' }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="modal-overlay"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="auth-card modal-content"
            style={{ ...sizeStyles[size], maxHeight: '85vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            {title && (
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 'var(--fs-xl)', fontWeight: 800, letterSpacing: '-0.02em' }}>{title}</h3>
                  {subtitle && <p style={{ margin: '4px 0 0', color: 'var(--text-sub)', fontSize: 'var(--fs-base)' }}>{subtitle}</p>}
                </div>
                <button className="btn-icon-only" onClick={onClose} title="Close"><X size={18} /></button>
              </div>
            )}
            {children}
            {footer && (
              <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)', justifyContent: 'flex-end' }}>
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
