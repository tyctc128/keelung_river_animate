# 基隆河的搶水大戰（3D 地質動畫）

給小學生看的基隆河河川襲奪動畫。第一版依使用者提供的文字（標示為林朝棨 1957）製作；查證版（_new 影片、web_v2）改依鄧屬予等（2004、2006）與《台北地質之旅》（遠流）的地質史。

## 成品

| 檔案 | 說明 |
|---|---|
| `基隆河的搶水大戰.mp4` | 約 4 分鐘的旁白動畫影片（1920×1080，有中文配音和字幕） |
| `web/index.html` | 互動網頁（第一版） |
| `基隆河的搶水大戰_new.mp4` | 查證版影片（約 5 分鐘，微軟 HsiaoChen 配音） |
| `基隆河的搶水大戰_new3.mp4` | **最新版影片**（約 6 分鐘）：實際座標地形、火山泥流堵出古台北湖、員山子襲奪、結尾重要說明 |
| `web_v3/index.html` | **最新版互動網頁**（與 _new3 同內容，9 步驟＋「近看員山子」，第 10 頁可直接播放動畫影片；影片檔為 web_v3/keelung_river.mp4，壓縮成約 51MB 以符合 GitHub 單檔上限） |
| `web_v2/index.html` | **查證版互動網頁**：直接用瀏覽器開啟就能用，不需要網路（9 個步驟） |

### 互動網頁怎麼用

- 拖曳畫面可以 360 度旋轉，滾輪（或兩指）可以放大縮小。
- 按「下一步：台北盆地陷落 ▶」之類的按鈕，3D 地形就會演出那個事件。
- 上方的 1～7 可以直接跳到某個時期；鍵盤 ← → 也可以切換。
- 「🔪 切開看地層」把大地切開，看地底岩層怎麼彎曲。
- 「🔄 自動旋轉」「⬇️ 從上面看」「🎯 建議視角」幫忙換角度。

七個步驟：遠古時期 → 台北盆地陷落 → 八堵與基隆間隆起 → 關渡決口 → 向源侵蝕 → 河川襲奪 → 今天的基隆河。

## 修改與重新產生

原始碼在 `src/`：

- `src/world.js`：3D 地形、地層、河流、標籤
- `src/stages.js`：網頁每個時期的說明文字與地形狀態
- `src/videoScript.js`：影片旁白（每句一行）與鏡頭

```bash
npm install
npm run build      # 重新打包 web/app.js 與 video/render.js
npm run video      # 重新配音並算出影片（約 20 分鐘）
npm run web2       # 重新打包 web_v2/app.js（原始碼 src/app2.js、src/stages2.js、src/world2.js）
npm run build2 && npm run video2   # 重新產生查證版影片
npm run web3       # 重新打包 web_v3/app.js（src/app3.js、src/stages3.js、src/world4.js）
npm run build4 && npm run video4   # 重新產生 _new3 影片（world4.js 由 tools/make_world4.py 產生）
```

配音使用 Windows 內建的「Microsoft Hanhan」中文語音；讀錯的字可以在 `src/videoScript.js` 的 `ttsText()` 裡加讀音替換。

地形是示意圖，位置與比例不代表真實大小。
