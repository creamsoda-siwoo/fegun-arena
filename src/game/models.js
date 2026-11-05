// Character models. Every limb is a smooth tapered capsule hanging from its joint group,
// torsos are lathed profiles, hair is built from curved tapered locks, and the face is a
// painted patch on a sculpted head. Joint names match poses.js.
import * as THREE from 'three';
import { G, part, glow, sph, cyl, rbox, torus, lathe, capsule, lock, headGeo, facePatchGeo, headDeform, HEAD_R } from './toon';
import { faceMaterials } from './face';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const darker = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();

/* ---------- head ---------- */
function buildHead(head, def, rig) {
  const P = def.pal;
  const skull = part(headGeo(), P.skin); skull.position.y = 0.26; head.add(skull);
  const mats = faceMaterials(def);
  const face = new THREE.Mesh(facePatchGeo(), mats.open); face.position.y = 0.26; face.renderOrder = 2; head.add(face);
  rig.face = face; rig.faceState = 'open';
  rig.setFace = st => { if (rig.faceState !== st) { rig.faceState = st; face.material = mats[st]; } };
  for (const s of [-1, 1]) {
    const ear = part(sph(0.05, 14, 10), P.skin, { w: 0.7 }); ear.scale.set(0.5, 1, 0.75); ear.position.set(s * 0.29, 0.235, -0.015); head.add(ear);
  }
  if (def.id === 'rai') head.add(raiMask(def));
}

/** Cloth face-wrap that follows the jawline (sampled from the head deformation). */
function raiMask(def) {
  const outer = [], v = new THREE.Vector3();
  for (let i = 0; i <= 12; i++) {
    const yr = -0.3 + i * 0.02, rho = Math.sqrt(Math.max(0, HEAD_R * HEAD_R - yr * yr));
    v.set(rho, yr, 0); headDeform(v); const sx = Math.abs(v.x), y = v.y;
    v.set(0, yr, rho); headDeform(v);
    outer.push([Math.max(sx, v.z) + 0.024, y]);
  }
  const inner = outer.map(([r, y]) => [r - 0.016, y]).reverse();
  const m = part(lathe([...outer, ...inner, outer[0]], 36), def.pal.top2, { w: 0.8 });
  m.position.y = 0.26;
  return m;
}

/* ---------- hair ---------- */
function buildHair(head, def, rig) {
  const P = def.pal, H = G(); head.add(H);
  const hc = V3(0, 0.3, -0.035), CAP = 0.318;
  const L = (pts, r, color = P.hair, parent = H, o) => { const m = part(lock(pts, r, o), color, { w: 0.8 }); parent.add(m); return m; };
  const at = (d, k) => { const n = V3(...d).normalize(); return [hc.x + n.x * k, hc.y + n.y * k, hc.z + n.z * k]; };
  const spike = (d, len, r, color, bend = [0, 0.05, -0.07]) => {
    const p0 = at(d, 0.18), p1 = at(d, CAP + len * 0.3), p2 = at(d, CAP + len);
    for (let k = 0; k < 3; k++) { p1[k] += bend[k] * 0.35; p2[k] += bend[k]; }
    L([p0, p1, p2], r, color, H, { pow: 1.15 });
  };
  const bangs = (n, color = P.hair, spread = 0.36, endY = 0.355, r = 0.075) => {
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1) - 0.5, x0 = u * spread;
      L([[x0 * 0.7, 0.55, 0.07], [x0, 0.5, 0.245], [x0 * 1.12 + u * 0.03, 0.43, 0.31], [x0 * 1.18 + u * 0.07, endY + Math.abs(u) * 0.05, 0.322]], r, color, H, { pow: 0.95 });
    }
  };
  const sideLocks = (len = 0.17, r = 0.055, color = P.hair) => {
    for (const s of [-1, 1]) L([[s * 0.24, 0.43, 0.05], [s * 0.296, 0.31, 0.1], [s * 0.292, len, 0.118]], r, color);
  };
  const cap = (scaleY = 1, c = hc, r = CAP) => { const m = part(sph(r, 28, 20), P.hair); m.scale.y = scaleY; m.position.copy(c); H.add(m); return m; };

  if (def.hair === 'spiky') {
    cap();
    const dirs = [[0, 1, -0.3], [0.5, 0.8, -0.5], [-0.5, 0.8, -0.5], [0.85, 0.35, -0.6], [-0.85, 0.35, -0.6], [0, 0.45, -1], [0.45, 0.1, -1], [-0.45, 0.1, -1], [0.35, 1, 0.3], [-0.35, 1, 0.2], [0, 0.9, 0.5]];
    dirs.forEach((d, i) => spike(d, 0.2 + (i % 3) * 0.06, 0.105, i % 4 === 0 ? P.hair2 : P.hair));
    bangs(5);
    sideLocks();
  } else if (def.hair === 'twintail') {
    cap();
    bangs(6, P.hair, 0.4, 0.35, 0.07);
    sideLocks(0.08, 0.05);
    L([[0.02, 0.6, 0.02], [0.05, 0.72, 0.1], [0.14, 0.75, 0.17]], 0.03, P.hair, H, { pow: 0.8 });
    for (const s of [-1, 1]) {
      const g = G(); g.position.set(s * 0.3, 0.44, -0.08); g.rotation.z = s * 0.28; H.add(g);
      L([[0, 0.05, 0], [s * 0.08, -0.12, -0.03], [s * 0.08, -0.45, -0.01], [0, -0.78, 0.03], [-s * 0.02, -0.98, 0.07]], 0.13, P.hair, g, { pow: 0.7, segs: 16 });
      L([[0, -0.7, 0.03], [-s * 0.01, -0.86, 0.05], [-s * 0.02, -0.99, 0.075]], 0.06, P.hair2, g, { pow: 0.8 });
      const scr = part(torus(0.075, 0.028, 8, 20), P.accent, { w: 0.7 }); scr.rotation.x = Math.PI / 2; scr.position.y = 0.0; g.add(scr);
      for (const b of [-1, 1]) {
        const bow = part(sph(0.06, 14, 10), P.accent, { w: 0.7 }); bow.scale.set(1.3, 0.75, 0.45);
        bow.position.set(b * 0.085, 0.03, 0.02); bow.rotation.z = b * 0.4; g.add(bow);
      }
      rig.sway.push({ obj: g, base: [0, 0, s * 0.28], a: 0.12, f: 2.4, ph: s, drag: 1 });
    }
  } else if (def.hair === 'ponytail') {
    cap();
    [[0, 1, -0.4], [0.6, 0.7, -0.6], [-0.6, 0.7, -0.6], [0.25, 1, 0.2]].forEach(d => spike(d, 0.14, 0.09, P.hair));
    bangs(4, P.hair2, 0.32, 0.37);
    sideLocks(0.2, 0.05, P.hair2);
    const band = part(torus(0.318, 0.032, 8, 40), 0x9a9ab0, { w: 0.7 });
    band.rotation.x = Math.PI / 2 - 0.25; band.position.set(0, 0.43, 0.0); H.add(band);
    const plate = part(rbox(0.17, 0.085, 0.03, 0.012), 0xd8d8e8, { w: 0.7 }); plate.position.set(0, 0.47, 0.305); plate.rotation.x = -0.35; H.add(plate);
    const pony = G(); pony.position.set(0, 0.48, -0.28); pony.rotation.x = -2.3; H.add(pony);
    L([[0, -0.04, 0], [0, 0.22, 0.03], [0, 0.52, -0.05], [0, 0.8, 0.03]], 0.11, P.hair, pony, { pow: 0.85, segs: 14 });
    rig.sway.push({ obj: pony, base: [-2.3, 0, 0], a: 0.15, f: 3, ph: 0, drag: 1.2 });
    for (const s of [-1, 1]) {
      const r = G(); r.position.set(s * 0.06, 0.43, -0.3); r.rotation.x = -2.0; H.add(r);
      const rb = part(rbox(0.06, 0.4, 0.016, 0.006), 0x9a9ab0, { w: 0.6 }); rb.position.y = 0.2; r.add(rb);
      rig.sway.push({ obj: r, base: [-2.0, 0, s * 0.2], a: 0.2, f: 4, ph: s, drag: 1.4 });
    }
  } else if (def.hair === 'mohawk') {
    const c = V3(0, 0.36, -0.07);
    cap(0.72, c, 0.31);
    for (let i = 0; i < 7; i++) {
      const z = 0.22 - i * 0.085, dz = (z - c.z) / 0.31, y = c.y + 0.31 * 0.72 * Math.sqrt(Math.max(0, 1 - dz * dz));
      const hgt = 0.2 - Math.abs(i - 2.5) * 0.018;
      L([[0, y - 0.03, z], [0, y + hgt * 0.55, z - 0.04], [0, y + hgt, z - 0.13]], 0.068, P.hair2, H, { pow: 1.1, flat: 0.55 });
    }
    const band = part(torus(0.312, 0.038, 8, 40), P.accent, { w: 0.7 });
    band.rotation.x = Math.PI / 2 - 0.12; band.position.set(0, 0.4, 0); H.add(band);
    for (const s of [-1, 1]) {
      const r = G(); r.position.set(s * 0.05, 0.4, -0.3); r.rotation.x = -2.2; H.add(r);
      const rb = part(rbox(0.07, 0.36, 0.016, 0.006), P.accent, { w: 0.6 }); rb.position.y = 0.18; r.add(rb);
      rig.sway.push({ obj: r, base: [-2.2, 0, s * 0.25], a: 0.18, f: 3.5, ph: s, drag: 1.2 });
    }
  } else if (def.hair === 'hime') {
    cap();
    bangs(7, P.hair, 0.42, 0.372, 0.068);
    // hime-cut side locks, cut straight at the jaw
    for (const s of [-1, 1]) L([[s * 0.24, 0.45, 0.06], [s * 0.302, 0.3, 0.11], [s * 0.305, 0.08, 0.12], [s * 0.3, -0.06, 0.11]], 0.062, P.hair, H, { pow: 0.35, flat: 0.7 });
    // long straight back hair
    const back = G(); back.position.set(0, 0.36, -0.2); H.add(back);
    for (let i = 0; i < 6; i++) {
      const u = i / 5 - 0.5, x = u * 0.44;
      L([[x * 0.7, 0.1, -0.02], [x, -0.08, -0.13], [x * 1.08, -0.42, -0.12], [x * 1.12, -0.8, -0.08], [x * 1.1, -1.08, -0.05]], 0.1, i % 3 === 1 ? P.hair2 : P.hair, back, { pow: 0.45, flat: 0.55, segs: 16 });
    }
    rig.sway.push({ obj: back, base: [0.05, 0, 0], a: 0.05, f: 2, ph: 0.3, drag: 0.6 });
    // sakura kanzashi with a dangling chain
    const kz = G(); kz.position.set(0.24, 0.5, 0.1); kz.rotation.set(0.3, 0.6, -0.4); H.add(kz);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2, pt = part(sph(0.042, 12, 8), k % 2 ? 0xffc2d8 : 0xff8fb8, { w: 0.5 });
      pt.scale.set(1, 0.6, 0.35); pt.position.set(Math.cos(a) * 0.048, Math.sin(a) * 0.048, 0); pt.rotation.z = a; kz.add(pt);
    }
    const ctr = part(sph(0.02, 10, 8), 0xffe48a, { outline: false }); ctr.position.z = 0.012; kz.add(ctr);
    const dangle = G(); dangle.position.set(0.25, 0.44, 0.04); H.add(dangle);
    for (let k = 0; k < 3; k++) { const b = part(sph(0.018, 8, 6), P.accent, { outline: false }); b.position.y = -0.04 - k * 0.04; dangle.add(b); }
    rig.sway.push({ obj: dangle, base: [0, 0, 0], a: 0.25, f: 4, ph: 0, drag: 1 });
  } else if (def.hair === 'swept') {
    cap();
    [[0, 0.85, -0.5], [0.5, 0.6, -0.7], [-0.5, 0.6, -0.7], [0.85, 0.15, -0.7], [-0.85, 0.15, -0.7], [0.25, 0.3, -1], [-0.25, 0.3, -1], [0.2, 1, 0.1]]
      .forEach((d, i) => spike(d, 0.2 + (i % 2) * 0.06, 0.1, i % 3 === 2 ? P.hair2 : P.hair, [0, -0.05, -0.12]));
    bangs(3, P.hair, 0.26, 0.4, 0.07);
    // long sweeping fringe falling over one eye
    L([[-0.08, 0.57, 0.1], [0.06, 0.5, 0.27], [0.17, 0.37, 0.315], [0.215, 0.24, 0.3]], 0.075, P.hair2, H, { pow: 0.9 });
    sideLocks(0.12, 0.05);
    // low tail tied with a violet cord
    const tail = G(); tail.position.set(0, 0.2, -0.26); tail.rotation.x = -2.95; H.add(tail);
    L([[0, -0.02, 0], [0, 0.2, 0.04], [0, 0.48, 0.02], [0, 0.72, 0.06]], 0.06, P.hair, tail, { pow: 0.8, segs: 14 });
    const tie = part(torus(0.055, 0.018, 8, 18), P.accent, { w: 0.6 }); tie.rotation.x = Math.PI / 2; tie.position.y = 0.04; tail.add(tie);
    rig.sway.push({ obj: tail, base: [-2.95, 0, 0], a: 0.1, f: 2.6, ph: 0.4, drag: 1 });
  }
}

/* ---------- weapons ---------- */
function katana(accent) {
  const g = G(), y0 = -0.13, Lb = 0.9, c = t => 0.035 * t * t;
  const s = new THREE.Shape();
  s.moveTo(-0.022, y0);
  for (let i = 1; i <= 10; i++) { const t = i / 10 * 0.95; s.lineTo(-0.022 + c(t), y0 - Lb * t); }
  s.lineTo(0.006 + c(1), y0 - Lb);
  for (let i = 10; i >= 0; i--) { const t = i / 10 * 0.88; s.lineTo(0.024 + c(t), y0 - Lb * t); }
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 1, curveSegments: 4 });
  geo.translate(0, 0, -0.005);
  g.add(part(geo, 0xe6ecfa, { w: 0.6 }));
  const e = new THREE.Shape();
  e.moveTo(0.014, y0 - 0.02);
  for (let i = 1; i <= 10; i++) { const t = i / 10 * 0.88; e.lineTo(0.014 + c(t), y0 - Lb * t); }
  for (let i = 10; i >= 0; i--) { const t = i / 10 * 0.88; e.lineTo(0.026 + c(t), y0 - Lb * t); }
  const eg = new THREE.ExtrudeGeometry(e, { depth: 0.02, bevelEnabled: false, curveSegments: 2 }); eg.translate(0, 0, -0.01);
  g.add(new THREE.Mesh(eg, glow(accent, 0.9)));
  const tsuba = part(cyl(0.065, 0.065, 0.022, 20), accent, { w: 0.6 }); tsuba.position.y = -0.115; g.add(tsuba);
  const hilt = part(capsule(0.024, 0.022, 0.2, 10), 0x3a1d14, { w: 0.6 }); hilt.position.y = 0.09; g.add(hilt);
  for (let i = 0; i < 4; i++) { const w = part(torus(0.025, 0.006, 6, 12), 0xe8d2a8, { outline: false }); w.rotation.x = Math.PI / 2; w.position.y = 0.06 - i * 0.045; g.add(w); }
  return g;
}

/** Folding fan: paper sector with a coloured band, opening away from the hand along -y. */
function fan(paper, band) {
  const g = G(), a0 = -Math.PI / 2 - 0.95, a1 = -Math.PI / 2 + 0.95;
  const sector = (r0, r1) => {
    const s = new THREE.Shape();
    s.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0);
    s.absarc(0, 0, r1, a0, a1, false);
    s.absarc(0, 0, r0, a1, a0, true);
    return s;
  };
  const leaf = new THREE.ExtrudeGeometry(sector(0.07, 0.36), { depth: 0.012, bevelEnabled: false, curveSegments: 18 }); leaf.translate(0, 0, -0.006);
  g.add(part(leaf, paper, { w: 0.6 }));
  const bandGeo = new THREE.ExtrudeGeometry(sector(0.27, 0.35), { depth: 0.02, bevelEnabled: false, curveSegments: 18 }); bandGeo.translate(0, 0, -0.01);
  g.add(part(bandGeo, band, { outline: false }));
  const pivot = part(cyl(0.022, 0.022, 0.03, 12), 0x2a1a2e, { outline: false }); pivot.rotation.x = Math.PI / 2; g.add(pivot);
  return g;
}

/** Long spear held mid-shaft: point extends along -y (forward when the arm is extended). */
function spear(accent) {
  const g = G();
  const shaft = part(cyl(0.022, 0.024, 2.0, 10), 0x2b2236, { w: 0.6 }); shaft.position.y = -0.4; g.add(shaft);
  for (const y of [0.05, -0.12]) { const w = part(torus(0.027, 0.007, 6, 12), 0x8f96b4, { outline: false }); w.rotation.x = Math.PI / 2; w.position.y = y; g.add(w); }
  const cap = part(cyl(0.03, 0.026, 0.06, 10), 0x8f96b4, { w: 0.6 }); cap.position.y = 0.62; g.add(cap);
  const collar = part(cyl(0.032, 0.026, 0.08, 12), 0x8f96b4, { w: 0.6 }); collar.position.y = -1.42; g.add(collar);
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.quadraticCurveTo(0.075, -0.1, 0.05, -0.2); s.lineTo(0, -0.42); s.lineTo(-0.05, -0.2); s.quadraticCurveTo(-0.075, -0.1, 0, 0);
  const bg = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1, curveSegments: 6 });
  bg.translate(0, -1.45, -0.006);
  g.add(part(bg, 0xe8ecf8, { w: 0.6 }));
  const edge = new THREE.Mesh(sph(1, 10, 8), glow(accent, 0.55)); edge.scale.set(0.05, 0.2, 0.03); edge.position.y = -1.66; g.add(edge);
  const tassel = G(); tassel.position.y = -1.36; g.add(tassel);
  tassel.add(part(lock([[0, 0, 0], [0.04, 0.06, -0.03], [0.05, 0.2, -0.05]], 0.03, { pow: 0.7 }), accent, { w: 0.5 }));
  return g;
}

/* ---------- body ---------- */
const TORSO = [[0, 0], [0.17, 0.0], [0.188, 0.1], [0.2, 0.22], [0.232, 0.34], [0.25, 0.43], [0.238, 0.5], [0.18, 0.553], [0.09, 0.585], [0, 0.592]];
const PELVIS = [[0, -0.15], [0.11, -0.14], [0.18, -0.08], [0.203, 0.0], [0.192, 0.08], [0.14, 0.12], [0, 0.135]];

export function buildModel(def) {
  const P = def.pal, bw = def.bw, aw = def.aw, hw = def.hw, id = def.id;
  const root = G(), body = G(); body.scale.setScalar(def.scale); root.add(body);
  const rig = { root, sway: [] };
  const hips = G(); hips.position.y = 0.95; body.add(hips); rig.hips = hips;
  const pelvis = part(lathe(PELVIS.map(([r, y]) => [r * bw, y]), 24), P.pants); pelvis.scale.z = 0.8; hips.add(pelvis);
  const chest = G(); chest.position.y = 0.04; hips.add(chest); rig.chest = chest;
  const torso = part(lathe(TORSO.map(([r, y]) => [r * bw, y]), 28), P.top); torso.scale.z = 0.74; chest.add(torso);
  const beltH = id === 'hana' ? 0.17 : 0.07, beltC = id === 'gou' ? 0x1b1410 : id === 'hana' ? P.top2 : id === 'ren' ? 0x2e2440 : P.accent;
  const belt = part(cyl(0.2 * bw, 0.194 * bw, beltH, 24), beltC, { w: 0.7 }); belt.scale.z = 0.8; belt.position.y = id === 'hana' ? 0.1 : 0.05; chest.add(belt);
  if (id === 'gou') { const buckle = part(rbox(0.13, 0.095, 0.035, 0.012), 0xf2c14e, { w: 0.6 }); buckle.position.set(0, 0.05, 0.205); chest.add(buckle); }
  const neck = part(capsule(0.066, 0.074, 0.16, 14), P.skin); neck.position.y = 0.67; chest.add(neck);
  const head = G(); head.position.y = 0.64; chest.add(head); rig.head = head;
  buildHead(head, def, rig);
  buildHair(head, def, rig);

  const sleeve = id === 'gou' ? P.skin : P.top;
  const fore = id === 'gou' || id === 'yuki' ? P.skin : id === 'hana' ? P.top : P.top2;
  const arm = s => {
    const sh = G(); sh.position.set(s * 0.3 * bw, 0.47, 0); chest.add(sh);
    sh.add(part(capsule(0.08 * aw, 0.066 * aw, 0.32), sleeve));
    if (id === 'yuki') { const puff = part(sph(0.105, 18, 12), P.top); puff.position.y = -0.03; sh.add(puff); }
    if (id === 'kaito') { const pad = part(sph(0.105, 18, 12), P.accent, { w: 0.8 }); pad.scale.set(1.1, 0.6, 1); pad.position.y = 0.025; sh.add(pad); }
    if (id === 'gou') { const delt = part(sph(0.105 * aw, 18, 12), P.skin); delt.scale.set(1, 0.9, 0.9); delt.position.y = -0.03; sh.add(delt); }
    const el = G(); el.position.y = -0.32; sh.add(el);
    el.add(part(capsule(0.066 * aw, 0.054 * aw, 0.27), fore));
    if (id === 'gou' || id === 'rai') { const cuff = part(cyl(0.072 * aw, 0.068 * aw, 0.08, 18), id === 'gou' ? 0xf4f0e6 : 0x9a9ab0, { w: 0.7 }); cuff.position.y = -0.24; el.add(cuff); }
    if (id === 'yuki') { const cuff = part(torus(0.058, 0.018, 8, 20), P.top2, { w: 0.6 }); cuff.rotation.x = Math.PI / 2; cuff.position.y = -0.24; el.add(cuff); }
    if (id === 'hana') {
      // furisode: a long sleeve panel hanging from the forearm
      const fs = G(); fs.position.set(0, -0.06, -0.06); el.add(fs);
      const panel = part(rbox(0.035, 0.4, 0.2, 0.014), P.top, { w: 0.7 }); panel.position.set(0, -0.2, -0.06); fs.add(panel);
      const hem = part(rbox(0.04, 0.06, 0.205, 0.014), P.top2, { w: 0.6 }); hem.position.set(0, -0.38, -0.06); fs.add(hem);
      rig.sway.push({ obj: fs, base: [0.25, 0, 0], a: 0.1, f: 2.8, ph: s, drag: 1 });
    }
    if (id === 'ren') { const cuff = part(cyl(0.07 * aw, 0.064 * aw, 0.07, 18), P.accent, { w: 0.6 }); cuff.position.y = -0.24; el.add(cuff); }
    if (id === 'ren' && s === 1) {
      const pad = part(sph(0.12, 18, 12), P.top2, { w: 0.8 }); pad.scale.set(1.15, 0.62, 1.05); pad.position.y = 0.03; sh.add(pad);
      const trim = part(torus(0.118, 0.012, 6, 24), P.accent, { outline: false }); trim.rotation.x = Math.PI / 2; trim.scale.set(1.15, 1.05, 1); trim.position.y = 0.0; sh.add(trim);
    }
    const hand = part(rbox(0.105 * hw, 0.112 * hw, 0.095 * hw, 0.04 * hw), P.glove); hand.position.y = -0.335; el.add(hand);
    return { sh, el, hand };
  };
  const La = arm(1), Ra = arm(-1);
  Object.assign(rig, { lSh: La.sh, lEl: La.el, rSh: Ra.sh, rEl: Ra.el, lHand: La.hand, rHand: Ra.hand });

  const thighColor = id === 'yuki' ? P.skin : P.pants;
  const shinColor = id === 'yuki' || id === 'rai' || id === 'ren' ? P.boots : P.pants;
  const leg = s => {
    const hp = G(); hp.position.set(s * 0.115 * bw, -0.02, 0); hips.add(hp);
    hp.add(part(capsule(0.1 * bw, 0.078 * bw, 0.43), thighColor));
    const kn = G(); kn.position.y = -0.43; hp.add(kn);
    kn.add(part(capsule(0.08 * bw, 0.062 * bw, 0.38), shinColor));
    if (id === 'yuki') { const top = part(torus(0.078, 0.02, 8, 20), 0xffffff, { w: 0.6 }); top.rotation.x = Math.PI / 2; top.position.y = -0.04; kn.add(top); }
    if (id === 'gou' || id === 'kaito') { const wrap = part(cyl(0.07 * bw, 0.066 * bw, 0.12, 18), P.boots, { w: 0.7 }); wrap.position.y = -0.33; kn.add(wrap); }
    if (id === 'hana') { const sock = part(cyl(0.064, 0.06, 0.12, 16), P.boots, { w: 0.7 }); sock.position.y = -0.33; kn.add(sock); }
    const ft = part(rbox(0.13 * bw, 0.095, 0.27, 0.04), P.boots); ft.position.set(0, -0.44, 0.05); kn.add(ft);
    if (id === 'hana') { const geta = part(rbox(0.12 * bw, 0.04, 0.27, 0.012), 0x8a5a3a, { w: 0.6 }); geta.position.set(0, -0.5, 0.05); kn.add(geta); }
    return { hp, kn };
  };
  const LL = leg(1), RL = leg(-1);
  Object.assign(rig, { lHip: LL.hp, lKnee: LL.kn, rHip: RL.hp, rKnee: RL.kn });

  /* ---------- character extras ---------- */
  if (id === 'kaito') {
    for (const s of [-1, 1]) {
      const g = G(); g.position.set(s * 0.1, 0.02, -0.16); hips.add(g);
      const flap = part(rbox(0.17, 0.55, 0.035, 0.014), P.top, { w: 0.8 }); flap.position.set(0, -0.27, -0.01); g.add(flap);
      const trim = part(rbox(0.172, 0.05, 0.04, 0.012), P.accent, { w: 0.6 }); trim.position.set(0, -0.525, -0.01); g.add(trim);
      rig.sway.push({ obj: g, base: [0.12, 0, s * 0.1], a: 0.06, f: 3, ph: s, drag: 0.9 });
    }
    const scarf = part(torus(0.115, 0.048, 10, 28), P.accent, { w: 0.8 }); scarf.rotation.x = Math.PI / 2; scarf.position.y = 0.585; chest.add(scarf);
    const tail = G(); tail.position.set(-0.07, 0.575, -0.1); chest.add(tail);
    tail.add(part(lock([[0, 0, 0], [-0.03, -0.1, -0.07], [-0.02, -0.28, -0.11], [0.02, -0.42, -0.1]], 0.045, { flat: 0.45, pow: 0.6, rEnd: 0.012 }), P.accent, { w: 0.7 }));
    rig.sway.push({ obj: tail, base: [0, 0, 0], a: 0.12, f: 3.2, ph: 0.5, drag: 1.1 });
    const sw = katana(P.accent); sw.position.y = -0.02; Ra.hand.add(sw);
  } else if (id === 'yuki') {
    const sk = [[0.43, -0.32], [0.445, -0.305], [0.36, -0.18], [0.27, -0.05], [0.215, 0.04], [0.2, 0.065], [0.19, 0.04], [0.25, -0.05], [0.34, -0.18], [0.425, -0.31], [0.43, -0.32]];
    const skirt = part(lathe(sk.map(([r, y]) => [r * bw, y]), 36), P.top2); hips.add(skirt);
    const frill = part(torus(0.43 * bw, 0.022, 8, 40), 0xffffff, { w: 0.6 }); frill.rotation.x = Math.PI / 2; frill.position.y = -0.31; hips.add(frill);
    for (const s of [-1, 1]) {
      const r = part(sph(0.06, 14, 10), 0xff7aa8, { w: 0.6 }); r.scale.set(1.3, 0.75, 0.45); r.position.set(s * 0.07, 0.42, 0.175); r.rotation.z = s * 0.35; chest.add(r);
    }
    const knot = part(sph(0.03, 10, 8), 0xff7aa8, { w: 0.6 }); knot.position.set(0, 0.42, 0.185); chest.add(knot);
    const st = G(); La.hand.add(st);
    const rod = part(cyl(0.022, 0.022, 1.25, 10), 0xf4f7ff, { w: 0.6 }); rod.rotation.x = Math.PI / 2; rod.position.z = 0.1; st.add(rod);
    const crystal = part(new THREE.OctahedronGeometry(0.11, 0), 0x8fe3ff, { w: 0.7 }); crystal.scale.y = 1.6; crystal.position.z = 0.82; crystal.rotation.x = Math.PI / 2; st.add(crystal);
    const halo = part(torus(0.12, 0.014, 6, 28), P.accent, { w: 0.5 }); halo.position.z = 0.82; st.add(halo);
    const cg = new THREE.Mesh(sph(1, 14, 10), glow(P.accent, 0.35)); cg.scale.setScalar(0.2); cg.position.z = 0.82; st.add(cg);
  } else if (id === 'rai') {
    const sc = G(); sc.position.set(0, 0.585, -0.08); chest.add(sc);
    const ring = part(torus(0.12, 0.05, 10, 28), P.accent, { w: 0.8 }); ring.rotation.x = Math.PI / 2; sc.add(ring);
    for (const s of [-1, 1]) {
      const g = G(); g.position.set(s * 0.05, 0, -0.1); g.rotation.x = -1.9; sc.add(g);
      const a = part(rbox(0.1, 0.6, 0.02, 0.008), P.accent, { w: 0.6 }); a.position.y = 0.3; g.add(a);
      const g2 = G(); g2.position.y = 0.6; g.add(g2);
      const b = part(rbox(0.1, 0.5, 0.02, 0.008), P.accent, { w: 0.6 }); b.position.y = 0.25; g2.add(b);
      rig.sway.push({ obj: g, base: [-1.9, 0, s * 0.15], a: 0.2, f: 5, ph: s, drag: 1.5 });
      rig.sway.push({ obj: g2, base: [-0.2, 0, 0], a: 0.3, f: 6, ph: s + 1, drag: 0.6 });
    }
    const back = G(); back.position.set(0.1, 0.3, -0.2); back.rotation.z = 0.7; chest.add(back);
    const blade = part(rbox(0.04, 0.62, 0.012, 0.005), 0xc8ccd8, { w: 0.6 }); blade.position.y = 0.06; back.add(blade);
    const grip = part(capsule(0.022, 0.02, 0.16, 10), 0x241c40, { w: 0.6 }); grip.position.y = -0.27; back.add(grip);
    const guard = part(rbox(0.09, 0.02, 0.05, 0.008), 0x9a9ab0, { w: 0.6 }); guard.position.y = -0.26; back.add(guard);
  } else if (id === 'hana') {
    // hakama: a long flared pleated skirt
    const hk = [[0.4, -0.62], [0.41, -0.6], [0.33, -0.36], [0.26, -0.15], [0.215, 0.02], [0.2, 0.06], [0.19, 0.03], [0.24, -0.15], [0.31, -0.36], [0.39, -0.6], [0.4, -0.62]];
    const hakama = part(lathe(hk.map(([r, y]) => [r * bw, y]), 36), P.pants); hakama.scale.z = 0.86; hips.add(hakama);
    const hem = part(torus(0.4 * bw, 0.018, 8, 40), P.accent, { w: 0.6 }); hem.rotation.x = Math.PI / 2; hem.scale.y = 0.86; hem.position.y = -0.61; hips.add(hem);
    // kimono collar (white V over pink)
    for (const s of [-1, 1]) {
      const c = part(rbox(0.05, 0.3, 0.03, 0.012), P.top2, { w: 0.6 }); c.position.set(s * 0.06, 0.43, 0.15); c.rotation.set(-0.25, 0, s * 0.5); chest.add(c);
    }
    // big obi bow on the back
    const bow = G(); bow.position.set(0, 0.1, -0.17); chest.add(bow);
    for (const s of [-1, 1]) {
      const lobe = part(sph(0.11, 16, 12), P.accent, { w: 0.7 }); lobe.scale.set(1.3, 0.75, 0.45); lobe.position.set(s * 0.12, 0.03, -0.03); lobe.rotation.z = s * 0.3; bow.add(lobe);
    }
    const knot = part(rbox(0.08, 0.1, 0.07, 0.025), P.top2, { w: 0.6 }); knot.position.z = -0.03; bow.add(knot);
    for (const s of [-1, 1]) {
      const r = G(); r.position.set(s * 0.04, -0.02, -0.06); bow.add(r);
      const rb = part(rbox(0.09, 0.38, 0.018, 0.008), P.accent, { w: 0.6 }); rb.position.y = -0.19; r.add(rb);
      rig.sway.push({ obj: r, base: [0.2, 0, s * 0.15], a: 0.12, f: 3, ph: s, drag: 1.1 });
    }
    const fl = fan(0xfff6fa, P.accent); fl.position.y = -0.03; fl.rotation.y = 0.3; La.hand.add(fl);
    const fr = fan(0xfff6fa, P.accent); fr.position.y = -0.03; fr.rotation.y = -0.3; Ra.hand.add(fr);
  } else if (id === 'ren') {
    // high collar
    const col = part(lathe([[0.13, 0], [0.135, 0.06], [0.125, 0.14], [0.12, 0.15], [0.11, 0.14], [0.115, 0.06], [0.12, 0]], 28), P.top2, { w: 0.7 });
    col.position.y = 0.55; col.scale.z = 0.9; chest.add(col);
    // V of violet piping down the coat front
    for (const s of [-1, 1]) {
      const p = part(rbox(0.026, 0.42, 0.02, 0.008), P.accent, { outline: false }); p.position.set(s * 0.07, 0.33, 0.178); p.rotation.set(-0.18, 0, s * 0.16); chest.add(p);
    }
    // long coat tails
    [[-0.13, -0.14, 0.45], [0, -0.17, 0], [0.13, -0.14, -0.45]].forEach(([x, z, rot], i) => {
      const g = G(); g.position.set(x, 0.03, z); g.rotation.y = rot; hips.add(g);
      const flap = part(rbox(0.19, 0.78, 0.03, 0.012), P.top, { w: 0.8 }); flap.position.set(0, -0.39, -0.01); g.add(flap);
      const trim = part(rbox(0.192, 0.045, 0.036, 0.012), P.accent, { w: 0.6 }); trim.position.set(0, -0.76, -0.01); g.add(trim);
      rig.sway.push({ obj: g, base: [0.16, rot, 0], a: 0.07, f: 2.6, ph: i, drag: 1 });
    });
    const sp = spear(P.accent); sp.position.y = -0.02; Ra.hand.add(sp);
  }
  return rig;
}

/** Free per-model geometry (materials are shared and cached). */
export function disposeModel(rig) {
  rig.root.traverse(o => { if (o.isMesh && o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); });
}
