// One fighter: state machine, physics, hit detection and animation.
import * as THREE from 'three';
import { rt, clamp, hitstop, addShake } from './runtime';
import { SFX } from './audio';
import { glow } from './toon';
import { buildModel, disposeModel } from './models';
import { P0, stance, POSES, poseJump, poseGuard, poseHurt, poseFly, poseLie, poseWin, poseUlt, applyPose } from './poses';
import { burst, ring, bolt, dust, slashFx } from './fx';
import { ARENA, GRAV, MOVES, specialMove, startUlt, gouImpact } from './combat';

export class Fighter {
  constructor(def, idx) {
    this.def = def; this.idx = idx; this.rig = buildModel(def); rt.scene.add(this.rig.root);
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.55 * def.bw, 32), new THREE.MeshBasicMaterial({ color: 0x1a0f22, transparent: true, opacity: 0.4, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2; rt.scene.add(this.shadow);
    this.heavy = Object.assign({}, MOVES.heavy, { pose: def.heavyPose });
    this.energy = 0; this.reset(idx === 0 ? -3 : 3);
  }
  dispose() {
    rt.scene.remove(this.rig.root); rt.scene.remove(this.shadow);
    disposeModel(this.rig); this.shadow.geometry.dispose(); this.shadow.material.dispose();
  }
  reset(x) {
    Object.assign(this, { x, y: 0, vx: 0, vy: 0, facing: x < 0 ? 1 : -1, hp: this.def.hp, lagHp: this.def.hp, state: 'idle', t: 0, move: null,
      hitDone: false, fired: false, stun: 0, invuln: 0, combo: 0, comboShow: 0, visible: true, lying: false, downT: 0, juggle: 0, walkPhase: 0,
      airUsed: false, blink: 2 + Math.random() * 3 });
    this.buffer = {}; this.held = {};
    this.rig.root.rotation.y = this.facing * 1.05;
  }
  actionable() { return this.state === 'idle' || this.state === 'walk' || this.state === 'guard' || this.state === 'jump'; }
  canBeHit() {
    if (this.state === 'ko' || this.state === 'getup' || this.state === 'win' || !this.visible || this.invuln > 0) return false;
    return !(this.state === 'knockdown' && this.lying);
  }
  setInput(h) {
    for (const a of ['light', 'heavy', 'special', 'ult']) if (h[a] && !this.held[a]) this.buffer[a] = 0.2;
    this.held = h;
  }
  startMove(m, air) {
    this.state = 'attack'; this.move = m; this.t = 0; this.hitDone = false; this.fired = false;
    if (!air && this.y <= 0) this.vx = (m.lunge || 0) * this.facing;
    if (air) this.airUsed = true;
  }
  trySpecial() {
    const b = this.buffer;
    if (b.ult > 0 && this.energy >= 100) { b.ult = 0; startUlt(this); return true; }
    if (b.special > 0 && this.energy >= 25) { b.special = 0; this.energy -= 25; this.startMove(specialMove(this.def)); SFX.special(); return true; }
    return false;
  }
  tryActions(air) {
    const b = this.buffer;
    if (!air && this.trySpecial()) return true;
    if (air && this.airUsed) return false;
    if (b.heavy > 0) { b.heavy = 0; this.startMove(air ? MOVES.airHeavy : this.heavy, air); return true; }
    if (b.light > 0) { b.light = 0; this.startMove(air ? MOVES.airLight : MOVES.jab1, air); return true; }
    return false;
  }
  update(dt, opp) {
    if (dt <= 0) return;
    const inp = this.held; this.t += dt; this.invuln = Math.max(0, this.invuln - dt);
    for (const k in this.buffer) this.buffer[k] -= dt;
    const grounded = this.y <= 0;
    const toward = Math.sign(opp.x - this.x) || this.facing;
    switch (this.state) {
      case 'idle': case 'walk': case 'guard': {
        if (grounded) this.facing = toward;
        if (this.tryActions(false)) break;
        const d = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
        if (inp.up && grounded) {
          this.vy = 12.5 * this.def.jump; this.vx = d * this.def.speed * 0.9; this.y = 0.001; this.state = 'jump'; this.t = 0; this.airUsed = false;
          SFX.jump(); dust(this.x, 4); break;
        }
        if (inp.down) { this.state = 'guard'; this.vx = 0; break; }
        if (d) { this.vx = d * this.def.speed * (d === this.facing ? 1 : 0.72); this.state = 'walk'; this.walkPhase += dt * 11 * d * this.facing; }
        else { this.vx = 0; this.state = 'idle'; }
        break;
      }
      case 'jump': this.tryActions(true); break;
      case 'attack': this.updateAttack(dt, opp); break;
      case 'hitstun': case 'blockstun':
        this.stun -= dt; if (grounded) this.vx *= Math.exp(-9 * dt);
        if (this.stun <= 0 && grounded) this.state = this.state === 'blockstun' && inp.down ? 'guard' : 'idle';
        break;
      case 'knockdown':
        if (this.lying) { this.vx *= Math.exp(-10 * dt); this.downT -= dt; if (this.downT <= 0) { this.state = 'getup'; this.t = 0; this.lying = false; this.invuln = 0.45; } }
        break;
      case 'getup': if (this.t > 0.32) this.state = 'idle'; break;
      case 'ko': if (this.y <= 0) this.vx *= Math.exp(-6 * dt); break;
      case 'win': this.vx = 0; break;
    }
    const airborne = this.y > 0 || this.vy > 0;
    if (airborne) { this.vy += GRAV * dt; this.y += this.vy * dt; }
    this.x += this.vx * dt;
    if (airborne && this.y <= 0) { this.y = 0; this.land(opp); }
    this.x = clamp(this.x, -ARENA, ARENA);
  }
  land(opp) {
    this.vy = 0; this.juggle = 0; this.airUsed = false;
    switch (this.state) {
      case 'jump': this.state = 'idle'; this.vx = 0; dust(this.x, 5); break;
      case 'attack': if (this.move && this.move.air) { this.state = 'idle'; this.vx = 0; this.move = null; } break;
      case 'knockdown': this.lying = true; this.downT = 0.75; this.vx *= 0.4; dust(this.x, 12); addShake(0.15); SFX.thud(); break;
      case 'ko': this.vx *= 0.4; dust(this.x, 14); SFX.thud(); break;
      case 'ultLeap': gouImpact(this, opp); break;
      default: break;
    }
  }
  phaseOf() {
    const m = this.move, t = this.t;
    if (t < m.startup) return 'w';
    if (t < m.startup + m.active + m.recovery * 0.5) return 'a';
    return 'r';
  }
  updateAttack(dt, opp) {
    const m = this.move, t = this.t, end = m.startup + m.active + m.recovery;
    if (m.teleport && !this.fired) { if (t > 0.05) this.visible = false; this.invuln = Math.max(this.invuln, 0.06); }
    if (!this.fired && t >= m.startup) {
      this.fired = true;
      if (m.teleport) this.teleport(opp);
      if (m.fire) m.fire(this, opp);
      if (m.arcBig) slashFx(this, true);
      if (!m.noHit) { SFX.swing(); if (this.def.weapon === 'sword' || m.pose === 'slash') slashFx(this, m === this.heavy); }
    }
    if (!m.noHit && !this.hitDone && t >= m.startup && t < m.startup + m.active) this.checkHit(opp, m);
    if (t >= m.startup) {
      const b = this.buffer;
      if (m.cancel && this.hitDone && this.trySpecial()) return;
      if (m.next && b.light > 0 && t >= m.startup + m.active * 0.5) { b.light = 0; this.startMove(MOVES[m.next]); return; }
      if (m.toHeavy && this.hitDone && b.heavy > 0) { b.heavy = 0; this.startMove(this.heavy); return; }
    }
    if (this.y <= 0 && !m.air) this.vx *= Math.exp(-8 * dt);
    if (t >= end) { this.move = null; this.state = this.y > 0 ? 'jump' : 'idle'; }
  }
  teleport(opp) {
    const from = this.x, side = Math.sign(opp.x - this.x) || 1;
    let nx = opp.x + side * 1.05;
    if (Math.abs(nx) > ARENA) nx = opp.x - side * 1.05;
    burst(from, 1.1, 0, 0xffe14a, 10, 5, 0.07, 0.3, 0);
    this.x = nx; this.facing = Math.sign(opp.x - nx) || -side; this.visible = true; this.y = 0;
    bolt(nx, 0xffe14a); SFX.zap();
  }
  checkHit(opp, m) {
    const dx = (opp.x - this.x) * this.facing, dy = opp.y - this.y;
    const reach = m.range * this.def.reach * this.def.scale;
    if (dx > -0.4 && dx < reach && dy > -1.5 && dy < 1.6 && opp.canBeHit()) { this.hitDone = true; opp.receive(this, m, this.facing); }
  }
  receive(att, m, dir) {
    const sc = this.def.scale;
    const px = this.x - dir * 0.25, py = this.y + 1.25 * sc, pz = 0.4;
    const blocking = (this.state === 'guard' || this.state === 'blockstun') && this.y <= 0;
    if (blocking) {
      const chip = Math.round((m.dmg || 0) * (m.chip != null ? m.chip : 0.1));
      this.hp = Math.max(1, this.hp - chip);
      this.state = 'blockstun'; this.stun = (m.stun || 0.3) * 0.75; this.vx = dir * ((m.kb || 1) * 0.7 + 2.2);
      this.energy = Math.min(100, this.energy + 3); att.energy = Math.min(100, att.energy + 2);
      burst(px, py, pz, 0x9ad8ff, 6, 5, 0.07, 0.25); ring(px, py, pz, 0x9ad8ff, 0.2, 0.9, 0.18);
      SFX.block(); hitstop(0.045); return;
    }
    const scale = Math.max(0.35, 1 - att.combo * 0.08);
    const dmg = Math.max(1, Math.round((m.dmg || 0) * att.def.power * scale));
    this.hp = Math.max(0, this.hp - dmg);
    att.combo++;
    att.energy = Math.min(100, att.energy + (m.energy != null ? m.energy : 6));
    this.energy = Math.min(100, this.energy + dmg * 0.06);
    const heavy = (m.hs || 0.06) >= 0.09;
    burst(px, py, pz, att.def.pal.accent, heavy ? 14 : 8, heavy ? 9 : 6, heavy ? 0.11 : 0.08, 0.35);
    burst(px, py, pz, 0xffffff, 4, 5, 0.05, 0.2);
    ring(px, py, pz, 0xffffff, 0.2, heavy ? 1.7 : 1.0, 0.2);
    SFX.hit(heavy); hitstop(m.hs || 0.06); addShake(heavy ? 0.35 : 0.14);
    this.move = null; this.visible = true; this.t = 0;
    if (this.hp <= 0) {
      this.state = 'ko'; this.vy = 8.5; this.vx = dir * 6; this.y = Math.max(this.y, 0.001); this.lying = false;
      rt.onKO?.(att, this); return;
    }
    const air = this.y > 0.05;
    if (m.knock || m.launch || air) {
      this.state = 'knockdown'; this.lying = false; this.juggle++;
      this.vy = m.launch || (air ? 5.5 : 6.5);
      if (this.juggle > 3 && !m.ult) { this.vy *= 0.6; this.invuln = 0.6; }
      this.vx = dir * Math.max(2.5, (m.kb || 2) * 0.9); this.y = Math.max(this.y, 0.001);
    } else { this.state = 'hitstun'; this.stun = m.stun || 0.3; this.vx = dir * (m.kb || 1.5) * 1.3; }
  }
  poseTarget() {
    const time = rt.game.time;
    const p = stance(P0(), time + this.idx);
    switch (this.state) {
      case 'walk': {
        const s = Math.sin(this.walkPhase);
        p.lHip = [-0.25 + s * 0.55, 0, 0.06]; p.rHip = [-0.05 - s * 0.55, 0, -0.06];
        p.lKnee = [0.35 + Math.max(0, -s) * 0.9, 0, 0]; p.rKnee = [0.35 + Math.max(0, s) * 0.9, 0, 0];
        p.hy = -0.06 + Math.abs(Math.cos(this.walkPhase)) * 0.03; break;
      }
      case 'jump': poseJump(p); break;
      case 'guard': case 'getup': poseGuard(p); break;
      case 'blockstun': poseGuard(p); p.chest = [0.05, 0.1, 0]; break;
      case 'attack': if (this.move && POSES[this.move.pose]) { const ph = this.phaseOf(); if (ph !== 'r') POSES[this.move.pose](p, ph, this); } break;
      case 'hitstun': poseHurt(p); break;
      case 'knockdown': if (this.lying) poseLie(p); else poseFly(p); break;
      case 'ko': if (this.y > 0.05) poseFly(p); else poseLie(p); break;
      case 'win': poseWin(p, time); break;
      case 'ultCast': poseUlt(p, time); break;
      case 'ultLeap': POSES.airSmash(p, this.vy > 0 ? 'w' : 'a'); break;
    }
    return p;
  }
  animate(dt) {
    const r = this.rig, game = rt.game;
    const fast = this.state === 'attack' || this.state === 'hitstun' || this.state === 'ultCast' || this.state === 'blockstun';
    applyPose(r, this.poseTarget(), 1 - Math.exp(-(fast ? 30 : 13) * dt));
    const tr = this.facing * (this.state === 'ultCast' || this.state === 'win' ? 0.55 : 1.05);
    r.root.rotation.y += (tr - r.root.rotation.y) * (1 - Math.exp(-14 * dt));
    const shaking = game.freeze > 0 && (this.state === 'hitstun' || this.state === 'knockdown' || this.state === 'blockstun' || this.state === 'ko');
    r.root.position.set(this.x + (shaking ? (Math.random() - 0.5) * 0.14 : 0), this.y, 0);
    r.root.visible = this.visible;
    this.shadow.position.set(this.x, 0.02, 0); this.shadow.scale.setScalar(1 / (1 + this.y * 0.35)); this.shadow.visible = this.visible;
    const drag = clamp(this.vx * this.facing * 0.05, -0.5, 0.5) + clamp(-this.vy * 0.02, -0.3, 0.3);
    for (const s of r.sway) {
      s.obj.rotation.x = s.base[0] + Math.sin(game.time * s.f + s.ph) * s.a + drag * s.drag;
      s.obj.rotation.z = s.base[2] + Math.sin(game.time * s.f * 0.7 + s.ph) * s.a * 0.4;
    }
    this.blink -= dt;
    const hurt = this.state === 'ko' || (this.state === 'hitstun' && this.t < 0.3) || (this.state === 'knockdown' && !this.lying);
    r.setFace(hurt ? 'hurt' : this.blink < 0.09 ? 'blink' : 'open');
    if (this.blink < 0) this.blink = 2 + Math.random() * 3;
    if (this.energy >= 100 && game.phase === 'fight' && Math.random() < dt * 22) {
      burst(this.x + (Math.random() - 0.5) * 0.8, this.y + 0.2, (Math.random() - 0.5) * 0.6, this.def.pal.accent, 1, 1, 0.06, 0.6, 5, glow(this.def.pal.accent, 0.9));
    }
  }
}
