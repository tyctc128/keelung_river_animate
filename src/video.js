// 影片算圖頁：依照時間 t 畫出每一格（由 tools/make-video.mjs 逐格呼叫）
import { createWorld } from './world.js';
import { STAGES } from './stages.js';
import { SCENES } from './videoScript.js';
import { camFrom, tweenState, ease } from './anim.js';

const view = document.getElementById('view');
const world = createWorld(view, { pixelRatio: window.devicePixelRatio, preserve: true });
world.resize(view.clientWidth, view.clientHeight);
const { camera } = world;
const $ = (s) => document.querySelector(s);

let TL = null;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

function camAt(sc, u) {
  const c = sc.cam;
  return { az: c.az + sc.drift * u, el: c.el, dist: c.dist, target: c.target };
}
function lerpCam(a, b, k) {
  return { az: lerp(a.az, b.az, k), el: lerp(a.el, b.el, k), dist: lerp(a.dist, b.dist, k), target: a.target.map((v, i) => lerp(v, b.target[i], k)) };
}

window.setup = (timeline) => { TL = timeline; };

window.renderAt = (t) => {
  const scs = TL.scenes;
  let i = scs.findIndex((s) => t < s.end);
  if (i < 0) i = scs.length - 1;
  const T = scs[i], sc = SCENES[i];
  const dur = T.end - T.start, local = t - T.start;

  // 地形狀態
  const to = STAGES[sc.stage].S;
  let S;
  if (i === 0) S = to;
  else {
    const from = STAGES[SCENES[i - 1].stage].S;
    const rewind = i === 1;
    const D = rewind ? 3.0 : clamp(dur * 0.55, 4, 9);
    const k = clamp((local - (rewind ? 0.4 : 0.6)) / D, 0, 1);
    S = tweenState(from, to, k, rewind);
  }
  world.setState(S);

  // 鏡頭
  const u = local / dur;
  let cam = camAt(sc, u);
  if (i > 0) {
    const P = SCENES[i - 1];
    const prevEnd = camAt(P, 1);
    const k = ease(clamp(local / Math.min(2.6 + 1.2 * Math.abs(cam.az - prevEnd.az), dur * 0.45), 0, 1));
    cam = lerpCam(prevEnd, cam, k);
  }
  const c = camFrom(cam);
  camera.position.copy(c.pos);
  camera.lookAt(c.target);

  // 字幕與標題
  const line = T.lines.find((l) => t >= l.start - 0.05 && t < l.end + 0.3);
  $('#sub').style.opacity = line ? 1 : 0;
  if (line) $('#sub span').textContent = line.text;
  $('#badge .era').textContent = sc.badge;
  $('#badge .ttl').textContent = sc.title;
  const badgeOn = !(i === 0 && local < T.lines[0].start) && !(i === scs.length - 1 && t > T.end - TL.endCard);
  $('#badge').style.opacity = badgeOn ? 1 : 0;

  // 片頭、時光倒流、片尾
  const titleO = i === 0 ? clamp((T.lines[0].start - 0.3 - local) / 0.8, 0, 1) : 0;
  $('#titlecard').style.opacity = titleO;
  const rew = i === 1 ? clamp(Math.min(local / 0.4, (3.2 - local) / 0.6), 0, 1) : 0;
  $('#rewind').style.opacity = rew;
  const endO = clamp((t - (TL.total - TL.endCard)) / 1.0, 0, 1);
  $('#endcard').style.opacity = endO;

  world.render(t);
  return true;
};
