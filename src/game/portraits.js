// Renders a bust portrait of each character once (offscreen) and stores it as a data URL on the def.
import * as THREE from 'three';
import { ROSTER } from './roster';
import { buildModel, disposeModel } from './models';
import { P0, stance, applyPose } from './poses';

export function makePortraits() {
  if (ROSTER.every(d => d.portrait)) return;
  let pr;
  try {
    pr = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    pr.setPixelRatio(1); pr.setSize(256, 256); pr.setClearColor(0x000000, 0);
    const ps = new THREE.Scene();
    ps.add(new THREE.HemisphereLight(0xfff0f5, 0x553366, 0.7 * Math.PI));
    const dl = new THREE.DirectionalLight(0xffffff, 0.85 * Math.PI); dl.position.set(2, 3, 4); ps.add(dl);
    const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
    for (const def of ROSTER) {
      const rig = buildModel(def); rig.root.rotation.y = 0.4; ps.add(rig.root);
      applyPose(rig, stance(P0(), 0), 1); rig.head.rotation.y = -0.15;
      rig.root.updateMatrixWorld(true);
      const hp = new THREE.Vector3(); rig.head.getWorldPosition(hp); hp.y += 0.22 * def.scale;
      cam.position.set(hp.x + 0.75 * def.scale, hp.y + 0.05, hp.z + 2.3 * def.scale); cam.lookAt(hp.x, hp.y - 0.18 * def.scale, hp.z);
      pr.render(ps, cam); def.portrait = pr.domElement.toDataURL('image/png');
      ps.remove(rig.root); disposeModel(rig);
    }
  } catch (e) { /* portraits stay empty; cards still show the colour block */ }
  if (pr) { pr.dispose(); try { pr.forceContextLoss(); } catch (e) { /* ignore */ } }
}
