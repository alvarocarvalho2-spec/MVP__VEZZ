// Read-only verification of the deployed site. Never submit production forms.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base='https://vezz-mvp.vercel.app';
const output='output/playwright/release';
await mkdir(output,{recursive:true});
const results=[],errors=[],blockedWrites=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const context=await browser.newContext({viewport:{width:1366,height:900},reducedMotion:'reduce'});
  await context.route('**/*',route=>{
    if(!['GET','HEAD','OPTIONS'].includes(route.request().method())){
      blockedWrites.push({method:route.request().method(),path:new URL(route.request().url()).pathname});
      return route.abort();
    }
    return route.continue();
  });
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  const check=(name,pass)=>{results.push({name,pass:Boolean(pass)});assert.ok(pass,name);console.log('PASS '+name);};
  const response=await page.goto(base);
  await page.waitForFunction(()=>document.querySelector('#app').dataset.route==='/'&&!document.querySelector('#app[aria-busy]'));
  check('production release and security headers',response.status()===200&&response.headers()['x-vezz-release']==='20261018-security'&&response.headers()['content-security-policy'].includes("frame-ancestors 'none'"));
  await page.screenshot({path:`${output}/production-home.png`});
  const routes=['/clinicas','/login','/cadastro','/recuperar-senha','/convite/release-smoke-nonexistent'];
  for(const route of routes){
    await page.goto(base+'/#'+route);
    await page.waitForFunction(route=>document.querySelector('#app').dataset.route===route&&!document.querySelector('#app[aria-busy]'),route);
    check('production route '+route,(await page.locator('main h1').count())===1&&!(await page.locator('main h1').innerText()).includes('Algo saiu'));
    if(route==='/login')check('demo credentials are hidden in production',await page.locator('.demo-box').count()===0);
  }
  await page.goto(base+'/#/gestor/fila');
  await page.waitForFunction(()=>document.querySelector('#app').dataset.route==='/login'&&!document.querySelector('#app[aria-busy]'));
  check('manager route requires authentication',page.url().includes('#/login?redirect='));
  await page.setViewportSize({width:375,height:812});
  check('production mobile login fits viewport',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`${output}/production-login-mobile.png`});
  check('no JavaScript exceptions',errors.length===0);
  check('no production write requests',blockedWrites.length===0);
} finally {
  await browser.close();
  await writeFile(`${output}/production-smoke.json`,JSON.stringify({results,errors,blockedWrites},null,2));
}
