import {createRequire} from 'node:module';
let playwright;
try {playwright = await import('playwright');}
catch {playwright = createRequire(import.meta.url)('C:/Users/PC/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright');}
export const {chromium} = playwright;
export const chromePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
export async function demoContext(browser, viewport) {
  const context = await browser.newContext({viewport,deviceScaleFactor:1,locale:'pt-BR',timezoneId:'America/Fortaleza',reducedMotion:'no-preference',serviceWorkers:'block'});
  const blocked = [];
  await context.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.hostname === '127.0.0.1' && u.port === '8096') return route.continue();
    if (['data:','blob:','about:'].includes(u.protocol)) return route.continue();
    blocked.push(u.origin); return route.abort('blockedbyclient');
  });
  await context.addInitScript(() => {
    // Separate, disposable browser context. A fixed demonstration morning
    // keeps actual appointment validation meaningful when re-recording.
    const NativeDate = Date;
    const start = performance.now();
    const base = new NativeDate('2026-10-19T08:15:00-03:00').getTime();
    globalThis.Date = class extends NativeDate {
      constructor(...args) {super(...(args.length ? args : [base + performance.now()-start]));}
      static now() {return base+performance.now()-start;}
    };
  });
  return {context,blocked};
}
