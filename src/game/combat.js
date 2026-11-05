// Move data, projectiles and ultimates.
import * as THREE from 'three';
import { rt, clamp, hexCss, schedule, hitstop, addShake } from './runtime';
import { SFX } from './audio';
import { G, part, basic, glow } from './toon';
import { burst, ring, bolt, icePillars, dust, shadowSpikes, petalStorm, streak, gSph, gCone, gShard, gRock } from './fx';

export const ARENA = 9.5, GRAV = -38;

export const MOVES = {
  jab1: { pose: 'jab', startup: 0.06, active: 0.07, recovery: 0.14, dmg: 40, range: 1.3, kb: 1.2, stun: 0.32, hs: 0.05, energy: 6, next: 'jab2', toHeavy: true, cancel: true, lunge: 1.6 },
  jab2: { pose: 'jab2', startup: 0.06, active: 0.07, recovery: 0.15, dmg: 45, range: 1.35, kb: 1.4, stun: 0.34, hs: 0.05, energy: 6, next: 'upper', toHeavy: true, cancel: true, lunge: 1.6 },
  upper: { pose: 'upper', startup: 0.1, active: 0.1, recovery: 0.3, dmg: 75, range: 1.4, kb: 3.5, launch: 9, stun: 0.6, hs: 0.09, energy: 10, cancel: true, knock: true, lunge: 2.2 },
  heavy: { pose: 'kick', startup: 0.17, active: 0.1, recovery: 0.28, dmg: 90, range: 1.65, kb: 6, stun: 0.48, hs: 0.1, energy: 12, cancel: true, lunge: 2.6 },
  airLight: { pose: 'airKick', startup: 0.06, active: 0.15, recovery: 0.12, dmg: 50, range: 1.35, kb: 2, stun: 0.35, hs: 0.06, energy: 6, air: true },
  airHeavy: { pose: 'airSmash', startup: 0.12, active: 0.15, recovery: 0.2, dmg: 75, range: 1.5, kb: 3, stun: 0.5, hs: 0.09, energy: 10, air: true, knock: true },
};

export function specialMove(def) {
  switch (def.special) {
    case 'fireball': return { pose: 'cast', startup: 0.2, active: 0.05, recovery: 0.3, noHit: true, fire: fireFireball };
    case 'ice': return { pose: 'cast', startup: 0.18, active: 0.05, recovery: 0.32, noHit: true, fire: fireIce };
    case 'flash': return { pose: 'dash', startup: 0.2, active: 0.1, recovery: 0.32, dmg: 85, range: 1.6, kb: 4, stun: 0.5, hs: 0.1, energy: 0, knock: true, launch: 7, teleport: true };
    case 'quake': return { pose: 'slam', startup: 0.26, active: 0.05, recovery: 0.36, noHit: true, fire: fireQuake };
    case 'gale': return { pose: 'cast', startup: 0.2, active: 0.05, recovery: 0.32, noHit: true, fire: fireGale };
    case 'shade': return { pose: 'thrust', startup: 0.22, active: 0.05, recovery: 0.4, noHit: true, fire: fireShade };
  }
}

/* ---------- projectiles ---------- */
function projMesh(kind, f) {
  const g = G();
  if (kind === 'fire' || kind === 'bigfire') {
    const o = new THREE.Mesh(gSph, glow(0xff5a1f, 0.85)); o.scale.setScalar(0.42);
    const i = new THREE.Mesh(gSph, basic(0xffe48a)); i.scale.setScalar(0.24);
    const tail = new THREE.Mesh(gCone, glow(0xff8a2a, 0.7)); tail.scale.set(0.34, 0.95, 0.34);
    tail.rotation.z = f.facing > 0 ? Math.PI / 2 : -Math.PI / 2; tail.position.x = -f.facing * 0.55;
    g.add(o, i, tail);
    if (kind === 'bigfire') g.scale.setScalar(2.6);
  } else if (kind === 'ice') {
    const m = part(gShard, 0xd8f6ff, { w: 0.7 }); m.rotation.z = -f.facing * Math.PI / 2; g.add(m);
    const gl = new THREE.Mesh(gSph, glow(0x5cc8ff, 0.5)); gl.scale.setScalar(0.17); g.add(gl);
  } else if (kind === 'quake') {
    for (let i = 0; i < 3; i++) {
      const m = part(gRock, i === 1 ? 0x8fdc4f : 0x7a5a3a, { w: 1.2 });
      m.position.set((i - 1) * 0.3 * -f.facing, 0.4, (i - 1) * 0.18); m.scale.setScalar(i === 1 ? 1.2 : 0.8); m.rotation.set(i, i * 2, 0);
      g.add(m);
    }
  } else if (kind === 'gale') {
    const sw = G(); g.add(sw);
    [[0.55, 0.0, 0xffffff, 0.35], [0.42, 0.35, 0xff8fbf, 0.5]].forEach(([r, y, c, o]) => {
      const m = new THREE.Mesh(gCone, glow(c, o)); m.scale.set(r, 1.5, r); m.rotation.x = Math.PI; m.position.y = y; sw.add(m);
    });
    for (let i = 0; i < 10; i++) {
      const pt = new THREE.Mesh(gSph, basic(i % 2 ? 0xffffff : 0xff8fbf)); pt.scale.set(0.07, 0.04, 0.02);
      const a = i * 2.4, h = -0.6 + (i / 10) * 1.3, r = 0.2 + (h + 0.6) * 0.3;
      pt.position.set(Math.cos(a) * r, h, Math.sin(a) * r); sw.add(pt);
    }
  }
  return g;
}
export function makeProj(o) {
  const p = Object.assign({ hit: false, vy: 0, life: 1.6, clash: true, ground: false, pierce: false, t: 0 }, o);
  p.mesh = projMesh(p.kind, p.owner); p.mesh.position.set(p.x, p.y, 0); rt.scene.add(p.mesh);
  rt.game.projs.push(p); return p;
}
export function killProj(p) { p.dead = true; rt.scene.remove(p.mesh); }

function fireFireball(f) {
  const s = f.def.scale;
  makeProj({ owner: f, kind: 'fire', x: f.x + f.facing * 0.9, y: f.y + 1.25 * s, vx: f.facing * 10.5, r: 0.38, life: 1.6,
    move: { dmg: 80, kb: 3, stun: 0.45, hs: 0.08, energy: 8 } });
  burst(f.x + f.facing * 0.9, f.y + 1.25 * s, 0.2, 0xffb03a, 8, 4, 0.08, 0.3, 0);
}
function fireIce(f) {
  const s = f.def.scale; SFX.ice();
  [-0.25, 0, 0.25].forEach((a, i) => makeProj({ owner: f, kind: 'ice', x: f.x + f.facing * 0.8, y: f.y + (1.05 + i * 0.25) * s, vx: f.facing * 13, vy: a * 3, r: 0.2, life: 1.2,
    move: { dmg: 33, kb: 1.4, stun: 0.3, hs: 0.04, energy: 4 } }));
}
function fireGale(f) {
  const s = f.def.scale; SFX.swing();
  makeProj({ owner: f, kind: 'gale', x: f.x + f.facing * 0.9, y: 0.85 * s, vx: f.facing * 7.5, r: 0.5, life: 1.5,
    move: { dmg: 75, kb: 1.5, launch: 9, knock: true, stun: 0.5, hs: 0.08, energy: 8 } });
  burst(f.x + f.facing * 0.9, 0.9 * s, 0.2, 0xffa8c8, 8, 4, 0.06, 0.35, 0);
}
function fireShade(f, o) {
  const X = clamp(f.x + f.facing * 3.1, -ARENA, ARENA), col = f.def.pal.accent;
  ring(X, 0.05, 0, col, 0.2, 1.3, 0.3, true); dust(X, 5);
  schedule(0.2, () => {
    shadowSpikes(X, col); SFX.thud(); SFX.zap(); addShake(0.2);
    if (Math.abs(o.x - X) < 1.1 && o.y < 1.8 && o.canBeHit()) o.receive(f, { dmg: 95, kb: 2, launch: 10, knock: true, stun: 0.5, hs: 0.1, energy: 8 }, Math.sign(o.x - f.x) || f.facing);
  });
}
function fireQuake(f) {
  addShake(0.25); dust(f.x + f.facing * 0.8, 14); SFX.thud();
  ring(f.x + f.facing * 0.8, 0.05, 0, 0x8fdc4f, 0.2, 2.2, 0.35, true);
  makeProj({ owner: f, kind: 'quake', x: f.x + f.facing * 1.0, y: 0.35, vx: f.facing * 8.5, r: 0.45, life: 1.3, ground: true,
    move: { dmg: 90, kb: 3, launch: 7, knock: true, stun: 0.5, hs: 0.1, energy: 8 } });
}

export function updateProjs(dt) {
  const game = rt.game;
  for (const p of game.projs) {
    if (p.dead) continue;
    p.t += dt; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
    p.mesh.position.set(p.x, p.y, 0);
    if (p.kind === 'fire' || p.kind === 'bigfire') {
      p.mesh.children[0].scale.setScalar(0.42 + Math.sin(p.t * 40) * 0.04);
      const big = p.kind === 'bigfire';
      if (Math.random() < (big ? 1 : 0.6)) burst(p.x - Math.sign(p.vx) * 0.3, p.y + (Math.random() - 0.5) * (big ? 1.6 : 0.4), 0, Math.random() < 0.5 ? 0xff7a2a : 0xffd04a, big ? 3 : 1, 2, big ? 0.22 : 0.08, 0.35, 2);
    } else if (p.kind === 'ice') { p.mesh.rotation.x += dt * 14; }
    else if (p.kind === 'gale') {
      p.mesh.children[0].rotation.y += dt * 18;
      if (Math.random() < 0.4) burst(p.x, p.y + (Math.random() - 0.3), 0, Math.random() < 0.5 ? 0xffa8c8 : 0xffffff, 1, 2, 0.05, 0.4, 1);
    }
    else if (p.kind === 'quake') {
      p.mesh.children.forEach((c, i) => { c.scale.y = (i === 1 ? 1.2 : 0.8) * (0.6 + Math.abs(Math.sin(p.t * 18 + i)) * 0.6); });
      if (Math.random() < 0.5) dust(p.x, 1);
    }
    if (p.life <= 0 || Math.abs(p.x) > ARENA + 3) { killProj(p); continue; }
    const tgt = game.fighters[1 - p.owner.idx];
    if (!p.hit && tgt && tgt.canBeHit()) {
      const sc = tgt.def.scale;
      if (Math.abs(tgt.x - p.x) < p.r + 0.35 * tgt.def.bw && p.y + p.r > tgt.y && p.y - p.r < tgt.y + 2.05 * sc && (!p.ground || tgt.y < 0.6)) {
        tgt.receive(p.owner, p.move, Math.sign(p.vx));
        p.hit = true;
        if (!p.pierce) killProj(p);
      }
    }
  }
  for (let i = 0; i < game.projs.length; i++) for (let j = i + 1; j < game.projs.length; j++) {
    const a = game.projs[i], b = game.projs[j];
    if (a.dead || b.dead || a.owner === b.owner || !a.clash || !b.clash) continue;
    if (Math.abs(a.x - b.x) < a.r + b.r && Math.abs(a.y - b.y) < a.r + b.r + 0.3) {
      burst((a.x + b.x) / 2, (a.y + b.y) / 2, 0.2, 0xffffff, 12, 6, 0.08, 0.3); ring((a.x + b.x) / 2, (a.y + b.y) / 2, 0.3, 0xffe9a0, 0.2, 1.6, 0.25);
      SFX.block(); killProj(a); killProj(b);
    }
  }
  game.projs = game.projs.filter(p => !p.dead);
}

/* ---------- ultimates ---------- */
export function startUlt(f) {
  const $ = rt.$;
  f.energy = 0; f.state = 'ultCast'; f.t = 0; f.vx = 0; f.move = null; f.invuln = 0.9; f.visible = true;
  rt.game.cine = { f, t: 0 }; SFX.ult();
  const u = $('#ult'); u.style.setProperty('--uc', hexCss(f.def.pal.accent));
  $('#ultWho').textContent = f.def.en + ' · 궁극기'; $('#ultName').textContent = f.def.ultName;
  u.classList.remove('go'); void u.offsetWidth; u.classList.add('go');
  $('#dim').classList.add('on');
  for (let i = 0; i < 3; i++) ring(f.x, f.y + 1.2, 0.3, f.def.pal.accent, 0.3, 3 + i, 0.6 + i * 0.15);
}
function ultHit(f, o, m, dir) { if (o.canBeHit()) o.receive(f, Object.assign({ chip: 0.25, ult: true, hs: 0.12, energy: 0, stun: 0.6 }, m), dir); }

export function doUlt(f) {
  const o = rt.game.fighters[1 - f.idx], s = f.def.scale;
  switch (f.def.id) {
    case 'kaito':
      f.startMove({ pose: 'slash', startup: 0.08, active: 0.05, recovery: 0.55, noHit: true, arcBig: true, fire: () => {
        makeProj({ owner: f, kind: 'bigfire', x: f.x + f.facing * 1.4, y: f.y + 1.2 * s, vx: f.facing * 15, r: 1.05, life: 1.5, clash: false, pierce: true,
          move: { dmg: 270, kb: 7, launch: 10, knock: true, stun: 0.6, hs: 0.15, chip: 0.25, ult: true, energy: 0 } });
        addShake(0.4); SFX.boom();
      } });
      break;
    case 'yuki': {
      const X = o.x;
      f.startMove({ pose: 'cast', startup: 0.05, active: 0.05, recovery: 0.7, noHit: true });
      ring(X, 0.05, 0, 0x8fe3ff, 0.5, 1.6, 0.4, true); ring(X, 0.05, 0, 0xffffff, 1.6, 1.4, 0.4, true);
      schedule(0.38, () => {
        icePillars(X); SFX.ice(); SFX.boom(); addShake(0.5);
        burst(X, 0.6, 0, 0xd8f6ff, 20, 7, 0.1, 0.6);
        if (Math.abs(o.x - X) < 1.55 && o.y < 2.6) ultHit(f, o, { dmg: 255, kb: 2, launch: 12, knock: true }, Math.sign(o.x - f.x) || f.facing);
      });
      break;
    }
    case 'rai':
      f.startMove({ pose: 'dash', startup: 0.05, active: 0.05, recovery: 0.95, noHit: true });
      for (let i = 0; i < 6; i++) schedule(0.06 + i * 0.13, () => {
        const X = o.x; bolt(X, 0xffe14a); SFX.zap(); addShake(0.25);
        if (Math.abs(o.x - X) < 1.3) ultHit(f, o, i < 5 ? { dmg: 40, kb: 0.6, stun: 0.5, hs: 0.05 } : { dmg: 75, kb: 4, launch: 10, knock: true }, Math.sign(o.x - f.x) || f.facing);
      });
      break;
    case 'hana': {
      f.startMove({ pose: 'cast', startup: 0.05, active: 0.05, recovery: 1.0, noHit: true });
      const X = o.x;
      petalStorm(X, 1.15, 1.25); SFX.swing();
      for (let i = 0; i < 6; i++) schedule(0.12 + i * 0.13, () => {
        SFX.swing(); burst(X, 1 + Math.random() * 1.4, 0.3, i % 2 ? 0xffffff : 0xff8fbf, 6, 5, 0.06, 0.35, 0);
        if (i === 5) { SFX.boom(); addShake(0.4); ring(X, 1.2, 0.3, 0xff8fbf, 0.3, 2.6, 0.4); }
        if (Math.abs(o.x - X) < 1.5 && o.y < 3) ultHit(f, o, i < 5 ? { dmg: 36, kb: 0.15, stun: 0.5, hs: 0.04 } : { dmg: 95, kb: 3, launch: 13, knock: true }, Math.sign(o.x - f.x) || f.facing);
      });
      break;
    }
    case 'ren':
      f.startMove({ pose: 'dash', startup: 0.22, active: 0.05, recovery: 0.9, noHit: true, fire: () => {
        const dir = Math.sign(o.x - f.x) || f.facing, from = f.x;
        let tx = o.x + dir * 1.8;
        if (Math.abs(tx) > ARENA - 0.2) tx = o.x - dir * 1.1;
        const caught = o.canBeHit() && o.y < 2.4;
        f.x = tx; f.facing = Math.sign(o.x - tx) || -dir;
        streak(from, tx, f.y + 1.15 * s, f.def.pal.accent); SFX.zap(); addShake(0.3);
        if (!caught) return;
        ultHit(f, o, { dmg: 30, kb: 0, stun: 1.2, hs: 0.06 }, dir);
        for (let i = 0; i < 3; i++) schedule(0.42 + i * 0.09, () => {
          const y = o.y + 1.1 * o.def.scale; burst(o.x, y, 0.3, f.def.pal.accent, 6, 5, 0.06, 0.25, 0); SFX.hit(false);
          ultHit(f, o, { dmg: 40, kb: 0.1, stun: 0.8, hs: 0.04 }, dir);
        });
        schedule(0.78, () => {
          const y = o.y + 1.1 * o.def.scale;
          ring(o.x, y, 0.3, f.def.pal.accent, 0.3, 3, 0.45); ring(o.x, y, 0.3, 0xffffff, 0.2, 2, 0.3);
          burst(o.x, y, 0.3, 0x2a1d44, 16, 8, 0.1, 0.5, -4); SFX.boom(); addShake(0.5);
          ultHit(f, o, { dmg: 140, kb: 5, launch: 11, knock: true, hs: 0.16 }, dir);
        });
      } });
      break;
    case 'gou':
      f.state = 'ultLeap'; f.t = 0; f.y = 0.001; f.vy = 14.25; f.vx = clamp((o.x - f.x) / 0.75, -14, 14);
      SFX.jump(); dust(f.x, 12);
      break;
  }
}

export function gouImpact(f, o) {
  f.vx = 0; addShake(0.8); SFX.boom(); hitstop(0.08);
  ring(f.x, 0.05, 0, 0x8fdc4f, 0.4, 4.2, 0.5, true); ring(f.x, 0.05, 0, 0xffffff, 0.2, 3, 0.35, true);
  burst(f.x, 0.3, 0, 0x7a5a3a, 22, 9, 0.14, 0.7, -14); dust(f.x, 18);
  if (Math.abs(o.x - f.x) < 2.8 && o.y < 1.3) ultHit(f, o, { dmg: 290, kb: 6, launch: 11, knock: true, hs: 0.16 }, Math.sign(o.x - f.x) || f.facing);
  f.startMove({ pose: 'slam', startup: 0, active: 0.05, recovery: 0.5, noHit: true });
  f.fired = true;
}
