export default function Toast({ toast, onClose }) {
  if (!toast) return null;
  return <div className={toast.type === 'error' ? 'toast toast-error' : 'toast toast-success'} role="status">
    <span>{toast.message}</span><button aria-label="Dismiss" onClick={onClose}>×</button>
  </div>;
}
