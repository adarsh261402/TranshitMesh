// NetworkManager — Singleton service for network-aware behavior
class NetworkManager {
  constructor() {
    if (NetworkManager.instance) return NetworkManager.instance;
    NetworkManager.instance = this;

    this.currentMode = 'online';
    this.updateInterval = 5000;
    this.payloadSize = 'full';
    this.activeMode = 'live';
    this.listeners = new Set();

    this._init();
  }

  _init() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => this.detectNetwork());
    window.addEventListener('offline', () => this.detectNetwork());

    if (navigator.connection) {
      navigator.connection.addEventListener('change', () => this.detectNetwork());
    }

    this.detectNetwork();
  }

  detectNetwork() {
    const wasMode = this.currentMode;

    if (!navigator.onLine) {
      this.switchMode('offline');
      return;
    }

    const conn = navigator.connection;
    if (conn) {
      const type = conn.effectiveType;
      if (type === '4g') {
        this.switchMode('online');
      } else if (type === '3g') {
        this.switchMode('weak');
      } else {
        this.switchMode('offline');
      }
    } else {
      this.switchMode(navigator.onLine ? 'online' : 'offline');
    }
  }

  switchMode(newMode) {
    this.currentMode = newMode;

    switch (newMode) {
      case 'online':
        this.updateInterval = 5000;
        this.payloadSize = 'full';
        this.activeMode = 'live';
        break;
      case 'weak':
        this.updateInterval = 15000;
        this.payloadSize = 'compressed';
        this.activeMode = 'live';
        break;
      case 'offline':
        this.updateInterval = 20000;
        this.payloadSize = 'minimal';
        this.activeMode = 'predicted';
        break;
    }

    this.notifyAllComponents();
  }

  // Force mode for simulation
  forceMode(mode) {
    this.switchMode(mode);
  }

  getPayloadConfig() {
    switch (this.payloadSize) {
      case 'full':
        return ['busId', 'lat', 'lng', 'speed', 'heading', 'passengers', 'route', 'stops'];
      case 'compressed':
        return ['busId', 'lat', 'lng', 'speed'];
      case 'minimal':
        return ['busId', 'lat', 'lng'];
      default:
        return ['busId', 'lat', 'lng', 'speed', 'heading'];
    }
  }

  getStatusInfo() {
    switch (this.currentMode) {
      case 'online':
        return { label: 'Strong Network', sublabel: `Updating every ${this.updateInterval / 1000}s`, color: 'strong', icon: '🟢' };
      case 'weak':
        return { label: 'Weak Network', sublabel: `Updating every ${this.updateInterval / 1000}s`, color: 'weak', icon: '🟡' };
      case 'offline':
        return { label: 'Offline', sublabel: 'Prediction Mode Active', color: 'offline', icon: '🔴' };
    }
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notifyAllComponents() {
    const event = new CustomEvent('network-mode-changed', {
      detail: { mode: this.currentMode, interval: this.updateInterval, activeMode: this.activeMode }
    });
    window.dispatchEvent(event);
    this.listeners.forEach(fn => fn(this.currentMode));
  }
}

const networkManager = new NetworkManager();
export default networkManager;
