class SimulationService {
  constructor(io) {
    this.io = io;
    this.simulations = new Map(); // busId → { mode, startTime }
  }

  setSimulation(busId, mode) {
    this.simulations.set(busId, {
      mode, // 'weak', 'offline', 'gps_gap'
      startTime: Date.now()
    });

    // Notify clients about simulation state
    this.io.emit('simulation:state', { busId, mode, active: true });
  }

  clearSimulation(busId) {
    this.simulations.delete(busId);
    this.io.emit('simulation:state', { busId, mode: 'normal', active: false });
  }

  getSimulationState(busId) {
    return this.simulations.get(busId) || null;
  }

  getAllSimulations() {
    const result = {};
    this.simulations.forEach((val, key) => {
      result[key] = val;
    });
    return result;
  }
}

module.exports = SimulationService;
