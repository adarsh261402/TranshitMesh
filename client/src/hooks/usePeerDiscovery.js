import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const PEER_POLL_MS = 30000;

export default function usePeerDiscovery() {
  const [peers, setPeers] = useState([]);

  const registerAsPeer = useCallback(({ lat, lng }) => {
    api.post('/api/peers/register', { lat, lng }).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchPeers = () => {
      api.get('/api/peers/nearby', { params: { lat: 23.1817, lng: 79.9895, radius: 1000 } })
        .then(r => setPeers(Array.isArray(r.data) ? r.data : []))
        .catch(() => {});
    };
    fetchPeers();
    const iv = setInterval(fetchPeers, PEER_POLL_MS);
    return () => clearInterval(iv);
  }, []);

  return { peers, registerAsPeer };
}
