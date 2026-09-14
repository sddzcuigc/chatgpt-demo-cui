import asyncio, json, os, subprocess
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parents[1]
PLAN = json.loads((ROOT/'scripts/live-demo-narration.json').read_text(encoding='utf-8'))
OUT = ROOT/'audio_live_demo'
OUT.mkdir(exist_ok=True)
VOICE='zh-CN-YunyangNeural'
RATE='+3%'

def duration(path):
    r=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(path)],capture_output=True,text=True,check=True)
    return float(r.stdout.strip())

async def main():
    timings=[]
    concat=[]
    for i,seg in enumerate(PLAN,1):
        p=OUT/f'{i:02d}_{seg["id"]}.mp3'
        await edge_tts.Communicate(seg['text'], VOICE, rate=RATE).save(str(p))
        d=duration(p)
        timings.append({'id':seg['id'],'duration':d,'file':p.name,'text':seg['text']})
        concat.append(f"file '{p.name}'")
    (OUT/'timings.json').write_text(json.dumps(timings,ensure_ascii=False,indent=2),encoding='utf-8')
    (OUT/'concat.txt').write_text('\n'.join(concat),encoding='utf-8')
    subprocess.run(['ffmpeg','-y','-f','concat','-safe','0','-i','concat.txt','-c:a','libmp3lame','-q:a','2','narration.mp3'],cwd=OUT,check=True)
    total=duration(OUT/'narration.mp3')
    print(json.dumps({'voice':VOICE,'rate':RATE,'duration':total},ensure_ascii=False))

asyncio.run(main())
