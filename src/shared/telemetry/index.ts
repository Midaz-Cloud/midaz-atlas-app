export { collectKioskTelemetry, type KioskTelemetrySnapshot } from './kioskTelemetry';
export {
  startKioskTelemetryHeartbeat,
  requestKioskHeartbeatNow,
  setKioskTelemetryLanIp,
  setKioskTelemetrySessionMode,
  type StartKioskTelemetryHeartbeatOptions,
} from './kioskTelemetryHeartbeat';
export {
  collectKioskRuntimeHealth,
  formatUptime,
  type KioskRuntimeHealth,
} from './kioskRuntimeHealth';
export {
  loadKioskRuntimeHealthHistory,
  recordKioskRuntimeHealthSample,
  clearKioskRuntimeHealthHistory,
  RUNTIME_HEALTH_MAX_SAMPLES,
} from './kioskRuntimeHealthHistory';
