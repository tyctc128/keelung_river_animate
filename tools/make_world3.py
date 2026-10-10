# 由 world2.js 產生 world3.js：換成依實際座標排列的地理（tools/geo3_block.js）
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'src', 'world2.js'), encoding='utf-8').read()
geo = open(os.path.join(ROOT, 'tools', 'geo3_block.js'), encoding='utf-8').read()

a = src.index('// ---------- 地名 ----------'); b = src.index('function combine(st, S) {')
s = src[:a] + geo + '\n' + src[b:]

def rep(old, new):
    global s
    assert old in s, old
    s = s.replace(old, new, 1)

rep("// 基隆河 3D 地質世界（第二版，依查證後的地質史）", "// 基隆河 3D 地質世界（第三版：地名、河道、海岸依實際座標排列）")
rep("const CUT_Z = -0.9;\nconst BASIN_C = [-4.6, -0.9];",
    "const CUT_Z = 3.6;\nconst BASIN_C = [(121.515 - 121.645) * (24 / 0.53), -(25.045 - 25.12) * (24 / 0.53) * 110.9 / 100.9];\nconst BASIN_R = [3.6, 2.9];")
rep("lake.scale.set(3.0 * 1.25, 1, 2.3 * 1.25);", "lake.scale.set(BASIN_R[0] * 1.25, 1, BASIN_R[1] * 1.25);")
rep("const basinArrows = [[-5.8, -1.3], [-3.6, -0.6], [-4.7, -0.9]]",
    "const basinArrows = [[BASIN_C[0] - 1.4, BASIN_C[1] - 0.3], [BASIN_C[0] + 1.3, BASIN_C[1] - 0.5], [BASIN_C[0], BASIN_C[1] - 0.1]]")
rep("const upArrows = [[0.3, -4.2], [1.0, -4.5]]",
    "const upArrows = [[UPLIFT_C[0] - 0.25, UPLIFT_C[1]], [UPLIFT_C[0] + 0.25, UPLIFT_C[1] - 0.1]]")
rep("const e = Math.hypot((x - BASIN_C[0]) / 3.0, (z - BASIN_C[1]) / 2.3);", "const e = Math.hypot((x - BASIN_C[0]) / BASIN_R[0], (z - BASIN_C[1]) / BASIN_R[1]);") if "/ 3.0, (z - BASIN_C[1]) / 2.3" in s else None

a = s.index("  ann('a_r1',"); b = s.index("  // ---------- 更新 ----------")
s = s[:a] + """  const annP = (key, text, ll, cls, lift, extra) => ann(key, text, ...P(ll[0], ll[1]), cls, lift, extra);
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

""" + s[b:]
open(os.path.join(ROOT, 'src', 'world3.js'), 'w', encoding='utf-8').write(s)
print('ok')
