// Read-only playback audit of an exported MP4, independent of the composition.
import http from 'node:http';
import path from 'node:path';
import {createReadStream} from 'node:fs';
import {mkdir,stat,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import {chromium,chromePath} from './capture/browser.mjs';
const arg=(key,fallback)=>process.argv.find(x=>x.startsWith(key+'='))?.slice(key.length+1)||fallback;
const target=path.resolve(arg('--file','final/VEZZ_Reel_Imersivo.mp4'));
const label=arg('--label','v3-audit-original');
const output=path.resolve('../output/playwright',label);await mkdir(output,{recursive:true});
const bytes=(await stat(target)).size;
const html=`<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#061b4f}video{display:block;width:540px;height:960px}</style><video id="reel" muted playsinline preload="auto" src="/reel.mp4"></video><script>window.audit={frames:0,last:0,maxGap:0,errors:[],ended:false};const v=document.querySelector('video');function tick(t,m){audit.frames++;audit.maxGap=Math.max(audit.maxGap,m.mediaTime-audit.last);audit.last=m.mediaTime;v.requestVideoFrameCallback(tick)}v.requestVideoFrameCallback(tick);v.onerror=()=>audit.errors.push(v.error?.message||'media error');v.onended=()=>audit.ended=true;</script>`;
const server=http.createServer((req,res)=>{
  if(req.url!=='/reel.mp4'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);return;}
  const range=req.headers.range;
  if(range){const [a,b]=range.replace('bytes=','').split('-');const start=Number(a),end=b?Math.min(Number(b),bytes-1):bytes-1;res.writeHead(206,{'Content-Type':'video/mp4','Content-Range':`bytes ${start}-${end}/${bytes}`,'Accept-Ranges':'bytes','Content-Length':end-start+1});createReadStream(target,{start,end}).pipe(res);}
  else{res.writeHead(200,{'Content-Type':'video/mp4','Content-Length':bytes,'Accept-Ranges':'bytes'});createReadStream(target).pipe(res);}
});
await new Promise(r=>server.listen(8097,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:chromePath,headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const captures=[];
try{
  const page=await browser.newPage({viewport:{width:540,height:960}});await page.goto('http://127.0.0.1:8097/');await page.locator('video').evaluate(v=>v.play());console.log('Full playback audit started',target);
  for(const t of [2.8,6.5,11.5,15.5,17.45,17.6,20.9,21.1,24.45,24.6,27,29.8,33.5,35.8,37.5,38.5,42,45.5,49.5,52.5,55.5,58.9]){
    await page.waitForFunction(t=>document.querySelector('video').currentTime>=t,t,{timeout:30000});
    const actual=await page.locator('video').evaluate(v=>v.currentTime);await page.screenshot({path:path.join(output,t+'.png')});captures.push({requested:t,actual});console.log('AUDIT',t+'s');
  }
  await page.waitForFunction(()=>window.audit.ended,null,{timeout:15000});
  const playback=await page.evaluate(()=>({...window.audit,duration:document.querySelector('video').duration}));
  await writeFile(path.join(output,'playback.json'),JSON.stringify({file:target,playback,captures},null,2));
  console.log('PLAYBACK COMPLETE',JSON.stringify(playback));
}finally{await browser.close();server.close();}
function command(args){return new Promise((resolve,reject)=>{const p=spawn(ffmpeg,args,{windowsHide:true,stdio:['ignore','ignore','pipe']});let e='';p.stderr.on('data',d=>e+=d);p.on('exit',c=>c===0?resolve(e):reject(Error(e)));});}
const levels=await command(['-hide_banner','-i',target,'-af','loudnorm=I=-14:TP=-1.2:LRA=9:print_format=json','-f','null','NUL']);await writeFile(path.join(output,'audio.json'),levels.slice(levels.lastIndexOf('{')));
for(const name of ['search','booking','manager'])await command(['-y','-hide_banner','-loglevel','error','-i',`public/footage/${name}.mp4`,'-vf',`fps=4,scale=${name==='manager'?'240:240':'160:250'},tile=6x5:padding=4:margin=4`,'-frames:v','1',path.join(output,'raw-'+name+'.png')]);
console.log('Audit artifacts saved',output);
