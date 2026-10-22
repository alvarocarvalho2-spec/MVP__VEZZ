import {mkdir,writeFile} from 'node:fs/promises';
import {startServer} from './server.mjs';
import {chromium,chromePath,demoContext} from './browser.mjs';
const server = await startServer();
const browser = await chromium.launch({executablePath:chromePath,headless:true});
try {
  const {context,blocked} = await demoContext(browser,{width:1200,height:1000});
  const page = await context.newPage();
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8096/#/');
  await page.waitForSelector('#jornada.is-enhanced'); await page.waitForTimeout(1500);
  await mkdir('../output/playwright',{recursive:true});
  await page.screenshot({path:'../output/playwright/video-home.png'});
  console.log(await page.locator('body').ariaSnapshot());
  console.log('GEOMETRY',await page.locator('#jornada').evaluate(async section=>{
    const {buildJourneyTimeline}=await import('/js/lib/motion-timing.js');
    const stage=section.querySelector('.jornada-stage');
    const metrics=[...section.querySelectorAll('.j-step')].map(s=>({words:s.querySelector('.j-copy').textContent.trim().split(/\s+/).length,details:s.querySelectorAll('.slot,.j-mock-row,.progress').length}));
    return {top:section.offsetTop,stageTop:getComputedStyle(stage).top,stageHeight:stage.offsetHeight,timeline:buildJourneyTimeline(metrics,stage.offsetHeight)};
  }));
  await page.getByRole('link',{name:'Entrar',exact:true}).first().click();
  await page.locator('#login').waitFor();
  await page.locator('#login [name=email]').fill('ana.silva@email.com');
  await page.locator('#login [name=senha]').fill('demo123');
  await page.locator('#login button[type=submit]').click();
  await page.waitForURL('**/#/paciente'); await page.waitForTimeout(600);
  await page.screenshot({path:'../output/playwright/video-patient.png'});
  console.log('PATIENT',await page.locator('main').ariaSnapshot());
  await page.goto('http://127.0.0.1:8096/#/agendar/cli_sol'); await page.waitForTimeout(800);
  console.log('BOOK',await page.locator('main').ariaSnapshot());
  console.log({blocked,errors});
} finally {await browser.close();server.close();}
