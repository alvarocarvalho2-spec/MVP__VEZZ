// Existing CDP scenarios, with browser lifecycle managed by Playwright.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
const output = path.resolve('tests/artifacts');
if (['--verify','--extended','--lifecycle'].some(flag => process.argv.includes(flag)) && !process.argv.includes('--local')) {
  throw Error('Run functional scenarios with --local to use isolated demonstration data.');
}
await mkdir(output, { recursive: true });
const browser=await chromium.launch(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH,headless:true}:{channel:'chrome',headless:true});
const context=await browser.newContext();
const page=await context.newPage();
const session=await context.newCDPSession(page);
const cdp=(method,params={})=>session.send(method,params);
try {
  const evaluate = async expression => {
    const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, replMode: true });
    if (r.exceptionDetails) throw Error(r.exceptionDetails.text + ': ' + r.exceptionDetails.exception?.description);
    return r.result.value;
  };
  const screenshot = async name => {
    const r = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(path.join(output, name + '.png'), Buffer.from(r.data, 'base64'));
  };
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  if (process.argv.includes('--local')) {
    await cdp('Page.addScriptToEvaluateOnNewDocument', { source: 'localStorage.clear()' });
    await context.route('**/js/env.js',route=>route.fulfill({contentType:'application/javascript',body:'export const VEZZ_ENV={supabaseUrl:"",supabaseAnonKey:""};'}));
    await context.route('https://*.supabase.co/**',route=>route.abort());
  }
  if (process.argv.includes('--lifecycle')) {
    await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `
      window.__qaTimers=new Set();window.__qaObservers=new Set();
      const interval=window.setInterval.bind(window),clear=window.clearInterval.bind(window);
      window.setInterval=(...args)=>{const id=interval(...args);__qaTimers.add(id);return id};
      window.clearInterval=id=>{__qaTimers.delete(id);clear(id)};
      for(const name of ['IntersectionObserver','MutationObserver']){
        const Original=window[name];
        window[name]=class extends Original {
          constructor(...args){super(...args);this.targets=new Set();__qaObservers.add(this)}
          observe(target,...args){this.targets.add(target);return super.observe(target,...args)}
          unobserve(target){this.targets.delete(target);return super.unobserve(target)}
          disconnect(){this.targets.clear();return super.disconnect()}
        }
      }
    ` });
  }
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.navigate', { url: 'http://localhost:8080/#/' });
  await delay(5000);
  console.log(JSON.stringify(await evaluate(`({title:document.title, motion:matchMedia('(prefers-reduced-motion: reduce)').matches?'reduced':'full', clinics:document.querySelectorAll('.clinic-card').length, journeyHeight:document.querySelector('.jornada')?.getBoundingClientRect().height})`)));
  await screenshot(process.argv.includes('--verify') ? 'after-desktop' : 'before-desktop');
  // Further verification is supplied by the scenario module.
  if (process.argv.includes('--verify')) {
    const { verify } = await import('./visual-scenarios.mjs');
    await verify({ cdp, evaluate, screenshot, delay, output });
  }
  if (process.argv.includes('--extended')) {
    await evaluate(`location.hash='#/';scrollTo({top:0,behavior:'instant'})`); await delay(1000);
    const { verify } = await import('./extended-scenarios.mjs');
    await verify({ cdp, evaluate, screenshot, delay, output });
  }
  if (process.argv.includes('--lifecycle')) {
    const command = async expression => (await cdp('Runtime.evaluate', { expression, returnByValue: true, includeCommandLineAPI: true, awaitPromise: true })).result.value;
    const checks=[];
    const check=(name,pass)=>{checks.push({name,pass});console.log(`${pass?'PASS':'FAIL'} ${name}`);if(!pass)throw Error(name)};
    for(let i=0;i<3;i++) {
      await evaluate(`location.hash='#/';scrollTo({top:0,behavior:'instant'})`);await delay(900);
      await evaluate(`window.__oldStage=document.querySelector('#heroStage')`);
      check(`home ${i+1} owns one demo timer`,await evaluate(`__qaTimers.size===1`));
      await evaluate(`location.hash='#/como-funciona'`);await delay(850);
      check(`route ${i+1} removes demo timer`,await evaluate(`__qaTimers.size===0`));
      check(`route ${i+1} keeps only current view and header listeners`,await command(`(getEventListeners(window).scroll||[]).length===1 && (getEventListeners(window).resize||[]).length===1`));
      check(`route ${i+1} removes pointer listeners`,await command(`(getEventListeners(window.__oldStage).pointermove||[]).length===0`));
      check(`route ${i+1} releases detached observer targets`,await evaluate(`[...__qaObservers].every(o=>[...o.targets].every(t=>t.isConnected))`));
    }
    await evaluate(`(async()=>{await (await import('/js/lib/db.js')).db().signIn('ricardo@clinicasol.com','demo123');location.hash='#/gestor'})()`);await delay(1100);
    check('manager owns one polling timer',await evaluate(`__qaTimers.size===1`));
    await evaluate(`location.hash='#/clinicas'`);await delay(900);
    check('leaving manager cancels polling',await evaluate(`__qaTimers.size===0`));
    await writeFile(path.join(output,'lifecycle-verification.json'),JSON.stringify(checks,null,2));
  }
} finally {
  await browser.close();
}
