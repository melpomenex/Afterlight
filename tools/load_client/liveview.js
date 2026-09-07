/**
 * LiveView transport placeholder for P10 load counts.
 *
 * runtime.md requires counting LiveView + Channels sockets in soak scenarios.
 * Afterlight has no LiveView surface mounted yet (ADR-001: island around
 * Three.js). This module documents the contract and returns zero sessions
 * until a LiveView endpoint ships; the scenario runner records the count
 * honestly in benchmark reports.
 */

export async function connectLiveViewSessions(_config) {
  return {
    transport: 'liveview',
    connected: 0,
    note: 'LiveView not mounted — Channels-only soak until UI migration lands',
  };
}
