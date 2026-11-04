// Joint-rotation poses. Each pose writes Euler targets per joint; applyPose eases toward them.
export const JOINTS = ['hips', 'chest', 'head', 'lSh', 'lEl', 'rSh', 'rEl', 'lHip', 'lKnee', 'rHip', 'rKnee'];
export function P0() { const p = { hy: 0 }; for (const j of JOINTS) p[j] = [0, 0, 0]; return p; }
export function stance(p, t) {
  p.hy = -0.07 + Math.sin(t * 3.2) * 0.012; p.chest = [0.12, 0.35, 0]; p.head = [-0.04, -0.32, 0];
  p.lSh = [-0.75, 0, 0.22]; p.lEl = [-1.9, 0, 0]; p.rSh = [-0.95, 0, -0.22]; p.rEl = [-1.7, 0, 0];
  p.lHip = [-0.38, 0, 0.1]; p.lKnee = [0.5, 0, 0]; p.rHip = [0.28, 0, -0.1]; p.rKnee = [0.38, 0, 0];
  return p;
}
export function poseJump(p) { p.hy = 0; p.lHip = [-1.1, 0, 0.1]; p.lKnee = [1.7, 0, 0]; p.rHip = [-0.45, 0, -0.1]; p.rKnee = [1.3, 0, 0]; p.lSh = [-0.5, 0, 0.7]; p.rSh = [-0.5, 0, -0.7]; p.lEl = [-0.8, 0, 0]; p.rEl = [-0.8, 0, 0]; p.chest = [0.15, 0.2, 0]; }
export function poseGuard(p) { p.hy = -0.16; p.chest = [0.28, 0.1, 0]; p.head = [0.1, -0.1, 0]; p.lSh = [-1.35, 0, -0.4]; p.lEl = [-2.05, 0, 0]; p.rSh = [-1.3, 0, 0.4]; p.rEl = [-2.05, 0, 0]; p.lHip = [-0.65, 0, 0.12]; p.lKnee = [0.95, 0, 0]; p.rHip = [0.05, 0, -0.12]; p.rKnee = [0.85, 0, 0]; }
export function poseHurt(p) { p.hy = -0.06; p.chest = [-0.5, 0.1, 0.1]; p.head = [-0.4, 0, 0]; p.lSh = [0.3, 0, 0.6]; p.rSh = [0.3, 0, -0.6]; p.lEl = [-0.4, 0, 0]; p.rEl = [-0.4, 0, 0]; p.lHip = [0.15, 0, 0.1]; p.rHip = [-0.25, 0, -0.1]; p.lKnee = [0.3, 0, 0]; p.rKnee = [0.4, 0, 0]; }
export function poseFly(p) { p.hips = [-0.8, 0, 0]; p.hy = 0; p.chest = [-0.3, 0, 0]; p.head = [-0.3, 0, 0]; p.lSh = [-2.6, 0, 0.6]; p.rSh = [-2.4, 0, -0.7]; p.lEl = [-0.5, 0, 0]; p.rEl = [-0.3, 0, 0]; p.lHip = [-0.6, 0, 0.2]; p.rHip = [-0.2, 0, -0.2]; p.lKnee = [0.8, 0, 0]; p.rKnee = [0.4, 0, 0]; }
export function poseLie(p) { p.hips = [-1.52, 0, 0]; p.hy = -0.74; p.chest = [0, 0, 0]; p.head = [0.15, 0, 0.3]; p.lSh = [-2.9, 0, 0.5]; p.rSh = [-2.7, 0, -0.6]; p.lEl = [-0.3, 0, 0]; p.rEl = [-0.4, 0, 0]; p.lHip = [-0.05, 0, 0.25]; p.rHip = [-0.3, 0, -0.15]; p.lKnee = [0.2, 0, 0]; p.rKnee = [0.6, 0, 0]; }
export function poseWin(p, t) { p.hy = Math.sin(t * 2) * 0.01; p.chest = [-0.1, -0.2, 0]; p.head = [-0.15, 0.25, 0]; p.rSh = [-2.95, 0, -0.25]; p.rEl = [-0.2, 0, 0]; p.lSh = [0.1, 0, 0.35]; p.lEl = [-1.5, 0, 0]; p.lHip = [0, 0, 0.12]; p.rHip = [0, 0, -0.12]; }
export function poseUlt(p, t) { p.hy = 0.02 + Math.sin(t * 30) * 0.008; p.chest = [-0.25, 0, 0]; p.head = [-0.3, 0, 0]; p.rSh = [-2.6, 0, -0.7]; p.lSh = [-2.6, 0, 0.7]; p.rEl = [-0.3, 0, 0]; p.lEl = [-0.3, 0, 0]; p.lHip = [-0.2, 0, 0.25]; p.rHip = [0.1, 0, -0.25]; p.lKnee = [0.2, 0, 0]; }
export const POSES = {
  jab(p, ph) { if (ph === 'w') { p.rSh = [-0.7, 0, -0.3]; p.rEl = [-2.2, 0, 0]; p.chest = [0.1, 0.6, 0]; } else { p.rSh = [-1.55, 0, 0.05]; p.rEl = [-0.05, 0, 0]; p.chest = [0.2, -0.35, 0]; p.head = [-0.05, 0.1, 0]; } },
  jab2(p, ph) { if (ph === 'w') { p.lSh = [-0.7, 0, 0.3]; p.lEl = [-2.2, 0, 0]; p.chest = [0.1, -0.2, 0]; } else { p.lSh = [-1.55, 0, -0.05]; p.lEl = [-0.05, 0, 0]; p.chest = [0.2, 0.85, 0]; p.head = [-0.05, -0.6, 0]; } },
  upper(p, ph) { if (ph === 'w') { p.hy = -0.22; p.rSh = [-0.2, 0, -0.2]; p.rEl = [-2.3, 0, 0]; p.lKnee = [1.0, 0, 0]; p.rKnee = [0.9, 0, 0]; p.lHip = [-0.8, 0, 0.1]; p.chest = [0.35, 0.5, 0]; } else { p.hy = 0.06; p.rSh = [-2.9, 0, -0.1]; p.rEl = [-0.35, 0, 0]; p.chest = [-0.2, -0.4, 0]; p.head = [-0.2, 0.2, 0]; p.lHip = [-0.2, 0, 0.1]; p.lKnee = [0.2, 0, 0]; p.rHip = [0.3, 0, -0.1]; p.rKnee = [0.1, 0, 0]; } },
  kick(p, ph) { if (ph === 'w') { p.rHip = [-1.1, 0, -0.1]; p.rKnee = [2.0, 0, 0]; p.chest = [0.05, 0.2, 0]; } else { p.rHip = [-1.6, 0, -0.25]; p.rKnee = [0.05, 0, 0]; p.lKnee = [0.25, 0, 0]; p.lHip = [0, 0, 0.1]; p.chest = [-0.45, 0.3, 0]; p.lSh = [-0.3, 0, 0.9]; p.rSh = [-0.3, 0, -0.9]; p.lEl = [-0.4, 0, 0]; p.rEl = [-0.4, 0, 0]; } },
  slash(p, ph) { if (ph === 'w') { p.rSh = [-3.0, 0, -0.4]; p.rEl = [-0.9, 0, 0]; p.chest = [-0.15, 0.7, 0]; p.lSh = [-1.2, 0, 0.3]; } else { p.rSh = [-0.7, 0, 0.25]; p.rEl = [-0.15, 0, 0]; p.chest = [0.45, -0.55, 0]; p.lHip = [-0.75, 0, 0.1]; p.lKnee = [0.75, 0, 0]; p.hy = -0.16; } },
  smash(p, ph) { if (ph === 'w') { p.rSh = [-0.9, 0, -1.1]; p.rEl = [-1.6, 0, 0]; p.chest = [0, 0.95, 0]; p.hy = -0.1; } else { p.rSh = [-1.6, 0, 0.15]; p.rEl = [0, 0, 0]; p.chest = [0.35, -0.65, 0]; p.lHip = [-0.7, 0, 0.1]; p.lKnee = [0.7, 0, 0]; p.hy = -0.17; } },
  airKick(p, ph) { p.hy = 0; p.lHip = [-1.0, 0, 0.1]; p.lKnee = [1.7, 0, 0]; if (ph === 'w') { p.rHip = [-0.6, 0, 0]; p.rKnee = [1.9, 0, 0]; } else { p.rHip = [-1.25, 0, -0.1]; p.rKnee = [0.05, 0, 0]; p.chest = [-0.3, 0.2, 0]; } },
  airSmash(p, ph) { p.hy = 0; p.lHip = [-0.9, 0, 0.1]; p.lKnee = [1.4, 0, 0]; p.rHip = [-0.5, 0, 0]; p.rKnee = [1.2, 0, 0]; if (ph === 'w') { p.rSh = [-3.0, 0, -0.3]; p.lSh = [-3.0, 0, 0.3]; p.rEl = [-0.6, 0, 0]; p.lEl = [-0.6, 0, 0]; p.chest = [-0.3, 0, 0]; } else { p.rSh = [-0.9, 0, -0.1]; p.lSh = [-0.9, 0, 0.1]; p.rEl = [0, 0, 0]; p.lEl = [0, 0, 0]; p.chest = [0.55, 0, 0]; } },
  cast(p, ph) { p.hy = -0.12; p.lHip = [-0.65, 0, 0.1]; p.lKnee = [0.6, 0, 0]; if (ph === 'w') { p.rSh = [0.6, 0, -0.3]; p.lSh = [0.6, 0, 0.3]; p.rEl = [-1.2, 0, 0]; p.lEl = [-1.2, 0, 0]; p.chest = [-0.1, 0.6, 0]; } else { p.rSh = [-1.55, 0, 0.18]; p.lSh = [-1.55, 0, -0.18]; p.rEl = [-0.1, 0, 0]; p.lEl = [-0.1, 0, 0]; p.chest = [0.15, 0, 0]; p.head = [0, 0, 0]; } },
  slam(p, ph) { if (ph === 'w') { p.hy = 0.04; p.rSh = [-3.0, 0, -0.2]; p.lSh = [-3.0, 0, 0.2]; p.rEl = [-0.5, 0, 0]; p.lEl = [-0.5, 0, 0]; p.chest = [-0.3, 0, 0]; } else { p.hy = -0.32; p.rSh = [-1.0, 0, -0.1]; p.lSh = [-1.0, 0, 0.1]; p.rEl = [0, 0, 0]; p.lEl = [0, 0, 0]; p.chest = [0.75, 0, 0]; p.lHip = [-0.9, 0, 0.15]; p.lKnee = [1.2, 0, 0]; p.rHip = [-0.2, 0, -0.15]; p.rKnee = [1.1, 0, 0]; } },
  dash(p) { p.hy = -0.18; p.rSh = [-1.55, 0, 0]; p.rEl = [0, 0, 0]; p.lSh = [0.5, 0, 0.4]; p.lEl = [-0.4, 0, 0]; p.chest = [0.35, -0.7, 0]; p.lHip = [-0.9, 0, 0.1]; p.lKnee = [0.8, 0, 0]; p.rHip = [0.5, 0, -0.1]; p.rKnee = [0.3, 0, 0]; },
};
export function applyPose(rig, p, k) {
  for (const j of JOINTS) { const r = rig[j].rotation, v = p[j]; r.x += (v[0] - r.x) * k; r.y += (v[1] - r.y) * k; r.z += (v[2] - r.z) * k; }
  rig.hips.position.y += (0.95 + p.hy - rig.hips.position.y) * k;
}
