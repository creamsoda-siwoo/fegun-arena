// Game bootstrap: renderer, input, match flow, menus/HUD, camera and main loop.
// startGame(root) wires everything to the DOM inside `root` and returns a dispose function.
import * as THREE from 'three';
import { rt, clamp, hexCss, newGameState, later } from './runtime';
import { SFX } from './audio';
import { ROSTER } from './roster';
import { glow } from './toon';
import { Fighter } from './fighter';
import { AI } from './ai';
import { buildStage } from './stage';
import { makePortraits } from './portraits';
import { updateProjs, killProj, doUlt, ARENA } from './combat';
import { burst } from './fx';

const ACTIONS = ['left', 'right', 'up', 'down', 'light', 'heavy', 'special', 'ult'];
const KEYMAP = [
  { left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'], light: ['KeyJ'], heavy: ['KeyK'], special: ['KeyL'], ult: ['KeyU', 'KeyI'] },
  { left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'], light: ['Numpad1', 'Comma'], heavy: ['Numpad2', 'Period'], special: ['Numpad3', 'Slash'], ult: ['Numpad0', 'Quote'] },
];

export function startGame(root) {
  const ac = new AbortController();
  const on = (target, ev, fn, opts) => target.addEventListener(ev, fn, { ...opts, signal: ac.signal });
  const $ = s => root.querySelector(s);
  const $$ = s => root.querySelectorAll(s);
  let disposed = false, raf = 0;

  /* ---------- three setup ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  // Adaptive resolution: start at the device ratio (capped lower on touch devices) and
  // step down when frames run long, back up when there is headroom.
  const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  const dprMax = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2), dprMin = Math.min(1, dprMax);
  let dpr = dprMax, frameAvg = 16.7, dprCool = 2;
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x0d0a17);
  $('#stage').appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x8d4277, 40, 175);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.3, 400);
  camera.position.set(0, 2.4, 10);
  scene.add(new THREE.HemisphereLight(0xffe6f2, 0x4a2a5a, 0.62 * Math.PI));
  const sunLight = new THREE.DirectionalLight(0xfff1e0, 0.85 * Math.PI);
  sunLight.position.set(-6, 10, 9); scene.add(sunLight);

  const game = newGameState();
  Object.assign(rt, { scene, camera, game, $ });

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    pausedDirty = true;
  }
  let pausedDirty = true;
  function tuneResolution(ms) {
    frameAvg += (Math.min(ms, 100) - frameAvg) * 0.05;
    dprCool -= ms / 1000;
    if (dprCool > 0) return;
    // >24ms ≈ under ~40fps → drop; holding the display rate (≤18ms) for a while → try one step up.
    let next = dpr, cool = 2;
    if (frameAvg > 24 && dpr > dprMin) { next = Math.max(dprMin, dpr - 0.25); cool = 8; }
    else if (frameAvg < 18 && dpr < dprMax) next = Math.min(dprMax, dpr + 0.25);
    if (next !== dpr) { dpr = next; renderer.setPixelRatio(dpr); renderer.setSize(window.innerWidth, window.innerHeight); pausedDirty = true; dprCool = cool; frameAvg = 16.7; }
  }
  on(window, 'resize', resize); resize();

  const updateStage = buildStage(scene);
  makePortraits();

  /* ---------- input ---------- */
  const keys = new Set(), touch = {};
  on(window, 'keydown', e => {
    SFX.init();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Slash', 'Quote'].includes(e.code) && game.phase !== 'menu') e.preventDefault();
    if (!e.repeat && (e.code === 'Escape' || e.code === 'KeyP')) togglePause();
    keys.add(e.code);
  });
  on(window, 'keyup', e => keys.delete(e.code));
  on(window, 'blur', () => { keys.clear(); for (const k in touch) touch[k] = false; });
  on(window, 'pointerdown', () => SFX.init());
  function readHuman(idx) {
    const maps = game.mode === 'cpu' && idx === 0 ? KEYMAP : [KEYMAP[idx]];
    const out = {};
    for (const a of ACTIONS) out[a] = maps.some(m => m[a].some(c => keys.has(c))) || (idx === 0 && !!touch[a]);
    return out;
  }
  $$('#touch .tb').forEach(b => {
    const k = b.dataset.k;
    const down = e => { e.preventDefault(); touch[k] = true; b.classList.add('on'); SFX.init(); };
    const up = e => { e.preventDefault(); touch[k] = false; b.classList.remove('on'); };
    on(b, 'pointerdown', down); on(b, 'pointerup', up); on(b, 'pointercancel', up); on(b, 'pointerleave', up);
    on(b, 'contextmenu', e => e.preventDefault());
  });
  const isTouch = coarse;
  root.classList.toggle('is-touch', isTouch);

  /* ---------- flow ---------- */
  function setFighters(i0, i1, x0, x1) {
    game.fighters.forEach(f => f.dispose());
    game.fighters = [new Fighter(ROSTER[i0], 0), new Fighter(ROSTER[i1], 1)];
    if (x0 != null) { game.fighters[0].reset(x0); game.fighters[1].reset(x1); }
  }
  function clearWorld() {
    game.projs.forEach(killProj); game.projs = [];
    game.events = []; game.later = []; game.cine = null; game.freeze = 0; game.timeScale = 1; game.slowT = 0;
    $('#dim').classList.remove('on');
  }
  function show(id) { for (const s of ['menu', 'select', 'pause', 'result']) $('#' + s).hidden = s !== id; }
  function announce(text, cls) {
    const a = $('#announce'); a.className = ''; a.textContent = text; void a.offsetWidth; a.className = 'go ' + (cls || '');
  }
  function toMenu() {
    clearWorld(); game.phase = 'menu'; show('menu'); $('#hud').hidden = true; $('#touch').hidden = true;
    setFighters(game.picks[0], game.picks[1], -1.5, 1.5);
  }
  function toSelect() {
    clearWorld(); game.phase = 'select'; show('select'); $('#hud').hidden = true; $('#touch').hidden = true;
    game.picking = 0; renderSelect();
  }
  function startMatch() {
    clearWorld(); show(null);
    setFighters(game.picks[0], game.picks[1]);
    const [a, b] = game.fighters;
    game.ctrl = ['human', game.mode === 'cpu' ? new AI(b, a, game.level) : 'human'];
    game.wins = [0, 0]; game.round = 1;
    for (const f of game.fighters) {
      $('#nm' + f.idx).textContent = f.def.name;
      $('#pf' + f.idx).src = f.def.portrait || '';
    }
    $('#tag1').textContent = game.mode === 'cpu' ? 'CPU' : '2P';
    $('#hud').hidden = false; $('#touch').hidden = !isTouch;
    startRound();
  }
  function startRound() {
    const [a, b] = game.fighters;
    a.reset(-3); b.reset(3);
    game.projs.forEach(killProj); game.projs = []; game.events = [];
    game.timer = 99; game.phase = 'intro'; game.timeScale = 1; game.freeze = 0; game.cine = null;
    announce(game.round >= 3 && game.wins[0] === 1 && game.wins[1] === 1 ? 'FINAL ROUND' : 'ROUND ' + game.round, 'round'); SFX.bell();
    later(1.4, () => { if (game.phase === 'intro') { announce('FIGHT!'); SFX.special(); game.phase = 'fight'; } });
  }
  function koEvent(winner) {
    if (game.phase !== 'fight') return;
    game.phase = 'roundEnd'; game.wins[winner.idx]++;
    game.timeScale = 0.28; game.slowT = 1.3;
    announce('K.O.', 'ko'); SFX.boom(); game.shake = Math.max(game.shake, 0.6);
    later(2.6, () => { if (winner.state !== 'ko') { winner.state = 'win'; winner.t = 0; winner.vx = 0; } });
    later(4.2, nextRound);
  }
  rt.onKO = koEvent;
  function timeOver() {
    game.phase = 'roundEnd';
    const [a, b] = game.fighters, ra = a.hp / a.def.hp, rb = b.hp / b.def.hp;
    announce('TIME OVER');
    let w = null;
    if (Math.abs(ra - rb) > 0.0005) w = ra > rb ? a : b;
    else if (game.round >= 5) w = a;
    if (w) { game.wins[w.idx]++; later(1.6, () => { w.state = 'win'; w.t = 0; }); }
    later(3.6, nextRound);
  }
  function nextRound() {
    const wi = game.wins.findIndex(w => w >= 2);
    if (wi >= 0) return matchEnd(wi);
    game.round++; startRound();
  }
  function matchEnd(wi) {
    game.phase = 'result';
    const f = game.fighters[wi];
    $('#resWho').textContent = (wi === 0 ? '1P' : game.mode === 'cpu' ? 'CPU' : '2P') + ' 승리';
    $('#resImg').src = f.def.portrait || '';
    $('#result').style.setProperty('--wc', hexCss(f.def.pal.accent));
    $('#resName').textContent = f.def.name;
    $('#resQuote').textContent = f.def.quote;
    $('#touch').hidden = true;
    show('result');
  }
  function togglePause() {
    if (game.phase === 'paused') { game.phase = game.prevPhase; show(null); if (isTouch) $('#touch').hidden = false; return; }
    if (game.phase === 'fight' || game.phase === 'intro' || game.phase === 'roundEnd') {
      game.prevPhase = game.phase; game.phase = 'paused'; show('pause'); $('#touch').hidden = true;
      keys.clear(); for (const k in touch) touch[k] = false;
    }
  }

  /* ---------- menu & select ---------- */
  $$('[data-mode]').forEach(b => on(b, 'click', () => { SFX.init(); SFX.pick(); game.mode = b.dataset.mode; toSelect(); }));
  $$('[data-lv]').forEach(b => on(b, 'click', () => {
    game.level = +b.dataset.lv; $$('[data-lv]').forEach(x => x.classList.toggle('on', x === b)); SFX.pick();
  }));
  on($('#selBack'), 'click', toMenu);
  on($('#startBtn'), 'click', () => { SFX.pick(); startMatch(); });
  on($('#resumeBtn'), 'click', togglePause);
  on($('#pauseBtn'), 'click', togglePause);
  on($('#pauseMenuBtn'), 'click', toMenu);
  on($('#rematchBtn'), 'click', startMatch);
  on($('#reselectBtn'), 'click', toSelect);
  on($('#resMenuBtn'), 'click', toMenu);
  [0, 1].forEach(i => on($('#slot' + i), 'click', () => { game.picking = i; renderSelect(); }));

  function buildRoster() {
    const el = $('#roster'); el.innerHTML = '';
    const lbl = ['체력', '파워', '속도'];
    ROSTER.forEach((def, i) => {
      const c = document.createElement('button'); c.className = 'card'; c.id = 'card-' + def.id;
      c.style.setProperty('--c', hexCss(def.pal.accent));
      c.innerHTML = `<div class="pic">${def.portrait ? `<img src="${def.portrait}" alt="${def.name} 초상">` : ''}</div>
        <div class="meta">
          <div class="nm">${def.name}<small>${def.en}</small></div>
          <div class="ti">${def.title}</div>
          <div class="stats">${def.stats.map((v, k) => `<span>${lbl[k]}</span><span class="pips">${[0, 1, 2, 3, 4].map(n => `<i class="${n < v ? 'on' : ''}"></i>`).join('')}</span>`).join('')}</div>
          <div class="moves"><em>필살</em> ${def.specialName} · ${def.specialDesc}<br><em>궁극</em> ${def.ultName} · ${def.ultDesc}</div>
        </div>`;
      on(c, 'click', () => {
        SFX.init(); SFX.pick();
        game.picks[game.picking] = i;
        game.picking = game.picking === 0 ? 1 : game.picking;
        renderSelect(true);
      });
      el.appendChild(c);
    });
  }
  let selDirty = true;
  function renderSelect(changed) {
    const tag2 = game.mode === 'cpu' ? 'CPU' : '2P';
    ROSTER.forEach((def, i) => {
      const c = $('#card-' + def.id);
      c.classList.toggle('p1sel', game.picks[0] === i); c.classList.toggle('p2sel', game.picks[1] === i);
      c.querySelectorAll('.tagP').forEach(t => t.remove());
      if (game.picks[0] === i) c.insertAdjacentHTML('beforeend', '<span class="tagP t1">1P</span>');
      if (game.picks[1] === i) c.insertAdjacentHTML('beforeend', `<span class="tagP t2">${tag2}</span>`);
    });
    [0, 1].forEach(s => {
      const sl = $('#slot' + s), d = ROSTER[game.picks[s]];
      sl.classList.toggle('active', game.picking === s);
      sl.querySelector('img').src = d.portrait || '';
      sl.querySelector('b').textContent = s === 0 ? '1P' : tag2;
      sl.querySelector('span').textContent = d.name;
    });
    $('#selHint').textContent = (game.picking === 0 ? '1P' : tag2) + ' 캐릭터를 고르세요 · 슬롯을 눌러 바꿀 수 있어요';
    $('#startBtn').disabled = false;
    if (changed || selDirty || game.fighters.length === 0 || game.fighters[0].def !== ROSTER[game.picks[0]] || game.fighters[1].def !== ROSTER[game.picks[1]]) {
      setFighters(game.picks[0], game.picks[1], -1.5, 1.5); selDirty = false;
    }
  }

  /* ---------- HUD ---------- */
  const hudEls = [0, 1].map(i => ({ hp: $('#hp' + i), lag: $('#lag' + i), exf: $('#exf' + i), exn: $('#exn' + i), ex: $('#ex' + i), combo: $('#combo' + i), wins: [...$$('#wins' + i + ' i')] }));
  const timerEl = $('#timer'), hudEl = $('#hud'), dimEl = $('#dim');
  // Only touch the DOM when a displayed value actually changes.
  const setW = (el, v) => { if (el._w !== v) { el._w = v; el.style.width = v; } };
  const setT = (el, v) => { if (el._t !== v) { el._t = v; el.textContent = v; } };
  const setC = (el, c, on) => { const k = '_c' + c; if (el[k] !== on) { el[k] = on; el.classList.toggle(c, on); } };
  function updateHud(rdt) {
    game.fighters.forEach((f, i) => {
      const e = hudEls[i], pct = f.hp / f.def.hp;
      if (f.lagHp > f.hp && f.state !== 'hitstun' && f.state !== 'knockdown') f.lagHp = Math.max(f.hp, f.lagHp - f.def.hp * 0.5 * rdt);
      if (f.lagHp < f.hp) f.lagHp = f.hp;
      setW(e.hp, (pct * 100).toFixed(1) + '%');
      setC(e.hp, 'low', pct < 0.25);
      setW(e.lag, (f.lagHp / f.def.hp * 100).toFixed(1) + '%');
      setW(e.exf, f.energy.toFixed(1) + '%');
      setT(e.exn, String(Math.floor(f.energy)));
      setC(e.ex, 'full', f.energy >= 100);
      e.wins.forEach((w, k) => setC(w, 'on', game.wins[i] > k));
      if (f.combo >= 2) { if (f.shownCombo !== f.combo) { e.combo.innerHTML = `${f.combo}<small>HITS</small>`; f.shownCombo = f.combo; } f.comboShow = 1; }
      else f.comboShow = Math.max(0, f.comboShow - rdt);
      setC(e.combo, 'show', f.comboShow > 0);
    });
    const t = Math.max(0, Math.ceil(game.timer));
    setT(timerEl, String(t)); setC(timerEl, 'low', t <= 10);
  }

  /* ---------- camera ---------- */
  const cam = { x: 0, y: 2.4, z: 10, lx: 0, ly: 1.3 };
  function updateCamera(rdt) {
    const fs = game.fighters, aspect = camera.aspect, tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    let tx, ty, tz, lx, ly, rate = 4;
    if (game.phase === 'menu' || game.phase === 'select') {
      const ang = game.time * 0.18;
      tz = Math.max(6.2, (2 + 2.2) / (tanV * aspect)) * (game.phase === 'menu' ? 1 : 1.05);
      tx = Math.sin(ang) * 2.2 + (game.phase === 'menu' && aspect > 1 ? -2.4 : 0); ty = 1.9;
      lx = game.phase === 'menu' && aspect > 1 ? -2.0 : 0; ly = game.phase === 'select' ? 1.6 : 1.3;
    } else if (game.cine) {
      const f = game.cine.f;
      tx = f.x + f.facing * 1.4; ty = f.y + 1.8; tz = 3.6 * Math.max(1, 0.9 / aspect); lx = f.x; ly = f.y + 1.5; rate = 7;
    } else {
      const [a, b] = fs, mid = (a.x + b.x) / 2, spread = Math.abs(a.x - b.x);
      const need = (spread / 2 + 2.4) / (tanV * aspect);
      tz = clamp(Math.max(need, 3.4 / tanV), 7.5, 42);
      ly = 1.25 + Math.max(a.y, b.y) * 0.35; ty = ly + 0.8 + tz * 0.05; tx = mid; lx = mid;
    }
    const k = 1 - Math.exp(-rate * rdt);
    cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k; cam.z += (tz - cam.z) * k; cam.lx += (lx - cam.lx) * k; cam.ly += (ly - cam.ly) * k;
    game.shake = Math.max(0, game.shake - rdt * 1.8);
    const s = game.shake * game.shake * 0.6;
    camera.position.set(cam.x + (Math.random() - 0.5) * s, cam.y + (Math.random() - 0.5) * s, cam.z);
    camera.lookAt(cam.lx, cam.ly, 0);
  }

  /* ---------- main loop ---------- */
  function separate(a, b) {
    if (a.state === 'ko' || b.state === 'ko' || !a.visible || !b.visible) return;
    const dx = b.x - a.x, min = 0.72 * (a.def.bw + b.def.bw) / 2;
    if (Math.abs(dx) < min && Math.abs(a.y - b.y) < 1.6) {
      const push = (min - Math.abs(dx)) / 2, s = dx >= 0 ? 1 : -1;
      a.x -= push * s; b.x += push * s;
    }
    const MAXD = 11, d = Math.abs(b.x - a.x);
    if (d > MAXD) { const over = (d - MAXD) / 2, s = Math.sign(b.x - a.x); a.x += over * s; b.x -= over * s; }
    a.x = clamp(a.x, -ARENA, ARENA); b.x = clamp(b.x, -ARENA, ARENA);
  }
  let last = performance.now();
  function frame(now) {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    const ms = now - last, rdt = Math.min(0.05, Math.max(0, ms / 1000)); last = now;
    if (game.phase === 'paused') { if (pausedDirty) { renderer.render(scene, camera); pausedDirty = false; } return; }
    pausedDirty = true;
    if (ms > 0 && ms < 250) tuneResolution(ms);
    game.time += rdt;
    for (const e of game.later) e.t -= rdt;
    const dueL = game.later.filter(e => e.t <= 0); game.later = game.later.filter(e => e.t > 0); dueL.forEach(e => e.fn());

    if (game.slowT > 0) { game.slowT -= rdt; if (game.slowT <= 0) game.timeScale = 1; }
    const dt = rdt * game.timeScale;
    const fs = game.fighters;
    const sim = game.phase === 'intro' || game.phase === 'fight' || game.phase === 'roundEnd' || game.phase === 'result';

    if (sim && fs.length === 2) {
      fs.forEach((f, i) => {
        let h = {};
        if (game.phase === 'fight') h = game.ctrl[i] === 'human' ? readHuman(i) : game.ctrl[i].think(rdt);
        f.setInput(h);
      });
      let simDt = dt;
      if (game.cine) {
        simDt = 0; game.cine.t += rdt;
        const f = game.cine.f;
        if (Math.random() < 0.7) burst(f.x + (Math.random() - 0.5), f.y + Math.random() * 2, 0.3, f.def.pal.accent, 1, 3, 0.08, 0.5, 4, glow(f.def.pal.accent, 0.9));
        if (game.cine.t >= 1.15) { game.cine = null; dimEl.classList.remove('on'); doUlt(f); }
      } else if (game.freeze > 0) { game.freeze -= rdt; simDt = 0; }
      if (simDt > 0) {
        fs[0].update(simDt, fs[1]); fs[1].update(simDt, fs[0]);
        updateProjs(simDt);
        separate(fs[0], fs[1]);
        for (const e of game.events) e.t -= simDt;
        const due = game.events.filter(e => e.t <= 0); game.events = game.events.filter(e => e.t > 0); due.forEach(e => e.fn());
        fs.forEach((f, i) => { if (f.actionable()) fs[1 - i].combo = 0; });
        if (game.phase === 'fight') { game.timer -= simDt; if (game.timer <= 0) { game.timer = 0; timeOver(); } }
      }
      fs.forEach(f => f.animate(game.cine && game.cine.f === f ? rdt : simDt));
    } else {
      fs.forEach(f => f.animate(rdt));
    }

    game.fx = game.fx.filter(f => f.update(game.cine ? rdt * 0.5 : dt));
    updateStage(rdt, game.time);
    updateCamera(rdt);
    if (!hudEl.hidden && fs.length === 2) updateHud(rdt);
    renderer.render(scene, camera);
  }

  /* ---------- boot ---------- */
  buildRoster();
  toMenu();
  raf = requestAnimationFrame(frame);

  return function dispose() {
    disposed = true;
    cancelAnimationFrame(raf);
    ac.abort();
    game.fighters.forEach(f => f.dispose()); game.fighters = [];
    SFX.close();
    renderer.dispose();
    try { renderer.forceContextLoss(); } catch (e) { /* ignore */ }
    renderer.domElement.remove();
    Object.assign(rt, { scene: null, camera: null, game: null, $: null, onKO: null });
  };
}
