// 產生影片：旁白語音 → 時間軸 → 逐格算圖 → 合成 MP4
// 用法：node tools/make-video.mjs [--fps 30] [--skip-tts] [--test 12.5,40]（只輸出幾張測試截圖）
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { SCENES, ttsText } from '../src/videoScript4.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILD = path.join(ROOT, 'video', 'build4');
const TTS_DIR = path.join(BUILD, 'tts');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const FPS = Number(opt('--fps', 30));
const OUT = path.join(ROOT, opt('--out', '基隆河的搶水大戰_new3.mp4'));
const TEST = opt('--test', null);

fs.mkdirSync(TTS_DIR, { recursive: true });

// 1. 語音
const items = [];
SCENES.forEach((s, i) => s.lines.forEach((l, j) => items.push({ id: `s${i}_${j}`, text: ttsText(l), sub: l, scene: i })));
if (!args.includes('--skip-tts')) {
  const inJson = path.join(BUILD, 'tts-input.json');
  fs.writeFileSync(inJson, JSON.stringify(items.map(({ id, text }) => ({ id, text }))), 'utf8');
  console.log(execFileSync('python', [path.join(ROOT, 'tools', 'tts_edge.py'), inJson, TTS_DIR]).toString().trim());
}
const dur = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());

// 2. 時間軸
const LEAD = { 0: 4.2, 1: 3.2 };
const GAP = 0.3, TAIL = 1.6, END_CARD = 8;
let t = 0;
const scenes = [];
const clips = [];
SCENES.forEach((s, i) => {
  const start = t;
  t += LEAD[i] ?? 1.3;
  const lines = [];
  s.lines.forEach((l, j) => {
    const f = path.join(TTS_DIR, `s${i}_${j}.mp3`);
    const d = dur(f);
    lines.push({ start: t, end: t + d, text: l });
    clips.push({ f, at: t });
    t += d + GAP;
  });
  // 地形變化需要時間：每一幕至少 9 秒
  t = Math.max(t + TAIL, start + 9);
  if (i === SCENES.length - 1) t += END_CARD;
  scenes.push({ start, end: t, lines });
});
const timeline = { scenes, total: t, endCard: END_CARD };
fs.writeFileSync(path.join(BUILD, 'timeline.json'), JSON.stringify(timeline, null, 1));
console.log(`總長 ${t.toFixed(1)} 秒，${Math.ceil(t * FPS)} 格`);

// 旁白音軌
const audio = path.join(BUILD, 'narration.wav');
{
  const inputs = clips.flatMap((c) => ['-i', c.f]);
  const filt = clips.map((c, k) => `[${k}]adelay=${Math.round(c.at * 1000)}:all=1[a${k}]`).join(';')
    + ';' + clips.map((_, k) => `[a${k}]`).join('') + `amix=inputs=${clips.length}:normalize=0,apad=whole_dur=${t.toFixed(2)},volume=1.6[out]`;
  const fpath = path.join(BUILD, 'mix.txt');
  fs.writeFileSync(fpath, filt);
  execFileSync('ffmpeg', ['-y', '-v', 'error', ...inputs, '-filter_complex_script', fpath, '-map', '[out]', '-ar', '48000', '-ac', '2', audio]);
}

// 3. 逐格算圖
const exe = path.join(os.homedir(), 'AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe');
let browser, page;
async function launch() {
  try { await browser?.close(); } catch {}
  browser = await chromium.launch({ executablePath: exe, timeout: 60000, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-gpu-watchdog'] });
  page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 });
  page.on('console', (m) => { if (m.type() === 'error') console.log('[page]', m.text()); });
  await page.goto(pathToFileURL(path.join(ROOT, 'video', 'render4.html')).href);
  await page.evaluate((tl) => window.setup(tl), timeline);
}
await launch();

if (TEST) {
  for (const ts of TEST.split(',').map(Number)) {
    await page.evaluate((x) => window.renderAt(x), ts);
    await page.screenshot({ path: path.join(BUILD, `test_${ts}.png`) });
    console.log('test frame', ts);
  }
  await browser.close();
  process.exit(0);
}

const N = Math.ceil(t * FPS);
// 每格存成檔案，可中斷後續跑；截圖逾時會重新載入頁面再試
const FRAMES = path.join(BUILD, 'frames');
fs.mkdirSync(FRAMES, { recursive: true });
const t0 = Date.now();
for (let f = 0; f < N; f++) {
  const fp = path.join(FRAMES, String(f).padStart(5, '0') + '.jpg');
  if (fs.existsSync(fp) && fs.statSync(fp).size > 0) continue;
  for (let tries = 0; ; tries++) {
    try {
      await page.evaluate((x) => window.renderAt(x), f / FPS);
      const buf = await page.screenshot({ type: 'jpeg', quality: 92, timeout: 20000 });
      fs.writeFileSync(fp, buf);
      break;
    } catch (e) {
      console.log(`格 ${f} 失敗（${tries + 1}），重新啟動瀏覽器`);
      if (tries >= 6) throw e;
      try { await launch(); } catch (e2) { console.log('重新啟動失敗', e2.message); }
    }
  }
  if (f % (FPS * 10) === 0) console.log(`格 ${f}/${N}  (${(f / FPS).toFixed(0)}s)  已花 ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await browser.close();
execFileSync('ffmpeg', ['-y', '-v', 'error', '-framerate', String(FPS), '-i', path.join(FRAMES, '%05d.jpg'), '-i', audio,
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', OUT],
{ stdio: 'inherit' });
console.log('完成：', OUT);
