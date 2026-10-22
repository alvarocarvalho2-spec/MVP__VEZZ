import {mkdir,writeFile,readFile,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import ffmpeg from 'ffmpeg-static';
import {startServer} from './server.mjs';
import {chromium,chromePath,demoContext} from './browser.mjs';
const base='http://127.0.0.1:8096';
const managerV3=process.argv.includes('--manager-v3');
const manifestFile=managerV3?'raw/capture-manifest-v3-manager.json':'raw/capture-manifest.json';
let activeTake=null;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const manifest={recordedAt:new Date().toISOString(),mode:'LocalAdapter — fictional seed only',fps:30,clips:[],actions:[],errors:[],blocked:[]};
await mkdir('raw/frames',{recursive:true}); await mkdir('public/footage',{recursive:true});
const server=await startServer();
const browser=await chromium.launch({executablePath:chromePath,headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--hide-scrollbars']});
const {context,blocked}=await demoContext(browser,{width:1200,height:1000});
const page=await context.newPage(); page.on('pageerror',e=>manifest.errors.push(e.message));
const log=(action,data={})=>{manifest.actions.push({action,...data});console.log(action,JSON.stringify(data));};
async function ready(hash,selector='main h1') {
  await page.goto(base+'/'+hash); await page.locator(selector).first().waitFor(); await page.waitForTimeout(750);
}
async function cursor() {
  await page.evaluate(()=>{
    if(document.getElementById('film-cursor'))return;
    const node=document.createElement('div');node.id='film-cursor';
    node.style.cssText='position:fixed;left:-100px;top:-100px;width:18px;height:18px;z-index:2147483647;pointer-events:none;border:2px solid #fff;background:#0b3b8f;border-radius:50%;box-shadow:0 0 0 5px #3fe6ff55,0 2px 12px #061b4f55;transform:translate(-50%,-50%);transition:width 100ms,height 100ms';
    document.body.append(node);
    addEventListener('pointermove',e=>{node.style.left=e.clientX+'px';node.style.top=e.clientY+'px';});
    addEventListener('pointerdown',()=>{node.style.width='26px';node.style.height='26px';});
    addEventListener('pointerup',()=>{node.style.width='18px';node.style.height='18px';});
  });
}
async function click(locator) {
  await locator.waitFor({state:'visible'});
  const b=await locator.boundingBox();
  await page.mouse.move(b.x+b.width*.5,b.y+b.height*.5,{steps:20});
  await wait(130);
  if(activeTake)manifest.actions.push({action:'click',clip:activeTake.name,at:(performance.now()-activeTake.started)/1000,label:(await locator.innerText().catch(()=>''))?.trim()});
  await locator.click();
}
async function scrollToY(to,ms) {
  await page.evaluate(({to,ms})=>new Promise(resolve=>{
    const from=scrollY;const begin=performance.now();
    const tick=now=>{const t=Math.min(1,(now-begin)/ms);const e=t*t*(3-2*t);scrollTo({top:from+(to-from)*e,behavior:'instant'});if(t<1)requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick);
  }),{to,ms});
}
function run(args) {return new Promise((resolve,reject)=>{const proc=spawn(ffmpeg,args,{windowsHide:true,stdio:['ignore','ignore','pipe']});let err='';proc.stderr.on('data',x=>err+=x);proc.on('exit',code=>code===0?resolve():reject(Error(err.slice(-2500))));});}
async function take(name,seconds,action) {
  await cursor(); const folder=path.resolve('raw/frames',name);await mkdir(folder,{recursive:true});
  const cdp=await context.newCDPSession(page); const frames=[];const writes=[]; const started=performance.now();
  const listener=e=>{
    const index=frames.length;const filename=String(index).padStart(5,'0')+'.jpg';
    frames.push({file:filename,timestamp:e.metadata.timestamp,wall:(performance.now()-started)/1000});
    writes.push(writeFile(path.join(folder,filename),Buffer.from(e.data,'base64')));
    cdp.send('Page.screencastFrameAck',{sessionId:e.sessionId}).catch(()=>{});
  };
  cdp.on('Page.screencastFrame',listener);
  await cdp.send('Page.startScreencast',{format:'jpeg',quality:96,maxWidth:1200,maxHeight:1100,everyNthFrame:1});
  activeTake={name,started};
  console.log('RECORD',name,seconds);
  await action();
  activeTake=null;
  const elapsed=(performance.now()-started)/1000;
  if(elapsed<seconds)await wait((seconds-elapsed)*1000);
  await cdp.send('Page.stopScreencast');cdp.off('Page.screencastFrame',listener);await cdp.detach();await Promise.all(writes);
  if(frames.length<5)throw Error('No live browser footage: '+name);
  const duration=Math.max(seconds,(performance.now()-started)/1000);
  let concat='';
  // Preserve real elapsed time, including unchanged frames. No slideshow,
  // no animation seeking and no forced website state during recording.
  for(let i=0;i<frames.length;i++) {
    const dt=i===frames.length-1?Math.max(.001,duration-frames[i].wall):Math.max(.001,frames[i+1].wall-frames[i].wall);
    concat+=`file '${frames[i].file}'\nduration ${dt.toFixed(6)}\n`;
  }
  concat+=`file '${frames.at(-1).file}'\n`;
  await writeFile(path.join(folder,'frames.ffconcat'),concat);
  await writeFile(path.join(folder,'timestamps.json'),JSON.stringify(frames));
  const out=path.resolve('public/footage',name+'.mp4');
  await run(['-y','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',path.join(folder,'frames.ffconcat'),'-vf','fps=30','-t',String(duration),'-c:v','libx264','-preset','fast','-crf','16','-pix_fmt','yuv420p','-movflags','+faststart','-threads','2',out]);
  const clip={name,seconds:duration,viewport:page.viewportSize(),liveFrames:frames.length,liveFramesPerSecond:frames.length/duration,file:'public/footage/'+name+'.mp4'};
  manifest.clips.push(clip);log('SAVED',clip);
  await writeFile(manifestFile,JSON.stringify(manifest,null,2));
}
async function signIn(email,hash) {
  await ready('#/login','#login');
  await page.locator('#login [name=email]').fill(email);await page.locator('#login [name=senha]').fill('demo123');
  await page.locator('#login button[type=submit]').click(); await page.waitForURL('**/'+hash);await wait(800);
}
try {
  if(managerV3){
    await signIn('ana.silva@email.com','#/paciente');
    await page.evaluate(async()=>{
      const {db}=await import('/js/lib/db.js');
      await db().cancelAppointment('con_ana_hoje');
      // Prepare the already filmed fictional booking using the real adapter.
      // The deterministic demo ticket preserves continuity with A-071.
      const random=Math.random;Math.random=()=>61.5/89;
      try{await db().bookAppointment({id_paciente:'pac_ana',id_clinica:'cli_sol',data:'2026-10-19',horario:'09:30',especialidade:'Cardiologia',observacao:''});}finally{Math.random=random;}
    });
    await click(page.locator('[data-action=logout]').first());await wait(400);
    await page.setViewportSize({width:1000,height:1000});
    await signIn('ricardo@clinicasol.com','#/gestor');
    await page.evaluate(()=>document.querySelector('#toasts')?.replaceChildren());
    await take('manager-v3',7.5,async()=>{
      await wait(450);await click(page.getByRole('link',{name:'Abrir fila',exact:true}));await wait(700);
      for(let i=0;i<4;i++){await click(page.locator('[data-next]').first());await wait(650);}
    });
    log('V3 manager final real status',await page.evaluate(async()=>{const{db}=await import('/js/lib/db.js');const q=await db().getPatientQueue('pac_ana');return{status:q.consulta.status,ticket:q.consulta.ticket};}));
    await page.screenshot({path:'../output/playwright/v3-review/manager-recapture.png'});
  }else{
  await ready('#/','#jornada.is-enhanced');
  await take('home',10,async()=>{
    await page.reload();await page.locator('#heroStage').waitFor();await wait(1000);await cursor();
    await page.mouse.move(980,390,{steps:35});await wait(700);await page.mouse.move(750,570,{steps:35});await wait(650);
    const clinics=await page.locator('#clinicas-home').evaluate(e=>e.offsetTop);
    await scrollToY(clinics-130,2600);await wait(600);
    await page.locator('.clinic-card').first().hover();await wait(700);
  });
  if(process.argv.includes('--home-only'))process.exitCode=0;
  else {
    await ready('#/','#jornada.is-enhanced');
    const geo=await page.locator('#jornada').evaluate(async section=>{
      const {buildJourneyTimeline}=await import('/js/lib/motion-timing.js');const stage=section.querySelector('.jornada-stage');
      const metrics=[...section.querySelectorAll('.j-step')].map(s=>({words:s.querySelector('.j-copy').textContent.trim().split(/\s+/).length,details:s.querySelectorAll('.slot,.j-mock-row,.progress').length}));
      return {start:section.offsetTop-parseFloat(getComputedStyle(stage).top),timeline:buildJourneyTimeline(metrics,stage.offsetHeight)};
    });
    await scrollToY(geo.start-170,700);await wait(250);
    const steps=[];
    await take('journey',15,async()=>{
      await scrollToY(geo.start+geo.timeline.steps[0].enterEnd,1200);await wait(1650);
      steps.push(await page.locator('#jornada').getAttribute('data-step'));
      for(let i=1;i<4;i++) {
        const prev=geo.timeline.steps[i-1];const next=geo.timeline.steps[i];
        await scrollToY(geo.start+prev.holdEnd-10,700);
        await scrollToY(geo.start+next.enterEnd+35,1250);await wait(1550);
        steps.push(await page.locator('#jornada').getAttribute('data-step'));
      }
      await page.screenshot({path:'../output/playwright/video-journey-final.png'});
    });
    if(steps.join(',')!=='1,2,3,4')throw Error('Journey not fully captured: '+steps);
    log('Journey all intermediate scroll transitions captured',{steps,geo});
    // Authenticate normally with the repository's documented fictitious account.
    await signIn('ana.silva@email.com','#/paciente');
    // Prepare the local demonstration fixture using the real adapter API.
    // This happens BEFORE footage and only removes Ana's preseeded slot.
    await page.evaluate(async()=>{const {db}=await import('/js/lib/db.js');await db().cancelAppointment('con_ana_hoje');});
    await page.setViewportSize({width:640,height:1000});
    await ready('#/clinicas');
    console.log('SEARCH SNAPSHOT',await page.locator('main').ariaSnapshot());
    await take('search',4.8,async()=>{
      const query=page.locator('input[name=q]');await click(query);await query.pressSequentially('Cardiologia',{delay:65});
      await click(page.getByRole('button',{name:/Pesquisar|Filtrar|Buscar/}).first());await wait(500);
      await click(page.locator('a[href="#/clinica/cli_sol"]').first());await wait(700);
    });
    await page.screenshot({path:'../output/playwright/video-clinic.png'});
    await ready('#/agendar/cli_sol','#book');
    await page.screenshot({path:'../output/playwright/video-booking-before.png'});
    await take('booking',6.4,async()=>{
      await wait(350);await click(page.locator('#especialidade'));await page.locator('#especialidade').selectOption('Cardiologia');
      await wait(400);await click(page.locator('#slots button').filter({hasText:'09:30'}));
      await wait(600);await click(page.getByRole('button',{name:'Confirmar agendamento',exact:true}));
      await page.waitForURL('**/#/paciente?nova=*');await wait(1200);
    });
    log('Real local appointment persisted',await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('vezz.db.v2'));const c=d.consultas.filter(c=>c.id_paciente==='pac_ana'&&c.status==='Agendada'&&c.especialidade==='Cardiologia');return {count:c.length,status:c[0]?.status};}));
    await take('patient',3.5,async()=>{
      await click(page.getByRole('link',{name:'Abrir acompanhamento'}));await wait(850);await scrollToY(120,650);
    });
    await page.screenshot({path:'../output/playwright/video-queue.png'});
    await click(page.locator('[data-action=logout]').first());await wait(500);
    await page.setViewportSize({width:1000,height:1000});
    await signIn('ricardo@clinicasol.com','#/gestor');
    await take('manager',7.5,async()=>{
      await wait(450);await click(page.getByRole('link',{name:'Abrir fila',exact:true}));await wait(700);
      for(let i=0;i<4;i++) {
        await click(page.locator('[data-next]').first());await wait(650);
      }
    });
    await page.screenshot({path:'../output/playwright/video-manager.png'});
    await click(page.locator('[data-action=logout]').first());await wait(400);
    await page.setViewportSize({width:640,height:1000});await signIn('ana.silva@email.com','#/paciente');
    await ready('#/paciente/fila');
    await take('called',3.4,async()=>{await scrollToY(100,850);await wait(900);});
    await page.screenshot({path:'../output/playwright/video-called.png'});
    log('Patient service verified',await page.evaluate(async()=>{const {db}=await import('/js/lib/db.js');const q=await db().getPatientQueue('pac_ana');return {status:q.consulta.status,position:q.posicao};}));
  }
  }
} finally {
  manifest.blocked=blocked;await writeFile(manifestFile,JSON.stringify(manifest,null,2));
  await browser.close();server.close();
}
