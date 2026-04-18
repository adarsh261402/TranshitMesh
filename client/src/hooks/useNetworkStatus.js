import { useState, useEffect } from 'react';
import networkManager from '../services/NetworkManager';

export default function useNetworkStatus() {
  const [status, setStatus] = useState(() => networkManager.getStatusInfo());
  const [mode, setMode] = useState(networkManager.currentMode);
  const [interval, setInterval_] = useState(networkManager.updateInterval);

  useEffect(() => {
    const unsub = networkManager.subscribe((newMode) => {
      setMode(newMode);
      setStatus(networkManager.getStatusInfo());
      setInterval_(networkManager.updateInterval);
    });

    const handler = () => {
      setMode(networkManager.currentMode);
      setStatus(networkManager.getStatusInfo());
      setInterval_(networkManager.updateInterval);
    };

    window.addEventListener('network-mode-changed', handler);
    return () => {
      unsub();
      window.removeEventListener('network-mode-changed', handler);
    };
  }, []);

  return { status, mode, updateInterval: interval, networkManager };
}
