import { useState, useEffect } from 'react';
import p2pManager from '../services/P2PManager';

export default function useP2P(userId) {
  const [p2pStatus, setP2PStatus] = useState({ connectedPeers: 0, isRelay: false, peerId: null });
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!userId) return;

    p2pManager.initialize(userId).then(() => {
      setIsActive(true);
    }).catch(() => {
      setIsActive(false);
    });

    const unsub = p2pManager.subscribe((status) => {
      setP2PStatus(status);
    });

    // Try connecting to nearby peers periodically
    const interval = setInterval(() => {
      p2pManager.connectToNearbyPeers();
    }, 30000);

    // Initial attempt
    setTimeout(() => p2pManager.connectToNearbyPeers(), 5000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [userId]);

  return { p2pStatus, isActive, p2pManager };
}
