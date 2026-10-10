// 基隆河 3D 地質世界（第三版：地名、河道、海岸依實際座標排列）
// 三條古河：①平溪→瑞芳→焿子寮灣出海 ②八堵→基隆出海 ③台北盆地裡的河（與古新店溪）
// 事件：大屯火山堰塞成古台北湖 → 關渡決口 → 盆地下陷、八堵基隆間隆起 → 河水倒流 → 向源侵蝕 → 瑞芳襲奪
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export const BOX = { x0: -12, x1: 12, z0: -8, z1: 8, bottom: -2.8 };
const NX = 288, NZ = 192;
const CUT_Z = 3.6;
const BASIN_C = [(121.515 - 121.645) * (24 / 0.53), -(25.045 - 25.12) * (24 / 0.53) * 110.9 / 100.9];
const BASIN_R = [3.6, 2.9];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const bump = (t, a, b) => sstep(a, a + (b - a) * 0.3, t) * (1 - sstep(b - (b - a) * 0.3, b, t));

// ---------- 雜訊（值雜訊 + 分形） ----------
function hash(i, j) { const h = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return h - Math.floor(h); }
function vnoise(x, z) {
  const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j;
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  return lerp(lerp(hash(i, j), hash(i + 1, j), ux), lerp(hash(i, j + 1), hash(i + 1, j + 1), ux), uz) * 2 - 1;
}
function fbm(x, z) {
  let s = 0, a = 0.5, f = 0.42;
  for (let k = 0; k < 5; k++) {
    const c = Math.cos(k * 0.9), sn = Math.sin(k * 0.9);
    s += a * vnoise((x * c - z * sn) * f + k * 17.3, (x * sn + z * c) * f - k * 9.1);
    a *= 0.5; f *= 2.05;
  }
  return s;
}
function ridged(x, z) { const n = 1 - Math.abs(vnoise(x * 0.55 + 3.1, z * 0.55 - 7.7)); return n * n - 0.45; }

// ---------- 真實座標換算（經緯度 → 模型座標；x 往東、z 往南，約 0.45 單位/公里） ----------
const KX = 24 / 0.53, KZ = KX * 110.9 / 100.9;
export const P = (lon, lat) => [(lon - 121.645) * KX, -(lat - 25.12) * KZ];

// ---------- 地名（依 OpenStreetMap 實際座標） ----------
export const PLACES = {
  source:  { name: '菁桐（源頭）', p: P(121.723, 25.024) },
  sandiao: { name: '三貂嶺', p: P(121.822, 25.065) },
  houtong: { name: '猴硐', p: P(121.828, 25.087) },
  yuanshan:{ name: '員山子', p: P(121.832, 25.103) },
  ruifang: { name: '瑞芳', p: P(121.806, 25.109) },
  ruibin:  { name: '瑞濱（焿子寮）', p: P(121.842, 25.142), sea: true },
  nuannuan:{ name: '暖暖', p: P(121.748, 25.101) },
  badu:    { name: '八堵', p: P(121.729, 25.109) },
  keelung: { name: '基隆港', p: P(121.742, 25.165), sea: true },
  xizhi:   { name: '汐止', p: P(121.64, 25.065) },
  basin:   { name: '台北盆地', p: P(121.53, 25.06) },
  guandu:  { name: '關渡', p: P(121.465, 25.118) },
  tamsui:  { name: '淡水河口', p: P(121.40, 25.195), sea: true },
  datun:   { name: '大屯火山', p: P(121.55, 25.19) },
  xindian: { name: '古新店溪', p: P(121.545, 24.99) },
  sea:     { name: '東 海', p: P(121.72, 25.24), sea: true, big: true },
};

// ---------- 河道（依實際河道經過的地點） ----------
const LL = (arr) => arr.map(([lon, lat]) => P(lon, lat));
const RIVER_DEF = {
  // 上游：菁桐→十分→三貂嶺→猴硐→員山子
  A:  { pts: LL([[121.723, 25.024], [121.748, 25.028], [121.775, 25.042], [121.798, 25.051], [121.822, 25.065], [121.828, 25.087], [121.831, 25.104]]), w: 0.45 },
  // 古出口：員山子→瑞濱（焿子寮）出海
  B:  { pts: LL([[121.831, 25.104], [121.833, 25.116], [121.836, 25.127], [121.84, 25.142]]), w: 0.42 },
  // 支流：八堵→暖暖→四腳亭→瑞芳→員山子
  T:  { pts: LL([[121.729, 25.109], [121.748, 25.103], [121.763, 25.099], [121.785, 25.104], [121.806, 25.109], [121.82, 25.108], [121.831, 25.104]]), w: 0.42 },
  // 八堵的河（上段）：五堵→七堵→八堵
  M1: { pts: LL([[121.675, 25.078], [121.695, 25.085], [121.713, 25.093], [121.729, 25.109]]), w: 0.45 },
  // 八堵的河（往北出海段）：八堵→基隆港
  M2: { pts: LL([[121.729, 25.109], [121.734, 25.122], [121.74, 25.136], [121.743, 25.162]]), w: 0.42 },
  // 盆地裡的河：汐止東邊→汐止→南港→松山→大直→士林→社子
  C:  { pts: LL([[121.665, 25.074], [121.64, 25.065], [121.605, 25.055], [121.575, 25.06], [121.545, 25.08], [121.52, 25.09], [121.48, 25.085]]), w: 0.55 },
  // 盆地往北的古出口（穿過大屯火山區）
  O:  { pts: LL([[121.48, 25.085], [121.50, 25.13], [121.515, 25.17], [121.528, 25.215], [121.535, 25.24], [121.538, 25.285]]), w: 0.55 },
  // 關渡出口：社子→關渡→淡水→河口
  G:  { pts: LL([[121.48, 25.085], [121.465, 25.118], [121.44, 25.165], [121.41, 25.18], [121.39, 25.195]]), w: 0.6 },
  // 古新店溪：新店→公館→萬華→社子
  X:  { pts: LL([[121.545, 24.958], [121.54, 24.975], [121.535, 25.01], [121.495, 25.035], [121.48, 25.085]]), w: 0.55 },
};
function prepPath(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, len: cum[cum.length - 1] };
}
const PATHS = {};
for (const k in RIVER_DEF) PATHS[k] = { ...prepPath(RIVER_DEF[k].pts), w: RIVER_DEF[k].w };
const T_SANDIAO = PATHS.A.cum[4] / PATHS.A.len;
const T_GUANDU = PATHS.G.cum[1] / PATHS.G.len;

function nearest(path, x, z) {
  let best = 1e9, bt = 0;
  const { pts, cum, len } = path;
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i][0], az = pts[i][1], dx = pts[i + 1][0] - ax, dz = pts[i + 1][1] - az, l2 = dx * dx + dz * dz;
    const u = clamp(((x - ax) * dx + (z - az) * dz) / l2, 0, 1);
    const d = Math.hypot(x - ax - dx * u, z - az - dz * u);
    if (d < best) { best = d; bt = (cum[i] + u * Math.sqrt(l2)) / len; }
  }
  return { d: best, t: bt };
}
function pointAt(path, t) {
  const s = clamp(t, 0, 1) * path.len, { pts, cum } = path;
  let i = 0;
  while (i < pts.length - 2 && cum[i + 1] < s) i++;
  const L = cum[i + 1] - cum[i], u = L > 0 ? (s - cum[i]) / L : 0;
  const dx = (pts[i + 1][0] - pts[i][0]) / L, dz = (pts[i + 1][1] - pts[i][1]) / L;
  return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u, dx, dz];
}

// ---------- 海岸線（依實際海岸，含基隆港的狹長港灣） ----------
const COAST = LL([[121.30, 25.10], [121.375, 25.13], [121.395, 25.165], [121.41, 25.18], [121.44, 25.20], [121.47, 25.23], [121.50, 25.26],
  [121.56, 25.29], [121.60, 25.28], [121.635, 25.225], [121.67, 25.22], [121.69, 25.205], [121.71, 25.17], [121.725, 25.157],
  [121.736, 25.155], [121.739, 25.133], [121.744, 25.155], [121.76, 25.153], [121.78, 25.146], [121.80, 25.14], [121.82, 25.135],
  [121.835, 25.128], [121.86, 25.122], [121.88, 25.125], [122.0, 25.12]]);
function coastZ(x) {
  for (let i = 0; i < COAST.length - 1; i++) {
    const [ax, az] = COAST[i], [bx, bz] = COAST[i + 1];
    if (x <= bx) return lerp(az, bz, clamp((x - ax) / (bx - ax), 0, 1));
  }
  return COAST[COAST.length - 1][1];
}
function segDist(x, z, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const u = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1);
  return Math.hypot(x - ax - dx * u, z - az - dz * u);
}
const ridge = (x, z, a, b, w, h) => h * Math.exp(-((segDist(x, z, a[0], a[1], b[0], b[1]) / w) ** 2));
const cone = (x, z, c, r, h) => h * Math.exp(-(((x - c[0]) ** 2 + (z - c[1]) ** 2) / (r * r)));
const VOLC = P(121.548, 25.205);
const UPLIFT_C = P(121.736, 25.121);

function staticAt(x, z) {
  const n = fbm(x, z);
  const mtn = sstep(-2, 6, x);
  const land = sstep(-0.1, 0.55, z - coastZ(x));
  let hl = 1.05 + 1.0 * sstep(-1, 9, x) + 0.55 * sstep(1, 7, z) + 0.75 * n * (0.55 + 0.45 * mtn) + 0.7 * ridged(x, z) * mtn
    + 0.1 * vnoise(x * 3.1 + 5.2, z * 3.1 - 1.3) + 0.05 * vnoise(x * 6.3, z * 6.3);
  hl += cone(x, z, P(121.555, 25.19), 1.9, 0.85);                               // 大屯火山群
  hl += cone(x, z, P(121.425, 25.135), 0.95, 1.2);                             // 觀音山
  hl += ridge(x, z, P(121.40, 25.115), P(121.49, 25.135), 0.55, 0.7);           // 關渡兩側的山（觀音山～大屯山）
  hl += cone(x, z, P(121.862, 25.115), 0.7, 1.2);                              // 基隆山
  hl += ridge(x, z, P(121.59, 25.105), P(121.70, 25.13), 0.8, 0.55);            // 五指山一帶
  hl += ridge(x, z, P(121.818, 25.094), P(121.818, 25.12), 0.25, 0.55);         // 瑞芳～員山子之間的分水嶺
  hl += ridge(x, z, P(121.671, 25.058), P(121.671, 25.09), 0.3, 0.45);          // 汐止與五堵之間的分水嶺（位置示意）
  // 林口台地
  const lk = sstep(-9.3, -10.1, x) * sstep(0.2, 1.2, z);
  hl = lerp(hl, 1.45 + 0.08 * n, lk);
  // 台北盆地
  const e = Math.hypot((x - BASIN_C[0]) / BASIN_R[0], (z - BASIN_C[1]) / BASIN_R[1]);
  hl = lerp(hl, 1.05 + 0.05 * n, 1 - sstep(0.75, 1.3, e));
  const base = lerp(-0.95 + 0.25 * n, hl, land);
  // 半地塹：西側沿山腳斷層陡降，東側緩
  const ew = Math.hypot((x - BASIN_C[0]) / (x < BASIN_C[0] ? BASIN_R[0] * 0.9 : BASIN_R[0] * 1.1), (z - BASIN_C[1]) / BASIN_R[1]);
  let basinW = x < BASIN_C[0] ? 1 - sstep(0.88, 1.0, ew) : 1 - sstep(0.4, 1.25, ew);
  basinW *= lerp(1.0, 0.65, sstep(BASIN_C[0] - 1, BASIN_C[0] + 3, x));
  const upW = Math.exp(-(((x - UPLIFT_C[0]) ** 2) / 0.35 + ((z - UPLIFT_C[1]) ** 2) / 0.3)) * land;
  const vd = Math.hypot(x - VOLC[0], z - VOLC[1]);
  const v = {};
  for (const k in PATHS) { const r = nearest(PATHS[k], x, z); if (r.d < PATHS[k].w) v[k] = r; }
  return { base, land, basinW, upW, vd, e, v, n };
}

function knots(t, ks) {
  for (let i = 0; i < ks.length - 1; i++) if (t <= ks[i + 1][0]) return lerp(ks[i][1], ks[i + 1][1], (t - ks[i][0]) / (ks[i + 1][0] - ks[i][0]));
  return ks[ks.length - 1][1];
}
const M1_POST = 0.5;
const FLOOR = {
  A: (t, S) => lerp(1.7, 1.05, t) - 0.12 * S.capture * t,
  B: (t) => knots(t, [[0, 1.05], [0.55, 0.45], [0.8, 0.0], [1, -0.6]]),
  T: (t, S) => lerp(lerp(1.0, 0.85, S.rev), 1.05 - 0.12 * S.capture, t),
  M1: (t, S) => lerp(lerp(1.3, 1.0, t), lerp(M1_POST, 0.85, t), S.rev),
  M2: (t, S) => knots(t, [[0, 1.0], [0.5, 0.5], [0.75, 0.0], [1, -0.6]]) + 1.0 * S.uplift * bump(t, 0.05, 0.6),
  C: (t, S) => lerp(lerp(1.3, M1_POST, S.rev), 0.55 - 0.35 * S.guandu, sstep(0, 0.35, t)),
  O: (t, S) => knots(t, [[0, 0.55], [0.5, 0.42], [0.85, 0.0], [1, -0.6]]) + 1.9 * S.volc * bump(t, 0.2, 0.85),
  G: (t, S) => knots(t, [[0, 0.62], [T_GUANDU * 0.6, 0.85], [T_GUANDU, 0.98], [0.75, 0.3], [1, -0.6]])
    - S.guandu * knots(t, [[0, 0.42], [T_GUANDU * 0.6, 0.85], [T_GUANDU, 1.03], [0.75, 0.3], [1, 0]]),
  X: (t) => knots(t, [[0, 1.6], [0.5, 0.9], [1, 0.55]]),
};

function combine(st, S) {
  const tect = -(0.45 + 0.55 * S.basin) * st.basinW + 1.15 * S.uplift * st.upW;
  let h = st.base + tect;
  // 大屯火山：噴發長高、火口
  const volcH = S.volc * (1.5 * Math.exp(-((st.vd / 1.15) ** 2)) - 0.4 * Math.exp(-((st.vd / 0.28) ** 2)));
  h += volcH;
  const h0 = h;
  for (const k in st.v) {
    const { d, t } = st.v[k];
    let a = 1;
    if (k === 'T') a = clamp((S.trib - t) / 0.04, 0, 1);
    if (a <= 0) continue;
    const w = PATHS[k].w * (k === 'T' ? lerp(0.75, 1, S.capture) : 1);
    if (d >= w) continue;
    const f = FLOOR[k](t, S);
    const carved = f + (h - f) * sstep(0.16, w, d);
    if (carved < h) h = lerp(h, carved, a);
  }
  return { h, tect, cut: h0 - h, volc: volcH };
}
export function heightAt(x, z, S) { return combine(staticAt(x, z), S).h; }

export const ANN_KEYS = ['a_r1', 'a_r1sea', 'a_r2', 'a_r3', 'a_out', 'a_erupt', 'a_block', 'a_lake', 'a_gap', 'a_fault', 'a_sink',
  'a_uplift', 'a_rev', 'a_dry2', 'a_trib', 'a_divide', 'a_capture', 'a_dry', 'a_seg1', 'a_seg2', 'a_seg3'];
const GEO_KEYS = ['basin', 'uplift', 'volc', 'lake', 'guandu', 'rev', 'trib', 'capture', 'hl', 'gflow'];
export function baseState() {
  const S = { basin: 0, uplift: 0, volc: 0, erupt: 0, lake: 0, guandu: 0, gflow: 0, rev: 0, trib: 0.3, capture: 0, cut: 0,
    arrBasin: 0, arrUplift: 0, arrRev: 0, arrBack: 0, hl: 0 };
  for (const k of ANN_KEYS) S[k] = 0;
  return S;
}

// ---------- 著色 ----------
const STRATA_GLSL = /* glsl */`
varying float vWY; varying float vTect; varying float vCut;
uniform float uContour;
vec3 strataCol(float y){
  float k = (y + 2.8) / 0.32;
  float i = floor(k); float f = fract(k);
  float r = mod(i, 6.0);
  vec3 c = r < 0.5 ? vec3(0.80,0.58,0.36) : r < 1.5 ? vec3(0.93,0.78,0.52) : r < 2.5 ? vec3(0.62,0.42,0.30)
         : r < 3.5 ? vec3(0.88,0.82,0.66) : r < 4.5 ? vec3(0.52,0.38,0.29) : vec3(0.76,0.60,0.44);
  c *= 0.8 + 0.2 * smoothstep(0.0, 0.07, f) * smoothstep(1.0, 0.93, f);
  return pow(c, vec3(2.2));
}
`;
function makeGeoMaterial({ side = THREE.FrontSide, contour = 0 } = {}) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, side });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uContour = { value: contour };
    sh.vertexShader = 'attribute float tect; attribute float cutA;\nvarying float vWY; varying float vTect; varying float vCut;\n' + sh.vertexShader
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWY = transformed.y; vTect = tect; vCut = cutA;');
    sh.fragmentShader = STRATA_GLSL + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
diffuseColor.rgb = mix(diffuseColor.rgb, strataCol(vWY - vTect), clamp((vCut - 0.1) * 3.0, 0.0, 1.0));
if (uContour > 0.5 && vWY > 0.05) {
  float q = vWY / 0.2;
  float fw = max(fwidth(q), 1e-4);
  float line = 1.0 - smoothstep(0.5, 1.5, (0.5 - abs(fract(q) - 0.5)) / fw);
  diffuseColor.rgb *= mix(1.0, 0.85, line);
}`);
  };
  return m;
}

function flowTexture(color) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, 128, 64);
  g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(44, 12); g.lineTo(76, 32); g.lineTo(44, 52); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function makeArrow(color, len = 1.4, rad = 0.12) {
  const mat = new THREE.MeshLambertMaterial({ color, transparent: true, emissive: color, emissiveIntensity: 0.35 });
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, len * 0.6, 16), mat);
  shaft.position.y = len * 0.3;
  const head = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.6, len * 0.4, 20), mat);
  head.position.y = len * 0.8;
  g.add(shaft, head);
  g.userData.mat = mat;
  return g;
}

// ======================================================================
export function createWorld(container, { pixelRatio = Math.min(window.devicePixelRatio, 2), preserve = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: preserve });
  renderer.setPixelRatio(pixelRatio);
  renderer.localClippingEnabled = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.className = 'labels';
  container.appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  scene.add(new THREE.HemisphereLight(0xe2f2ff, 0x6a4a2a, 1.1));
  const sun = new THREE.DirectionalLight(0xfff6e8, 2.8);
  sun.position.set(-11, 10, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 14, bottom: -14, near: 1, far: 50 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.025;
  scene.add(sun);

  const clip = new THREE.Plane(new THREE.Vector3(0, 0, -1), BOX.z1 + 1);
  const clips = [clip];

  // --- 地形 ---
  const W = BOX.x1 - BOX.x0, D = BOX.z1 - BOX.z0;
  const nV = (NX + 1) * (NZ + 1);
  const pos = new Float32Array(nV * 3), col = new Float32Array(nV * 3), tectA = new Float32Array(nV), cutA = new Float32Array(nV), volA = new Float32Array(nV);
  const statics = new Array(nV);
  for (let j = 0, i = 0; j <= NZ; j++) for (let k = 0; k <= NX; k++, i++) {
    const x = BOX.x0 + W * k / NX, z = BOX.z0 + D * j / NZ;
    pos[i * 3] = x; pos[i * 3 + 2] = z;
    statics[i] = staticAt(x, z);
  }
  const idx = [];
  for (let j = 0; j < NZ; j++) for (let k = 0; k < NX; k++) {
    const a = j * (NX + 1) + k, b = a + 1, c = a + NX + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const tg = new THREE.BufferGeometry();
  tg.setIndex(idx);
  tg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  tg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  tg.setAttribute('tect', new THREE.BufferAttribute(tectA, 1));
  tg.setAttribute('cutA', new THREE.BufferAttribute(cutA, 1));
  const terrainMat = makeGeoMaterial({ contour: 1 });
  terrainMat.clippingPlanes = clips;
  const terrain = new THREE.Mesh(tg, terrainMat);
  terrain.castShadow = terrain.receiveShadow = true;
  scene.add(terrain);

  const C = (hex) => new THREE.Color(hex);
  const cSeaBed = C('#b5a47a'), cBeach = C('#eedfae'), cLow = C('#9ccf62'), cMid = C('#5aa548'), cHigh = C('#2f7a3c'), cPeak = C('#58784a'),
    cPlain = C('#dfe39a'), cRock = C('#9a8366'), cLava = C('#5d5550'), cAsh = C('#8d8478'), tmp = new THREE.Color(), tmp2 = new THREE.Color();

  // --- 側面地層牆 ---
  const wallMat = makeGeoMaterial({ side: THREE.DoubleSide });
  wallMat.clippingPlanes = clips;
  const waterSideMat = new THREE.MeshLambertMaterial({ color: 0x3f9fe0, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  waterSideMat.clippingPlanes = clips;
  function makeWall(n) {
    const ix = [];
    for (let i = 0; i < n - 1; i++) { const a = i * 2; ix.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
    const g = new THREE.BufferGeometry();
    g.setIndex(ix);
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 6).fill(1), 3));
    g.setAttribute('tect', new THREE.BufferAttribute(new Float32Array(n * 2), 1));
    g.setAttribute('cutA', new THREE.BufferAttribute(new Float32Array(n * 2).fill(1), 1));
    const wg = new THREE.BufferGeometry();
    wg.setIndex(ix.slice());
    wg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3));
    const m = new THREE.Mesh(g, wallMat), wm = new THREE.Mesh(wg, waterSideMat);
    scene.add(m, wm);
    return { mesh: m, water: wm, n };
  }
  function fillWall(wall, xs, zs, hs, ts, lv) {
    const p = wall.mesh.geometry.attributes.position.array, ta = wall.mesh.geometry.attributes.tect.array, wp = wall.water.geometry.attributes.position.array;
    for (let i = 0; i < wall.n; i++) {
      const x = xs[i], z = zs[i], h = hs[i];
      p.set([x, h, z, x, BOX.bottom, z], i * 6);
      ta[i * 2] = ta[i * 2 + 1] = ts[i];
      const top = Math.max(h, lv ? Math.max(0, lv[i]) : 0);
      wp.set([x, top, z, x, Math.min(h, top), z], i * 6);
    }
    for (const g of [wall.mesh.geometry, wall.water.geometry]) {
      for (const k in g.attributes) g.attributes[k].needsUpdate = true;
      g.computeVertexNormals(); g.computeBoundingSphere();
    }
  }
  const edgeIds = {
    S: Array.from({ length: NX + 1 }, (_, k) => NZ * (NX + 1) + k),
    N: Array.from({ length: NX + 1 }, (_, k) => k),
    W: Array.from({ length: NZ + 1 }, (_, j) => j * (NX + 1)),
    E: Array.from({ length: NZ + 1 }, (_, j) => j * (NX + 1) + NX),
  };
  const edges = Object.values(edgeIds).map((ids) => ({ ids, wall: makeWall(ids.length) }));
  const cutWall = makeWall(NX + 1);

  // --- 海、湖 ---
  const waterMat = new THREE.MeshPhongMaterial({ color: 0x2b8ad6, transparent: true, opacity: 0.74, shininess: 90, depthWrite: false });
  waterMat.clippingPlanes = clips;
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(W, D).rotateX(-Math.PI / 2), waterMat);
  sea.position.set(0, 0, 0);
  sea.renderOrder = 2;
  scene.add(sea);
  const lakeMat = new THREE.MeshPhongMaterial({ color: 0x3aa6d8, transparent: true, opacity: 0.82, shininess: 90, depthWrite: false });
  lakeMat.clippingPlanes = clips;
  const lake = new THREE.Mesh(new THREE.CircleGeometry(1, 72).rotateX(-Math.PI / 2), lakeMat);
  lake.scale.set(BASIN_R[0] * 1.25, 1, BASIN_R[1] * 1.25);
  lake.position.set(BASIN_C[0], 0.9, BASIN_C[1]);
  lake.renderOrder = 2;
  scene.add(lake);
  const lakeLevel = (S) => lerp(0.4, 0.99, S.lake);

  // --- 火山：火口光、煙 ---
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 12), new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true }));
  scene.add(glow);
  const smokeMat = new THREE.MeshLambertMaterial({ color: 0x6b6460, transparent: true, depthWrite: false });
  const smokes = Array.from({ length: 14 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), smokeMat.clone()); scene.add(m); return m; });

  // --- 河流緞帶 ---
  function makeRibbon(key, color, { yOff = 0.07, flow = true, order = 3 } = {}) {
    const path = PATHS[key];
    const N = Math.ceil(path.len / 0.06) + 1;
    const samples = [];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const [x, z, dx, dz] = pointAt(path, t);
      samples.push({ t, x, z, dx, dz, st: staticAt(x, z) });
    }
    const mat = flow
      ? new THREE.MeshBasicMaterial({ map: flowTexture(color), transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 })
      : new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 });
    mat.clippingPlanes = clips;
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    mesh.renderOrder = order;
    scene.add(mesh);
    return { path, samples, mesh, mat, yOff };
  }
  function buildRibbon(r, S, t0, t1, width, dir) {
    const sel = r.samples.filter((s) => s.t >= t0 - 1e-6 && s.t <= t1 + 1e-6);
    if (sel.length < 2 || width < 0.01 || r.mat.opacity < 0.01) { r.mesh.visible = false; return; }
    r.mesh.visible = true;
    const p = new Float32Array(sel.length * 6), uv = new Float32Array(sel.length * 4), ix = [];
    sel.forEach((s, i) => {
      const y = combine(s.st, S).h + r.yOff;
      const nx = -s.dz * width / 2, nz = s.dx * width / 2;
      p.set([s.x + nx, y, s.z + nz, s.x - nx, y, s.z - nz], i * 6);
      const u = dir * s.t * r.path.len / 0.4;
      uv.set([u, 0, u, 1], i * 4);
      if (i < sel.length - 1) { const a = i * 2; ix.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
    });
    const g = r.mesh.geometry;
    g.setIndex(ix);
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.computeBoundingSphere();
  }
  const WATER = '#1f86e6';
  const R = {};
  for (const k of ['A', 'B', 'T', 'M1', 'M2', 'C', 'O', 'G', 'X']) R[k] = makeRibbon(k, WATER);
  const HL = {
    h1: makeRibbon('A', '#ff9f1c', { flow: false, yOff: 0.05, order: 2 }),
    h2: makeRibbon('A', '#a259ff', { flow: false, yOff: 0.05, order: 2 }),
    h3: makeRibbon('T', '#ff4d8d', { flow: false, yOff: 0.05, order: 2 }),
    h4: makeRibbon('M1', '#ff4d8d', { flow: false, yOff: 0.05, order: 2 }),
  };

  // --- 箭頭 ---
  const basinArrows = [[BASIN_C[0] - 1.4, BASIN_C[1] - 0.3], [BASIN_C[0] + 1.3, BASIN_C[1] - 0.5], [BASIN_C[0], BASIN_C[1] - 0.1]].map(([x, z]) => {
    const a = makeArrow(0xff5a36, 1.6, 0.13); a.rotation.z = Math.PI; a.userData.p = [x, z]; scene.add(a); return a;
  });
  const upArrows = [[UPLIFT_C[0] - 0.25, UPLIFT_C[1]], [UPLIFT_C[0] + 0.25, UPLIFT_C[1] - 0.1]].map(([x, z]) => {
    const a = makeArrow(0xffb000, 1.4, 0.12); a.userData.p = [x, z]; scene.add(a); return a;
  });
  const cones = Array.from({ length: 6 }, () => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 16), new THREE.MeshLambertMaterial({ color: 0xff3030, emissive: 0xff3030, emissiveIntensity: 0.5, transparent: true }));
    scene.add(m); return m;
  });
  const headArrow = makeArrow(0xff3030, 1.0, 0.09);
  scene.add(headArrow);
  const UP = new THREE.Vector3(0, 1, 0), dirV = new THREE.Vector3();
  function placeCone(m, path, t, S, dir, lift = 0.35) {
    const [x, z, dx, dz] = pointAt(path, t);
    m.position.set(x, heightAt(x, z, S) + lift, z);
    dirV.set(dx * dir, 0, dz * dir).normalize();
    m.quaternion.setFromUnitVectors(UP, dirV);
  }

  // --- 標籤 ---
  const labels = [];
  function addLabel(text, x, z, cls, opts = {}) {
    const el = document.createElement('div');
    el.className = 'lbl ' + cls;
    el.innerHTML = text;
    const obj = new CSS2DObject(el);
    obj.center.set(0.5, 1);
    scene.add(obj);
    labels.push({ el, obj, x, z, lift: opts.lift ?? 0.15, key: opts.key, place: !opts.key, fixedY: opts.fixedY, path: opts.path, onCut: opts.onCut });
  }
  for (const k in PLACES) {
    const pl = PLACES[k];
    addLabel(pl.name, pl.p[0], pl.p[1], pl.big ? 'sea big' : pl.sea ? 'sea' : 'place', { fixedY: pl.sea ? 0.05 : undefined });
  }
  const ann = (key, text, x, z, cls = 'note', lift = 0.6, extra = {}) => addLabel(text, x, z, cls, { key, lift, ...extra });
  const annP = (key, text, ll, cls, lift, extra) => ann(key, text, ...P(ll[0], ll[1]), cls, lift, extra);
  annP('a_r1', '① 往東北流，再往北', [121.75, 25.03], 'note blue', 0.4);
  annP('a_r1sea', '從瑞濱流進大海', [121.885, 25.16], 'note blue', 0.1);
  annP('a_r2', '② 往北流到基隆', [121.733, 25.12], 'note blue', 0.45);
  annP('a_r3', '③ 盆地裡的河', [121.575, 25.06], 'note blue', 0.4);
  annP('a_out', '往北出海', [121.512, 25.16], 'note blue', 0.45);
  ann('a_erupt', '大屯火山噴發！', VOLC[0], VOLC[1], 'note red', 1.6);
  annP('a_block', '出口被堵住了', [121.505, 25.145], 'note gray', 0.6);
  ann('a_lake', '古台北湖', BASIN_C[0] + 0.6, BASIN_C[1] - 0.6, 'note blue', 0.25);
  annP('a_gap', '關渡決口！<br><small>湖水流進大海</small>', [121.465, 25.118], 'note red', 0.5);
  ann('a_fault', '山腳斷層', BASIN_C[0] - BASIN_R[0] * 0.9, CUT_Z, 'note dark', 0.0, { onCut: true });
  ann('a_sink', '盆地往下陷', BASIN_C[0], BASIN_C[1] - 0.6, 'note red', 2.3);
  ann('a_uplift', '地面往上抬', UPLIFT_C[0], UPLIFT_C[1], 'note orange', 1.7);
  annP('a_rev', '河水掉頭，往西倒流！', [121.705, 25.089], 'note red', 0.55);
  annP('a_dry2', '往基隆的路被抬高', [121.735, 25.124], 'note gray', 0.5);
  ann('a_trib', '好勝的支流', 0, 0, 'note red', 0.5, { path: 'T' });
  annP('a_divide', '分水嶺', [121.818, 25.112], 'note gray', 0.45);
  annP('a_capture', '在員山子搶水成功！', [121.831, 25.104], 'note red', 0.7);
  annP('a_dry', '舊河道沒水了', [121.835, 25.122], 'note gray', 0.45);
  annP('a_seg1', '① 往東北東', [121.775, 25.042], 'note seg1', 0.45);
  annP('a_seg2', '② 轉彎往北北東', [121.826, 25.077], 'note seg2', 0.45);
  annP('a_seg3', '③ 再轉彎往西南西', [121.763, 25.099], 'note seg3', 0.5);

  // ---------- 更新 ----------
  let S = baseState();
  let showPlaces = true;

  function updateGeometry() {
    for (let i = 0; i < nV; i++) {
      const r = combine(statics[i], S);
      pos[i * 3 + 1] = r.h; tectA[i] = r.tect; cutA[i] = r.cut; volA[i] = r.volc;
    }
    tg.attributes.position.needsUpdate = true;
    tg.computeVertexNormals();
    const nrm = tg.attributes.normal.array;
    for (let i = 0; i < nV; i++) {
      const st = statics[i], h = pos[i * 3 + 1], ny = nrm[i * 3 + 1];
      if (h < 0.02) tmp.copy(cSeaBed);
      else if (h < 0.18 && st.land < 0.95) tmp.copy(cBeach);
      else {
        tmp.copy(cLow).lerp(cMid, sstep(0.8, 1.8, h + 0.25 * st.n)).lerp(cHigh, sstep(1.8, 2.8, h + 0.3 * st.n));
        if (h > 3.0) tmp.lerp(cPeak, sstep(3.0, 3.6, h));
        const plain = st.basinW * (1 - sstep(0.75, 1.05, h));
        if (plain > 0) tmp.lerp(cPlain, clamp(plain * 1.4, 0, 1));
        tmp.lerp(cRock, sstep(0.82, 0.6, ny) * 0.7);   // 陡坡露出岩石
        const v = volA[i];
        if (v > 0.05) tmp.lerp(tmp2.copy(cLava).lerp(cAsh, sstep(0.2, 0.9, v)), clamp(v * 1.4, 0, 0.9));
        const o = st.v.O;
        if (o && S.volc > 0.01) tmp.lerp(cAsh, S.volc * bump(o.t, 0.15, 0.9) * (1 - sstep(0.2, o ? PATHS.O.w : 1, o.d)) * 0.9);
      }
      col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
    }
    tg.attributes.color.needsUpdate = true;
    tg.attributes.tect.needsUpdate = true;
    tg.attributes.cutA.needsUpdate = true;

    for (const e of edges) {
      const xs = [], zs = [], hs = [], ts = [];
      for (const id of e.ids) { xs.push(pos[id * 3]); zs.push(pos[id * 3 + 2]); hs.push(pos[id * 3 + 1]); ts.push(tectA[id]); }
      fillWall(e.wall, xs, zs, hs, ts);
    }
    cutZ = NaN; updateCut();

    const lv = lakeLevel(S);
    lake.position.y = lv;
    lake.visible = S.lake > 0.01;

    const op = (r, o) => { r.mat.opacity = clamp(o, 0, 1); };
    op(R.A, 1); buildRibbon(R.A, S, 0, 1, 0.26, 1);
    op(R.B, 1 - sstep(0.15, 0.85, S.capture)); buildRibbon(R.B, S, 0, 1, 0.24, 1);
    op(R.T, 1); buildRibbon(R.T, S, 0, Math.max(0, S.trib - 0.02), lerp(0.12, 0.26, S.capture), -1);
    const flip = S.rev;
    op(R.M1, 1 - 0.9 * Math.sin(Math.PI * flip)); buildRibbon(R.M1, S, 0, 1, 0.24, flip < 0.5 ? 1 : -1);
    op(R.M2, 1 - sstep(0.1, 0.7, Math.max(S.rev, S.uplift * 0.6))); buildRibbon(R.M2, S, 0, 1, 0.24, 1);
    op(R.C, 1); buildRibbon(R.C, S, 0, 1, 0.28, 1);
    op(R.O, 1 - sstep(0.1, 0.5, S.volc)); buildRibbon(R.O, S, 0, 1, 0.28, 1);
    op(R.G, S.gflow); buildRibbon(R.G, S, 0, 1, 0.3, 1);
    op(R.X, 1); buildRibbon(R.X, S, 0, 1, 0.26, 1);
    for (const h of Object.values(HL)) h.mat.opacity = 0.85 * S.hl;
    const hw = S.hl > 0.01 ? 0.62 : 0;
    buildRibbon(HL.h1, S, 0, T_SANDIAO, hw, 1);
    buildRibbon(HL.h2, S, T_SANDIAO, 1, hw, 1);
    buildRibbon(HL.h3, S, 0, 1, hw, 1);
    buildRibbon(HL.h4, S, 0, 1, hw, 1);
  }

  let cutZ = NaN, cutStatics = [];
  function updateCut() {
    if (!cutWall.mesh.visible) return;
    const z = Math.min(clip.constant - 0.004, BOX.z1);
    if (z !== cutZ) { cutStatics = []; for (let k = 0; k <= NX; k++) cutStatics.push(staticAt(BOX.x0 + W * k / NX, z)); }
    cutZ = z;
    const lv = lakeLevel(S);
    const xs = [], zs = [], hs = [], ts = [], lvs = [];
    cutStatics.forEach((st, k) => {
      const r = combine(st, S);
      xs.push(BOX.x0 + W * k / NX); zs.push(z); hs.push(r.h); ts.push(r.tect);
      lvs.push(st.e < 1.25 && S.lake > 0.01 ? lv : 0);
    });
    fillWall(cutWall, xs, zs, hs, ts, lvs);
  }

  function setState(next) {
    let changed = false;
    for (const k of GEO_KEYS) if (k in next && S[k] !== next[k]) { changed = true; break; }
    S = { ...S, ...next };
    clip.constant = lerp(BOX.z1 + 1, CUT_Z, S.cut);
    cutWall.mesh.visible = cutWall.water.visible = S.cut > 0.001 && clip.constant < BOX.z1;
    if (changed) updateGeometry(); else updateCut();
  }

  function animate(time) {
    for (const k in R) R[k].mat.map.offset.x = -time * 1.6;
    // 火山
    const vh = heightAt(VOLC[0], VOLC[1], S);
    glow.position.set(VOLC[0], vh + 0.1, VOLC[1]);
    glow.material.opacity = S.erupt * (0.75 + 0.25 * Math.sin(time * 9));
    glow.visible = S.erupt > 0.01;
    smokes.forEach((m, i) => {
      const ph = (time * 0.25 + i / smokes.length) % 1;
      const r = 0.25 + ph * 1.1;
      m.position.set(VOLC[0] + Math.sin(i * 2.3) * ph * 0.9 + ph * 0.8, vh + 0.3 + ph * 4.2, VOLC[1] + Math.cos(i * 1.7) * ph * 0.6);
      m.scale.setScalar(r);
      m.material.opacity = S.erupt * 0.75 * Math.sin(Math.PI * ph) ** 0.7;
      m.visible = S.erupt > 0.01;
    });
    basinArrows.forEach((a, i) => {
      const [x, z] = a.userData.p, bob = (time * 0.9 + i * 0.33) % 1;
      a.position.set(x, 3.6 - bob * 0.9, z);
      a.userData.mat.opacity = S.arrBasin * Math.sin(Math.PI * bob);
      a.visible = S.arrBasin > 0.01;
    });
    upArrows.forEach((a, i) => {
      const [x, z] = a.userData.p, bob = (time * 0.9 + i * 0.5) % 1;
      a.position.set(x, heightAt(x, z, S) + 0.2 + bob * 0.8, z);
      a.userData.mat.opacity = S.arrUplift * Math.sin(Math.PI * bob);
      a.visible = S.arrUplift > 0.01;
    });
    cones.forEach((m, i) => {
      const ph = (time * 0.35 + i / cones.length) % 1;
      let vis = 0;
      if (S.arrRev > 0.01) { placeCone(m, PATHS.M1, 1 - ph, S, -1); vis = S.arrRev; m.material.color.set(0x1565c0); m.material.emissive.set(0x1565c0); }
      else if (S.arrBack > 0.01 && S.trib > 0.05) { placeCone(m, PATHS.T, S.trib * ph, S, 1); vis = S.arrBack; m.material.color.set(0xff3030); m.material.emissive.set(0xff3030); }
      m.material.opacity = vis * Math.sin(Math.PI * ph);
      m.visible = vis > 0.01;
    });
    headArrow.visible = S.arrBack > 0.01 && S.trib > 0.02;
    if (headArrow.visible) {
      placeCone(headArrow, PATHS.T, clamp(S.trib, 0, 1), S, 1, 0.25 + 0.1 * Math.sin(time * 6));
      headArrow.userData.mat.opacity = S.arrBack;
    }
    for (const L of labels) {
      let o = L.place ? (showPlaces ? 1 : 0) : S[L.key];
      let x = L.x, z = L.z;
      if (L.path) { const p = pointAt(PATHS[L.path], clamp(S.trib, 0.05, 1)); x = p[0]; z = p[1]; }
      if (S.cut > 0.5 && !L.onCut && z > clip.constant + 0.05) o = 0;
      let y;
      if (L.onCut) { z = cutZ; y = heightAt(x, z, S) - 0.9; }
      else y = L.fixedY !== undefined ? L.fixedY : heightAt(x, z, S) + L.lift;
      L.obj.position.set(x, y, z);
      L.el.style.opacity = o;
      L.obj.visible = o > 0.02;
    }
  }

  function render(time) { animate(time); renderer.render(scene, camera); labelRenderer.render(scene, camera); }
  // sx：畫面中心往左移幾像素；sy：往下移（負值往上），用來避開說明面板
  function resize(w, h, sx = 0, sy = 0) {
    renderer.setSize(w, h); labelRenderer.setSize(w, h);
    const fw = w + 2 * Math.abs(sx), fh = h + 2 * Math.abs(sy);
    camera.aspect = fw / fh;
    if (sx || sy) camera.setViewOffset(fw, fh, sx > 0 ? 2 * sx : 0, sy < 0 ? 2 * -sy : 0, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  updateGeometry();
  setState({});
  return { renderer, scene, camera, render, resize, setState, getState: () => S, setPlacesVisible(v) { showPlaces = v; } };
}
