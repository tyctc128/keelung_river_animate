# 由第二版檔案產生第三版（實際座標版）的腳本、算圖頁與流程
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rd = lambda p: open(os.path.join(ROOT, p), encoding='utf-8').read()
def wr(p, s): open(os.path.join(ROOT, p), 'w', encoding='utf-8').write(s)

def apply(s, pairs, name):
    for a, b in pairs:
        assert a in s, (name, a)
        s = s.replace(a, b)
    return s

# ---- 腳本 ----
s = rd('src/videoScript2.js')
s = apply(s, [
    ("// 第二版影片腳本（依查證後的地質史）", "// 第三版影片腳本（查證後的地質史 + 依實際座標排列的地形；分岔點在員山子、古出口在瑞濱）"),
    ("import { baseState } from './world2.js';", "import { baseState } from './world3.js';"),
    # 鏡頭
    ("cam: { az: -0.55, el: 58, dist: 27, target: [0.5, 0.6, -0.6] }", "cam: { az: -0.5, el: 58, dist: 27, target: [1.5, 0.6, 1.6] }"),
    ("cam: { az: 0.1, el: 50, dist: 27, target: [0, 0.4, -0.6] }", "cam: { az: 0.1, el: 56, dist: 26, target: [1.5, 0.4, 1.4] }"),
    ("cam: { az: -0.35, el: 40, dist: 19, target: [-5.3, 0.6, -2.4] }", "cam: { az: -0.35, el: 42, dist: 18, target: [-6.0, 0.6, 1.0] }"),
    ("cam: { az: -0.75, el: 42, dist: 19, target: [-5.6, 0.4, -2.6] }", "cam: { az: -0.75, el: 42, dist: 17, target: [-7.2, 0.4, 0.8] }"),
    ("cam: { az: 0.1, el: 26, dist: 22, target: [-2.2, 0.0, -1.6] }", "cam: { az: 0.1, el: 26, dist: 23, target: [-2.0, 0.0, 2.4] }"),
    ("cam: { az: 0.2, el: 48, dist: 13.5, target: [-0.2, 1.0, -3.7] }", "cam: { az: 0.2, el: 50, dist: 11, target: [3.0, 1.0, 0.6] }"),
    ("cam: { az: -0.2, el: 44, dist: 17, target: [2.4, 1, -2.6] }", "cam: { az: -0.2, el: 56, dist: 12, target: [6.2, 1.0, 0.8] }"),
    ("cam: { az: 0.35, el: 46, dist: 17, target: [3, 1, -1.5] }", "cam: { az: 0.3, el: 64, dist: 10, target: [7.5, 1.0, 0.6] }"),
    ("cam: { az: 0.0, el: 64, dist: 21, target: [1.5, 0.8, -0.3] }", "cam: { az: 0.0, el: 64, dist: 20, target: [3.5, 0.8, 1.8] }"),
    ("cam: { az: 0.9, el: 42, dist: 27, target: [0, 0.4, -0.6] }", "cam: { az: 0.9, el: 42, dist: 27, target: [0, 0.4, 1.5] }"),
    # 旁白
    ("'它從平溪出發，先往東北流，到了三貂嶺突然轉向北，過了瑞芳又來一個大迴轉，往西流進台北。'",
     "'它從平溪的菁桐出發，先往東北流，到了三貂嶺轉向北，過了猴硐、員山子又來一個大迴轉，往西流進台北。'"),
    ("'第一條，從平溪出發，經過三貂嶺、侯硐、瑞芳，往東北流進焿子寮灣，也就是現在深澳一帶的大海。'",
     "'第一條，從平溪出發，經過三貂嶺、猴硐，到了員山子繼續往北，從瑞濱，也就是以前叫焿子寮的地方，流進大海。'"),
    ("'它在八堵到瑞芳之間的小支流，拚命往上游、往東邊挖呀挖，這叫做「向源侵蝕」。'",
     "'它在八堵東邊的小支流，拚命往上游、往東邊挖呀挖，這叫做「向源侵蝕」。'"),
    ("'支流一路挖過暖暖，前面只剩下一道分水嶺擋著。'", "'支流一路挖過暖暖、瑞芳，前面只剩下一道分水嶺擋著。'"),
    ("title: '在瑞芳搶水成功！'", "title: '在員山子搶水成功！'"),
    ("'終於，支流挖穿了分水嶺，在瑞芳接上了往東北流的那條河！'", "'終於，支流挖穿了分水嶺，在瑞芳東邊的員山子，接上了往北流的那條河！'"),
    ("'因為往台北這一邊的地勢比較低，上游的水就被「搶」了過來，改成往西流向暖暖、八堵，進入台北盆地。'",
     "'因為往台北這一邊的地勢比較低，上游的水就被「搶」了過來，改成往西流過瑞芳、暖暖、八堵，進入台北盆地。'"),
    ("'原本流向焿子寮灣的舊河道，就沒有水了。'", "'原本從瑞濱流進大海的舊河道，就沒有水了。'"),
    ("'第二段，從三貂嶺到侯硐，轉了大約九十度，往北北東流。'", "'第二段，從三貂嶺到猴硐，轉了大約九十度，往北北東流。'"),
    ("'第三段，過了瑞芳又一個大轉彎，往西南西流向暖暖、八堵，最後在關渡流進淡水河。'",
     "'第三段，到了員山子又一個大轉彎，往西南西流過瑞芳、暖暖、八堵，最後在關渡流進淡水河。'"),
], 'script')
wr('src/videoScript3.js', s)

# ---- 算圖程式 ----
s = rd('src/video2.js')
s = apply(s, [("// 第二版影片算圖頁", "// 第三版影片算圖頁（實際座標版）"),
              ("from './world2.js'", "from './world3.js'"), ("from './videoScript2.js'", "from './videoScript3.js'")], 'video')
wr('src/video3.js', s)

s = rd('video/render2.html')
s = apply(s, [("<title>基隆河影片算圖 v2</title>", "<title>基隆河影片算圖 v3</title>"),
              ('<script src="render2.js"></script>', '<script src="render3.js"></script>'),
              ("三條河 → 古台北湖 → 關渡決口 → 盆地下陷、八堵基隆間隆起 → 河水倒流 → 向源侵蝕 → 瑞芳襲奪",
               "三條河 → 古台北湖 → 關渡決口 → 盆地下陷、八堵基隆間隆起 → 河水倒流 → 向源侵蝕 → 員山子襲奪"),
              ("※ 地形為示意圖；各事件的先後與年代，學者說法不一。",
               "地名、河道、海岸依 OpenStreetMap 實際座標排列；山的高低為示意<br>※ 各事件的先後與年代，學者說法不一。")], 'html')
wr('video/render3.html', s)

s = rd('tools/make-video2.mjs')
s = apply(s, [("from '../src/videoScript2.js'", "from '../src/videoScript3.js'"),
              ("path.join(ROOT, 'video', 'build2')", "path.join(ROOT, 'video', 'build3')"),
              ("基隆河的搶水大戰_new.mp4'", "基隆河的搶水大戰_new2.mp4'"),
              ("'render2.html'", "'render3.html'")], 'mjs')
wr('tools/make-video3.mjs', s)
print('ok')
