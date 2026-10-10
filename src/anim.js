import * as THREE from 'three';

export const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function camFrom({ az, el, dist, target }) {
  const e = (el * Math.PI) / 180;
  const tg = new THREE.Vector3(...target);
  const pos = new THREE.Vector3(Math.sin(az) * Math.cos(e), Math.sin(e), Math.cos(az) * Math.cos(e)).multiplyScalar(dist).add(tg);
  return { pos, target: tg };
}

// 每個參數在整段動畫中「什麼時候開始、什麼時候結束」，讓事件依序發生
const WIN_UP = {
  cut: [0, 0.3], basin: [0.25, 1], uplift: [0.1, 0.9], guandu: [0.05, 0.75], trib: [0, 0.5], capture: [0.45, 0.95], hl: [0.3, 0.8],
  arrBasin: [0.15, 0.35], arrUplift: [0, 0.25], arrBackD: [0.5, 0.75], arrBackC: [0, 0.2],
};
const WIN_DOWN = { cut: [0, 0.25], trib: [0, 0.6] };

export function tweenState(from, to, k, plain = false) {
  const out = {};
  for (const key in to) {
    const a = from[key] ?? 0, b = to[key];
    let w;
    if (plain) w = [0, 1];
    else if (b > a) w = WIN_UP[key] || (key.startsWith('a_') ? [0.65, 0.9] : [0, 1]);
    else w = WIN_DOWN[key] || [0, 0.3];
    const t = Math.min(1, Math.max(0, (k - w[0]) / (w[1] - w[0])));
    out[key] = a + (b - a) * ease(t);
  }
  return out;
}
