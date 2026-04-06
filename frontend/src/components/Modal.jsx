function Modal({ title, children, onClose, actions, size = 'md' }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className={`modal-card modal-${size}`}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button type="button" className="touch-btn" onClick={onClose} aria-label="Cerrar modal">
            ✕
          </button>
        </div>
        <div className="modal-content">{children}</div>
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}

export default Modal;
