// Short-lived visual effects. Each pushes an updater into rt.game.fx that returns false when done.
import * as THREE from 'three';
import { rt } from './runtime';
import { G, part, basic, glow } from './toon';

const shared = g => { g.userData.shared = true; return g; };
export const gSph = shared(new THREE.SphereGeometry(1, 14, 10));
export const gIco = shared(new THREE.IcosahedronGeometry(1, 0));
export const gCone = shared(new THREE.ConeGeometry(1, 1, 8));
export const gRing = shared(new THREE.RingGeometry(0.86, 1, 48));
export const gCyl = shared(new THREE.CylinderGeometry(1, 1, 1, 8));
export const gShard = shared(new THREE.ConeGeometry(0.09, 0.55, 6));
export const gRock = shared(new THREE.DodecahedronGeometry(0.32, 0));
const gArc = shared(new THREE.TorusGeometry(0.9, 0.06, 6, 28, Math.PI * 0.95));
const gArcBig = shared(new THREE.TorusGeometry(1.3, 0.1, 6, 28, Math.PI * 0.95));

const addFx = update => rt.game.fx.push({ update });

export function burst(x, y, z, color, n, spd, size, life = 0.4, grav = -6, mat) {
  const scene = rt.scene;
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(gIco, mat || basic(color));
    const s = size * (0.5 + Math.random() * 0.8); m.scale.setScalar(s); m.position.set(x, y, z); scene.add(m);
    const a = Math.random() * Math.PI * 2, b = (Math.random() - 0.3) * Math.PI * 0.9, v = spd * (0.35 + Math.random() * 0.8);
    const vel = new THREE.Vector3(Math.cos(a) * Math.cos(b) * v, Math.sin(b) * v, Math.sin(a) * Math.cos(b) * v * 0.6);
    let t = 0; const L = life * (0.6 + Math.random() * 0.6);
    addFx(dt => {
      t += dt; m.position.addScaledVector(vel, dt); vel.y += grav * dt; m.rotation.x += dt * 9; m.rotation.y += dt * 7;
      m.scale.setScalar(Math.max(0.0001, s * (1 - t / L)));
      if (t >= L) { scene.remove(m); return false; } return true;
    });
  }
}

export function ring(x, y, z, color, r0, r1, life, flat) {
  const scene = rt.scene, camera = rt.camera;
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
  const m = new THREE.Mesh(gRing, mat); m.position.set(x, y, z); scene.add(m);
  if (flat) m.rotation.x = -Math.PI / 2;
  let t = 0;
  addFx(dt => {
    t += dt; const k = Math.min(1, t / life), e = 1 - Math.pow(1 - k, 3);
    m.scale.setScalar(r0 + (r1 - r0) * e); mat.opacity = 1 - k;
    if (!flat) m.quaternion.copy(camera.quaternion);
    if (k >= 1) { scene.remove(m); mat.dispose(); return false; } return true;
  });
}

export function slashFx(f, big) {
  const scene = rt.scene;
  const mat = new THREE.MeshBasicMaterial({ color: f.def.pal.accent, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const m = new THREE.Mesh(big ? gArcBig : gArc, mat);
  m.position.set(f.x + f.facing * (big ? 0.9 : 0.7), f.y + 1.15 * f.def.scale, 0.35);
  m.scale.x = f.facing; m.rotation.z = f.facing > 0 ? -0.5 : 0.5; scene.add(m);
  let t = 0;
  addFx(dt => {
    t += dt; const k = t / 0.2; m.rotation.z -= f.facing * dt * 6; m.scale.y = 1 + k * 0.3; mat.opacity = 0.95 * (1 - k);
    if (k >= 1) { scene.remove(m); mat.dispose(); return false; } return true;
  });
}

export function bolt(x, color) {
  const scene = rt.scene, g = G(), mats = [];
  let y = 13, px = x + (Math.random() - 0.5);
  for (let i = 0; i < 7; i++) {
    const ny = y - 13 / 7, nx = i === 6 ? x : x + (Math.random() - 0.5) * 1.4;
    const len = Math.hypot(nx - px, ny - y);
    const mat = new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffffff : color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
    mats.push(mat);
    const seg = new THREE.Mesh(gCyl, mat); seg.scale.set(0.09, len, 0.09);
    seg.position.set((px + nx) / 2, (y + ny) / 2, 0); seg.rotation.z = Math.atan2(-(nx - px), ny - y) + Math.PI;
    g.add(seg); px = nx; y = ny;
  }
  const col = new THREE.Mesh(gCyl, glow(color, 0.25)); col.scale.set(0.6, 13, 0.6); col.position.set(x, 6.5, 0); g.add(col);
  scene.add(g); ring(x, 0.05, 0, color, 0.3, 2.4, 0.35, true);
  let t = 0;
  addFx(dt => {
    t += dt; const o = (1 - t / 0.3) * (Math.random() > 0.3 ? 1 : 0.3);
    mats.forEach(m => { m.opacity = Math.max(0, o); }); col.visible = t < 0.15;
    if (t >= 0.3) { scene.remove(g); mats.forEach(m => m.dispose()); return false; } return true;
  });
}

export function icePillars(x) {
  const scene = rt.scene, g = G(); g.position.set(x, 0, 0); scene.add(g);
  for (let i = 0; i < 8; i++) {
    const h = 1.6 + Math.random() * 1.8;
    const m = part(gCone, i % 2 ? 0xd8f6ff : 0x8fd8ff, { w: 1.4 });
    m.scale.set(0.35 + Math.random() * 0.25, h, 0.35 + Math.random() * 0.25);
    m.position.set((Math.random() - 0.5) * 2.4, h / 2, (Math.random() - 0.5) * 1.4);
    m.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * 3, (Math.random() - 0.5) * 0.5);
    g.add(m);
  }
  g.scale.y = 0.01;
  let t = 0;
  addFx(dt => {
    t += dt;
    g.scale.y = t < 0.12 ? Math.max(0.01, t / 0.12) : t < 0.8 ? 1 : Math.max(0.01, 1 - (t - 0.8) / 0.4);
    if (t >= 1.2) { scene.remove(g); return false; } return true;
  });
}

export function dust(x, n = 8) { burst(x, 0.1, 0, 0xd9c6ae, n, 2.5, 0.09, 0.45, 1.5); }
