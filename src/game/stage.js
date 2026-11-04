// Dusk shrine ring: sky dome, mountains, torii, cherry trees, lanterns, falling petals.
import * as THREE from 'three';
import { G, part, toon, basic, glow, sph, cyl, cone, rbox } from './toon';

export function buildStage(scene) {
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x1b1440) }, mid: { value: new THREE.Color(0x8e3b78) }, bot: { value: new THREE.Color(0xffa060) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP;
      void main(){ float h = vP.y; vec3 c = h > 0.1 ? mix(mid, top, smoothstep(0.1, 0.55, h)) : mix(bot, mid, smoothstep(-0.04, 0.1, h));
      gl_FragColor = vec4(c, 1.0);
      #include <colorspace_fragment>
      }`,
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(190, 32, 16), skyMat));
  const sun = new THREE.Mesh(new THREE.CircleGeometry(15, 48), new THREE.MeshBasicMaterial({ color: 0xffdca8, fog: false }));
  sun.position.set(-26, 15, -170); scene.add(sun);
  const halo = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshBasicMaterial({ color: 0xffa070, transparent: true, opacity: 0.22, fog: false, depthWrite: false }));
  halo.position.set(-26, 15, -172); scene.add(halo);
  const mc = [0x6a2f6e, 0x55265e, 0x3f1f4f];
  for (let L = 0; L < 3; L++) for (let i = 0; i < 9; i++) {
    const h = 16 + Math.random() * 26, r = 18 + Math.random() * 14;
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), basic(mc[L]));
    m.position.set(-130 + i * 33 + Math.random() * 12, h / 2 - 3, -125 + L * 24); m.rotation.y = Math.random(); scene.add(m);
  }
  const clouds = [];
  for (let i = 0; i < 9; i++) {
    const c = G();
    for (let k = 0; k < 4; k++) {
      const s = new THREE.Mesh(sph(1, 16, 10), new THREE.MeshBasicMaterial({ color: 0xffd3e2, transparent: true, opacity: 0.75, fog: false }));
      s.scale.set(6 + Math.random() * 6, 2 + Math.random() * 1.5, 3); s.position.set(k * 5 - 8, Math.random() * 1.5, 0); c.add(s);
    }
    c.position.set(-120 + i * 30, 28 + Math.random() * 18, -150 + Math.random() * 20); scene.add(c); clouds.push(c);
  }

  // ring floor
  const floor = part(cyl(13, 13.8, 1.2, 72), 0xe6d3bd, { w: 2 }); floor.position.y = -0.6; scene.add(floor);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(10.4, 72), toon(0xd8c0a6)); inner.rotation.x = -Math.PI / 2; inner.position.y = 0.004; scene.add(inner);
  const lineMat = basic(0x9c2f4f);
  [[10.4, 10.7, 72], [4.2, 4.38, 56], [1.3, 1.46, 6]].forEach(([a, b, s]) => { const m = new THREE.Mesh(new THREE.RingGeometry(a, b, s), lineMat); m.rotation.x = -Math.PI / 2; m.position.y = 0.01; scene.add(m); });
  for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 3.2), lineMat); m.rotation.x = -Math.PI / 2; m.position.set(s * 2.6, 0.012, 0); scene.add(m); }

  // torii
  const tor = G(); tor.position.set(0, 0, -11); scene.add(tor);
  for (const s of [-1, 1]) {
    const p = part(cyl(0.34, 0.4, 6.2, 20), 0xc8323c, { w: 2 }); p.position.set(s * 4.2, 3.1, 0); tor.add(p);
    const foot = part(cyl(0.48, 0.5, 0.5, 20), 0x2a1a20, { w: 2 }); foot.position.set(s * 4.2, 0.25, 0); tor.add(foot);
  }
  const kasagi = part(rbox(11.5, 0.55, 0.8, 0.16), 0x2a1a20, { w: 2 }); kasagi.position.y = 6.45; tor.add(kasagi);
  for (const s of [-1, 1]) { const tip = part(rbox(1.2, 0.5, 0.82, 0.16), 0x2a1a20, { w: 2 }); tip.position.set(s * 5.9, 6.6, 0); tip.rotation.z = s * 0.12; tor.add(tip); }
  const shimaki = part(rbox(10.8, 0.4, 0.7, 0.1), 0xc8323c, { w: 2 }); shimaki.position.y = 6.0; tor.add(shimaki);
  const nuki = part(rbox(9.6, 0.38, 0.5, 0.1), 0xc8323c, { w: 2 }); nuki.position.y = 5.0; tor.add(nuki);
  const gaku = part(rbox(1.1, 1.1, 0.2, 0.06), 0x2a1a20, { w: 1.6 }); gaku.position.set(0, 5.5, 0.3); tor.add(gaku);
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.75), basic(0xf2c14e)); plaque.position.set(0, 5.5, 0.41); tor.add(plaque);

  // cherry trees
  [[-13.5, -9], [13.5, -9], [-19, -15], [19, -15]].forEach(([x, z], i) => {
    const t = G(); t.position.set(x, 0, z); scene.add(t);
    const trunk = part(cyl(0.32, 0.55, 4.5, 12), 0x4a2a2e, { w: 2 }); trunk.position.y = 2.25; trunk.rotation.z = (i % 2 ? -1 : 1) * 0.12; t.add(trunk);
    for (let k = 0; k < 6; k++) {
      const f = part(sph(1.4 + Math.random() * 1.0, 18, 14), k % 2 ? 0xffb3cf : 0xff92bb, { w: 2.4 });
      f.position.set((Math.random() - 0.5) * 3.4, 4.6 + Math.random() * 1.8, (Math.random() - 0.5) * 2.4); t.add(f);
    }
  });

  // stone lanterns
  for (const s of [-1, 1]) {
    const l = G(); l.position.set(s * 10.6, 0, -4); scene.add(l);
    const base = part(rbox(0.9, 0.3, 0.9, 0.06), 0x8a8494, { w: 1.4 }); base.position.y = 0.15; l.add(base);
    const post = part(cyl(0.15, 0.2, 1.4, 14), 0x8a8494, { w: 1.4 }); post.position.y = 1.0; l.add(post);
    const light = part(rbox(0.6, 0.5, 0.6, 0.06), 0, { w: 1.4, mat: basic(0xffd27a) }); light.position.y = 1.95; l.add(light);
    const roof = part(cone(0.7, 0.45, 4), 0x6c6676, { w: 1.4 }); roof.position.y = 2.45; roof.rotation.y = Math.PI / 4; l.add(roof);
    const gl = new THREE.Mesh(sph(1, 14, 10), glow(0xffb84a, 0.25)); gl.scale.setScalar(1.1); gl.position.y = 1.95; l.add(gl);
  }

  // petals
  const N = 420, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 50; pos[i * 3 + 1] = Math.random() * 16; pos[i * 3 + 2] = -18 + Math.random() * 26; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const petals = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffc4da, size: 0.14, transparent: true, opacity: 0.9, depthWrite: false }));
  scene.add(petals);

  return function updateStage(dt, t) {
    const a = petals.geometry.attributes.position, arr = a.array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i + 1] -= dt * (0.6 + (i % 7) * 0.08); arr[i] += dt * (0.5 + Math.sin(t + i) * 0.5);
      if (arr[i + 1] < 0) { arr[i + 1] = 16; arr[i] = (Math.random() - 0.5) * 50; }
      if (arr[i] > 25) arr[i] = -25;
    }
    a.needsUpdate = true;
    for (const c of clouds) { c.position.x += dt * 0.8; if (c.position.x > 150) c.position.x = -150; }
  };
}
