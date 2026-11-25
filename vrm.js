// VRoid / VRM player character support.
// The procedural rig (hero()/human()) keeps running game logic + animH(). If Mixamo clips are in
// models/anim/, they pose the VRM; otherwise the rig's joint rotations are copied onto its bones.
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {VRMLoaderPlugin, VRMUtils} from '@pixiv/three-vrm';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';

// ---- Mixamo animations (models/anim/*.fbx), retargeted onto any VRM ----
// Missing files are skipped; states without a clip fall back to the procedural rig.
const ANIM_DIR = 'models/anim/';
const ANIMS = ['idle', 'walk', 'run', 'sit', 'phone', 'wave'];
const MIXAMO = {
  mixamorigHips: 'hips', mixamorigSpine: 'spine', mixamorigSpine1: 'chest', mixamorigSpine2: 'upperChest',
  mixamorigNeck: 'neck', mixamorigHead: 'head',
  mixamorigLeftShoulder: 'leftShoulder', mixamorigLeftArm: 'leftUpperArm', mixamorigLeftForeArm: 'leftLowerArm', mixamorigLeftHand: 'leftHand',
  mixamorigRightShoulder: 'rightShoulder', mixamorigRightArm: 'rightUpperArm', mixamorigRightForeArm: 'rightLowerArm', mixamorigRightHand: 'rightHand',
  mixamorigLeftUpLeg: 'leftUpperLeg', mixamorigLeftLeg: 'leftLowerLeg', mixamorigLeftFoot: 'leftFoot', mixamorigLeftToeBase: 'leftToes',
  mixamorigRightUpLeg: 'rightUpperLeg', mixamorigRightLeg: 'rightLowerLeg', mixamorigRightFoot: 'rightFoot', mixamorigRightToeBase: 'rightToes',
  mixamorigLeftHandThumb1: 'leftThumbMetacarpal', mixamorigLeftHandThumb2: 'leftThumbProximal', mixamorigLeftHandThumb3: 'leftThumbDistal',
  mixamorigLeftHandIndex1: 'leftIndexProximal', mixamorigLeftHandIndex2: 'leftIndexIntermediate', mixamorigLeftHandIndex3: 'leftIndexDistal',
  mixamorigLeftHandMiddle1: 'leftMiddleProximal', mixamorigLeftHandMiddle2: 'leftMiddleIntermediate', mixamorigLeftHandMiddle3: 'leftMiddleDistal',
  mixamorigLeftHandRing1: 'leftRingProximal', mixamorigLeftHandRing2: 'leftRingIntermediate', mixamorigLeftHandRing3: 'leftRingDistal',
  mixamorigLeftHandPinky1: 'leftLittleProximal', mixamorigLeftHandPinky2: 'leftLittleIntermediate', mixamorigLeftHandPinky3: 'leftLittleDistal',
  mixamorigRightHandThumb1: 'rightThumbMetacarpal', mixamorigRightHandThumb2: 'rightThumbProximal', mixamorigRightHandThumb3: 'rightThumbDistal',
  mixamorigRightHandIndex1: 'rightIndexProximal', mixamorigRightHandIndex2: 'rightIndexIntermediate', mixamorigRightHandIndex3: 'rightIndexDistal',
  mixamorigRightHandMiddle1: 'rightMiddleProximal', mixamorigRightHandMiddle2: 'rightMiddleIntermediate', mixamorigRightHandMiddle3: 'rightMiddleDistal',
  mixamorigRightHandRing1: 'rightRingProximal', mixamorigRightHandRing2: 'rightRingIntermediate', mixamorigRightHandRing3: 'rightRingDistal',
  mixamorigRightHandPinky1: 'rightLittleProximal', mixamorigRightHandPinky2: 'rightLittleIntermediate', mixamorigRightHandPinky3: 'rightLittleDistal',
};
const fbx = new FBXLoader();
const fbxCache = new Map();
const loadFBX = url => { if (!fbxCache.has(url)) fbxCache.set(url, fbx.loadAsync(url).catch(() => null)); return fbxCache.get(url) };

// Convert a Mixamo clip to the VRM's normalized bones (same approach as three-vrm's Mixamo example).
function retarget(asset, vrm, scale) {
  const src = T.AnimationClip.findByName(asset.animations, 'mixamo.com') || asset.animations[0];
  const srcHips = asset.getObjectByName('mixamorigHips');
  if (!src || !srcHips) return null;
  const v0 = vrm.meta && vrm.meta.metaVersion === '0';
  const restInv = new T.Quaternion(), parentRest = new T.Quaternion(), q = new T.Quaternion(), v = new T.Vector3();
  const vrmHipsH = Math.abs(vrm.humanoid.getNormalizedBoneNode('hips').getWorldPosition(v).y - vrm.scene.getWorldPosition(new T.Vector3()).y) / scale;
  const posScale = vrmHipsH / srcHips.position.y;
  const tracks = [];
  for (const tr of src.tracks) {
    const [rigName, prop] = tr.name.split('.');
    const node = vrm.humanoid.getNormalizedBoneNode(MIXAMO[rigName]);
    const rigNode = asset.getObjectByName(rigName);
    if (!node || !rigNode) continue;
    rigNode.getWorldQuaternion(restInv).invert();
    rigNode.parent.getWorldQuaternion(parentRest);
    if (tr instanceof T.QuaternionKeyframeTrack) {
      const vals = tr.values.slice();
      for (let i = 0; i < vals.length; i += 4) {
        q.fromArray(vals, i).premultiply(parentRest).multiply(restInv).toArray(vals, i);
        if (v0) { vals[i] = -vals[i]; vals[i + 2] = -vals[i + 2] }
      }
      tracks.push(new T.QuaternionKeyframeTrack(node.name + '.' + prop, tr.times, vals));
    } else if (tr instanceof T.VectorKeyframeTrack && rigName === 'mixamorigHips') {
      const vals = tr.values.map((x, i) => (v0 && i % 3 !== 1 ? -x : x) * posScale);
      // keep the clip in place: remove any forward/sideways drift (the rig moves the character)
      const n = vals.length / 3;
      for (const ax of [0, 2]) { const a = vals[ax], b = vals[(n - 1) * 3 + ax]; for (let k = 0; k < n; k++) vals[k * 3 + ax] -= a + (b - a) * (n > 1 ? k / (n - 1) : 0) }
      tracks.push(new T.VectorKeyframeTrack(node.name + '.' + prop, tr.times, vals));
    }
  }
  return new T.AnimationClip(src.name, src.duration, tracks);
}

async function loadAnims(vrm) {
  const s = vrm.scene.scale.y, mixer = new T.AnimationMixer(vrm.scene), actions = {};
  vrm.scene.updateMatrixWorld(true);
  await Promise.all(ANIMS.map(async name => {
    const asset = await loadFBX(ANIM_DIR + name + '.fbx');
    let clip = asset && retarget(asset, vrm, s);
    if (clip && name === 'phone' && clip.duration > 19.5) clip = T.AnimationUtils.subclip(clip, 'phone', 165, 570, 30);
    if (!clip) return;
    const a = mixer.clipAction(clip);
    if (name === 'sit' || name === 'phone' || name === 'wave') a.clampWhenFinished = name === 'sit';
    actions[name] = a;
  }));
  return Object.keys(actions).length ? {mixer, actions, cur: null} : null;
}

// Pick the clip for this frame from the rig's state; null = use the procedural pose.
function pickState(A, u) {
  const spd = u.spd || 0;
  if (u.ss > .5) return A.actions.sit ? 'sit' : null;
  if (u.wave > 0 && spd < .2 && A.actions.wave) return 'wave';
  if (u.pc && spd < .2 && A.actions.phone) return 'phone';
  if (spd > 4.5) return A.actions.run ? 'run' : (A.actions.walk ? 'walk' : null);
  if (spd > .2) return A.actions.walk ? 'walk' : null;
  return A.actions.idle ? 'idle' : null;
}

const loader = new GLTFLoader();
loader.register(p => new VRMLoaderPlugin(p));
const cache = new Map();
const TARGET_H = 1.72; // roughly the procedural rig's height, so the camera framing still fits
const PI = Math.PI;
// Rig arms hang down; the VRM rest pose is a T-pose. d = rotation that lowers each arm.
const ARM_OUT = .16; // keep hands a little away from the hips/skirt
const DOWN = {left: -PI / 2 + ARM_OUT, right: PI / 2 - ARM_OUT};
const HAIR = {drag: .55, stiff: 1.8, grav: .6}; // calmer spring bones: less flying hair
const qz = d => new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), d);
const _e = new T.Euler(), _q = new T.Quaternion(), _v1 = new T.Vector3(), _v2 = new T.Vector3(), _v3 = new T.Vector3();

export function loadVRM(url) {
  if (cache.has(url)) return cache.get(url);
  const pr = loader.loadAsync(url).then(async g => {
    const vrm = g.userData.vrm;
    if (!vrm) throw new Error('Is file mein VRM nahi hai: ' + url);
    VRMUtils.removeUnnecessaryVertices(g.scene);
    if (VRMUtils.combineSkeletons) VRMUtils.combineSkeletons(g.scene);
    else if (VRMUtils.removeUnnecessaryJoints) VRMUtils.removeUnnecessaryJoints(g.scene);
    VRMUtils.rotateVRM0(vrm); // VRM 0.x faces -Z; make every model face +Z like the rig
    vrm.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false } });
    prep(vrm);
    vrm.scene.userData.mn.anim = await loadAnims(vrm);
    return vrm;
  });
  cache.set(url, pr);
  pr.catch(() => cache.delete(url));
  return pr;
}

function prep(vrm) {
  const H = vrm.humanoid, n = k => H.getNormalizedBoneNode(k);
  vrm.scene.updateMatrixWorld(true);
  const box = new T.Box3().setFromObject(vrm.scene), h = Math.max(.5, box.max.y - box.min.y), s = TARGET_H / h;
  vrm.scene.scale.setScalar(s);
  vrm.scene.position.y = -box.min.y * s;
  const hips = n('hips'), B = {};
  for (const k of ['hips', 'spine', 'chest', 'neck', 'head', 'leftUpperArm', 'leftLowerArm', 'rightUpperArm', 'rightLowerArm',
    'leftUpperLeg', 'leftLowerLeg', 'rightUpperLeg', 'rightLowerLeg', 'leftFoot', 'rightFoot', 'leftHand', 'rightHand']) B[k] = n(k);
  const f = vrm.meta && vrm.meta.metaVersion === '0' ? -1 : 1;
  const qd = {left: qz(DOWN.left * f), right: qz(DOWN.right * f)}, qdi = {left: qd.left.clone().invert(), right: qd.right.clone().invert()};
  // phone in the left hand, mapped from the rig's elbow frame into the VRM forearm frame
  let phone = null;
  if (B.leftLowerArm && B.leftHand) {
    const len = B.leftHand.position.length() * s; // forearm length in metres
    phone = new T.Mesh(new T.BoxGeometry(.05, .095, .009), new T.MeshStandardMaterial({color: 0x111111, emissive: 0x4aa8ff, emissiveIntensity: .9, roughness: .3}));
    phone.position.set(0, -(len + .02), .045 * f).applyQuaternion(qdi.left).multiplyScalar(1 / s);
    phone.quaternion.copy(qdi.left).multiply(new T.Quaternion().setFromEuler(new T.Euler(-.9 * f, 0, 0)));
    phone.scale.setScalar(1 / s);
    phone.visible = false;
    B.leftLowerArm.add(phone);
  }
  // spring bones were initialised at load scale; re-init at the new scale and damp them
  const sbm = vrm.springBoneManager;
  if (sbm) {
    for (const j of sbm.joints || []) {
      const st = j.settings; if (!st) continue;
      st.dragForce = Math.max(HAIR.drag, st.dragForce);
      st.stiffness = st.stiffness * HAIR.stiff;
      st.gravityPower = st.gravityPower * HAIR.grav;
      // simulate hair relative to the character, so walking/turning through the city
      // doesn't fling it like wind; only her own head and body motion sways it
      try { j.center = vrm.scene } catch (e) { }
    }
  }
  // phone held in the right hand for the Mixamo texting clip (palm-side, screen facing away from the palm)
  let phone2 = null;
  if (B.rightHand) {
    phone2 = new T.Mesh(new T.BoxGeometry(.05, .095, .009), phone ? phone.material : new T.MeshStandardMaterial({color: 0x111111, emissive: 0x4aa8ff, emissiveIntensity: .9}));
    const bx = new T.Vector3(0, 0, f), by = new T.Vector3(-f, 0, 0), bz = new T.Vector3(0, -1, 0);
    phone2.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(bx, by, bz));
    phone2.position.set(-.075 * f, -.022, 0).multiplyScalar(1 / s);
    phone2.scale.setScalar(1 / s);
    phone2.visible = false;
    vrm.scene.add(phone2);
  }
  // colour slots, found from VRoid's material names (Hair_00_HAIR, Tops_01_CLOTH, ...)
  const slots = {};
  vrm.scene.traverse(o => { if (!o.isMesh) return; for (const m of [].concat(o.material)) { const sl = slotOf(m.name || ''); if (sl) (slots[sl] = slots[sl] || new Set()).add(m) } });
  vrm.scene.userData.mn = {B, rest: hips.position.clone(), k: hips.position.y / .95, qd, qdi, phone, phone2, s, f, slots};
}

// Put a VRM on a rig: hide the rig's own meshes, keep its animation driving the VRM.
export function attachVRM(rig, vrm) {
  rig.traverse(o => { if (o.isMesh) o.visible = false });
  rig.add(vrm.scene);
  rig.userData.vrm = vrm;
  vrm.scene.visible = true;
  rig.updateMatrixWorld(true);
  if (vrm.springBoneManager && vrm.springBoneManager.reset) vrm.springBoneManager.reset();
}

// ---- colour customiser ----
function slotOf(n) {
  if (/EyeIris/i.test(n)) return 'eyes';
  if (/HAIR/.test(n)) return 'hair';
  if (/Tops|Onepiece/i.test(n)) return 'top';
  if (/Bottoms/i.test(n)) return 'bottom';
  if (/Shoes/i.test(n)) return 'shoes';
  if (/SKIN/.test(n)) return 'skin';
  return null;
}
export function vrmSlots(vrm) { const M = vrm.scene.userData.mn; return M ? Object.keys(M.slots) : [] }
// Greyscale copy of a texture, levels stretched so even black cloth can take any colour and keep its detail.
const greyCache = new WeakMap();
function grey(tex) {
  if (!tex || !tex.image) return null;
  if (greyCache.has(tex)) return greyCache.get(tex);
  const img = tex.image, w = img.width, h = img.height, c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, w, h), p = d.data;
  let hi = 0; for (let i = 0; i < p.length; i += 4) if (p[i + 3] > 8) { const l = .3 * p[i] + .59 * p[i + 1] + .11 * p[i + 2]; if (l > hi) hi = l }
  const k = 235 / Math.max(24, hi);
  for (let i = 0; i < p.length; i += 4) { const l = Math.min(255, (.3 * p[i] + .59 * p[i + 1] + .11 * p[i + 2]) * k); p[i] = p[i + 1] = p[i + 2] = l }
  x.putImageData(d, 0, 0);
  const t = tex.clone(); t.image = c; t.needsUpdate = true;
  greyCache.set(tex, t);
  return t;
}
// hex = null restores the model's own colour. Skin is a gentle multiply tint; other slots are recoloured.
export function recolor(vrm, slot, hex) {
  const M = vrm.scene.userData.mn; if (!M || !M.slots[slot]) return;
  for (const m of M.slots[slot]) {
    if (!m.userData.orig) m.userData.orig = {map: m.map, shadeTex: m.shadeMultiplyTexture, color: m.color ? m.color.clone() : null, shade: m.shadeColorFactor ? m.shadeColorFactor.clone() : null};
    const o = m.userData.orig, prevMap = m.map, prevShade = m.shadeMultiplyTexture;
    if (hex == null || slot === 'skin') { m.map = o.map; if ('shadeMultiplyTexture' in m) m.shadeMultiplyTexture = o.shadeTex }
    else { const g = grey(o.map); if (g) m.map = g; if ('shadeMultiplyTexture' in m && o.shadeTex) m.shadeMultiplyTexture = grey(o.shadeTex) || o.shadeTex }
    if (m.color && o.color) { m.color.copy(o.color); if (hex != null) m.color.multiply(new T.Color(hex)) }
    if (m.shadeColorFactor && o.shade) { m.shadeColorFactor.copy(o.shade); if (hex != null) m.shadeColorFactor.multiply(new T.Color(hex)) }
    if (m.map !== prevMap || m.shadeMultiplyTexture !== prevShade) m.needsUpdate = true; // only recompile when a texture swapped
  }
}

export function detachVRM(rig) {
  const v = rig.userData.vrm;
  if (!v) return;
  rig.remove(v.scene);
  rig.userData.vrm = null;
  rig.traverse(o => { if (o.isMesh) o.visible = true });
}

let F = 1; // 1 for VRM 1.0, -1 for VRM 0.x (mirrored axes)
let SK = 1; // per-frame smoothing factor: bones ease toward their target pose instead of snapping
const _t = new T.Quaternion();
const ease = (node, q) => { node.quaternion.slerp(q, SK) };
const setE = (node, x, y, z) => { if (node) ease(node, _t.setFromEuler(_e.set(x * F, y, z * F))) };
const ARM_SWING = .65; // the rig's arm swing is cartoonish on a real-proportioned body

export function driveVRM(vrm, u, dt) {
  const M = vrm.scene.userData.mn; if (!M) return;
  F = M.f;
  SK = 1 - Math.exp(-dt * 18);
  // teleports (start of game, leaving a vehicle, metro) would whip the hair: reset the springs on big jumps
  vrm.scene.getWorldPosition(_v3); if (M.last && M.last.distanceToSquared(_v3) > 4 && vrm.springBoneManager) vrm.springBoneManager.reset(); (M.last || (M.last = new T.Vector3())).copy(_v3);
  // Mixamo clip for this state, if one was loaded: crossfade to it and let the mixer pose the body
  const A = M.anim, st = A ? pickState(A, u) : null;
  if (st) {
    const next = A.actions[st], spd = u.spd || 0;
    if (A.cur !== next) { next.reset().setEffectiveWeight(1).fadeIn(.3).play(); if (A.cur) A.cur.fadeOut(.3); A.cur = next }
    next.timeScale = st === 'walk' ? Math.min(1.5, Math.max(.85, spd / 2.4)) : st === 'run' ? Math.min(2.1, Math.max(.85, spd / 5.7)) : 1;
    A.mixer.update(dt);
    if (M.phone) M.phone.visible = false;
    if (M.phone2) M.phone2.visible = false;
    face(vrm, u);
    vrm.update(dt);
    if (M.phone2 && st === 'phone' && M.B.leftHand && M.B.rightHand && M.B.head) { const B = M.B;
      vrm.scene.updateMatrixWorld(true);
      B.leftHand.getWorldPosition(_v1); B.rightHand.getWorldPosition(_v2); B.head.getWorldPosition(_v3);
      _v1.add(_v2).multiplyScalar(.5); _v2.subVectors(_v3, _v1).normalize(); _v1.addScaledVector(_v2, .03 * vrm.scene.parent.scale.x).y += .02;
      M.phone2.position.copy(vrm.scene.worldToLocal(_v1.clone())); M.phone2.lookAt(_v3); M.phone2.rotateX(-.35);
      M.phone2.visible = true;
    }
    return;
  }
  if (A && A.cur) { A.mixer.stopAllAction(); A.cur = null } // no clip for this state: procedural pose eases in
  const B = M.B, hp = u.hips, sp = u.spine, hd = u.head;
  if (B.hips) {
    B.hips.position.copy(M.rest);
    B.hips.position.y += (hp.position.y - .95) * M.k;
    setE(B.hips, hp.rotation.x, hp.rotation.y, hp.rotation.z);
  }
  if (B.chest) { setE(B.spine, sp.rotation.x * .6, sp.rotation.y * .6, sp.rotation.z * .6); setE(B.chest, sp.rotation.x * .4, sp.rotation.y * .4, sp.rotation.z * .4) }
  else setE(B.spine, sp.rotation.x, sp.rotation.y, sp.rotation.z);
  if (B.neck) { setE(B.neck, hd.rotation.x * .4, hd.rotation.y * .4, 0); setE(B.head, hd.rotation.x * .6, hd.rotation.y * .6, 0) }
  else setE(B.head, hd.rotation.x, hd.rotation.y, 0);
  // arms: rig side s=+1 is the character's left (+X when facing +Z)
  for (const A of u.arms) {
    const side = A.s > 0 ? 'left' : 'right', U = B[side + 'UpperArm'], L = B[side + 'LowerArm'];
    const swing = u.pw > .05 || u.wave > 0 ? 1 : ARM_SWING; // full pose for phone/wave, softer swing for walking
    if (U) ease(U, _t.setFromEuler(_e.set(A.sh.rotation.x * swing * F, A.sh.rotation.y, A.sh.rotation.z * F)).multiply(M.qd[side]));
    if (L) { _q.setFromEuler(_e.set(A.el.rotation.x * F, A.el.rotation.y, A.el.rotation.z * F)); ease(L, _t.copy(M.qdi[side]).multiply(_q).multiply(M.qd[side])) }
  }
  for (const Lg of u.legs) {
    const side = Lg.s > 0 ? 'left' : 'right', hx = Lg.hp.rotation.x, kx = Lg.kn.rotation.x;
    setE(B[side + 'UpperLeg'], hx, 0, Lg.hp.rotation.z);
    setE(B[side + 'LowerLeg'], kx, 0, 0);
    setE(B[side + 'Foot'], -(hx + kx) * .8, 0, 0); // keep the sole roughly level instead of pointing with the shin
  }
  if (M.phone) M.phone.visible = u.pw > .05;
  if (M.phone2) M.phone2.visible = false;
  face(vrm, u);
  vrm.update(dt); // spring bones (hair, hood, clothes) + expressions
}

function face(vrm, u) { // blink + eye movement from the rig's timers
  const em = vrm.expressionManager;
  if (em) em.setValue('blink', u.lidG && u.lidG.visible ? Math.min(1, u.lidG.scale.y) : 0);
  if (vrm.lookAt) { vrm.lookAt.yaw = u.gx * 12 * F; vrm.lookAt.pitch = u.gy * 10 }
}
