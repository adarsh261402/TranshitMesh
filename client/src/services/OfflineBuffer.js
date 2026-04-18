import localforage from 'localforage';

// OfflineBuffer — Store-and-forward buffering using IndexedDB via localforage
class OfflineBuffer {
  constructor() {
    this.store = localforage.createInstance({ name: 'transitMesh', storeName: 'offlineBuffer' });
    this.MAX_ENTRIES = 500;
    this._setupListeners();
  }

  _setupListeners() {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', () => this._syncBuffer());
  }

  async addEntry(entry) {
    try {
      let buffer = (await this.store.getItem('buffer')) || [];
      buffer.push({
        ...entry,
        timestamp: entry.timestamp || Date.now()
      });
      // Rolling window cap
      if (buffer.length > this.MAX_ENTRIES) {
        buffer = buffer.slice(buffer.length - this.MAX_ENTRIES);
      }
      await this.store.setItem('buffer', buffer);
      return buffer.length;
    } catch (err) {
      console.error('OfflineBuffer addEntry error:', err);
      return 0;
    }
  }

  async getBufferSize() {
    try {
      const buffer = (await this.store.getItem('buffer')) || [];
      return buffer.length;
    } catch {
      return 0;
    }
  }

  async _syncBuffer() {
    try {
      const buffer = (await this.store.getItem('buffer')) || [];
      if (buffer.length === 0) return;

      const token = localStorage.getItem('tm_token');
      const resp = await fetch('http://localhost:5000/api/sync/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ entries: buffer })
      });

      if (resp.ok) {
        const result = await resp.json();
        await this.store.setItem('buffer', []);
        // Dispatch sync event
        window.dispatchEvent(new CustomEvent('offline-sync', {
          detail: { synced: result.synced }
        }));
        return result.synced;
      }
    } catch (err) {
      console.error('Sync failed:', err);
    }
    return 0;
  }

  async clearBuffer() {
    await this.store.setItem('buffer', []);
  }
}

const offlineBuffer = new OfflineBuffer();
export default offlineBuffer;
