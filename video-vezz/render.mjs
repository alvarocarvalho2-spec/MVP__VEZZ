import {bundle} from '@remotion/bundler';
import {renderMedia,renderStill,selectComposition} from '@remotion/renderer';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromePath} from './capture/browser.mjs';
const browserExecutable=chromePath;
const v3=process.argv.includes('--v3');
const short=process.argv.includes('--short');
if(process.argv.includes('--verify')||process.argv.includes('--verify-preview')) {await import('./verify.mjs');process.exit(0);}
if(process.argv.includes('--finish'))await import('./audio/compose.mjs');
const reviewFolder=short?'../output/playwright/short-review':v3?'../output/playwright/v3-review':'../output/playwright/reel-review';
await mkdir('final',{recursive:true});await mkdir(reviewFolder,{recursive:true});
const serveUrl=await bundle({entryPoint:path.resolve('src/index.jsx'),publicDir:path.resolve('public'),outDir:path.resolve('.cache/bundle'),onProgress:p=>{if(p===100)console.log('Composition bundled');}});
const composition=await selectComposition({serveUrl,id:short?'VEZZ-Reel-Curto':v3?'VEZZ-Reel-V3':'VEZZ-Reel',browserExecutable});
if(process.argv.includes('--stills')) {
  const requested=process.argv.find(a=>a.startsWith('--at='));
  for(const second of requested?requested.slice(5).split(',').map(Number):short?[1.4,3.3,5.4,7.5,9.5,12.8,14.6,15.6,18.6,20.8,23.5,27.8,30.5,34.1,36.7]:[1.8,3.3,6.5,11,15.5,18.5,22,26.5,30,32.8,35.8,38.8,42,45.5,49.5,52.5,56.5,58.6]) {
    console.log('Review frame',second);
    await renderStill({composition,serveUrl,browserExecutable,frame:Math.round(second*30),output:path.resolve(reviewFolder,String(second)+'.png'),imageFormat:'png',scale:.5,chromiumOptions:{gl:'angle'},timeoutInMilliseconds:90000});
  }
} else {
  const preview=process.argv.includes('--preview');let last=-1;
  const out=path.resolve('final',short?(preview?'VEZZ_Reel_Curto_Previa.mp4':'VEZZ_Reel_Curto_37s.mp4'):v3?(preview?'VEZZ_Reel_Previa_V3.mp4':'VEZZ_Reel_Imersivo_V3.mp4'):(preview?'VEZZ_Reel_Previa.mp4':'VEZZ_Reel_Imersivo.mp4'));
  console.log('Rendering',out);
  const start=Date.now();
  await renderMedia({composition,serveUrl,browserExecutable,outputLocation:out,codec:'h264',audioCodec:'aac',audioBitrate:'192k',pixelFormat:'yuv420p',colorSpace:'bt709',crf:preview?25:17,x264Preset:'fast',scale:preview?.5:1,concurrency:1,offthreadVideoThreads:1,offthreadVideoCacheSizeInBytes:96*1024*1024,imageFormat:short?'png':'jpeg',jpegQuality:short?undefined:95,timeoutInMilliseconds:90000,chromiumOptions:{gl:'angle'},onProgress:p=>{const percent=Math.floor(p.progress*100);if(percent!==last){last=percent;console.log(`RENDER ${percent}% (${p.renderedFrames}/${composition.durationInFrames} frames)`);}}});
  await writeFile(short?(preview?'final/preview-render-short.json':'final/render-short.json'):v3?(preview?'final/preview-render-v3.json':'final/render-v3.json'):(preview?'final/preview-render.json':'final/render.json'),JSON.stringify({file:out,codec:'H.264',fps:composition.fps,width:preview?540:1080,height:preview?960:1920,duration:composition.durationInFrames/composition.fps,elapsedSeconds:(Date.now()-start)/1000},null,2));
  console.log('COMPLETE',out);
  if(process.argv.includes('--finish'))await import('./verify.mjs');
}
