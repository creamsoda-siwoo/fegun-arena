// Toon rendering kit: cached materials, inverted-hull outlines with smoothed normals,
// and smooth primitives (lathe capsules, tapered hair locks, rounded boxes, anime head).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export const UP = new THREE.Vector3(0, 1, 0);
export const G = () => new THREE.Group();
export const INK = 0x1a1024;

/* ---------- materials ---------- */
let gradTex = null;
function gradient() {
  if (!gradTex) {
    gradTex = new THREE.DataTexture(new Uint8Array([96, 96, 96, 255, 178, 178, 178, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
    gradTex.minFilter = gradTex.magFilter = THREE.NearestFilter;
    gradTex.generateMipmaps = false; gradTex.needsUpdate = true;
  }
  return gradTex;
}
const cache = new Map();
const memo = (k, make) => { let v = cache.get(k); if (!v) { v = make(); cache.set(k, v); } return v; };

export const toon = c => memo('t' + c, () => new THREE.MeshToonMaterial({ color: c, gradientMap: gradient() }));
export const basic = c => memo('b' + c, () => new THREE.MeshBasicMaterial({ color: c }));
export const glow = (c, o = 0.8) => memo('g' + c + '_' + o, () => new THREE.MeshBasicMaterial({
  color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false,
}));

/**
 * Outline: back-face hull pushed out along a *smoothed* normal in view space, so the line
 * has the same thickness on every part (no cracks on hard edges, unaffected by mesh scale)
 * and stays readable when the camera pulls back.
 */
export function outline(w = 1) {
  const key = w.toFixed(2);
  return memo('o' + key, () => {
    const m = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
    const k = (0.0021 * w).toFixed(5);
    m.onBeforeCompile = sh => {
      sh.vertexShader = 'attribute vec3 smoothNormal;\n' + sh.vertexShader.replace('#include <project_vertex>', `
        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        vec3 olN = normalize(normalMatrix * smoothNormal);
        mvPosition.xyz += olN * (${k} * clamp(-mvPosition.z, 4.0, 30.0));
        gl_Position = projectionMatrix * mvPosition;`);
    };
    m.customProgramCacheKey = () => 'outline' + key;
    return m;
  });
}

/** Adds a `smoothNormal` attribute: normals averaged over all vertices sharing a position. */
export function withSmoothNormals(geo) {
  if (geo.attributes.smoothNormal) return geo;
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const pos = geo.attributes.position, nor = geo.attributes.normal, n = pos.count;
  const sums = new Map(), keys = new Array(n), out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const k = Math.round(pos.getX(i) * 1e4) + '_' + Math.round(pos.getY(i) * 1e4) + '_' + Math.round(pos.getZ(i) * 1e4);
    keys[i] = k;
    let s = sums.get(k); if (!s) { s = [0, 0, 0]; sums.set(k, s); }
    s[0] += nor.getX(i); s[1] += nor.getY(i); s[2] += nor.getZ(i);
  }
  for (let i = 0; i < n; i++) {
    const s = sums.get(keys[i]), l = Math.hypot(s[0], s[1], s[2]) || 1;
    out[i * 3] = s[0] / l; out[i * 3 + 1] = s[1] / l; out[i * 3 + 2] = s[2] / l;
  }
  geo.setAttribute('smoothNormal', new THREE.BufferAttribute(out, 3));
  return geo;
}

/** Toon mesh with an outline child. opts: { mat, outline:false, w } */
export function part(geo, color, opts = {}) {
  const m = new THREE.Mesh(geo, opts.mat || toon(color));
  if (opts.outline !== false) {
    withSmoothNormals(geo);
    m.add(new THREE.Mesh(geo, outline(opts.w ?? 1)));
  }
  return m;
}

/* ---------- primitives ---------- */
export const sph = (r, w = 22, h = 16) => new THREE.SphereGeometry(r, w, h);
export const cyl = (a, b, h, s = 18) => new THREE.CylinderGeometry(a, b, h, s);
export const cone = (r, h, s = 10) => new THREE.ConeGeometry(r, h, s);
export const torus = (R, r, rs = 10, ts = 32, arc = Math.PI * 2) => new THREE.TorusGeometry(R, r, rs, ts, arc);
export const rbox = (x, y, z, r = Math.min(x, y, z) * 0.35, seg = 3) => new RoundedBoxGeometry(x, y, z, seg, Math.min(r, Math.min(x, y, z) / 2 - 1e-4));

/** Revolve a [radius, y] profile (listed bottom → top) around Y. */
export function lathe(pts, seg = 22) {
  return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(1e-4, r), y)), seg);
}

/** Tapered capsule hanging from the joint: radius r0 at y=0, r1 at y=-len, rounded ends. */
export function capsule(r0, r1, len, seg = 16) {
  const pts = [], N = 6;
  for (let i = 0; i <= N; i++) { const a = -Math.PI / 2 + (i / N) * Math.PI / 2; pts.push([r1 * Math.cos(a), -len + r1 * Math.sin(a)]); }
  for (let i = 0; i <= N; i++) { const a = (i / N) * Math.PI / 2; pts.push([r0 * Math.cos(a), r0 * Math.sin(a)]); }
  return lathe(pts, seg);
}

/** Tapered tube along a Catmull-Rom curve, closed at the root and pointed at the tip — a hair lock. */
export function lock(points, r0, { segs = 12, radial = 8, flat = 1, pow = 1, rEnd = 0 } = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], p[2])));
  const fr = curve.computeFrenetFrames(segs, false);
  const pos = [], idx = [], P = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs; curve.getPointAt(t, P);
    const r = rEnd + (r0 - rEnd) * Math.pow(1 - t, pow);
    const N = fr.normals[i], B = fr.binormals[i];
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2, c = Math.cos(a) * r, s = Math.sin(a) * r * flat;
      pos.push(P.x + N.x * c + B.x * s, P.y + N.y * c + B.y * s, P.z + N.z * c + B.z * s);
    }
  }
  const base = pos.length / 3; curve.getPointAt(0, P); pos.push(P.x, P.y, P.z);
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * radial + j, b = i * radial + (j + 1) % radial, c = a + radial, d = b + radial;
    idx.push(a, b, c, b, d, c);
  }
  for (let j = 0; j < radial; j++) idx.push(base, (j + 1) % radial, j);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/** Weld duplicate vertices (sphere seams/poles) and recompute smooth normals. */
export function weld(geo) {
  geo.deleteAttribute('uv'); geo.deleteAttribute('normal');
  const g = mergeVertices(geo, 1e-5); g.computeVertexNormals();
  return g;
}

/* ---------- anime head ---------- */
export const HEAD_R = 0.3;
/** Sphere → anime head: tapered V-jaw, slightly forward chin, gently flattened face. */
export function headDeform(v, r = HEAD_R) {
  let { x, y, z } = v;
  if (y < 0) {
    const k = Math.min(1, -y / r);
    x *= 1 - 0.3 * k * k; z *= 1 - 0.12 * k * k; y *= 1 + 0.1 * k;
    if (z > 0) z += r * 0.06 * k * (1 - k);
  } else {
    x *= 1 + 0.02 * (1 - y / r);
  }
  v.set(x, y, z * 0.97);
}
function deformAll(g) {
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); headDeform(v); p.setXYZ(i, v.x, v.y, v.z); }
}
export function headGeo() {
  const g = new THREE.SphereGeometry(HEAD_R, 40, 30);
  deformAll(g);
  return weld(g);
}
/** Front patch that hugs the head (slightly lifted) with planar UVs: x,y ∈ [-0.32, 0.32] → [0, 1]. */
export function facePatchGeo() {
  const g = new THREE.SphereGeometry(HEAD_R, 48, 40, Math.PI / 2 - 1.05, 2.1, Math.PI * 0.16, Math.PI * 0.74);
  deformAll(g); g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + n.getX(i) * 0.0022, y = p.getY(i) + n.getY(i) * 0.0022, z = p.getZ(i) + n.getZ(i) * 0.0022;
    p.setXYZ(i, x, y, z);
    uv.setXY(i, (x + 0.32) / 0.64, (y + 0.32) / 0.64);
  }
  return g;
}
