import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import MapView from '../components/map/MapView';
import { useToast } from '../components/ui/Toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, BarChart, Bar, ResponsiveContainer, Legend } from 'recharts';

const API = 'http://localhost:5000/api';
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('tm_token')}` });

function HealthCards({ health }) {
  const cards = [
    { label: 'Active Buses', value: `${health.activeBuses || 0} / ${health.totalBuses || 0}`, icon: '🚌', color: 'var(--success)' },
    { label: 'Connected Students', value: health.connectedStudents || 0, icon: '👥', color: 'var(--accent-primary)' },
    { label: 'P2P Peers', value: health.activePeers || 0, icon: '📡', color: 'var(--warning)' },
    { label: 'Avg ETA Accuracy', value: `${health.avgETAAccuracy || 0}%`, icon: '🎯', color: 'var(--success)' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
      {cards.map((c, i) => (
        <div key={i} className="card card-accent" style={{ padding: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>{c.icon} {c.label}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}

function BusTable({ buses, onEdit, onDelete, onSimulate }) {
  return (
    <div className="table-container">
      <table>
        <thead><tr><th>ID</th><th>Name</th><th>Route</th><th>Status</th><th>Speed</th><th>Actions</th></tr></thead>
        <tbody>
          {buses.map(bus => (
            <tr key={bus.busId}>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{bus.busId}</td>
              <td style={{ fontWeight: 500 }}>{bus.name}</td>
              <td>{bus.route}</td>
              <td><span className={`badge ${bus.isActive ? 'badge-live' : 'badge-predicted'}`}>{bus.isActive ? '● Active' : '○ Inactive'}</span></td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>{Math.round(bus.speed || 0)} km/h</td>
              <td style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => onEdit(bus)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => onDelete(bus.busId)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SimPanel({ buses, onSimulate }) {
  const [simStates, setSimStates] = useState({});
  const [tick, setTick] = useState(0);

  useEffect(() => {
    fetch(`${API}/admin/simulate`, { headers: headers() }).then(r => r.json()).then(setSimStates).catch(() => {});
    const iv = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const doSim = async (busId, mode) => {
    // Optimistic update
    if (mode === 'normal') {
      setSimStates(prev => { const n = { ...prev }; delete n[busId]; return n; });
    } else {
      setSimStates(prev => ({ ...prev, [busId]: { mode, startedAt: new Date().toISOString() } }));
    }
    onSimulate(busId, mode);
  };

  const formatDuration = (startedAt) => {
    if (!startedAt) return '';
    const sec = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}m ${s}s ago`;
  };

  const modeColors = { offline: { bg: '#FFEBEE', text: '#C62828', label: '🔴 OFFLINE' }, weak: { bg: '#FFF3E0', text: '#E65100', label: '🟡 WEAK' }, gps_gap: { bg: '#FFF8E1', text: '#FF6F00', label: '⚠️ GPS GAP' } };
  const normalPill = { bg: '#E8F5E9', text: '#2E7D32', label: '🟢 NORMAL' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h3 style={{ fontSize: '16px', marginBottom: '4px' }}>🧪 Network Simulation Panel</h3>
      {buses.map(bus => {
        const sim = simStates[bus.busId];
        const currentMode = sim?.mode || 'normal';
        const pill = sim ? modeColors[sim.mode] || normalPill : normalPill;
        return (
          <div key={bus.busId} className="card" style={{ padding: '14px', borderLeft: `4px solid ${pill.text}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 600 }}>{bus.name}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px', fontFamily: 'var(--font-mono)' }}>#{bus.busNumber || bus.busId}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '12px', background: pill.bg, color: pill.text }}>{pill.label}</span>
                {sim && <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>since {formatDuration(sim.startedAt)}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => doSim(bus.busId, 'weak')} disabled={currentMode === 'weak'} style={{ opacity: currentMode === 'weak' ? 0.5 : 1 }}>🟡 Weak Network</button>
              <button className="btn btn-danger btn-sm" onClick={() => doSim(bus.busId, 'offline')} disabled={currentMode === 'offline'} style={{ opacity: currentMode === 'offline' ? 0.5 : 1 }}>🔴 Simulate Offline</button>
              <button className="btn btn-secondary btn-sm" onClick={() => doSim(bus.busId, 'gps_gap')} disabled={currentMode === 'gps_gap'} style={{ opacity: currentMode === 'gps_gap' ? 0.5 : 1 }}>⚠️ GPS Gap</button>
              {currentMode !== 'normal' && (
                <button className="btn btn-primary btn-sm" onClick={() => doSim(bus.busId, 'normal')} style={{ background: 'var(--accent-primary)', fontWeight: 700 }}>🟢 Restore ✓</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}


function AnalyticsView({ data }) {
  if (!data) return <div className="spinner" style={{ margin: '40px auto' }} />;
  const COLORS = ['#2E7D32', '#E65100', '#C62828'];
  const pieData = data.networkDistribution ? [
    { name: 'Live', value: data.networkDistribution.live },
    { name: 'Peer', value: data.networkDistribution.peer },
    { name: 'Predicted', value: data.networkDistribution.predicted },
  ] : [];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      <div className="card" style={{ padding: '20px' }}>
        <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>📈 ETA Accuracy (7 days)</h4>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data.etaAccuracy || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis domain={[60, 100]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="accuracy" stroke="var(--accent-primary)" strokeWidth={2} dot={{ fill: 'var(--accent-primary)' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="card" style={{ padding: '20px' }}>
        <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>🔄 Network Mode Distribution</h4>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="card" style={{ padding: '20px' }}>
        <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>👥 P2P Relay Usage by Hour</h4>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.p2pUsage || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="relays" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="card" style={{ padding: '20px' }}>
        <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>🕐 Bus Punctuality</h4>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.punctuality || []} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="busName" tick={{ fontSize: 11 }} width={60} />
            <Tooltip />
            <Legend />
            <Bar dataKey="onTime" stackId="a" fill="#2E7D32" name="On Time" />
            <Bar dataKey="late" stackId="a" fill="#E65100" name="Late" />
            <Bar dataKey="early" stackId="a" fill="#F5C518" name="Early" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function AdminDashboard({ user, onLogout }) {
  const [section, setSection] = useState('health');
  const [health, setHealth] = useState({});
  const [buses, setBuses] = useState([]);
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [showAddBus, setShowAddBus] = useState(false);
  const [editBus, setEditBus] = useState(null);
  const [newBus, setNewBus] = useState({ busId: '', name: '', route: '', isActive: true });
  const { addToast } = useToast();

  const fetchData = async () => {
    try {
      const h = await fetch(`${API}/admin/health`, { headers: headers() }).then(r => r.json());
      setHealth(h);
      const b = await fetch(`${API}/buses`).then(r => r.json());
      setBuses(Array.isArray(b) ? b : []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 10000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (section === 'users') {
      fetch(`${API}/admin/users`, { headers: headers() }).then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : []));
    }
    if (section === 'analytics') {
      fetch(`${API}/admin/analytics`, { headers: headers() }).then(r => r.json()).then(setAnalytics);
    }
  }, [section]);

  const handleSimulate = async (busId, mode) => {
    try {
      await fetch(`${API}/admin/simulate`, { method: 'POST', headers: headers(), body: JSON.stringify({ busId, mode }) });
      addToast(`Simulation: ${mode} for ${busId}`, mode === 'normal' ? 'success' : 'warning');
    } catch (e) { addToast('Simulation failed', 'error'); }
  };

  const handleAddBus = async () => {
    if (!newBus.busId || !newBus.name || !newBus.route) { addToast('Fill all fields', 'error'); return; }
    try {
      await fetch(`${API}/buses`, { method: 'POST', headers: headers(), body: JSON.stringify(newBus) });
      addToast('Bus created', 'success');
      setShowAddBus(false);
      setNewBus({ busId: '', name: '', route: '', isActive: true });
      fetchData();
    } catch (e) { addToast('Failed to create bus', 'error'); }
  };

  const handleDeleteBus = async (busId) => {
    if (!confirm(`Delete ${busId}?`)) return;
    try {
      await fetch(`${API}/buses/${busId}`, { method: 'DELETE', headers: headers() });
      addToast('Bus deleted', 'success');
      fetchData();
    } catch (e) { addToast('Delete failed', 'error'); }
  };

  const navItems = [
    { id: 'health', label: '📊 System Health', },
    { id: 'buses', label: '🚌 Bus Management' },
    { id: 'map', label: '🗺️ Live Monitor' },
    { id: 'simulation', label: '🎮 Simulation' },
    { id: 'users', label: '👥 User Activity' },
    { id: 'analytics', label: '📈 Analytics' },
  ];

  return (
    <div style={{ height: '100vh', display: 'flex', overflow: 'hidden' }}>
      {/* Admin Sidebar */}
      <div style={{ width: '220px', background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 800 }}>TransitMesh 🚌</h1>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Admin Panel</div>
        </div>
        <nav style={{ flex: 1, padding: '8px' }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setSection(item.id)} style={{
              display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px',
              background: section === item.id ? 'var(--bg-tertiary)' : 'transparent',
              border: 'none', borderLeft: section === item.id ? '3px solid var(--accent-primary)' : '3px solid transparent',
              borderRadius: '0 8px 8px 0', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
              fontFamily: 'var(--font-body)', color: section === item.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              marginBottom: '2px', transition: 'all 0.15s'
            }}>
              {item.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>{user?.name}</div>
          <button onClick={onLogout} className="btn btn-secondary btn-sm" style={{ width: '100%' }}>Logout</button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: section === 'map' ? '0' : '24px', background: 'var(--bg-primary)' }}>
        <div className="animate-fadeIn">
          {section === 'health' && (
            <>
              <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>📊 System Health Dashboard</h2>
              <HealthCards health={health} />
            </>
          )}

          {section === 'buses' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px' }}>🚌 Bus Management</h2>
                <button className="btn btn-primary" onClick={() => setShowAddBus(true)}>+ Add Bus</button>
              </div>
              <BusTable buses={buses} onEdit={setEditBus} onDelete={handleDeleteBus} onSimulate={handleSimulate} />

              {/* Add Bus Modal */}
              {showAddBus && (
                <div className="modal-overlay" onClick={() => setShowAddBus(false)}>
                  <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <h3 style={{ marginBottom: '16px' }}>Add New Bus</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label className="input-label">Bus ID</label>
                        <input className="input-field" placeholder="BUS-5E" value={newBus.busId} onChange={e => setNewBus({ ...newBus, busId: e.target.value })} />
                      </div>
                      <div>
                        <label className="input-label">Name</label>
                        <input className="input-field" placeholder="Bus 5E" value={newBus.name} onChange={e => setNewBus({ ...newBus, name: e.target.value })} />
                      </div>
                      <div>
                        <label className="input-label">Route</label>
                        <input className="input-field" placeholder="Route-E" value={newBus.route} onChange={e => setNewBus({ ...newBus, route: e.target.value })} />
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button className="btn btn-primary" onClick={handleAddBus} style={{ flex: 1 }}>Create Bus</button>
                        <button className="btn btn-secondary" onClick={() => setShowAddBus(false)}>Cancel</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {section === 'map' && (
            <div style={{ height: '100%', minHeight: 'calc(100vh - 0px)' }}>
              <MapView buses={buses.map(b => ({ ...b, lat: b.currentLat, lng: b.currentLng, source: 'live' }))} isAdmin showStops showRoutes />
            </div>
          )}

          {section === 'simulation' && (
            <>
              <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>🎮 Network Simulation</h2>
              <SimPanel buses={buses} onSimulate={handleSimulate} />
              <div className="card" style={{ marginTop: '16px', padding: '16px' }}>
                <h4 style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>How to Demo</h4>
                <ol style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.8, paddingLeft: '20px' }}>
                  <li>Open student dashboard in another tab</li>
                  <li>Select a bus and click "Simulate Offline"</li>
                  <li>Watch the student map switch to 🔴 PREDICTED mode</li>
                  <li>Click "Restore Normal" to show reconnection + sync</li>
                </ol>
              </div>
            </>
          )}

          {section === 'users' && (
            <>
              <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>👥 User Activity</h2>
              <div className="table-container">
                <table>
                  <thead><tr><th>Name</th><th>Email</th><th>Last Seen</th><th>Network</th><th>Route</th></tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id}>
                        <td style={{ fontWeight: 500 }}>{u.name}</td>
                        <td style={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}>{u.email}</td>
                        <td style={{ fontSize: '12px' }}>{u.lastSeen ? new Date(u.lastSeen).toLocaleString() : 'N/A'}</td>
                        <td><span className={`badge badge-${u.networkMode === 'online' ? 'live' : u.networkMode === 'weak' ? 'peer' : 'predicted'}`}>{u.networkMode || 'online'}</span></td>
                        <td>{u.routePreference || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {section === 'analytics' && (
            <>
              <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>📈 Analytics Dashboard</h2>
              <AnalyticsView data={analytics} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
