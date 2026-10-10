// 互動網頁：可 360 度旋轉，按按鈕一步一步看基隆河的搶水大戰
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createWorld } from './world.js';
import { STAGES } from './stages.js';
import { camFrom, tweenState, ease } from './anim.js';

const view = document.getElementById('view');
const world = createWorld(view);
const { camera, renderer } = world;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 6;
controls.maxDistance = 70;
controls.maxPolarAngle = Math.PI * 0.49;
controls.autoRotateSpeed = 1.2;

function resize() {
  const w = view.clientWidth, h = view.clientHeight;
  const panel = document.getElementById('panel').getBoundingClientRect();
  const bar = document.getElementById('bar').getBoundingClientRect();
  if (w > 820) world.resize(w, h, (panel.width + 16) / 2, bar.height / 2);
  else world.resize(w, h, 0, -(h - panel.top) / 2 + bar.height / 2);
}
window.addEventListener('resize', resize);
resize();

// ---------- UI ----------
const $ = (s) => document.querySelector(s);
const chips = $('#chips');
STAGES.forEach((s, i) => {
  const b = document.createElement('button');
  b.className = 'chip';
  b.innerHTML = `<span class="n">${i + 1}</span><span class="t">${s.title}</span>`;
  b.onclick = () => go(i);
  chips.appendChild(b);
});

let cur = -1;
let tw = null;     // 地形狀態補間
let camTw = null;  // 鏡頭補間

function currentSph() {
  const d = camera.position.clone().sub(controls.target);
  const dist = d.length();
  return { az: Math.atan2(d.x, d.z), el: Math.asin(d.y / dist) * 180 / Math.PI, dist, target: controls.target.toArray() };
}
function flyTo(cam, dur) {
  const a = currentSph();
  let daz = cam.az - a.az;
  daz = Math.atan2(Math.sin(daz), Math.cos(daz)); // 走最短的方向
  // 直式螢幕（手機）視野比較窄，鏡頭要拉遠一點
  const narrow = Math.min(2.6, Math.max(1, 1.5 / (view.clientWidth / view.clientHeight)));
  camTw = { a, b: { ...cam, az: a.az + daz, dist: cam.dist * narrow }, t0: performance.now(), dur };
}

function go(i) {
  i = Math.max(0, Math.min(STAGES.length - 1, i));
  const st = STAGES[i];
  const forward = i === cur + 1;
  tw = { from: { ...world.getState() }, to: st.S, t0: performance.now(), dur: forward ? 5200 : 3200 };
  flyTo(st.cam, 2600);
  cur = i;
  renderPanel();
}

function renderPanel() {
  const st = STAGES[cur];
  $('#era').textContent = `第 ${cur + 1} 步・${st.era}`;
  $('#title').textContent = st.title;
  $('#points').innerHTML = st.points.map((p) => `<li>${p}</li>`).join('');
  $('#tip').textContent = '💡 ' + st.tip;
  const next = STAGES[cur + 1];
  $('#next').innerHTML = next ? `下一步：${next.btn} ▶` : '🔄 從頭再看一次';
  $('#prev').disabled = cur === 0;
  [...chips.children].forEach((c, k) => { c.classList.toggle('on', k === cur); c.classList.toggle('done', k < cur); });
  $('#replay').textContent = `⟲ 重播「${st.title}」`;
}

$('#next').onclick = () => go(cur + 1 < STAGES.length ? cur + 1 : 0);
$('#prev').onclick = () => go(cur - 1);
$('#replay').onclick = () => {
  if (cur === 0) return go(0);
  world.setState(STAGES[cur - 1].S);
  cur -= 1;
  go(cur + 1);
};
$('#rotate').onclick = (e) => { controls.autoRotate = !controls.autoRotate; e.currentTarget.classList.toggle('on', controls.autoRotate); };
$('#cut').onclick = () => {
  const s = world.getState();
  tw = { from: { ...s }, to: { ...s, cut: s.cut > 0.5 ? 0 : 1 }, t0: performance.now(), dur: 1500, plain: true };
};
let places = true;
$('#names').onclick = (e) => { places = !places; world.setPlacesVisible(places); e.currentTarget.classList.toggle('on', places); };
$('#home').onclick = () => flyTo(STAGES[cur].cam, 1500);
$('#top').onclick = () => flyTo({ az: currentSph().az, el: 88, dist: 24, target: [0, 0, -0.5] }, 1500);
$('#panelToggle').onclick = () => { document.body.classList.toggle('collapsed'); resize(); };

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); $('#next').click(); }
  if (e.key === 'ArrowLeft') $('#prev').click();
});

// ---------- 主迴圈 ----------
const compass = $('#compass .needle');
const t00 = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  if (tw) {
    const k = Math.min(1, (now - tw.t0) / tw.dur);
    world.setState(tweenState(tw.from, tw.to, k, tw.plain));
    if (k >= 1) tw = null;
  }
  if (camTw) {
    const k = ease(Math.min(1, (now - camTw.t0) / camTw.dur));
    const { a, b } = camTw, L = (x, y) => x + (y - x) * k;
    const c = camFrom({ az: L(a.az, b.az), el: L(a.el, b.el), dist: L(a.dist, b.dist), target: a.target.map((v, j) => L(v, b.target[j])) });
    camera.position.copy(c.pos);
    controls.target.copy(c.target);
    if (k >= 1) camTw = null;
  }
  controls.update();
  const az = Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z);
  compass.style.transform = `rotate(${az * 180 / Math.PI}deg)`;
  world.render((now - t00) / 1000);
}

world.setState(STAGES[0].S);
const c0 = camFrom(STAGES[0].cam);
camera.position.copy(c0.pos).add(new THREE.Vector3(6, 6, 6));
controls.target.copy(c0.target);
go(0);
requestAnimationFrame(loop);
