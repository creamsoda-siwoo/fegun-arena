// Shared per-session references. startGame() fills these; dispose clears them.
export const rt = { scene: null, camera: null, game: null, $: null, onKO: null };

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const hexCss = c => '#' + c.toString(16).padStart(6, '0');

export function newGameState() {
  return {
    phase: 'menu', prevPhase: null, mode: 'cpu', level: 1, picks: [0, 1], picking: 0, fighters: [], ctrl: [null, null],
    wins: [0, 0], round: 1, timer: 99, timeScale: 1, slowT: 0, freeze: 0, cine: null, events: [], later: [], projs: [], fx: [], shake: 0, time: 0,
  };
}

export const schedule = (t, fn) => rt.game.events.push({ t, fn }); // sim time
export const later = (t, fn) => rt.game.later.push({ t, fn });     // real time
export const hitstop = s => { rt.game.freeze = Math.max(rt.game.freeze, s); };
export const addShake = s => { rt.game.shake = Math.max(rt.game.shake, s); };
