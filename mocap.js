// Mixamo motion for the code-built characters (hero() / human()).
// Each clip is baked once into per-joint rotations for the rig (30 fps), shared by every character,
// so the player, NPCs and remote players all move with real motion capture at almost no cost.
import * as T from 'three';
import {loadFBX} from './vrm.js?v=19';

const DIR = 'models/anim/', FPS = 30;
// rig joint order: hips, spine, head, armL, elL, armR, elR, hipL, kneeL, hipR, kneeR, footL, footR (feet only on hero())
const SRC = ['Hips', 'Spine2', 'Head', 'LeftArm', 'LeftForeArm', 'RightArm', 'RightForeArm', 'LeftUpLeg', 'LeftLeg', 'RightUpLeg', 'RightLeg', 'LeftFoot', 'RightFoot'];
const PARENT = [-1, 0, 1, 1, 3, 1, 5, 0, 7, 0, 9, 8, 10];
const NJ = SRC.length;
// rig arms hang down at rest, Mixamo's are in a T-pose: C turns a hanging arm out to the side
const qz = a => new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), a);
const CORR = [null, null, null, qz(PI2()), qz(PI2()), qz(-PI2()), qz(-PI2()), null, null, null, null, null, null];
function PI2() { return Math.PI / 2 }

function bake(asset, range) {
  const src = T.AnimationClip.findByName(asset.animations, 'mixamo.com') || asset.animations[0];
  const bones = SRC.map(n => asset.getObjectByName('mixamorig' + n));
  if (!src || bones.some(b => !b)) return null;
  // remember the bind pose so the same FBX can still be retargeted onto a VRM afterwards
  const saved = []; asset.traverse(o => saved.push([o, o.position.clone(), o.quaternion.clone(), o.scale.clone()]));
  asset.updateMatrixWorld(true);
  const restInv = bones.map(b => b.getWorldQuaternion(new T.Quaternion()).invert());
  const p0 = bones[0].getWorldPosition(new T.Vector3()), k = .95 / Math.max(1e-3, p0.y);
  const t0 = range ? range[0] : 0, t1 = range ? Math.min(range[1], src.duration) : src.duration;
  const n = Math.max(2, Math.round((t1 - t0) * FPS) + 1);
  const q = new Float32Array(n * NJ * 4), p = new Float32Array(n * 3);
  const mixer = new T.AnimationMixer(asset), act = mixer.clipAction(src); act.play();
  const W = bones.map(() => new T.Quaternion()), inv = new T.Quaternion(), L = new T.Quaternion(), v = new T.Vector3(), up = new T.Vector3();
  let leanH = 0, leanC = 0; // average forward tilt of the pelvis and of the chest (character faces +Z)
  for (let i = 0; i < n; i++) {
    mixer.setTime(t0 + i / FPS); asset.updateMatrixWorld(true);
    for (let j = 0; j < NJ; j++) { bones[j].getWorldQuaternion(W[j]).multiply(restInv[j]); if (CORR[j]) W[j].multiply(CORR[j]) }
    for (let j = 0; j < NJ; j++) {
      if (PARENT[j] < 0) L.copy(W[j]); else L.copy(inv.copy(W[PARENT[j]]).invert()).multiply(W[j]);
      L.normalize().toArray(q, (i * NJ + j) * 4);
    }
    bones[0].getWorldPosition(v).sub(p0).multiplyScalar(k); v.toArray(p, i * 3);
    leanH += Math.asin(Math.max(-1, Math.min(1, up.set(0, 1, 0).applyQuaternion(W[0]).z))); leanC += Math.asin(Math.max(-1, Math.min(1, up.set(0, 1, 0).applyQuaternion(W[1]).z)));
  }
  // keep it in place: remove forward/sideways drift
  for (const ax of [0, 2]) { const a = p[ax], b = p[(n - 1) * 3 + ax]; for (let i = 0; i < n; i++) p[i * 3 + ax] -= a + (b - a) * i / (n - 1) }
  mixer.stopAllAction(); mixer.uncacheRoot(asset);
  for (const [o, ps, qs, sc] of saved) { o.position.copy(ps); o.quaternion.copy(qs); o.scale.copy(sc) }
  asset.updateMatrixWorld(true);
  return {n, dur: (n - 1) / FPS, q, p, leanH: leanH / n, leanC: leanC / n};
}

export const MX = {clips: {}, ready: false};
export async function loadMocap() {
  const want = [['walk'], ['run'], ['idle'], ['wave'], ['phone', [165 / 30, 570 / 30]], ['jump']];
  for (const [name, range] of want) {           // one at a time: keeps the first frames smooth
    const asset = await loadFBX(DIR + name + '.fbx');
    const c = asset && bake(asset, range);
    if (c) { if (name === 'jump') c.once = true; MX.clips[name] = c }
    if (MX.clips.walk && MX.clips.idle) MX.ready = true;
  }
  return MX;
}

// ---- per-character playback ----
const _e = new T.Euler(), _X = new T.Vector3(1, 0, 0), A = new Float32Array(NJ * 4), B = new Float32Array(NJ * 4), PA = new T.Vector3(), PB = new T.Vector3(), _q = new T.Quaternion();
function sample(c, t, out, pos) {
  const f = (c.once ? Math.min(t, c.dur) : (t % c.dur + c.dur) % c.dur) * FPS, i0 = Math.floor(f), i1 = Math.min(c.n - 1, i0 + 1), a = f - i0;
  for (let j = 0; j < NJ; j++) T.Quaternion.slerpFlat(out, j * 4, c.q, (i0 * NJ + j) * 4, c.q, (i1 * NJ + j) * 4, a);
  pos.set(c.p[i0 * 3] + (c.p[i1 * 3] - c.p[i0 * 3]) * a, c.p[i0 * 3 + 1] + (c.p[i1 * 3 + 1] - c.p[i0 * 3 + 1]) * a, c.p[i0 * 3 + 2] + (c.p[i1 * 3 + 2] - c.p[i0 * 3 + 2]) * a);
}
function pick(u, spd) {
  const C = MX.clips;
  if (u.air && C.jump) return 'jump';
  if (u.wave > 0 && spd < .2 && C.wave) return 'wave';
  if (u.pc && spd < .2 && C.phone) return 'phone';
  if (spd > 4.5 && C.run) return 'run';
  if (spd > .2) return 'walk';
  return 'idle';
}
const LOCO = {walk: 1, run: 1};
// Pose the rig from the clips. w = how much mocap to use (0 while sitting, so the bench pose stays procedural).
export function mocapPose(u, speed, dt, w) {
  if (!MX.ready || w <= .001) return false;
  const m = u.mx || (u.mx = {cur: 'idle', t: Math.random() * 10, prev: null, pt: 0, f: 1});
  const st = pick(u, speed);
  if (st !== m.cur) {
    const ph = LOCO[st] && LOCO[m.cur] ? (m.t % MX.clips[m.cur].dur) / MX.clips[m.cur].dur : 0;
    m.prev = m.cur; m.pt = m.t; m.cur = st; m.f = 0; m.t = st === 'jump' ? .25 * MX.clips.jump.dur : ph * MX.clips[st].dur;
  }
  const rate = s => s === 'walk' ? Math.min(1.5, Math.max(.8, speed / 2.4)) : s === 'run' ? Math.min(1.35, Math.max(.85, speed / 6.8)) : s === 'jump' ? 1.3 : 1;
  m.t += dt * rate(m.cur); if (m.prev) m.pt += dt * rate(m.prev);
  m.f = Math.min(1, m.f + dt / .2);
  sample(MX.clips[m.cur], m.t, A, PA);
  if (m.prev && m.f < 1) { sample(MX.clips[m.prev], m.pt, B, PB); const s = m.f * m.f * (3 - 2 * m.f);
    for (let j = 0; j < NJ; j++) T.Quaternion.slerpFlat(A, j * 4, B, j * 4, A, j * 4, s); PA.lerp(PB.lerp(PA, s), 1) } else m.prev = null;
  const R = u.arms[0].s > 0 ? [u.arms[0], u.arms[1]] : [u.arms[1], u.arms[0]], Lg = u.legs[0].s > 0 ? [u.legs[0], u.legs[1]] : [u.legs[1], u.legs[0]];
  const J = [u.hips, u.spine, u.head, R[0].sh, R[0].el, R[1].sh, R[1].el, Lg[0].hp, Lg[0].kn, Lg[1].hp, Lg[1].kn, Lg[0].ft, Lg[1].ft];
  for (let j = 0; j < NJ; j++) if (J[j]) J[j].quaternion.slerp(_q.fromArray(A, j * 4), w);
  // the run clip leans far forward, which looks like falling on these characters: stand most of it back up
  m.lw = (m.lw || 0) + ((m.cur === 'run' ? 1 : 0) - (m.lw || 0)) * Math.min(1, dt * 6);
  const rc = MX.clips.run;
  if (rc && m.lw > .01) { const k = m.lw * w;
    u.hips.quaternion.premultiply(_q.setFromAxisAngle(_X, -rc.leanH * .7 * k));
    u.spine.quaternion.premultiply(_q.setFromAxisAngle(_X, -(rc.leanC - rc.leanH) * .65 * k));
    u.head.quaternion.premultiply(_q.setFromAxisAngle(_X, Math.max(0, rc.leanC) * .55 * k)); }
  // calmer hips: much less side-to-side shift, twist and roll than the raw clip (which reads as shaking)
  _e.setFromQuaternion(u.hips.quaternion, 'YXZ'); _e.y *= .35; _e.z *= .3; u.hips.quaternion.setFromEuler(_e);
  u.hips.position.x += (PA.x * .25 - u.hips.position.x) * w;
  u.hips.position.y += (.95 + PA.y - u.hips.position.y) * w;
  u.hips.position.z += (PA.z - u.hips.position.z) * w;
  return true;
}
