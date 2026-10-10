// 第三版影片算圖頁（實際座標版）
import { createWorld } from './world3.js';
import { SCENES, CHIPS } from './videoScript3.js';
import { camFrom, ease } from './anim.js';

const view = document.getElementById('view');
const world = createWorld(view, { pixelRatio: window.devicePixelRatio, preserve: true });
world.resize(view.clientWidth, view.clientHeight);
const { camera } = world;
const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

// 進度條
const bar = $('#chips');
CHIPS.forEach((c, i) => { const d = document.createElement('div'); d.className = 'chip'; d.innerHTML = `<b>${i + 1}</b>${c}`; bar.appendChild(d); });

// 每個參數在一幕裡的變化時段，讓事件依序發生
const UP = {
  volc: [0.0, 0.3], erupt: [0.0, 0.12], lake: [0.3, 0.9], guandu: [0.15, 0.75], gflow: [0.1, 0.45],
  cut: [0, 0.22], basin: [0.22, 0.6], uplift: [0.55, 0.9], arrBasin: [0.2, 0.3], arrUplift: [0.5, 0.6],
  rev: [0.15, 0.7], arrRev: [0.55, 0.7], trib: [0, 0.65], arrBack: [0, 0.15], capture: [0.1, 0.7], hl: [0.1, 0.5],
  a_erupt: [0.05, 0.2], a_block: [0.3, 0.45], a_lake: [0.75, 0.9], a_sink: [0.3, 0.45], a_uplift: [0.75, 0.9], a_fault: [0.35, 0.5],
  a_rev: [0.55, 0.7], a_dry2: [0.3, 0.45],
};
const DOWN = { erupt: [0, 0.35], lake: [0.15, 0.75], cut: [0, 0.2], trib: [0, 0.5] };
function tween(from, to, k, plain) {
  const out = {};
  for (const key in to) {
    const a = from[key] ?? 0, b = to[key];
    let w = plain ? [0, 1] : b > a ? (UP[key] || (key.startsWith('a_') ? [0.6, 0.8] : [0.05, 0.9])) : (DOWN[key] || [0, 0.25]);
    const t = clamp((k - w[0]) / (w[1] - w[0]), 0, 1);
    out[key] = a + (b - a) * ease(t);
  }
  return out;
}

let TL = null;
window.setup = (tl) => { TL = tl; };
const camAt = (sc, u) => ({ ...sc.cam, az: sc.cam.az + sc.drift * u });
const lerpCam = (a, b, k) => ({ az: lerp(a.az, b.az, k), el: lerp(a.el, b.el, k), dist: lerp(a.dist, b.dist, k), target: a.target.map((v, i) => lerp(v, b.target[i], k)) });

window.renderAt = (t) => {
  const scs = TL.scenes;
  let i = scs.findIndex((s) => t < s.end);
  if (i < 0) i = scs.length - 1;
  const T = scs[i], sc = SCENES[i], dur = T.end - T.start, local = t - T.start;
  const talk0 = T.lines[0].start - T.start, talkEnd = T.lines[T.lines.length - 1].end - T.start;

  // 地形：在旁白期間依序演出
  let S = sc.S;
  if (i > 0) {
    const from = SCENES[i - 1].S;
    if (sc.rewind) S = tween(from, sc.S, clamp((local - 0.3) / 2.6, 0, 1), true);
    else S = tween(from, sc.S, clamp((local - talk0 * 0.6) / Math.max(4, talkEnd - talk0 * 0.6 - 0.5), 0, 1), false);
  }
  world.setState(S);

  // 鏡頭
  let cam = camAt(sc, local / dur);
  if (i > 0) {
    const prev = camAt(SCENES[i - 1], 1);
    const k = ease(clamp(local / Math.min(2.6 + 1.2 * Math.abs(cam.az - prev.az), dur * 0.4), 0, 1));
    cam = lerpCam(prev, cam, k);
  }
  const c = camFrom(cam);
  camera.position.copy(c.pos);
  camera.lookAt(c.target);

  // 字幕、標題、進度條
  const line = T.lines.find((l) => t >= l.start - 0.05 && t < l.end + 0.3);
  $('#sub').style.opacity = line ? 1 : 0;
  if (line) $('#sub span').textContent = line.text;
  $('#badge .era').textContent = sc.badge;
  $('#badge .ttl').textContent = sc.title;
  const endStart = TL.total - TL.endCard;
  const showUI = !(i === 0 && local < talk0) && t < endStart;
  $('#badge').style.opacity = showUI ? 1 : 0;
  $('#chips').style.opacity = showUI ? 1 : 0;
  [...bar.children].forEach((d, k) => { d.className = 'chip' + (k === sc.chip ? ' on' : k < sc.chip ? ' done' : ''); });

  $('#titlecard').style.opacity = i === 0 ? clamp((talk0 - 0.3 - local) / 0.8, 0, 1) : 0;
  $('#rewind').style.opacity = sc.rewind ? clamp(Math.min(local / 0.4, (3.0 - local) / 0.6), 0, 1) : 0;
  $('#endcard').style.opacity = clamp((t - endStart) / 1.0, 0, 1);

  world.render(t);
  return true;
};
