// Playwright CLI run-code callback. See docs/REFINAMENTO-SCROLL.md.
async page => {
  const results = [];
  const errors = [];
  const errorListener = error => errors.push(error.message);
  page.on('pageerror', errorListener);
  try {
  const check = (name, value) => { results.push({ name, pass: Boolean(value) }); if (!value) throw Error(name); };
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('http://localhost:8080/#/');
  await page.reload();
  await page.waitForSelector('#jornada.is-enhanced');
  await page.waitForTimeout(400);
  const first = page.locator('.clinic-card').first();
  const top = await first.evaluate(el => el.getBoundingClientRect().top + scrollY);
  await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), top - 800);
  for (let offset = 0; offset <= 450; offset += 10) {
    await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), top - 800 + offset);
    await page.waitForTimeout(20);
    const state = await first.evaluate(el => ({ top: el.getBoundingClientRect().top, height: el.getBoundingClientRect().height, in: el.classList.contains('in') }));
    if (state.in) { results.push({ cardTrigger: state, viewport: 768 }); check('Card waits for meaningful visibility', state.top < 600 && state.top > 350); break; }
  }
  const geometry = await page.locator('#jornada').evaluate(async section => {
    const { buildJourneyTimeline } = await import('/js/lib/motion-timing.js');
    const stage = section.querySelector('.jornada-stage');
    const metrics = [...section.querySelectorAll('.j-step')].map(step => ({ words: step.querySelector('.j-copy').textContent.trim().split(/\s+/).length, details: step.querySelectorAll('.slot,.j-mock-row,.progress').length }));
    return { start: section.getBoundingClientRect().top + scrollY - parseFloat(getComputedStyle(stage).top), height: section.offsetHeight, stage: stage.offsetHeight, timeline: buildJourneyTimeline(metrics, stage.offsetHeight) };
  });
  results.push({ geometry });
  const position = async distance => {
    await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), geometry.start + distance);
    await page.waitForTimeout(420);
    return await page.locator('#jornada').evaluate(el => ({ active: Number(el.dataset.step), progress: Number(el.dataset.progress), opacity: [...el.querySelectorAll('.j-step')].map(step => Number(getComputedStyle(step).opacity)), copy: [...el.querySelectorAll('.j-copy')].map(copy => Number(getComputedStyle(copy).opacity)), mock: [...el.querySelectorAll('.j-mock')].map(mock => Number(getComputedStyle(mock).opacity)) }));
  };
  // A short wheel sequence observes the first construction at human scroll speed.
  await position(0);
  await page.screenshot({ path: 'journey-start.png' });
  for (let i = 0; i < 5; i++) { await page.mouse.wheel(0, 22); await page.waitForTimeout(95); }
  await page.screenshot({ path: 'journey-build.png' });
  for (let i = 0; i < geometry.timeline.steps.length; i++) {
    const step = geometry.timeline.steps[i];
    const begin = await position(step.enterEnd + 12);
    const end = await position(step.holdEnd - 12);
    check('Step ' + (i + 1) + ' holds its complete composition', begin.active === i + 1 && end.active === i + 1 && begin.opacity[i] === 1 && end.opacity[i] === 1 && begin.mock[i] === 1 && end.mock[i] === 1);
    await position((step.enterEnd + step.holdEnd) / 2);
    await page.screenshot({ path: 'journey-hold-' + (i + 1) + '.png' });
    if (i < 3) {
      const blend = await position((step.holdEnd + step.exitEnd) / 2);
      check('Transition ' + (i + 1) + ' is a scroll crossfade', blend.opacity[i] > .2 && blend.opacity[i] < .8 && blend.opacity[i + 1] > .2 && blend.opacity[i + 1] < .8);
      await page.screenshot({ path: 'journey-transition-' + (i + 1) + '.png' });
    }
  }
  for (const index of [2, 1, 0, 3, 0, 2]) {
    const step = geometry.timeline.steps[index];
    const state = await position((step.enterEnd + step.holdEnd) / 2);
    check('Reverse or jump reaches step ' + (index + 1), state.active === index + 1 && state.opacity[index] === 1 && state.opacity.filter(v => v > .01).length === 1);
  }
  const beforeKeyboard = await page.evaluate(() => scrollY);
  await page.keyboard.press('PageDown');
  await page.waitForTimeout(450);
  check('Native keyboard scrolling remains available', await page.evaluate(before => scrollY > before, beforeKeyboard));
  await position(geometry.timeline.total);
  await page.waitForFunction(() => document.querySelector('#jornada').dataset.progress === '1.0000', null, { timeout: 2000 });
  const last = await page.locator('#jornada').evaluate(el => ({ progress: el.dataset.progress, last: getComputedStyle(el.querySelector('.j-step:last-child')).opacity }));
  check('Final state remains visible at narrative end', last.progress === '1.0000' && last.last === '1');
  // Anchor-style entry, then the reverse path, must settle without invisible text.
  await page.locator('#jornada').evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }));
  await page.waitForTimeout(500);
  check('Anchor entry has visible content', await page.locator('#jornada').evaluate(el => [...el.querySelectorAll('.j-step')].some(step => Number(getComputedStyle(step).opacity) > .5)));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(250);
  check('Reduced motion exposes all four steps', await page.locator('#jornada').evaluate(el => !el.classList.contains('is-enhanced') && [...el.querySelectorAll('.j-step')].every(step => !step.inert && getComputedStyle(step).opacity === '1')));
  check('Reduced motion removes mascot animation', await page.locator('#heroBot .bot').evaluate(el => getComputedStyle(el).animationName === 'none'));
  await page.screenshot({ path: 'reduced-story.png' });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForTimeout(350);
  check('Restoring motion recalculates the narrative', await page.locator('#jornada').evaluate(el => el.classList.contains('is-enhanced')));
  await page.setViewportSize({ width: 1366, height: 600 });
  await page.waitForTimeout(250);
  check('Short notebook displays a complete sequential story', await page.locator('#jornada').evaluate(el => !el.classList.contains('is-enhanced') && [...el.querySelectorAll('.j-step')].every(step => !step.inert)));
  check('No unexpected browser errors', errors.length === 0);
  return { results, errors };
  } finally { page.off('pageerror', errorListener); }
}
