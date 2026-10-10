# 由第三版產生第四版（_new3）的腳本、算圖頁與流程
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rd = lambda p: open(os.path.join(ROOT, p), encoding='utf-8').read()
def wr(p, s): open(os.path.join(ROOT, p), 'w', encoding='utf-8').write(s)

def apply(s, pairs, name):
    for a, b in pairs:
        assert a in s, (name, a)
        s = s.replace(a, b, 1)
    return s

CLOSE1 = """  {
    chip: 0, badge: '很久很久以前', title: '近看：第一條河的出海口',
    S: st({ ...S_ANCIENT, a_r1sea: 1, a_dist: 1 }),
    cam: { az: 0.2, el: 50, dist: 7.5, target: [8.2, 0.4, 0.9] }, drift: 0.12,
    lines: [
      '我們靠近一點，看看第一條河。',
      '它從三貂嶺往北流過猴硐，到了員山子，離海邊只剩兩公里多，所以就直接往北流進大海。',
    ],
  },
"""
CLOSE2 = """  {
    chip: 7, badge: '現在', title: '近看：大轉彎和乾掉的舊河道',
    S: st({ ...S_CAP, hl: 1, a_dry: 1 }),
    cam: { az: -0.3, el: 55, dist: 7.5, target: [8.0, 0.4, 0.8] }, drift: 0.15,
    lines: [
      '再靠近看看員山子。',
      '河水在這裡轉了一個大彎，往西流去；以前往北流到瑞濱的舊河道，現在已經沒有河水了。',
    ],
  },
"""

s = rd('src/videoScript3.js')
s = apply(s, [
    ("// 第三版影片腳本（查證後的地質史 + 依實際座標排列的地形；分岔點在員山子、古出口在瑞濱）",
     "// 第四版影片腳本（_new3）：大屯山區先為低矮火山群、火山泥流堵住出口、古出口往東北到金山（推測）、\n// 東北角拉近鏡頭、結尾加上「觀點尚未一致、並非最後結論」的重要說明"),
    ("import { baseState } from './world3.js';", "import { baseState } from './world4.js';"),
    ("'第三條，在台北盆地裡，和古新店溪會合，再往北流出海。'",
     "'第三條，在台北盆地裡，和古新店溪會合，往北經過北投，穿過大屯山區的低谷，往東北流到金山出海，這是科學家的推測。'"),
    ("badge: '約十八萬年前', title: '大屯火山堵住出口，變成古台北湖'", "badge: '約十八萬年前', title: '火山泥流堵住出口，變成古台北湖'"),
    ("'大約十八萬年前，北邊的大屯火山猛烈噴發！'", "'大約十八萬年前，大屯山區的火山猛烈噴發！'"),
    ("'火山噴出的岩石和火山灰，把盆地往北的出口堵住了。'", "'火山泥流順著河谷流下來，把盆地在北投、五股一帶的出口堵住了。'"),
    # 拉近鏡頭插入
    ("  {\n    chip: 1,", CLOSE1 + "  {\n    chip: 1,"),
    ("  {\n    chip: 7, badge: '結語',", CLOSE2 + "  {\n    chip: 7, badge: '結語',"),
    # 結尾重要說明
    ("drift: 1.1, outro: true,", "drift: 1.1, outro: true, notice: 2,"),
    ("""      '不過，這些事情發生的先後順序和年代，科學家們還在研究，說法不完全一樣喔。',""",
     """      '大屯山區的火山，也是經過很多次噴發，才慢慢長成今天的樣子。',
      '最後要特別說明：關於基隆河是怎麼形成的，目前科學家的看法還沒有完全一致，研究也還在進行中。',
      '這部影片介紹的是目前比較常見的說法，並不是最後的結論喔！',"""),
], 'script')
# 高度降低後，鏡頭目標高度跟著降低
s = s.replace("target: [-2.0, 0.0, 2.4]", "target: [-2.0, -0.2, 2.4]")
wr('src/videoScript4.js', s)

s = rd('src/video3.js')
s = apply(s, [("// 第三版影片算圖頁（實際座標版）", "// 第四版影片算圖頁（_new3）"),
              ("from './world3.js'", "from './world4.js'"), ("from './videoScript3.js'", "from './videoScript4.js'"),
              ("  $('#endcard').style.opacity = clamp((t - endStart) / 1.0, 0, 1);",
               "  $('#endcard').style.opacity = clamp((t - endStart) / 1.0, 0, 1);\n"
               "  const nOn = sc.notice !== undefined && t >= T.lines[sc.notice].start - 0.3 && t < endStart;\n"
               "  $('#notice').style.opacity = nOn ? clamp((t - T.lines[sc.notice].start + 0.3) / 0.6, 0, 1) : 0;")], 'video')
wr('src/video4.js', s)

s = rd('video/render3.html')
s = apply(s, [("<title>基隆河影片算圖 v3</title>", "<title>基隆河影片算圖 v4</title>"),
              ('<script src="render3.js"></script>', '<script src="render4.js"></script>'),
              ("  #endcard .refs {", "  #notice { position: absolute; left: 50%; top: 150px; transform: translateX(-50%); z-index: 7; opacity: 0; width: 900px;\n"
               "    background: #fff8e1; border: 4px solid #f59e0b; border-radius: 18px; padding: 16px 26px; box-shadow: 0 8px 30px rgba(0,0,0,.25); }\n"
               "  #notice h3 { margin: 0 0 6px; font-size: 30px; color: #b45309; }\n"
               "  #notice p { margin: 0; font-size: 25px; line-height: 1.5; font-weight: bold; color: #3b2a1e; }\n"
               "  #endcard .notice { margin-top: 22px; background: #fff8e1; color: #3b2a1e; border: 3px solid #f59e0b; border-radius: 14px; padding: 10px 22px; font-size: 22px; font-weight: bold; }\n"
               "  #endcard .refs {"),
              ('<div id="endcard" class="card">',
               '<div id="notice"><h3>⚠️ 重要說明</h3><p>關於基隆河的形成，目前科學家的觀點尚未完全一致，研究仍在進行中。本片介紹的是目前較常見的說法，並非最後結論。</p></div>\n<div id="endcard" class="card">'),
              ("  <div class=\"refs\">", "  <div class=\"notice\">⚠️ 重要說明：目前學界觀點尚未完全一致，研究仍在進行中，本片內容並非最後結論。</div>\n  <div class=\"refs\">"),
              ("三條河 → 古台北湖 → 關渡決口", "三條河 → 火山泥流堵出古台北湖 → 關渡決口"),
              ("地名、河道、海岸依 OpenStreetMap 實際座標排列；山的高低為示意<br>",
               "地名座標：OpenStreetMap；山的高低約放大 4.5 倍示意；盆地古出口路線為推測<br>")], 'html')
wr('video/render4.html', s)

s = rd('tools/make-video3.mjs')
s = apply(s, [("from '../src/videoScript3.js'", "from '../src/videoScript4.js'"),
              ("path.join(ROOT, 'video', 'build3')", "path.join(ROOT, 'video', 'build4')"),
              ("基隆河的搶水大戰_new2.mp4'", "基隆河的搶水大戰_new3.mp4'"),
              ("'render3.html'", "'render4.html'")], 'mjs')
wr('tools/make-video4.mjs', s)
print('ok')
