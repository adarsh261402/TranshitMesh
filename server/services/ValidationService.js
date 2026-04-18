class ValidationService {
  constructor() {
    // Store recent position reports: busId → [{ lat, lng, peerId, timestamp }]
    this.reportWindows = new Map();
    this.peerViolations = new Map(); // peerId → violation count
    this.WINDOW_MS = 10000; // 10-second window
    this.OUTLIER_THRESHOLD_M = 200; // 200m from median
    this.BLACKLIST_THRESHOLD_M = 500; // 500m = blacklist candidate
    this.BLACKLIST_STRIKES = 3;
  }

  /**
   * Calculate distance between two points in meters
   */
  distanceMeters(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Compute median of array
   */
  median(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Validate a position report against recent consensus
   */
  validatePosition(busId, lat, lng, peerId, timestamp) {
    const now = Date.now();
    const ts = timestamp ? new Date(timestamp).getTime() : now;

    // Clean old entries
    if (!this.reportWindows.has(busId)) {
      this.reportWindows.set(busId, []);
    }

    const window = this.reportWindows.get(busId);
    // Remove entries older than window
    const filtered = window.filter(r => now - r.time < this.WINDOW_MS);
    filtered.push({ lat, lng, peerId, time: ts });
    this.reportWindows.set(busId, filtered);

    // If fewer than 3 reports, accept with lower confidence
    if (filtered.length < 3) {
      return {
        accepted: true,
        consensusLat: lat,
        consensusLng: lng,
        confidence: 50 + filtered.length * 10,
        reportCount: filtered.length
      };
    }

    // Compute median position
    const medLat = this.median(filtered.map(r => r.lat));
    const medLng = this.median(filtered.map(r => r.lng));

    // Check if this report is an outlier
    const distFromMedian = this.distanceMeters(lat, lng, medLat, medLng);

    if (distFromMedian > this.BLACKLIST_THRESHOLD_M) {
      // Increment violations
      const violations = (this.peerViolations.get(peerId) || 0) + 1;
      this.peerViolations.set(peerId, violations);

      if (violations >= this.BLACKLIST_STRIKES) {
        return {
          accepted: false,
          consensusLat: medLat,
          consensusLng: medLng,
          confidence: 0,
          reason: 'peer_blacklisted',
          reportCount: filtered.length
        };
      }

      return {
        accepted: false,
        consensusLat: medLat,
        consensusLng: medLng,
        confidence: 30,
        reason: 'outlier_rejected',
        distanceFromConsensus: Math.round(distFromMedian),
        reportCount: filtered.length
      };
    }

    // Filter out outliers for consensus
    const validReports = filtered.filter(r => {
      const d = this.distanceMeters(r.lat, r.lng, medLat, medLng);
      return d <= this.OUTLIER_THRESHOLD_M;
    });

    const consensusLat = validReports.reduce((s, r) => s + r.lat, 0) / validReports.length;
    const consensusLng = validReports.reduce((s, r) => s + r.lng, 0) / validReports.length;
    const confidence = Math.min(95, 60 + validReports.length * 8);

    return {
      accepted: true,
      consensusLat: Math.round(consensusLat * 1e6) / 1e6,
      consensusLng: Math.round(consensusLng * 1e6) / 1e6,
      confidence,
      reportCount: validReports.length
    };
  }
}

module.exports = ValidationService;
