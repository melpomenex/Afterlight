/**
 * Downhill Mayhem host contract
 * (integrate-multiplayer-downhill-mayhem-arcade 0.2 / 5.1). This file is the
 * frozen boundary the Afterlight activity controller compiles against; it has
 * no runtime behavior beyond JSDoc types.
 *
 * @typedef {Object} DownhillMayhemHostOptions
 * @property {import('three').WebGLRenderer} renderer External renderer (required).
 * @property {() => ({width:number,height:number})} [viewport] CSS-pixel viewport provider.
 * @property {HTMLElement} [hudHost] Explicit HUD root; the game never touches another DOM root.
 * @property {{context?: AudioContext|null, destination?: AudioNode|null}} [audio]
 *   Host-owned audio. When `context` is present it is never closed by the game.
 * @property {Object} [params] Quality/settings overrides.
 * @property {Object} courseDocument Canonical course document to render/step.
 * @property {(err: Error) => void} [onFatal] Irrecoverable failure callback.
 * @property {(reason?: string) => void} [onExitRequest] The player asked to leave.
 *
 * @typedef {Object} DownhillMayhemInput
 * @property {(event: KeyboardEvent) => void} handleKeyDown
 * @property {(event: KeyboardEvent) => void} handleKeyUp
 * @property {() => void} neutralize
 *
 * @typedef {Object} DownhillMayhemSession
 * @property {(frame: Object) => void} acceptSnapshot
 * @property {(frame: Object) => void} acceptEvent
 * @property {(frame: Object) => void} acceptResult
 * @property {(muted: boolean) => void} setMuted
 * @property {(reason?: string) => void} requestExit
 * @property {() => {phase:string, mode:string, difficulty:string, raceTime:number, tick:number}} state
 *
 * @typedef {Object} DownhillMayhemHost
 * @property {Promise<void>} ready
 * @property {(opts?: {signal?: AbortSignal|null}) => Promise<void>} prepare
 * @property {(sessionContext?: Object) => void} enter
 * @property {(dt: number, authoritative?: boolean) => void} update
 * @property {() => void} present
 * @property {(width: number, height: number) => void} resize
 * @property {DownhillMayhemInput} input
 * @property {DownhillMayhemSession} session
 * @property {() => void} dispose
 */

export {};
