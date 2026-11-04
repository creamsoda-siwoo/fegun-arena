// CPU opponent: re-decides every few hundred ms depending on difficulty.
import { rt } from './runtime';

export class AI {
  constructor(f, o, lv) { this.f = f; this.o = o; this.lv = lv; this.tm = 0.3; this.hold = {}; this.taps = {}; this.mash = 0; }
  tap(k) { this.taps[k] = 0.07; }
  think(dt) {
    this.tm -= dt;
    for (const k in this.taps) this.taps[k] -= dt;
    if (this.tm <= 0) { this.tm = [0.34, 0.2, 0.11][this.lv] + Math.random() * 0.08; this.decide(); }
    const out = Object.assign({}, this.hold);
    for (const k in this.taps) if (this.taps[k] > 0) out[k] = true;
    return out;
  }
  decide() {
    const f = this.f, o = this.o, L = this.lv, R = Math.random;
    this.hold = {};
    const dx = o.x - f.x, dist = Math.abs(dx), fwd = dx > 0 ? 'right' : 'left', back = dx > 0 ? 'left' : 'right';
    if (f.state === 'attack') {
      if (this.mash > 0 && f.move && f.move.next) { this.tap('light'); this.mash--; }
      else if (f.hitDone && f.energy >= 100 && R() < [0.1, 0.4, 0.8][L]) this.tap('ult');
      else if (f.hitDone && f.energy >= 25 && R() < [0.1, 0.3, 0.6][L]) this.tap('special');
      return;
    }
    if (f.state === 'jump') { if (dist < 1.9 && f.vy < 3) this.tap(R() < 0.5 ? 'light' : 'heavy'); return; }
    if (!f.actionable()) return;
    const threat = rt.game.projs.find(p => p.owner === o && Math.sign(f.x - p.x) === Math.sign(p.vx) && Math.abs(p.x - f.x) < 4.5);
    if (threat && R() < [0.25, 0.6, 0.88][L]) {
      if (threat.ground || R() < 0.4) { this.hold.up = true; this.hold[fwd] = true; } else this.hold.down = true;
      return;
    }
    if (((o.state === 'attack' && o.move && !o.move.noHit) || o.state === 'ultLeap') && dist < 2.8 && R() < [0.15, 0.45, 0.75][L]) { this.hold.down = true; this.tm = 0.3; return; }
    if (o.state === 'knockdown' || o.state === 'getup') { if (dist < 2) this.hold[back] = R() < 0.5; return; }
    if (f.energy >= 100 && R() < [0.15, 0.35, 0.6][L]) { this.tap('ult'); return; }
    if (dist > 3.2) {
      const r = R();
      if (f.energy >= 25 && r < [0.12, 0.22, 0.3][L]) this.tap('special');
      else if (r < 0.42 && R() < 0.25) { this.hold.up = true; this.hold[fwd] = true; }
      else this.hold[fwd] = true;
      return;
    }
    if (dist > 1.6) {
      const r = R();
      if (r < 0.5) this.hold[fwd] = true;
      else if (r < 0.65) this.tap('heavy');
      else if (r < 0.78) { this.hold.up = true; this.hold[fwd] = true; }
      else if (r < 0.9) this.hold.down = true;
      else this.hold[back] = true;
      return;
    }
    const r = R();
    if (r < 0.5) { this.tap('light'); this.mash = [0, 1, 2][L] + (R() < 0.5 ? 1 : 0); }
    else if (r < 0.7) this.tap('heavy');
    else if (r < 0.78 && f.energy >= 25 && f.def.special !== 'fireball') this.tap('special');
    else if (r < 0.9) this.hold.down = true;
    else this.hold[back] = true;
  }
}
