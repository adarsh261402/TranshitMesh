// SimulationService — manages network simulation state
class SimulationService {
  constructor(io) {
    this.io = io;
    this.state = global.simulationState || {};
  }

  setMode(busId, mode) {
    if (mode === 'normal') {
      delete this.state[busId];
    } else {
      this.state[busId] = { mode, startedAt: new Date() };
    }
    this.io.emit('simulation:changed', { busId, mode, startedAt: this.state[busId]?.startedAt });
    return this.state;
  }

  getMode(busId) {
    return this.state[busId]?.mode || 'normal';
  }

  getAll() {
    return this.state;
  }

  shouldSuppress(busId) {
    const sim = this.state[busId];
    if (!sim) return false;
    if (sim.mode === 'offline') return true;
    if (sim.mode === 'gps_gap') {
      return (Date.now() - new Date(sim.startedAt).getTime()) < 30000;
    }
    return false;
  }

  isWeak(busId) {
    return this.state[busId]?.mode === 'weak';
  }
}

module.exports = SimulationService;
