// Playwright CLI run-code callback. See docs/REFINAMENTO-SCROLL.md.
async page => {
  const results = [];
  const check = (name, pass) => { results.push({ name, pass: Boolean(pass) }); if (!pass) throw Error(name); };
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const [width, height] of [[320,568],[375,812],[768,1024],[1024,768],[1280,800],[1440,900]]) {
    await page.setViewportSize({ width, height });
    await page.goto('http://localhost:8080/#/'); await page.reload();
    await page.waitForSelector('#jornada');
    await page.waitForTimeout(250);
    check('No page overflow '+width+'x'+height, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    if (width <= 768) {
      check('Vertical story '+width, await page.locator('#jornada').evaluate(el => !el.classList.contains('is-enhanced') && [...el.querySelectorAll('.j-step')].every(step => !step.inert)));
      const stage = await page.locator('#heroStage').evaluate(el => ({ top: el.getBoundingClientRect().top + scrollY, height: el.offsetHeight, presented: el.classList.contains('is-presented') }));
      await page.evaluate(y => scrollTo({ top:y, behavior:'instant' }), stage.top-height+80);
      await page.waitForTimeout(120);
      if (!stage.presented) check('Hero waits before entering on '+width, await page.locator('#heroStage').evaluate(el => !el.classList.contains('is-presented')));
      if (width===320) {
        const before=await page.locator('#demoPos').innerText();
        await page.waitForTimeout(4300);
        check('Demo does not advance before composition is visible',before===await page.locator('#demoPos').innerText());
      }
      await page.evaluate(y => scrollTo({ top:y, behavior:'instant' }), stage.top-height+stage.height*.6);
      await page.waitForTimeout(1350);
      check('Hero constructs after entering on '+width, await page.locator('#heroStage').evaluate(el => el.classList.contains('is-presented') && Number(getComputedStyle(el.querySelector('.demo-main')).opacity)===1));
      for (let i=0;i<4;i++) {
        await page.locator('.j-copy').nth(i).evaluate(el=>el.scrollIntoView({behavior:'instant',block:'center'}));
        await page.waitForTimeout(800);
        check('Mobile copy visible '+width+' step '+(i+1),await page.locator('.j-copy').nth(i).evaluate(el=>getComputedStyle(el).opacity==='1'));
        await page.locator('.j-mock').nth(i).evaluate(el=>el.scrollIntoView({behavior:'instant',block:'center'}));
        await page.waitForTimeout(800);
        check('Mobile mock visible '+width+' step '+(i+1),await page.locator('.j-mock').nth(i).evaluate(el=>getComputedStyle(el).opacity==='1'));
        if(i===1) await page.screenshot({path:'story-'+width+'x'+height+'.png'});
      }
    } else {
      check('Desktop story fits '+width+'x'+height, await page.locator('#jornada').evaluate(el => el.classList.contains('is-enhanced')));
      await page.locator('#jornada').evaluate(el=>el.scrollIntoView({behavior:'instant',block:'start'}));
      await page.waitForTimeout(300);
      await page.screenshot({path:'story-'+width+'x'+height+'.png'});
    }
  }
  await page.setViewportSize({width:1024,height:768});await page.waitForTimeout(200);
  await page.setViewportSize({width:768,height:1024});await page.waitForTimeout(200);
  check('Orientation switch releases inactive steps',await page.locator('#jornada').evaluate(el=>!el.classList.contains('is-enhanced')&&[...el.querySelectorAll('.j-step')].every(step=>!step.inert)));
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(200);
  check('Reduced motion exposes mobile reveals',await page.locator('#jornada').evaluate(el=>[...el.querySelectorAll('.reveal')].every(e=>getComputedStyle(e).opacity==='1')));
  await page.emulateMedia({reducedMotion:'no-preference'});
  const browser=page.context().browser();
  const touchContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
  try {
  const touchPage=await touchContext.newPage();
  await touchPage.route('**/js/env.js',route=>route.fulfill({contentType:'application/javascript',body:'export const VEZZ_ENV = {supabaseUrl:String(),supabaseAnonKey:String()};'}));
  await touchPage.goto('http://localhost:8080/#/');await touchPage.waitForSelector('#app:not([aria-busy]) #jornada');
  await touchPage.bringToFront();await touchPage.waitForTimeout(700);
  const client=await touchContext.newCDPSession(touchPage);
  await client.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:190,y:650}]});
  for(let i=1;i<=12;i++) {
    await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:190,y:650-i*28}]});
    await touchPage.waitForTimeout(25);
  }
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await touchPage.waitForTimeout(500);
  check('Native emulated touch scroll remains available',await touchPage.evaluate(()=>scrollY>0));
  await touchPage.screenshot({path:'touch-scroll-390.png'});
  } finally { await touchContext.close(); }
  return results;
}
