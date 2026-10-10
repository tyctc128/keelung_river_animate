// 基隆河 3D 地質世界：地形、地層、河流、標籤、箭頭
// 網頁互動版與影片版共用這個模組。
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export const BOX = { x0: -12, x1: 12, z0: -8, z1: 8, bottom: -2.6 };
const NX = 192, NZ = 128;
const CUT_Z = -0.8; // 剖面切開的位置（通過台北盆地中央）

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ---------- 地名（x 往東、z 往南；畫面上方是北方） ----------
export const PLACES = {
  source:   { name: '基隆河源頭', p: [-0.6, 4.6] },
  sandiao:  { name: '三貂嶺', p: [3.8, 3.1] },
  houtong:  { name: '侯硐', p: [4.4, 0.6] },
  ruifang:  { name: '瑞芳', p: [4.8, -2.2] },
  shenao:   { name: '焿子寮灣（深澳灣）', p: [7.3, -5.4], sea: true },
  nuannuan: { name: '暖暖', p: [2.0, -2.9] },
  badu:     { name: '八堵', p: [0.0, -3.3] },
  keelung:  { name: '基隆', p: [0.4, -5.1] },
  basin:    { name: '台北盆地', p: [-4.6, -1.4] },
  guandu:   { name: '關渡', p: [-7.6, -3.2] },
  tamsui:   { name: '淡水河口', p: [-10.0, -6.2], sea: true },
  pacific:  { name: '太平洋', p: [3.0, -7.2], sea: true, big: true },
};

// ---------- 河道（折線） ----------
const RIVER_DEF = {
  A: { pts: [[-0.6, 4.6], [1.6, 4.2], [3.8, 3.1], [4.2, 1.8], [4.4, 0.6], [4.7, -0.8], [4.8, -2.2]], w: 0.75 },     // 上游
  B: { pts: [[4.8, -2.2], [5.9, -3.3], [6.7, -4.1], [7.4, -5.3]], w: 0.65 },                                         // 古出海口（往東北）
  C: { pts: [[0.0, -3.3], [1.7, -3.0], [3.25, -2.6], [4.1, -2.4], [4.8, -2.2]], w: 0.6 },                          // 向源侵蝕的支流（八堵→瑞芳）
  D: { pts: [[0.0, -3.3], [-1.6, -2.7], [-3.4, -1.5], [-4.6, -0.9], [-6.0, -1.6], [-7.6, -3.2], [-8.8, -4.6], [-10.4, -6.6]], w: 0.85 }, // 下游
};

function prepPath(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, len: cum[cum.length - 1] };
}
const PATHS = {};
for (const k in RIVER_DEF) PATHS[k] = { ...prepPath(RIVER_DEF[k].pts), w: RIVER_DEF[k].w };
// 三貂嶺在 A 河道上的位置（0~1）
const T_SANDIAO = PATHS.A.cum[2] / PATHS.A.len;

function nearest(path, x, z) {
  let best = 1e9, bt = 0;
  const { pts, cum, len } = path;
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i][0], az = pts[i][1], bx = pts[i + 1][0], bz = pts[i + 1][1];
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
    const u = clamp(((x - ax) * dx + (z - az) * dz) / l2, 0, 1);
    const px = ax + dx * u, pz = az + dz * u;
    const d = Math.hypot(x - px, z - pz);
    if (d < best) { best = d; bt = (cum[i] + u * Math.sqrt(l2)) / len; }
  }
  return { d: best, t: bt };
}
function pointAt(path, t) {
  const s = clamp(t, 0, 1) * path.len;
  const { pts, cum } = path;
  let i = 0;
  while (i < pts.length - 2 && cum[i + 1] < s) i++;
  const segL = cum[i + 1] - cum[i];
  const u = segL > 0 ? (s - cum[i]) / segL : 0;
  const dx = (pts[i + 1][0] - pts[i][0]) / segL, dz = (pts[i + 1][1] - pts[i][1]) / segL;
  return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u, dx, dz];
}

// ---------- 地形公式 ----------
function coastZ(x) {
  return -6.1 + 0.35 * Math.sin(0.8 * x + 1) + 1.5 * Math.exp(-(((x - 7.2) / 1.1) ** 2))
    + 0.75 * Math.exp(-(((x - 1.1) / 0.55) ** 2)) + 1.0 * sstep(-8.5, -12, x);
}
function noise(x, z) {
  return 0.5 * Math.sin(1.3 * x + 0.4) * Math.sin(1.1 * z + 1.7) + 0.3 * Math.sin(2.7 * x + 2.1 * z + 0.5)
    + 0.2 * Math.sin(3.9 * x - 2.3 * z + 1.1) * Math.cos(1.7 * x + 0.3) + 0.12 * Math.sin(6.1 * x + 5.3 * z);
}
function segDist(x, z, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const u = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1);
  return Math.hypot(x - ax - dx * u, z - az - dz * u);
}
function basinE(x, z) { return Math.hypot((x + 4.6) / 3.0, (z + 0.8) / 2.3); }

// 不會隨時間改變的部分
function staticAt(x, z) {
  const n = noise(x, z);
  const land = sstep(-0.2, 1.3, z - coastZ(x));
  let hl = 1.2 + 1.25 * sstep(-5, 7, x) + 0.55 * sstep(-3, 7, z) + 0.42 * n;
  hl += 1.0 * Math.exp(-((segDist(x, z, -10.5, 0.3, -5.0, -6.2) / 1.05) ** 2)); // 大屯山～觀音山（關渡兩側的山）
  hl += 0.7 * Math.exp(-((segDist(x, z, 3.2, -5.2, 3.45, -0.9) / 0.7) ** 2));   // 暖暖～瑞芳之間的分水嶺
  const e = basinE(x, z);
  hl = lerp(hl, 1.05 + 0.05 * n, 1 - sstep(0.75, 1.35, e));
  const base = lerp(-0.95 + 0.15 * n, hl, land);
  const basinW = 1 - sstep(0.5, 1.25, e);
  const upW = Math.exp(-(((x - 0.6) ** 2 + (z + 4.2) ** 2) / 1.5)) * land;
  const v = {};
  for (const k in PATHS) {
    const r = nearest(PATHS[k], x, z);
    if (r.d < PATHS[k].w) v[k] = r;
  }
  return { base, land, basinW, upW, v, e };
}

function knots(t, ks) {
  for (let i = 0; i < ks.length - 1; i++) {
    if (t <= ks[i + 1][0]) return lerp(ks[i][1], ks[i + 1][1], (t - ks[i][0]) / (ks[i + 1][0] - ks[i][0]));
  }
  return ks[ks.length - 1][1];
}
const FLOOR = {
  A: (t, S) => lerp(1.7, 1.05, t) - 0.1 * S.capture * t,
  B: (t) => lerp(1.05, -0.6, t),
  C: (t, S) => lerp(1.2 - 0.4 * S.guandu, 1.05 - 0.1 * S.capture, t),
  D: (t, S) => knots(t, [[0, 1.2], [0.25, 1.0], [0.55, 0.95], [0.68, 0.9], [0.85, 0.15], [1, -0.6]])
    - S.guandu * knots(t, [[0, 0.4], [0.25, 0.6], [0.55, 0.85], [0.68, 0.95], [0.85, 0.3], [1, 0]]),
};

function combine(st, S) {
  const tect = -0.9 * S.basin * st.basinW + 1.1 * S.uplift * st.upW;
  let h = st.base + tect;
  const h0 = h;
  for (const k in st.v) {
    const { d, t } = st.v[k];
    let a = 1;
    if (k === 'C') a = clamp((S.trib - t) / 0.04, 0, 1);
    if (a <= 0) continue;
    const w = PATHS[k].w * (k === 'C' ? lerp(0.75, 1, S.capture) : 1);
    if (d >= w) continue;
    const f = FLOOR[k](t, S);
    const carved = f + (h - f) * sstep(0.14, w, d);
    if (carved < h) h = lerp(h, carved, a);
  }
  return { h, tect, cut: h0 - h };
}
export function heightAt(x, z, S) { return combine(staticAt(x, z), S).h; }

// ---------- 預設狀態 ----------
export const ANN_KEYS = ['a_up', 'a_low', 'a_sea', 'a_lake', 'a_sink', 'a_uplift', 'a_gap', 'a_back', 'a_divide', 'a_trib',
  'a_capture', 'a_dry', 'a_seg1', 'a_seg2', 'a_seg3', 'a_sep'];
const GEO_KEYS = ['basin', 'uplift', 'guandu', 'trib', 'capture', 'hl'];
export function baseState() {
  const S = { basin: 0, uplift: 0, guandu: 0, trib: 0, capture: 0, cut: 0, arrBasin: 0, arrUplift: 0, arrBackD: 0, arrBackC: 0, hl: 0 };
  for (const k of ANN_KEYS) S[k] = 0;
  return S;
}

// ---------- 地層著色（GLSL） ----------
const STRATA_GLSL = /* glsl */`
varying float vWY; varying float vTect; varying float vCut;
vec3 strataCol(float y){
  float k = (y + 2.6) / 0.34;
  float i = floor(k); float f = fract(k);
  float r = mod(i, 6.0);
  vec3 c = r < 0.5 ? vec3(0.80,0.58,0.36) : r < 1.5 ? vec3(0.93,0.78,0.52) : r < 2.5 ? vec3(0.64,0.43,0.30)
         : r < 3.5 ? vec3(0.88,0.82,0.66) : r < 4.5 ? vec3(0.56,0.40,0.30) : vec3(0.78,0.60,0.44);
  c *= 0.82 + 0.18 * smoothstep(0.0, 0.07, f) * smoothstep(1.0, 0.93, f);
  return pow(c, vec3(2.2));
}
`;
function makeGeoMaterial(opts = {}) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, side: opts.side ?? THREE.FrontSide });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = 'attribute float tect; attribute float cutA;\nvarying float vWY; varying float vTect; varying float vCut;\n' + sh.vertexShader
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWY = transformed.y; vTect = tect; vCut = cutA;');
    sh.fragmentShader = STRATA_GLSL + sh.fragmentShader
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, strataCol(vWY - vTect), clamp((vCut - 0.08) * 3.0, 0.0, 1.0));');
  };
  return m;
}

// ---------- 河流流動貼圖 ----------
function flowTexture(color) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, 128, 64);
  g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round';
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
  return g; // 預設指向 +y
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
  camera.position.set(0, 15, 17);

  scene.add(new THREE.HemisphereLight(0xdff2ff, 0x8a6a4a, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(-9, 16, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 14, bottom: -14, near: 1, far: 50 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  scene.add(sun);

  const clip = new THREE.Plane(new THREE.Vector3(0, 0, -1), BOX.z1 + 1); // keep z <= constant
  const clips = [clip];

  // --- 地形 ---
  const W = BOX.x1 - BOX.x0, D = BOX.z1 - BOX.z0;
  const nV = (NX + 1) * (NZ + 1);
  const pos = new Float32Array(nV * 3), col = new Float32Array(nV * 3), tectA = new Float32Array(nV), cutA = new Float32Array(nV);
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
  const terrainMat = makeGeoMaterial();
  terrainMat.clippingPlanes = clips;
  const terrain = new THREE.Mesh(tg, terrainMat);
  terrain.castShadow = terrain.receiveShadow = true;
  scene.add(terrain);

  const C = (hex) => new THREE.Color(hex);
  const cSeaBed = C('#b9a77c'), cBeach = C('#ecdcaa'), cLow = C('#93c95f'), cHigh = C('#3d8a45'), cPeak = C('#5f7f4a'), cPlain = C('#d6dd8a'), tmp = new THREE.Color();

  // --- 側面地層牆 ---
  function makeWall(n) {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(n * 2 * 3);
    const ix = [];
    for (let i = 0; i < n - 1; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; ix.push(a, b, c, c, b, d); }
    g.setIndex(ix);
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 2 * 3).fill(1), 3));
    g.setAttribute('tect', new THREE.BufferAttribute(new Float32Array(n * 2), 1));
    g.setAttribute('cutA', new THREE.BufferAttribute(new Float32Array(n * 2).fill(1), 1));
    const m = new THREE.Mesh(g, wallMat);
    const wg = new THREE.BufferGeometry();
    wg.setIndex(ix.slice());
    wg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 2 * 3), 3));
    const wm = new THREE.Mesh(wg, waterSideMat);
    scene.add(m, wm);
    return { mesh: m, water: wm, n };
  }
  const wallMat = makeGeoMaterial({ side: THREE.DoubleSide });
  wallMat.clippingPlanes = clips;
  const waterSideMat = new THREE.MeshLambertMaterial({ color: 0x3f9fe0, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  waterSideMat.clippingPlanes = clips;

  const edges = [];
  const edgeIdx = (side) => {
    const out = [];
    if (side === 'S') for (let k = 0; k <= NX; k++) out.push(NZ * (NX + 1) + k);
    if (side === 'N') for (let k = 0; k <= NX; k++) out.push(k);
    if (side === 'W') for (let j = 0; j <= NZ; j++) out.push(j * (NX + 1));
    if (side === 'E') for (let j = 0; j <= NZ; j++) out.push(j * (NX + 1) + NX);
    return out;
  };
  for (const s of ['S', 'N', 'W', 'E']) { const ids = edgeIdx(s); edges.push({ ids, wall: makeWall(ids.length) }); }

  function fillWall(wall, xs, zs, hs, ts, lakeLv) {
    const p = wall.mesh.geometry.attributes.position.array, ta = wall.mesh.geometry.attributes.tect.array;
    const wp = wall.water.geometry.attributes.position.array;
    for (let i = 0; i < wall.n; i++) {
      const x = xs[i], z = zs[i], h = hs[i];
      p.set([x, h, z, x, BOX.bottom, z], i * 6);
      ta[i * 2] = ta[i * 2 + 1] = ts[i];
      const lv = lakeLv ? Math.max(0, lakeLv[i]) : 0;
      const top = Math.max(h, lv);
      wp.set([x, top, z, x, Math.min(h, top), z], i * 6);
    }
    wall.mesh.geometry.attributes.position.needsUpdate = true;
    wall.mesh.geometry.attributes.tect.needsUpdate = true;
    wall.mesh.geometry.computeVertexNormals();
    wall.mesh.geometry.computeBoundingSphere();
    wall.water.geometry.attributes.position.needsUpdate = true;
    wall.water.geometry.computeVertexNormals();
    wall.water.geometry.computeBoundingSphere();
  }

  // 剖面切開時的切面
  const cutWall = makeWall(NX + 1);

  // --- 海水、湖水 ---
  const waterMat = new THREE.MeshPhongMaterial({ color: 0x2f8fdc, transparent: true, opacity: 0.72, shininess: 80, depthWrite: false });
  waterMat.clippingPlanes = clips;
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(W, D).rotateX(-Math.PI / 2), waterMat);
  sea.position.set((BOX.x0 + BOX.x1) / 2, 0, (BOX.z0 + BOX.z1) / 2);
  sea.renderOrder = 2;
  scene.add(sea);
  const lakeMat = new THREE.MeshPhongMaterial({ color: 0x3aa6d8, transparent: true, opacity: 0.8, shininess: 80, depthWrite: false });
  lakeMat.clippingPlanes = clips;
  const lake = new THREE.Mesh(new THREE.CircleGeometry(1, 64).rotateX(-Math.PI / 2), lakeMat);
  lake.scale.set(3.0 * 1.22, 1, 2.3 * 1.22);
  lake.position.set(-4.6, 0.9, -0.8);
  lake.renderOrder = 2;
  scene.add(lake);

  // --- 河流緞帶 ---
  const ribbons = {};
  function makeRibbon(key, color, { width = 0.24, yOff = 0.07, flow = true, order = 3 } = {}) {
    const path = PATHS[key];
    const N = Math.ceil(path.len / 0.07) + 1;
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
    const r = { key, path, samples, mesh, mat, width, yOff, flow };
    return r;
  }
  function buildRibbon(r, S, t0, t1, width, dir) {
    const sel = r.samples.filter((s) => s.t >= t0 - 1e-6 && s.t <= t1 + 1e-6);
    if (sel.length < 2 || width < 0.01) { r.mesh.visible = false; return; }
    r.mesh.visible = true;
    const p = new Float32Array(sel.length * 6), uv = new Float32Array(sel.length * 4), ix = [];
    sel.forEach((s, i) => {
      const y = combine(s.st, S).h + r.yOff;
      const nx = -s.dz * width / 2, nz = s.dx * width / 2;
      p.set([s.x + nx, y, s.z + nz, s.x - nx, y, s.z - nz], i * 6);
      const u = dir * s.t * r.path.len / 0.38;
      uv.set([u, 0, u, 1], i * 4);
      if (i < sel.length - 1) { const a = i * 2; ix.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
    });
    const g = r.mesh.geometry;
    g.setIndex(ix);
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.computeBoundingSphere();
  }
  ribbons.A = makeRibbon('A', '#2b8be0');
  ribbons.B = makeRibbon('B', '#2b8be0');
  ribbons.C = makeRibbon('C', '#2b8be0');
  ribbons.D = makeRibbon('D', '#2b8be0');
  const hl1 = makeRibbon('A', '#ff9f1c', { flow: false, yOff: 0.05, order: 2 });
  const hl2 = makeRibbon('A', '#a259ff', { flow: false, yOff: 0.05, order: 2 });
  const hl3 = makeRibbon('C', '#ff4d8d', { flow: false, yOff: 0.05, order: 2 });

  // --- 箭頭 ---
  const basinArrows = [[-5.6, -1.2], [-3.6, -0.4], [-4.6, -0.8]].map(([x, z]) => {
    const a = makeArrow(0xff5a36, 1.6, 0.13); a.rotation.z = Math.PI; a.userData.p = [x, z]; scene.add(a); return a;
  });
  const upArrows = [[0.3, -4.1], [1.0, -4.4]].map(([x, z]) => {
    const a = makeArrow(0xffb000, 1.4, 0.12); a.userData.p = [x, z]; scene.add(a); return a;
  });
  const backArrows = [];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 16), new THREE.MeshLambertMaterial({ color: 0xff3030, emissive: 0xff3030, emissiveIntensity: 0.5, transparent: true }));
    scene.add(m); backArrows.push(m);
  }
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
    const L = { el, obj, x, z, lift: opts.lift ?? 0.15, key: opts.key, place: !opts.key, fixedY: opts.fixedY, path: opts.path };
    labels.push(L);
    return L;
  }
  for (const k in PLACES) {
    const pl = PLACES[k];
    addLabel(pl.name, pl.p[0], pl.p[1], pl.big ? 'sea big' : pl.sea ? 'sea' : 'place', { fixedY: pl.sea ? 0.05 : undefined });
  }
  const ann = (key, text, x, z, cls = 'note', lift = 0.6, extra = {}) => addLabel(text, x, z, cls, { key, lift, ...extra });
  ann('a_up', '古基隆河上游<br><small>往東北流</small>', 1.6, 4.2, 'note blue');
  ann('a_sea', '直接流進大海！', 5.9, -3.3, 'note blue', 0.5);
  ann('a_low', '古基隆河下游<br><small>和上游沒有連在一起</small>', -2.4, -2.1, 'note blue');
  ann('a_sep', '這裡有山擋著', 3.25, -2.6, 'note gray', 0.5);
  ann('a_sink', '地面往下陷！', -4.6, -0.8, 'note red', 2.4);
  ann('a_lake', '盆地積水變成湖', -4.0, 0.6, 'note blue', 0.2);
  ann('a_uplift', '地面往上抬！', 0.65, -4.25, 'note orange', 1.9);
  ann('a_gap', '關渡被切開<br><small>湖水流進大海</small>', -7.6, -3.2, 'note blue', 0.5);
  ann('a_back', '河流往回（往東）挖！<br><small>侵蝕基準面下降</small>', -1.6, -2.7, 'note red', 0.6);
  ann('a_divide', '分水嶺<br><small>像一道山牆</small>', 3.25, -2.6, 'note gray', 0.55);
  ann('a_trib', '好勝的支流', 0, 0, 'note red', 0.55, { path: 'C' });
  ann('a_capture', '切穿分水嶺<br>搶水成功！', 4.4, -2.4, 'note red', 0.7);
  ann('a_dry', '舊河道沒水了', 6.0, -3.4, 'note gray', 0.45);
  ann('a_seg1', '① 往東北東', 1.6, 4.2, 'note seg1', 0.45);
  ann('a_seg2', '② 轉彎往北北東', 4.3, 1.2, 'note seg2', 0.45);
  ann('a_seg3', '③ 再轉彎往西南西', 2.2, -2.9, 'note seg3', 0.45);

  // ---------- 狀態更新 ----------
  let S = baseState();
  let showPlaces = true;

  function updateGeometry() {
    const lakeLevel = lerp(0.1, 0.9, 1 - S.guandu);
    for (let i = 0; i < nV; i++) {
      const st = statics[i];
      const r = combine(st, S);
      const h = r.h;
      pos[i * 3 + 1] = h; tectA[i] = r.tect; cutA[i] = r.cut;
      // 地表顏色
      if (h < 0.02) tmp.copy(cSeaBed);
      else if (h < 0.2 && st.land < 0.95) tmp.copy(cBeach);
      else {
        tmp.copy(cLow).lerp(cHigh, sstep(0.9, 2.4, h));
        if (h > 2.7) tmp.lerp(cPeak, sstep(2.7, 3.3, h));
        const plain = st.basinW * S.basin * (1 - sstep(0.7, 1.0, h));
        if (plain > 0) tmp.lerp(cPlain, clamp(plain * 1.3, 0, 1));
      }
      col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
    }
    tg.attributes.position.needsUpdate = true;
    tg.attributes.color.needsUpdate = true;
    tg.attributes.tect.needsUpdate = true;
    tg.attributes.cutA.needsUpdate = true;
    tg.computeVertexNormals();

    for (const e of edges) {
      const xs = [], zs = [], hs = [], ts = [];
      for (const id of e.ids) { xs.push(pos[id * 3]); zs.push(pos[id * 3 + 2]); hs.push(pos[id * 3 + 1]); ts.push(tectA[id]); }
      fillWall(e.wall, xs, zs, hs, ts);
    }
    cutZ = NaN; updateCut();

    lake.position.y = lakeLevel;
    lake.visible = S.basin > 0.02;

    // 河流
    const cap = S.capture;
    buildRibbon(ribbons.A, S, 0, 1, 0.24, 1);
    ribbons.B.mat.opacity = 1 - sstep(0.2, 0.9, cap);
    buildRibbon(ribbons.B, S, 0, 1, 0.22, 1);
    buildRibbon(ribbons.C, S, 0, Math.max(0, S.trib - 0.02), lerp(0.1, 0.24, cap), -1);
    buildRibbon(ribbons.D, S, 0, 1, 0.26, 1);
    for (const h of [hl1, hl2, hl3]) h.mat.opacity = 0.85 * S.hl;
    buildRibbon(hl1, S, 0, T_SANDIAO, S.hl > 0.01 ? 0.6 : 0, 1);
    buildRibbon(hl2, S, T_SANDIAO, 1, S.hl > 0.01 ? 0.6 : 0, 1);
    buildRibbon(hl3, S, 0, 1, S.hl > 0.01 ? 0.6 : 0, 1);
  }

  function setState(next) {
    let changed = false;
    for (const k of GEO_KEYS) if (k in next && S[k] !== next[k]) { changed = true; break; }
    S = { ...S, ...next };
    clip.constant = lerp(BOX.z1 + 1, CUT_Z, S.cut);
    cutWall.mesh.visible = cutWall.water.visible = S.cut > 0.001 && clip.constant < BOX.z1;
    if (changed) updateGeometry(); else updateCut();
  }

  // 切面跟著切刀位置移動（稍微往北一點，避免和切割平面打架）
  let cutZ = NaN, cutStatics = [];
  function updateCut() {
    if (!cutWall.mesh.visible) return;
    const z = Math.min(clip.constant - 0.004, BOX.z1);
    if (z !== cutZ) {
      cutStatics = [];
      for (let k = 0; k <= NX; k++) cutStatics.push(staticAt(BOX.x0 + W * k / NX, z));
    }
    cutZ = z;
    const lakeLevel = lerp(0.1, 0.9, 1 - S.guandu);
    const xs = [], zs = [], hs = [], ts = [], lv = [];
    cutStatics.forEach((st, k) => {
      const r = combine(st, S);
      xs.push(BOX.x0 + W * k / NX); zs.push(z); hs.push(r.h); ts.push(r.tect);
      lv.push(st.e < 1.22 && S.basin > 0.02 ? lakeLevel : 0);
    });
    fillWall(cutWall, xs, zs, hs, ts, lv);
  }

  function animate(time) {
    // 水流動
    for (const k of ['A', 'B', 'C', 'D']) ribbons[k].mat.map.offset.x = -time * 1.6;
    // 構造箭頭
    basinArrows.forEach((a, i) => {
      const [x, z] = a.userData.p;
      const bob = (time * 0.9 + i * 0.33) % 1;
      a.position.set(x, 3.9 - bob * 0.9, z);
      a.userData.mat.opacity = S.arrBasin * Math.sin(Math.PI * bob);
      a.visible = S.arrBasin > 0.01;
    });
    upArrows.forEach((a, i) => {
      const [x, z] = a.userData.p;
      const bob = (time * 0.9 + i * 0.5) % 1;
      a.position.set(x, heightAt(x, z, S) + 0.2 + bob * 0.8, z);
      a.userData.mat.opacity = S.arrUplift * Math.sin(Math.PI * bob);
      a.visible = S.arrUplift > 0.01;
    });
    // 往回侵蝕的箭頭（在八堵～關渡之間，或沿著支流）
    backArrows.forEach((m, i) => {
      const ph = (time * 0.35 + i / backArrows.length) % 1;
      let vis = 0;
      if (S.arrBackD > 0.01) { placeCone(m, PATHS.D, 0.66 * (1 - ph), S, -1); vis = S.arrBackD; }
      else if (S.arrBackC > 0.01 && S.trib > 0.05) { placeCone(m, PATHS.C, S.trib * ph, S, 1); vis = S.arrBackC; }
      m.material.opacity = vis * Math.sin(Math.PI * ph);
      m.visible = vis > 0.01;
    });
    headArrow.visible = S.arrBackC > 0.01 && S.trib > 0.02;
    if (headArrow.visible) {
      placeCone(headArrow, PATHS.C, clamp(S.trib, 0, 1), S, 1, 0.25 + 0.1 * Math.sin(time * 6));
      headArrow.userData.mat.opacity = S.arrBackC;
    }
    // 標籤
    for (const L of labels) {
      let o = L.place ? (showPlaces ? 1 : 0) : S[L.key];
      let x = L.x, z = L.z;
      if (L.path) { const p = pointAt(PATHS[L.path], clamp(S.trib, 0.05, 1)); x = p[0]; z = p[1]; }
      if (S.cut > 0.5 && z > clip.constant + 0.05) o = 0;
      const y = L.fixedY !== undefined ? L.fixedY : heightAt(x, z, S) + L.lift;
      L.obj.position.set(x, y, z);
      L.el.style.opacity = o;
      L.obj.visible = o > 0.02;
    }
  }

  function render(time) {
    animate(time);
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }
  // sx：畫面中心往左移幾像素；sy：往下移（負值往上），用來避開說明面板
  function resize(w, h, sx = 0, sy = 0) {
    renderer.setSize(w, h);
    labelRenderer.setSize(w, h);
    const fw = w + 2 * Math.abs(sx), fh = h + 2 * Math.abs(sy);
    camera.aspect = fw / fh;
    if (sx || sy) camera.setViewOffset(fw, fh, sx > 0 ? 2 * sx : 0, sy < 0 ? 2 * -sy : 0, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }

  updateGeometry();
  setState({});
  return {
    renderer, scene, camera, render, resize, setState,
    getState: () => S,
    setPlacesVisible(v) { showPlaces = v; },
  };
}
