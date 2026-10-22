import {bundle} from '@remotion/bundler';
import {renderMedia,renderStill,selectComposition} from '@remotion/renderer';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromePath} from './capture/browser.mjs';
const browserExecutable=chromePath;
if(process.argv.includes('--verify')||process.argv.includes('--verify-preview')) {await import('./verify.mjs');process.exit(0);}
if(process.argv.includes('--finish'))await import('./audio/compose.mjs');
await mkdir('final',{recursive:true});await mkdir('../output/playwright/reel-review',{recursive:true});
const serveUrl=await bundle({entryPoint:path.resolve('src/index.jsx'),publicDir:path.resolve('public'),outDir:path.resolve('.cache/bundle'),onProgress:p=>{if(p===100)console.log('Composition bundled');}});
const composition=await selectComposition({serveUrl,id:'VEZZ-Reel',browserExecutable});
if(process.argv.includes('--stills')) {
  const requested=process.argv.find(a=>a.startsWith('--at='));
  for(const second of requested?requested.slice(5).split(',').map(Number):[1.8,3.3,6.5,11,15.5,18.5,22,26.5,30,32.8,35.8,38.8,42,45.5,49.5,52.5,56.5,58.6]) {
    console.log('Review frame',second);
    await renderStill({composition,serveUrl,browserExecutable,frame:Math.round(second*30),output:path.resolve('../output/playwright/reel-review',String(second)+'.png'),imageFormat:'png',scale:.5,chromiumOptions:{gl:'angle'},timeoutInMilliseconds:90000});
  }
} else {
  const preview=process.argv.includes('--preview');let last=-1;
  const out=path.resolve('final',preview?'VEZZ_Reel_Previa.mp4':'VEZZ_Reel_Imersivo.mp4');
  console.log('Rendering',out);
  const start=Date.now();
  await renderMedia({composition,serveUrl,browserExecutable,outputLocation:out,codec:'h264',audioCodec:'aac',audioBitrate:'192k',pixelFormat:'yuv420p',colorSpace:'bt709',crf:preview?25:17,x264Preset:'fast',scale:preview?.5:1,concurrency:1,offthreadVideoThreads:1,offthreadVideoCacheSizeInBytes:96*1024*1024,imageFormat:'jpeg',jpegQuality:95,timeoutInMilliseconds:90000,chromiumOptions:{gl:'angle'},onProgress:p=>{const percent=Math.floor(p.progress*100);if(percent!==last){last=percent;console.log(`RENDER ${percent}% (${p.renderedFrames}/1800 frames)`);}}});
  await writeFile(preview?'final/preview-render.json':'final/render.json',JSON.stringify({file:out,codec:'H.264',fps:30,width:preview?540:1080,height:preview?960:1920,duration:60,elapsedSeconds:(Date.now()-start)/1000},null,2));
  console.log('COMPLETE',out);
  if(process.argv.includes('--finish'))await import('./verify.mjs');
}
