import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Listen for system events
  useEffect(() => {
    const handleNotification = (e) => {
      const { type, message } = e.detail;
      const toastType = type === 'warning' ? 'warning' : type === 'error' ? 'error' : 'success';
      addToast(message, toastType);

      // Browser notification
      if (Notification.permission === 'granted') {
        new Notification('TransitMesh', { body: message, icon: '🚌' });
      }
    };

    const handleSync = (e) => {
      addToast(`✅ Synced ${e.detail.synced} offline updates`, 'success');
    };

    window.addEventListener('tm-notification', handleNotification);
    window.addEventListener('offline-sync', handleSync);

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      window.removeEventListener('tm-notification', handleNotification);
      window.removeEventListener('offline-sync', handleSync);
    };
  }, [addToast]);

  const icons = { info: '💡', success: '✅', warning: '⚠️', error: '❌' };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`} onClick={() => removeToast(toast.id)}>
            <span className="toast-icon">{icons[toast.type]}</span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
