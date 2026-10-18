// Playwright CLI run-code callback. See docs/REFINAMENTO-SCROLL.md.
async page => {
  const results = [];
  const check = (name, pass) => {
    results.push({ name, pass: Boolean(pass) });
    if (!pass) throw Error(JSON.stringify(results));
  };
  const browser = page.context().browser();
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'no-preference' });
  await context.addInitScript(() => {
    window.__motionQA = { timers: new Set(), observers: new Set() };
    const interval = window.setInterval.bind(window), clear = window.clearInterval.bind(window);
    window.setInterval = (...args) => { const id = interval(...args); __motionQA.timers.add(id); return id; };
    window.clearInterval = id => { __motionQA.timers.delete(id); clear(id); };
    for (const name of ['IntersectionObserver', 'MutationObserver', 'ResizeObserver']) {
      const Original = window[name];
      window[name] = class extends Original {
        constructor(...args) { super(...args); this.targets = new Set(); __motionQA.observers.add(this); }
        observe(target, ...args) { this.targets.add(target); return super.observe(target, ...args); }
        unobserve(target) { this.targets.delete(target); return super.unobserve(target); }
        disconnect() { this.targets.clear(); return super.disconnect(); }
      };
    }
  });
  const local = route => route.fulfill({ contentType: 'application/javascript', body: 'export const VEZZ_ENV = {supabaseUrl:String(),supabaseAnonKey:String()};' });
  const testPage = await context.newPage();
  await testPage.route('**/js/env.js', local);
  const errors = [];
  testPage.on('pageerror', error => errors.push(error.message));
  const client = await context.newCDPSession(testPage);
  try {
    await testPage.goto('http://localhost:8080/#/');
    for (let i = 0; i < 3; i++) {
      await testPage.evaluate(() => { location.hash = '#/'; scrollTo({ top: 0, behavior: 'instant' }); });
      await testPage.waitForSelector('#jornada.is-enhanced'); await testPage.waitForTimeout(900);
      check('Home owns one demo timer, visit ' + (i + 1), await testPage.evaluate(() => __motionQA.timers.size === 1));
      await testPage.evaluate(() => { window.__oldStage = document.querySelector('#heroStage'); location.hash = '#/como-funciona'; });
      await testPage.waitForSelector('#app[data-route="/como-funciona"]:not([aria-busy])'); await testPage.waitForTimeout(500);
      check('Leaving home removes its timer, visit ' + (i + 1), await testPage.evaluate(() => __motionQA.timers.size === 0));
      const listeners = (await client.send('Runtime.evaluate', { expression: '({scroll:(getEventListeners(window).scroll||[]).length,resize:(getEventListeners(window).resize||[]).length,pointer:(getEventListeners(__oldStage).pointermove||[]).length})', includeCommandLineAPI: true, returnByValue: true })).result.value;
      check('Only current view/header listeners remain, visit ' + (i + 1), listeners.scroll === 1 && listeners.resize === 1 && listeners.pointer === 0);
      check('Observers release detached elements, visit ' + (i + 1), await testPage.evaluate(() => [...__motionQA.observers].every(observer => [...observer.targets].every(target => target.isConnected))));
    }
    await testPage.evaluate(() => { location.hash = '#/'; });
    await testPage.waitForSelector('#jornada.is-enhanced'); await testPage.waitForTimeout(500);
    await testPage.locator('#heroStage').hover(); await testPage.waitForTimeout(100);
    check('Fine pointer parallax still responds', await testPage.locator('.demo-main').evaluate(el => el.style.translate.includes('px')));
    await testPage.mouse.move(1, 1); await testPage.waitForTimeout(100);
    check('Pointer exit clears pending parallax', await testPage.locator('.demo-main').evaluate(el => el.style.translate === ''));
    check('No lifecycle browser errors', errors.length === 0);
  } finally { await context.close(); }
  const fallbackContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
  await fallbackContext.addInitScript(() => { delete window.IntersectionObserver; });
  try {
    const fallback = await fallbackContext.newPage(); await fallback.route('**/js/env.js', local);
    await fallback.goto('http://localhost:8080/#/'); await fallback.waitForSelector('#jornada'); await fallback.waitForTimeout(900);
    check('Missing observer leaves all reveals visible', await fallback.locator('.reveal').evaluateAll(elements => elements.every(el => getComputedStyle(el).opacity === '1')));
    check('Missing observer presents the demo immediately', await fallback.locator('#heroStage').evaluate(el => el.classList.contains('is-presented') && getComputedStyle(el.querySelector('.demo-main')).opacity === '1'));
    check('Sequential fallback exposes all four steps', await fallback.locator('.j-step').evaluateAll(elements => elements.length === 4 && elements.every(el => !el.inert)));
    await fallback.screenshot({ path: 'observer-fallback-375.png', fullPage: true });
  } finally { await fallbackContext.close(); }
  const staticContext = await browser.newContext({ viewport: { width: 375, height: 812 }, javaScriptEnabled: false });
  try {
    const staticPage = await staticContext.newPage(); await staticPage.goto('http://localhost:8080/');
    check('Without JavaScript the four stages remain readable', await staticPage.locator('#app li h3').count() === 4 && await staticPage.locator('#journey-fallback-title').isVisible());
    await staticPage.screenshot({ path: 'without-javascript-375.png', fullPage: true });
  } finally { await staticContext.close(); }
  return results;
}
