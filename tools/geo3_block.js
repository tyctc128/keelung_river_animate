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
