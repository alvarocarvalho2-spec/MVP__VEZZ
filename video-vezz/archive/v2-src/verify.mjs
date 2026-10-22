import {spawn} from 'node:child_process';
import {readFile,writeFile,stat,mkdir} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {createHash} from 'node:crypto';
import ffmpeg from 'ffmpeg-static';
import {chromium,chromePath} from './capture/browser.mjs';
const preview=process.argv.includes('--verify-preview');
const target=path.resolve('final',preview?'VEZZ_Reel_Previa.mp4':'VEZZ_Reel_Imersivo.mp4');
const ffprobe=path.resolve('node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe');
function cmd(binary,args) {return new Promise((resolve,reject)=>{
  const p=spawn(binary,args,{windowsHide:true,stdio:['ignore','pipe','pipe']});let out='',err='';p.stdout.on('data',v=>out+=v);p.stderr.on('data',v=>err+=v);p.on('error',reject);p.on('exit',code=>code===0?resolve({out,err}):reject(Error(err)));
});}
const metadata=JSON.parse((await cmd(ffprobe,['-v','error','-show_streams','-show_format','-of','json',target])).out);
const video=metadata.streams.find(s=>s.codec_type==='video'),audio=metadata.streams.find(s=>s.codec_type==='audio');
const capture=JSON.parse(await readFile('raw/capture-manifest.json','utf8'));
const checks={
  h264:video.codec_name==='h264',
  correctResolution:video.width===(preview?540:1080)&&video.height===(preview?960:1920),
  fps30:video.avg_frame_rate==='30/1',
  frames1800:Number(video.nb_frames)===1800,
  duration60:Math.abs(Number(metadata.format.duration)-60)<.1,
  yuv420p:video.pix_fmt==='yuv420p',
  aacStereo:audio.codec_name==='aac'&&audio.channels===2,
  audio48k:audio.sample_rate==='48000',
  fullJourney:JSON.stringify(capture.actions.find(a=>a.steps)?.steps)==='["1","2","3","4"]',
  persistedLocalAppointment:capture.actions.find(a=>a.action==='Real local appointment persisted')?.count===1,
  realServiceStatus:capture.actions.find(a=>a.action==='Patient service verified')?.status==='Em Atendimento',
  noPageErrors:capture.errors.length===0,
  noExternalRequests:capture.blocked.length===0,
};
console.log('METADATA',JSON.stringify({file:target,seconds:metadata.format.duration,video:{codec:video.codec_name,width:video.width,height:video.height,fps:video.avg_frame_rate,frames:video.nb_frames},audio:{codec:audio.codec_name,sampleRate:audio.sample_rate,channels:audio.channels}}));
await cmd(ffmpeg,['-v','error','-xerror','-i',target,'-f','null','NUL']);checks.fullDecode=true;console.log('Complete video and audio decode passed');
const levels=await cmd(ffmpeg,['-hide_banner','-i',target,'-af','loudnorm=I=-14:TP=-1.2:LRA=9:print_format=json','-f','null','NUL']);
const loudness=JSON.parse(levels.err.slice(levels.err.lastIndexOf('{')));checks.noAudioClipping=Number(loudness.input_tp)<0;console.log('AUDIO',JSON.stringify(loudness));
await mkdir('../output/playwright/reel-review',{recursive:true});
// Review images are DECODED FROM THE EXPORTED MP4, not re-rendered stills.
for(const t of [6.5,11,15.5,18.5,22,26.5,30,33.6,35.8,38.8,42,45.5,49.5,52.5,58.6]) {
  await cmd(ffmpeg,['-y','-hide_banner','-loglevel','error','-ss',String(t),'-i',target,'-frames:v','1','-vf','scale=540:960','-threads','1',path.resolve('../output/playwright/reel-review',`export-${t}.png`)]);
}
const html=`<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#061b4f;display:grid;place-items:center;min-height:100vh}video{width:540px;height:960px}</style><video id="reel" controls muted playsinline preload="auto" src="/reel.mp4"></video><script>window.playback={frames:0,last:0,maxGap:0,errors:[],ended:false};const v=document.querySelector('video');function frame(now,m){playback.frames++;playback.maxGap=Math.max(playback.maxGap,m.mediaTime-playback.last);playback.last=m.mediaTime;v.requestVideoFrameCallback(frame)}v.requestVideoFrameCallback(frame);v.onerror=()=>playback.errors.push(v.error?.message||'media error');v.onended=()=>playback.ended=true;</script>`;
const bytes=(await stat(target)).size;
const server=http.createServer((req,res)=>{
  if(req.url!=='/reel.mp4'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);return;}
  const range=req.headers.range;
  if(range){const [a,b]=range.replace('bytes=','').split('-');const start=Number(a),end=b?Math.min(Number(b),bytes-1):bytes-1;res.writeHead(206,{'Content-Type':'video/mp4','Content-Range':`bytes ${start}-${end}/${bytes}`,'Accept-Ranges':'bytes','Content-Length':end-start+1});createReadStream(target,{start,end}).pipe(res);}
  else{res.writeHead(200,{'Content-Type':'video/mp4','Content-Length':bytes,'Accept-Ranges':'bytes'});createReadStream(target).pipe(res);}
});
await new Promise(r=>server.listen(8097,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:chromePath,headless:true,args:['--autoplay-policy=no-user-gesture-required']});
let playback;
try {
  const context=await browser.newContext({viewport:{width:600,height:1020}});const page=await context.newPage();await page.goto('http://127.0.0.1:8097/');
  await page.locator('video').evaluate(v=>v.play());console.log('PLAYBACK started — exported MP4 in Chrome');
  for(const until of [15,30,45,59]) {
    await page.waitForFunction(t=>document.querySelector('video').currentTime>=t,until,{timeout:30000});
    console.log('PLAYBACK',until+'s');
  }
  await page.waitForFunction(()=>playback.ended,null,{timeout:15000});playback=await page.evaluate(()=>({...window.playback,duration:document.querySelector('video').duration,readyState:document.querySelector('video').readyState}));
  checks.fullBrowserPlayback=playback.ended&&playback.errors.length===0&&playback.frames>1000;
  await page.screenshot({path:'../output/playwright/reel-review/playback-ended.png'});
}finally{await browser.close();server.close();}
const originalChanges=(await cmd('git',['diff','--name-only','--','index.html','js','css','assets','start.sh','serve.py'])).out.trim();checks.productionFilesUnchanged=originalChanges==='';
const hash=createHash('sha256').update(await readFile(target)).digest('hex');
const report={file:target,sha256:hash,sizeBytes:bytes,checks,metadata,loudness,playback,originalChanges,review:'Exported MP4 decoded completely, played end-to-end in Chrome, and decoded key frames saved for visual review.'};
await writeFile(preview?'final/preview-quality-report.json':'final/quality-report.json',JSON.stringify(report,null,2));
console.log('QUALITY',JSON.stringify(checks));
if(Object.values(checks).some(x=>!x))throw Error('A quality check failed. See report.');
if(!preview){
  const previewFile=path.resolve('final/VEZZ_Reel_Previa.mp4');
  await cmd(ffmpeg,['-y','-hide_banner','-loglevel','error','-i',target,'-vf','scale=540:960:flags=lanczos','-c:v','libx264','-preset','fast','-crf','24','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-movflags','+faststart','-threads','2',previewFile]);
  const pMetadata=JSON.parse((await cmd(ffprobe,['-v','error','-show_streams','-show_format','-of','json',previewFile])).out);
  await cmd(ffmpeg,['-v','error','-xerror','-i',previewFile,'-f','null','NUL']);
  const pVideo=pMetadata.streams.find(s=>s.codec_type==='video');
  const pChecks={h264:pVideo.codec_name==='h264',resolution:pVideo.width===540&&pVideo.height===960,fps30:pVideo.avg_frame_rate==='30/1',frames1800:Number(pVideo.nb_frames)===1800,fullDecode:true};
  if(Object.values(pChecks).some(x=>!x))throw Error('Derived preview validation failed');
  await writeFile('final/preview-quality-report.json',JSON.stringify({file:previewFile,sha256:createHash('sha256').update(await readFile(previewFile)).digest('hex'),derivedFromMasterSha256:hash,checks:pChecks,metadata:pMetadata,review:'Derived directly from the validated master; complete decode verified. End-to-end Chrome playback is recorded in the master quality report.'},null,2));
  console.log('Lightweight preview derived from the final master and verified');
  await import('./package-project.mjs');
}
