import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function verify({ cdp, evaluate, screenshot, delay, output }) {
  const results = [];
  const check = (name, value) => { results.push({ name, pass: Boolean(value) }); console.log(`${value ? 'PASS' : 'FAIL'} ${name}`); assert.ok(value, name); };
  const waitFor = async expression => {
    for (let i = 0; i < 80; i++) { if (await evaluate(expression)) return; await delay(100); }
    throw Error(`Timed out: ${expression}`);
  };
  const route = async hash => {
    await evaluate(`location.hash=${JSON.stringify(hash)}`);
    await waitFor(`!document.querySelector('#app[aria-busy]') && document.querySelector('#app').dataset.route === ${JSON.stringify(hash.replace(/^#/, '').split('?')[0])}`);
    await delay(750);
  };
  const width = async value => {
    await cdp('Emulation.setDeviceMetricsOverride', { width: value, height: 1000, deviceScaleFactor: 1, mobile: false });
    await delay(150);
  };
  const fit = async name => {
    const dimensions = await evaluate(`({inner:innerWidth,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth})`);
    check(`${name}: no horizontal page overflow`, dimensions.doc <= dimensions.inner && dimensions.body <= dimensions.inner);
  };
  try {
    await route('#/');
    check('real clinic count', await evaluate(`(async()=>{const clinics=await (await import('/js/lib/db.js')).db().listClinics();return document.querySelector('.stat .count').dataset.count===String(clinics.length)})()`));
    check('search immediately visible', await evaluate(`getComputedStyle(document.querySelector('#home-search')).opacity === '1'`));
    for (const size of [360, 390, 768, 1024, 1440]) {
      await width(size);
      await evaluate(`scrollTo({top:0,behavior:'instant'})`);
      await delay(700);
      await fit(`home ${size}`);
      await screenshot(`home-${size}`);
      await evaluate(`document.querySelector('#clinicas-home').scrollIntoView({behavior:'instant'})`);
      await delay(950);
      check(`clinic reveals ${size}`, await evaluate(`[...document.querySelectorAll('.clinic-card')].some(e=>getComputedStyle(e).opacity==='1')`));
      await screenshot(`clinics-${size}`);
    }
    await width(1440);
    await route('#/como-funciona');
    check('navigation focuses heading', await evaluate(`document.activeElement === document.querySelector('main h1')`));
    await route('#/');
    const initialPos = await evaluate(`document.querySelector('#demoPos').textContent`);
    await delay(3400);
    check('queue demo advances', initialPos !== await evaluate(`document.querySelector('#demoPos').textContent`));
    const box = await evaluate(`(()=>{const r=document.querySelector('#heroStage').getBoundingClientRect();return {x:r.x+30,y:r.y+30}})()`);
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y });
    await delay(150);
    check('parallax applies to stage', await evaluate(`document.querySelector('.demo-main').style.translate.includes('px')`));
    for (let i = 0; i < 4; i++) {
      await evaluate(`(()=>{const s=document.querySelector('#jornada'),r=s.getBoundingClientRect();scrollTo({top:scrollY+r.top-72+(s.offsetHeight-innerHeight+72)*(${i}+.2)/4,behavior:'instant'})})()`);
      await delay(700);
      check(`journey step ${i + 1}`, await evaluate(`document.querySelectorAll('.j-step')[${i}].classList.contains('is-active') && !document.querySelectorAll('.j-step')[${i}].inert`));
      await screenshot(`journey-${i + 1}`);
    }
    check('ambient pauses outside viewport', await evaluate(`document.querySelector('#heroStage').classList.contains('motion-paused')`));
    const pausedPos = await evaluate(`document.querySelector('#demoPos').textContent`);
    await delay(3400);
    check('demo timer pauses outside viewport', pausedPos === await evaluate(`document.querySelector('#demoPos').textContent`));
    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await delay(200);
    check('reduced motion exposes all four steps', await evaluate(`[...document.querySelectorAll('.j-step')].every(e=>!e.inert && getComputedStyle(e).opacity==='1') && !document.querySelector('#jornada').classList.contains('is-enhanced')`));
    await evaluate(`scrollTo({top:0,behavior:'instant'})`);
    await screenshot('reduced-motion');
    check('reduced motion disables ambient animations', await evaluate(`getComputedStyle(document.querySelector('#heroBot .bot')).animationName==='none'`));
    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await route('#/clinicas?q=__no_match__');
    check('empty search', await evaluate(`document.querySelector('.empty')?.textContent.includes('Nenhuma')`));
    await route('#/clinicas');
    await screenshot('search-desktop');
    await route('#/clinica/cli_sol');
    await screenshot('clinic-desktop');
    await route('#/solicitar-clinica');
    check('request grouped without losing fields', await evaluate(`document.querySelectorAll('#clinic-request fieldset').length===3 && new FormData(document.querySelector('#clinic-request')).has('email_responsavel')`));
    await route('#/cadastro');
    check('registration preserves shy mascot', await evaluate(`document.querySelector('.auth-bot use').getAttribute('href')==='#bot-shy'`));
    await route('#/recuperar-senha');
    check('recovery preserves worried mascot', await evaluate(`document.querySelector('.auth-bot use').getAttribute('href')==='#bot-worried'`));
    for (const size of [360,390,768,1024,1440]) {
      await width(size);
      for (const hash of ['#/login','#/solicitar-clinica','#/clinicas','#/clinica/cli_sol']) { await route(hash); await fit(`${hash} ${size}`); }
      await route('#/login');
      await screenshot(`login-${size}`);
    }
    await width(1440);
    await evaluate(`(()=>{const form=document.querySelector('#login');form.email.value='ana.silva@email.com';form.senha.value='demo123';form.requestSubmit()})()`);
    await waitFor(`location.hash==='#/paciente' && document.querySelector('#app').dataset.route==='/paciente' && !document.querySelector('#app[aria-busy]')`);
    await delay(800);
    check('patient login', await evaluate(`document.querySelector('#app').dataset.route==='/paciente'`));
    await screenshot('patient-desktop');
    await route('#/paciente/fila');
    await screenshot('patient-queue');
    await route('#/paciente/historico');
    await screenshot('patient-history');
    await route('#/agendar/cli_sol');
    await evaluate(`(async()=>{const api=(await import('/js/lib/db.js')).db();const u=await import('/js/lib/utils.js');for(let n=8;n<20;n++){const d=u.plusDaysISO(n);if(!await api.hasAppointmentOnDay(api.getSession().id,d)&&(await api.availableSlots('cli_sol',d)).some(s=>!s.taken)){document.querySelector('#book [name=data]').value=d;document.querySelector('#book [name=data]').dispatchEvent(new Event('change'));break}}})()`);
    await waitFor(`!!document.querySelector('#slots button')`);
    await evaluate(`document.querySelector('#slots button').click();document.querySelector('#slots button.is-on').focus();window.__slot=document.querySelector('#slots button.is-on');window.__selected=document.querySelector('#book [name=horario]').value`);
    await delay(5300);
    check('availability polling retains selected slot and focus', await evaluate(`document.querySelector('#book [name=horario]').value===window.__selected && document.activeElement===window.__slot && window.__slot.isConnected`));
    await screenshot('schedule-desktop');
    await evaluate(`document.querySelector('#book').requestSubmit()`);
    await waitFor(`location.hash.startsWith('#/paciente?nova=') && document.querySelector('#app').dataset.route==='/paciente' && !document.querySelector('#app[aria-busy]')`);
    check('booking submit succeeds after availability poll', await evaluate(`document.querySelector('#app').dataset.route==='/paciente'`));
    await evaluate(`(async()=>{const api=(await import('/js/lib/db.js')).db();await api.signOut()})()`);
    await route('#/login');
    await evaluate(`(()=>{const f=document.querySelector('#login');f.email.value='ricardo@clinicasol.com';f.senha.value='demo123';f.requestSubmit()})()`);
    await waitFor(`location.hash==='#/gestor' && document.querySelector('#app').dataset.route==='/gestor' && !document.querySelector('#app[aria-busy]')`);
    await delay(750);
    await screenshot('manager-desktop');
    await evaluate(`window.__header=document.querySelector('.site-header');window.__liveButton=document.querySelector('[data-next]');window.__liveButton.focus();window.__h1=document.querySelector('main h1')`);
    await evaluate(`(async()=>{const api=(await import('/js/lib/db.js')).db();await api.callNext('cli_sol')})()`);
    await delay(700);
    check('live update preserves header, heading and focused button identity', await evaluate(`document.querySelector('.site-header')===window.__header && document.querySelector('main h1')===window.__h1 && document.activeElement===window.__liveButton && window.__liveButton.isConnected`));
    check('live update changes current service', await evaluate(`!!document.querySelector('[data-finish]')`));
    await screenshot('manager-live');
    for (const size of [360,390,768,1024,1440]) {
      await width(size);
      for (const hash of ['#/gestor','#/gestor/fila','#/gestor/consultas','#/gestor/pacientes','#/gestor/clinica','#/gestor/novo-gestor']) { await route(hash); await fit(`${hash} ${size}`); }
      await route('#/gestor');
      await screenshot(`manager-${size}`);
    }
    await route('#/gestor/clinica');
    check('clinic editor preserves all groups and hours', await evaluate(`document.querySelectorAll('#cli fieldset').length===2 && document.querySelectorAll('.hours-day').length===7`));
    await evaluate(`document.querySelector('#cli [name=nome]').focus();document.querySelector('#cli [name=nome]').value+=' revisão';window.__draft=document.querySelector('#cli [name=nome]')`);
    await delay(2800);
    check('clinic edit retains draft focus', await evaluate(`document.activeElement===window.__draft && window.__draft.value.endsWith('revisão')`));
    await route('#/gestor/fila');
    await evaluate(`document.querySelector('[data-finish]').click()`);
    await delay(700);
    check('finish service updates queue', await evaluate(`!document.querySelector('[data-finish]')`));
    await route('#/pagina-inexistente');
    check('404 is accessible and focused', await evaluate(`document.querySelector('main h1')===document.activeElement && document.body.innerText.includes('não existe')`));
    await evaluate(`history.back()`);
    await waitFor(`document.querySelector('#app').dataset.route==='/gestor/fila' && !document.querySelector('#app[aria-busy]')`);
    check('browser back preserves hash routing', true);
    await route('#/');
    await evaluate(`location.hash='#/como-funciona';setTimeout(()=>location.hash='#/clinicas',5)`);
    await waitFor(`document.querySelector('#app').dataset.route==='/clinicas' && !document.querySelector('#app[aria-busy]')`);
    check('rapid route change renders latest page', await evaluate(`document.querySelector('main h1').textContent.includes('Encontre')`));
  } finally {
    await writeFile(path.join(output, 'verification.json'), JSON.stringify(results, null, 2));
  }
  console.log(`${results.length} browser checks passed`);
}
