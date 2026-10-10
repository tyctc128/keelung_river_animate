# 用微軟線上語音（edge-tts，zh-TW-HsiaoChenNeural）把每句旁白存成 mp3
# 用法：python tools/tts_edge.py 輸入.json 輸出資料夾
import asyncio, json, os, sys
import edge_tts

VOICE, RATE = "zh-TW-HsiaoChenNeural", "-6%"
items = json.load(open(sys.argv[1], encoding="utf-8"))
out = sys.argv[2]
os.makedirs(out, exist_ok=True)

async def make(it):
    path = os.path.join(out, it["id"] + ".mp3")
    stamp = path + ".txt"
    if os.path.exists(path) and os.path.exists(stamp) and open(stamp, encoding="utf-8").read() == it["text"]:
        return
    for attempt in range(6):
        try:
            await edge_tts.Communicate(it["text"], VOICE, rate=RATE).save(path + ".tmp")
            os.replace(path + ".tmp", path)
            open(stamp, "w", encoding="utf-8").write(it["text"])
            return
        except Exception as e:
            print("retry", it["id"], type(e).__name__, flush=True)
            await asyncio.sleep(2 + attempt * 2)
    raise RuntimeError("TTS failed: " + it["id"])

async def main():
    sem = asyncio.Semaphore(3)
    async def run(it):
        async with sem:
            await make(it)
    await asyncio.gather(*(run(it) for it in items))
    print("tts done:", len(items))

asyncio.run(main())
