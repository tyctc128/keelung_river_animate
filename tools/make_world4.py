# 由 world2.js 產生 world4.js（第四版）：換成依實際座標排列的地理（tools/geo3_block.js）
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'src', 'world2.js'), encoding='utf-8').read()
geo = open(os.path.join(ROOT, 'tools', 'geo4_block.js'), encoding='utf-8').read()

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
  annP('a_out', '往東北流到金山出海（推測）', [121.56, 25.18], 'note blue', 0.45);
  ann('a_erupt', '大屯山區火山噴發！', VOLC[0], VOLC[1], 'note red', 1.4);
  annP('a_block', '火山泥流堵住出口', [121.47, 25.115], 'note gray', 0.6);
  annP('a_dist', '離海只有約 2.5 公里！', [121.836, 25.118], 'note orange', 0.5);
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

rep("const volcH = S.volc * (1.5 * Math.exp(-((st.vd / 1.15) ** 2)) - 0.4 * Math.exp(-((st.vd / 0.28) ** 2)));",
    "const volcH = S.volc * (0.25 * Math.exp(-((st.dd / 1.6) ** 2)) + 0.7 * Math.exp(-((st.vd / 0.75) ** 2)) - 0.25 * Math.exp(-((st.vd / 0.22) ** 2)));")
rep("// 基隆河 3D 地質世界（第三版：地名、河道、海岸依實際座標排列）",
    "// 基隆河 3D 地質世界（第四版：實際座標；大屯山區先為低矮丘陵，火山噴發後才長高；高度誇張約 4.5 倍）")
rep("export const BOX = { x0: -12, x1: 12, z0: -8, z1: 8, bottom: -2.8 };", "export const BOX = { x0: -12, x1: 12, z0: -8, z1: 8, bottom: -2.8 };\nconst VS = 0.45; // 高度縮放：地形整體高度乘上這個值（降低垂直誇張）")
# 所有世界物件放進可縮放高度的群組（燈光除外）
s = s.replace("scene.add(", "root.add(")
rep("root.add(new THREE.HemisphereLight(", "scene.add(new THREE.HemisphereLight(")
rep("root.add(sun);", "scene.add(sun);")
rep("  const scene = new THREE.Scene();", "  const scene = new THREE.Scene();\n  const root = new THREE.Group();\n  root.scale.y = VS;\n  scene.add(root);")
# 直立的箭頭與煙霧在縮放群組裡會被壓扁，反向補償
rep("const a = makeArrow(0xff5a36, 1.6, 0.13); a.rotation.z = Math.PI;", "const a = makeArrow(0xff5a36, 1.6, 0.13); a.rotation.z = Math.PI; a.scale.y = 1 / VS;")
rep("const a = makeArrow(0xffb000, 1.4, 0.12); a.userData.p = [x, z];", "const a = makeArrow(0xffb000, 1.4, 0.12); a.scale.y = 1 / VS; a.userData.p = [x, z];")
rep("      m.scale.setScalar(r);", "      m.scale.set(r, r / VS, r);")
rep("a.position.set(x, 3.6 - bob * 0.9, z);", "a.position.set(x, 4.6 - bob * 2.0, z);")
rep("a.position.set(x, heightAt(x, z, S) + 0.2 + bob * 0.8, z);", "a.position.set(x, heightAt(x, z, S) + 0.4 + bob * 1.8, z);")
rep("m.position.set(VOLC[0] + Math.sin(i * 2.3) * ph * 0.9 + ph * 0.8, vh + 0.3 + ph * 4.2, VOLC[1] + Math.cos(i * 1.7) * ph * 0.6);",
    "m.position.set(VOLC[0] + Math.sin(i * 2.3) * ph * 0.9 + ph * 0.8, vh + 0.5 + ph * 8.5, VOLC[1] + Math.cos(i * 1.7) * ph * 0.6);")
# 標籤高度單位跟著縮放，抬高一些
rep("    labels.push({ el, obj, x, z, lift: opts.lift ?? 0.15,", "    labels.push({ el, obj, x, z, lift: (opts.lift ?? 0.15) / VS,")
rep("if (L.onCut) { z = cutZ; y = heightAt(x, z, S) - 0.9; }", "if (L.onCut) { z = cutZ; y = heightAt(x, z, S) - 1.6; }")
rep("m.position.set(x, heightAt(x, z, S) + lift, z);", "m.position.set(x, heightAt(x, z, S) + lift / VS, z);")

# 火山泥流：堆在盆地出口（北投～五股一帶，O 河道前段），抬高河床並染成灰色
rep("O: (t, S) => knots(t, [[0, 0.55], [0.5, 0.42], [0.85, 0.0], [1, -0.6]]) + 1.9 * S.volc * bump(t, 0.2, 0.85),",
    "O: (t, S) => knots(t, [[0, 0.55], [0.5, 0.42], [0.85, 0.0], [1, -0.6]]) + 1.6 * S.volc * bump(t, 0.04, 0.75),")
rep("S.volc * bump(o.t, 0.15, 0.9) * (1 - sstep(0.2, o ? PATHS.O.w : 1, o.d)) * 0.9", "S.volc * bump(o.t, 0.04, 0.75) * (1 - sstep(0.25, PATHS.O.w, o.d)) * 0.95")
rep("'a_capture', 'a_dry', 'a_seg1', 'a_seg2', 'a_seg3'];", "'a_capture', 'a_dry', 'a_seg1', 'a_seg2', 'a_seg3', 'a_dist'];")
open(os.path.join(ROOT, 'src', 'world4.js'), 'w', encoding='utf-8').write(s)
print('ok')
