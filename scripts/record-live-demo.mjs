import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LIVE = 'https://alert-ten-self.vercel.app/platform?tts=0';
const timings = JSON.parse(fs.readFileSync(path.join(ROOT,'audio_live_demo','timings.json'),'utf8'));
const tmap = Object.fromEntries(timings.map(x=>[x.id,x.duration]));
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const recDir = path.join(ROOT,'recordings');
fs.mkdirSync(recDir,{recursive:true});

const browser = await chromium.launch({headless:true});
const context = await browser.newContext({
  viewport:{width:1920,height:1080},
  recordVideo:{dir:recDir,size:{width:1920,height:1080}}
});
const page = await context.newPage();
const video = page.video();

async function addCursor(){
  await page.addStyleTag({content:`#demo-cursor{position:fixed;z-index:2147483647;width:18px;height:18px;border:3px solid #1769e0;border-radius:50%;pointer-events:none;transform:translate(-50%,-50%);box-shadow:0 0 0 5px rgba(23,105,224,.14)}#demo-cursor.down{width:30px;height:30px}`});
  await page.evaluate(()=>{const c=document.createElement('div');c.id='demo-cursor';document.body.appendChild(c);const mv=e=>{c.style.left=e.clientX+'px';c.style.top=e.clientY+'px'};addEventListener('mousemove',mv,true);addEventListener('pointermove',mv,true);addEventListener('mousedown',()=>c.classList.add('down'),true);addEventListener('mouseup',()=>c.classList.remove('down'),true)});
}
async function moveClick(locator){
  await locator.scrollIntoViewIfNeeded(); await sleep(300);
  const b=await locator.boundingBox(); if(b) await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:16});
  await sleep(220); await locator.click(); await sleep(650);
}
async function show(locator,ms=1600){await locator.scrollIntoViewIfNeeded(); await sleep(ms)}
async function section(id,fn){const start=Date.now();await fn();const left=Math.max(0,tmap[id]*1000-(Date.now()-start));if(left)await sleep(left)}
async function gotoEvents(){
  const b=page.getByRole('button',{name:'事件核查',exact:true});
  if(await b.count()) await moveClick(b);
}
async function openEvent(shortNo){
  await page.locator('#es').fill(shortNo); await sleep(450);
  const row=page.locator('.erow').filter({hasText:shortNo}).first();
  await moveClick(row); await page.waitForSelector('#detail .hero',{timeout:12000}); await sleep(700);
}
async function tab(name){await moveClick(page.getByRole('button',{name,exact:true}))}

await section('01_problem',async()=>{
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:radial-gradient(circle at 30% 20%,#1f5f9e,#071d34 70%);color:#fff;font-family:'Microsoft YaHei','Noto Sans CJK SC',sans-serif;overflow:hidden}.g{position:absolute;inset:0;background-image:linear-gradient(#ffffff10 1px,transparent 1px),linear-gradient(90deg,#ffffff10 1px,transparent 1px);background-size:60px 60px;animation:m 8s linear infinite}@keyframes m{to{transform:translateY(60px)}}.c{position:absolute;inset:0;display:grid;place-items:center;text-align:center}.k{font-size:16px;letter-spacing:6px;opacity:.75}.t{font-size:54px;font-weight:800;margin:18px}.s{font-size:24px;opacity:.86}.l{width:520px;height:3px;background:linear-gradient(90deg,transparent,#65b4ff,transparent);margin:24px auto}</style></head><body><div class="g"></div><div class="c"><div><div class="k">宁津公安 · 执法监督智能化</div><div class="t">执法全过程多模态智能监督模型</div><div class="l"></div><div class="s">还原事实 · 识别行为 · 发现机制性风险</div></div></div></body></html>`);
  await sleep(4500);
  await page.goto(LIVE,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForSelector('#login',{timeout:10000}); await addCursor(); await sleep(900);
  await moveClick(page.getByRole('button',{name:'督察端',exact:true}));
  await page.waitForSelector('#app:not(.hide)',{timeout:15000});
  await show(page.locator('#overview'),2200); await page.mouse.wheel(0,430); await sleep(1400); await page.mouse.wheel(0,-430);
});

await section('02_event',async()=>{
  await gotoEvents(); await openEvent('07000012'); await show(page.locator('#detail .hero'),2000);
  const tls=page.locator('#tl .tl'); const n=await tls.count();
  for(let i=0;i<Math.min(n,5);i++) await show(tls.nth(i),850);
});

await section('03_reconstruct',async()=>{
  await tab('音视频转写与总结');
  for(const st of ['A01','A03','A04','A10','A05','A12']){
    const c=page.locator(`.tcard[data-stage="${st}"]`).first();
    if(await c.count()) await show(c,Math.max(1100,(tmap['03_reconstruct']*1000-5000)/6));
  }
});

await section('04_evidence',async()=>{
  await tab('原始资料 / 原始证据');
  for(const id of ['A01','A04','A10','FEEDBACK']){
    const d=page.locator(`#src-${id}`); if(await d.count()){await show(d,800);const s=d.locator('summary');if(await s.count()) await moveClick(s);await show(d,950)}
  }
});

await section('05_behavior',async()=>{
  await tab('AI综合研判'); await show(page.locator('.aiwb'),1500); await show(page.locator('.fmat-wrap'),1800); await show(page.locator('.behgrid'),1800);
  for(const label of ['② 民警联系研判','③ 现场处置与反馈','⑥ 综合监督研判']){
    const b=page.locator('.ai-btn').filter({hasText:label}).first(); if(await b.count()){await moveClick(b);await show(page.locator('#aiout'),1500)}
  }
});

await section('06_breakpoint',async()=>{
  await show(page.locator('.fmat-wrap'),1400); await tab('案件流程');
  let check=page.getByRole('button',{name:'用AI核查本流程'}); if(await check.count()) await moveClick(check); await sleep(1000);
  await gotoEvents(); await openEvent('07000552'); await tab('案件流程'); await show(page.locator('#case'),1500);
  check=page.getByRole('button',{name:'用AI核查本流程'}); if(await check.count()) await moveClick(check); await show(page.locator('#aiout'),1800);
});

await section('07_closure',async()=>{
  await gotoEvents(); await openEvent('07000096'); await tab('AI综合研判');
  const cross=page.locator('.ai-btn').filter({hasText:'⑤ 重复报警与跨系统印证'}).first(); if(await cross.count()) await moveClick(cross); await show(page.locator('#aiout'),1900);
  await tab('原始资料 / 原始证据'); const rep=page.locator('#src-REPEAT'); if(await rep.count()){await show(rep,800);await moveClick(rep.locator('summary'));await show(rep,1500)}
});

await section('08_metrics',async()=>{
  await moveClick(page.getByRole('button',{name:'监督总览',exact:true}));
  await page.evaluate(()=>{
    const d=document.createElement('div');d.id='model-metrics-overlay';d.innerHTML=`<div class="mm-head"><b>模型指标分析层</b><span>汇报叠加 · 非当前独立菜单</span></div><div class="mm-grid"><div><small>01</small><b>案件化事实转正式程序率</b><i style="--w:72%"></i></div><div><small>02</small><b>关键事实衰减率</b><i style="--w:38%"></i></div><div><small>03</small><b>警情分类降级率</b><i style="--w:24%"></i></div><div><small>04</small><b>办结后回流率</b><i style="--w:18%"></i></div><div><small>05</small><b>事实与程序偏离度</b><i style="--w:31%"></i></div></div><p>规则判断 + 同类单位对比 + 时间趋势 + 统计异常 + 大模型解释</p>`;document.body.appendChild(d);
    const s=document.createElement('style');s.id='model-metrics-style';s.textContent=`#model-metrics-overlay{position:fixed;z-index:99999;left:270px;right:38px;bottom:45px;background:#ffffffee;border:1px solid #bed2e7;border-radius:18px;box-shadow:0 22px 70px #0b294933;padding:18px 20px;backdrop-filter:blur(10px)}.mm-head{display:flex;align-items:center;justify-content:space-between}.mm-head b{font-size:22px;color:#0e3155}.mm-head span{font-size:11px;color:#74869a}.mm-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:14px}.mm-grid>div{border:1px solid #dbe5ef;border-radius:12px;padding:12px;background:#f9fbfe}.mm-grid small{display:block;color:#1769e0;font-weight:700}.mm-grid b{display:block;font-size:12px;min-height:38px;margin:7px 0}.mm-grid i{display:block;height:7px;border-radius:8px;background:linear-gradient(90deg,#1769e0 var(--w),#e8eef5 var(--w));animation:mm 1.4s ease-out}#model-metrics-overlay p{margin:12px 0 0;color:#61758a}@keyframes mm{from{transform:scaleX(0);transform-origin:left}}`;document.head.appendChild(s)
  });
  await show(page.locator('#model-metrics-overlay'),3200);
});

await section('09_verifier',async()=>{
  await page.evaluate(()=>{document.querySelector('#model-metrics-overlay')?.remove();document.querySelector('#model-metrics-style')?.remove()});
  await gotoEvents(); await openEvent('07000012'); await tab('AI综合研判');
  const finalBtn=page.locator('.ai-btn').filter({hasText:'⑥ 综合监督研判'}).first(); if(await finalBtn.count()) await moveClick(finalBtn); await show(page.locator('#aiout'),2200);
  const evbtn=page.locator('#aiout .evidence-link').first(); if(await evbtn.count()) await moveClick(evbtn); await sleep(1500);
});

await section('10_close',async()=>{
  const ov=page.getByRole('button',{name:'监督总览',exact:true}); if(await ov.count()) await moveClick(ov);
  const d=tmap['10_close']; await sleep(Math.max(2500,(d-6)*1000));
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:linear-gradient(145deg,#081f38,#0d4b7d);color:#fff;font-family:'Microsoft YaHei','Noto Sans CJK SC',sans-serif}.c{height:100vh;display:grid;place-items:center;text-align:center}.t{font-size:46px;font-weight:800}.s{font-size:24px;line-height:1.9;margin-top:25px}.k{font-size:16px;opacity:.72;margin-top:28px}.dot{display:inline-block;width:10px;height:10px;border-radius:50%;background:#70c7ff;margin:0 12px}</style></head><body><div class="c"><div><div class="t">执法全过程多模态智能监督模型</div><div class="s">机器发现线索 <span class="dot"></span> 原始证据说话 <span class="dot"></span> 督察民警最终确认</div><div class="k">从还原一个事件，到发现单位异常模式，再到识别机制性风险</div></div></div></body></html>`); await sleep(6000);
});

await page.close();
await context.close();
const vp = await video.path();
fs.copyFileSync(vp,path.join(recDir,'live-system-demo.webm'));
await browser.close();
console.log(JSON.stringify({video:path.join(recDir,'live-system-demo.webm'),audioSeconds:timings.reduce((a,b)=>a+b.duration,0)},null,2));
