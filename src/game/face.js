// Anime faces painted on a canvas and wrapped onto the head's front patch.
// Three expressions per character: open, blink, hurt (><).
import * as THREE from 'three';

// Head-space units (skull centre = 0,0). x: + is the character's left (viewer's right).
const FACE = {
  kaito: { x: 0.104, y: -0.028, w: 0.062, h: 0.074, tilt: 0.16, lash: 0x2a1014, brow: { c: 0xb0301e, th: 0.017, ang: 0.27, dy: 0.04 }, mouth: 'smirk' },
  yuki: { x: 0.106, y: -0.03, w: 0.066, h: 0.09, tilt: -0.04, lash: 0x1f3462, brow: { c: 0x6aa6d6, th: 0.011, ang: -0.1, dy: 0.05 }, mouth: 'smile', blush: true },
  rai: { x: 0.102, y: -0.004, w: 0.066, h: 0.048, tilt: 0.3, lash: 0x120d1e, brow: { c: 0x1d1a2c, th: 0.015, ang: 0.34, dy: 0.032 }, mouth: null },
  gou: { x: 0.108, y: -0.03, w: 0.056, h: 0.05, tilt: 0.12, lash: 0x1e140c, brow: { c: 0x3e2416, th: 0.027, ang: 0.3, dy: 0.034 }, mouth: 'grin' },
};

const S = 512, K = S / 0.64;
const PX = x => (x + 0.32) * K, PY = y => (0.32 - y) * K;

const rgb = c => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
const css = (c, a = 1) => { const [r, g, b] = rgb(c); return `rgba(${r},${g},${b},${a})`; };
const mix = (c1, c2, t) => { const a = rgb(c1), b = rgb(c2); return (Math.round(a[0] + (b[0] - a[0]) * t) << 16) | (Math.round(a[1] + (b[1] - a[1]) * t) << 8) | Math.round(a[2] + (b[2] - a[2]) * t); };

/** Points around the eye outline (canvas px). Outer corner on side s, flatter upper lid. */
function eyePts(cx, cy, w, h, tilt, s, a0 = 0, a1 = Math.PI * 2, n = 48) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * (i / n), c = Math.cos(a), sn = Math.sin(a);
    let y = h * sn; if (sn > 0) y *= 0.86; y += tilt * h * c;
    pts.push([cx + s * w * c, cy - y]);
  }
  return pts;
}
function path(ctx, pts, close = true) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}
/** Filled ribbon along a polyline with per-point thickness (for lashes and brows). */
function ribbon(ctx, pts, th, color) {
  const up = [], dn = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const t = typeof th === 'function' ? th(i / (pts.length - 1)) : th;
    up.push([p[0] - ty * t * 0.5, p[1] + tx * t * 0.5]); dn.push([p[0] + ty * t * 0.5, p[1] - tx * t * 0.5]);
  }
  ctx.fillStyle = css(color);
  path(ctx, up.concat(dn.reverse())); ctx.fill();
}
function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
}

function drawBrow(ctx, f, s, state) {
  const cx = PX(s * f.x), cy = PY(f.y), w = f.w * K, h = f.h * K, b = f.brow;
  const ang = state === 'hurt' ? -Math.abs(b.ang) * 0.7 - 0.1 : b.ang;
  const base = cy - h * 0.86 - f.tilt * h * 0.2 - b.dy * K - (state === 'hurt' ? 0.012 * K : 0);
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16, xr = -0.95 + 2.0 * t;
    pts.push([cx + s * xr * w, base - xr * w * Math.tan(ang) - Math.sin(Math.PI * t) * h * 0.14]);
  }
  ribbon(ctx, pts, t => b.th * K * (1.05 - 0.75 * t), b.c);
}

function drawOpenEye(ctx, f, s, eye) {
  const cx = PX(s * f.x), cy = PY(f.y), w = f.w * K, h = f.h * K;
  const outlinePts = eyePts(cx, cy, w, h, f.tilt, s);
  ctx.save();
  path(ctx, outlinePts); ctx.fillStyle = '#fffaf6'; ctx.fill(); ctx.clip();
  // lid shadow
  let g = ctx.createLinearGradient(0, cy - h, 0, cy + h * 0.2);
  g.addColorStop(0, 'rgba(70,45,100,0.45)'); g.addColorStop(0.5, 'rgba(70,45,100,0)');
  ctx.fillStyle = g; ctx.fillRect(cx - w * 1.5, cy - h * 1.5, w * 3, h * 3);
  // iris
  const ix = cx - s * w * 0.06, iy = cy + h * 0.06, irx = w * 0.6, iry = h * 0.95;
  g = ctx.createLinearGradient(0, iy - iry, 0, iy + iry);
  g.addColorStop(0, css(mix(eye, 0x000000, 0.62))); g.addColorStop(0.5, css(eye)); g.addColorStop(1, css(mix(eye, 0xffffff, 0.5)));
  ellipse(ctx, ix, iy, irx, iry, g);
  ctx.lineWidth = w * 0.07; ctx.strokeStyle = css(mix(eye, 0x000000, 0.55)); ctx.stroke();
  ellipse(ctx, ix, iy - iry * 0.06, irx * 0.46, iry * 0.5, css(mix(eye, 0x0a0614, 0.78)));
  ctx.globalAlpha = 0.75; ellipse(ctx, ix, iy + iry * 0.52, irx * 0.62, iry * 0.26, css(mix(eye, 0xffffff, 0.62))); ctx.globalAlpha = 1;
  // highlights (same light direction for both eyes)
  ellipse(ctx, ix - irx * 0.34, iy - iry * 0.42, irx * 0.34, iry * 0.26, '#ffffff');
  ellipse(ctx, ix + irx * 0.4, iy + iry * 0.32, irx * 0.13, irx * 0.13, 'rgba(255,255,255,0.9)');
  ctx.restore();
  // upper lash: thick ribbon along the lid with a flick at the outer corner
  const lid = eyePts(cx, cy, w, h, f.tilt, s, -0.04 * Math.PI, 1.02 * Math.PI, 28);
  const lt = Math.max(3, h * 0.26);
  ribbon(ctx, lid, t => lt * (0.55 + 0.6 * Math.sin(Math.PI * Math.min(1, t * 1.15))), f.lash);
  const oc = lid[0];
  ctx.fillStyle = css(f.lash);
  path(ctx, [[oc[0] - s * lt * 0.2, oc[1] - lt * 0.6], [oc[0] + s * w * 0.3, oc[1] - h * 0.34], [oc[0] - s * w * 0.04, oc[1] + lt * 0.5]]); ctx.fill();
  // lower lash hint at the outer half
  const low = eyePts(cx, cy, w, h, f.tilt, s, -0.42 * Math.PI, -0.06 * Math.PI, 12);
  ribbon(ctx, low, t => lt * 0.32 * Math.sin(Math.PI * t), f.lash);
}

function drawBlinkEye(ctx, f, s) {
  const cx = PX(s * f.x), cy = PY(f.y), w = f.w * K, h = f.h * K, pts = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20, xr = 1 - 2 * t;
    pts.push([cx + s * xr * w * 1.02, cy + h * 0.12 - f.tilt * h * xr * 0.6 + Math.sin(Math.PI * t) * h * 0.22]);
  }
  ribbon(ctx, pts, t => Math.max(3, h * 0.2) * (0.5 + 0.6 * Math.sin(Math.PI * t)), f.lash);
}

function drawHurtEye(ctx, f, s) {
  const cx = PX(s * f.x), cy = PY(f.y), w = f.w * K, h = Math.max(f.h, 0.06) * K;
  const pts = [[cx + s * w * 0.8, cy - h * 0.5], [cx - s * w * 0.55, cy], [cx + s * w * 0.8, cy + h * 0.5]];
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(4, h * 0.26); ctx.strokeStyle = css(f.lash);
  path(ctx, pts, false); ctx.stroke();
}

function drawMouth(ctx, f, def, state) {
  const mx = PX(0), my = PY(-0.152);
  ctx.lineCap = 'round';
  if (state === 'hurt') {
    ellipse(ctx, mx, my + 0.004 * K, 0.02 * K, 0.014 * K, '#5a1a2a');
    ellipse(ctx, mx, my + 0.011 * K, 0.011 * K, 0.006 * K, '#d9657a');
    return;
  }
  ctx.strokeStyle = '#6a2434'; ctx.beginPath();
  if (f.mouth === 'smirk') { ctx.lineWidth = 0.008 * K; ctx.moveTo(mx - 0.03 * K, my); ctx.quadraticCurveTo(mx, my + 0.006 * K, mx + 0.03 * K, my - 0.01 * K); }
  else if (f.mouth === 'smile') { ctx.lineWidth = 0.008 * K; ctx.moveTo(mx - 0.026 * K, my - 0.002 * K); ctx.quadraticCurveTo(mx, my + 0.016 * K, mx + 0.026 * K, my - 0.002 * K); }
  else { ctx.lineWidth = 0.011 * K; ctx.strokeStyle = '#4a1e16'; ctx.moveTo(mx - 0.044 * K, my + 0.004 * K); ctx.quadraticCurveTo(mx, my - 0.008 * K, mx + 0.044 * K, my + 0.004 * K); }
  ctx.stroke();
  void def;
}

function drawFace(ctx, def, state) {
  const f = FACE[def.id] || FACE.kaito, eye = def.pal.eye;
  ctx.clearRect(0, 0, S, S);
  if (f.blush) for (const s of [-1, 1]) {
    const bx = PX(s * 0.15), by = PY(-0.105), g = ctx.createRadialGradient(bx, by, 0, bx, by, 0.05 * K);
    g.addColorStop(0, 'rgba(255,120,160,0.55)'); g.addColorStop(1, 'rgba(255,120,160,0)');
    ctx.save(); ctx.translate(bx, by); ctx.scale(1, 0.45); ctx.translate(-bx, -by);
    ctx.fillStyle = g; ctx.fillRect(bx - 0.06 * K, by - 0.06 * K, 0.12 * K, 0.12 * K); ctx.restore();
  }
  for (const s of [-1, 1]) {
    drawBrow(ctx, f, s, state);
    if (state === 'open') drawOpenEye(ctx, f, s, eye);
    else if (state === 'blink') drawBlinkEye(ctx, f, s);
    else drawHurtEye(ctx, f, s);
  }
  if (def.id !== 'rai') {
    // nose: a soft shadow tick
    ctx.lineCap = 'round'; ctx.lineWidth = 0.006 * K; ctx.strokeStyle = css(mix(def.pal.skin, 0x7a3a3a, 0.45), 0.8);
    ctx.beginPath(); ctx.moveTo(PX(-0.003), PY(-0.072)); ctx.lineTo(PX(0.007), PY(-0.088)); ctx.stroke();
    drawMouth(ctx, f, def, state);
  }
}

const faceCache = {};
/** { open, blink, hurt } materials for the face patch, cached per character. */
export function faceMaterials(def) {
  if (faceCache[def.id]) return faceCache[def.id];
  const make = state => {
    const c = document.createElement('canvas'); c.width = c.height = S;
    drawFace(c.getContext('2d'), def, state);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  };
  return (faceCache[def.id] = { open: make('open'), blink: make('blink'), hurt: make('hurt') });
}
