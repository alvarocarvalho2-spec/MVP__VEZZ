import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

// All records are in the isolated LocalAdapter selected by --local.
export async function verify({ cdp, evaluate, screenshot, delay, output }) {
  const results = [];
  const check = (name, pass) => { results.push({ name, pass: Boolean(pass) }); console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`); assert.ok(pass, name); };
  const waitFor = async expression => {
    for (let i = 0; i < 80; i++) { if (await evaluate(expression)) return; await delay(100); }
    throw Error(`Timed out: ${expression}`);
  };
  const route = async hash => {
    await evaluate(`location.hash=${JSON.stringify(hash)}`);
    await delay(50);
    await waitFor(`document.querySelector('#app').dataset.route===${JSON.stringify(hash.slice(1).split('?')[0])} && !document.querySelector('#app[aria-busy]')`);
    await delay(650);
  };
  const width = value => cdp('Emulation.setDeviceMetricsOverride', { width: value, height: 1000, deviceScaleFactor: 1, mobile: false });
  try {
    await evaluate(`window.api=(await import('/js/lib/db.js')).db()`);
    check('QA uses local data only', await evaluate(`!!window.api.db && window.api.constructor.name==='LocalAdapter'`));
    await evaluate(`document.querySelector('.skip').click()`);
    check('skip link focuses content without changing route', await evaluate(`location.hash==='#/' && document.activeElement.tagName==='MAIN'`));
    await width(390);
    await evaluate(`document.querySelector('[data-action=menu]').click()`);
    check('mobile menu announces expanded state', await evaluate(`document.querySelector('[data-action=menu]').getAttribute('aria-expanded')==='true'`));
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
    check('Escape closes menu and restores focus', await evaluate(`!document.querySelector('#mobile-nav').classList.contains('open') && document.activeElement.matches('[data-action=menu]')`));
    await width(1440);
    await evaluate(`window.__originalClinics=api.listClinics.bind(api);window.__allClinics=await api.listClinics()`);
    for (const count of [1,2,3,4,0]) {
      await evaluate(`api.listClinics=async()=>window.__allClinics.slice(0,${count})`);
      await route('#/como-funciona'); await route('#/');
      check(`editorial supports ${count} clinics`, await evaluate(`${count}===0 ? !!document.querySelector('#clinicas-home .empty') : document.querySelector('.clinic-editorial').dataset.items===String(${count}) && document.querySelectorAll('.clinic-editorial .clinic-card').length===${count}`));
      if (count===3) {
        await evaluate(`document.querySelector('#clinicas-home').scrollIntoView({behavior:'instant'})`); await delay(800); await screenshot('editorial-three');
      }
    }
    await evaluate(`api.listClinics=window.__originalClinics`);
    if (process.argv.includes('--layouts-only')) {
      await route('#/como-funciona'); await route('#/');
      for (const value of [360,390,768,1024,1440]) {
        await width(value);
        await evaluate(`document.querySelector('#clinicas-home').scrollIntoView({behavior:'instant'})`);
        await delay(800);
        check(`final clinic layout fits ${value}`, await evaluate(`document.documentElement.scrollWidth<=innerWidth`));
        await screenshot(`final-clinics-${value}`);
      }
      return;
    }
    await route('#/como-funciona');
    await evaluate(`api.listClinics=()=>new Promise(resolve=>window.__resolveClinics=()=>resolve(window.__allClinics));location.hash='#/clinicas'`);
    await delay(350);
    check('loading status while data is pending', await evaluate(`!!document.querySelector('#app[aria-busy]') && document.querySelector('[role=status]')?.textContent.includes('Preparando')`));
    await screenshot('loading');
    await evaluate(`window.__resolveClinics();api.listClinics=window.__originalClinics`);
    await waitFor(`!document.querySelector('#app[aria-busy]')`);
    await evaluate(`api.listClinics=async()=>{throw Error('Indisponibilidade simulada')}`);
    await route('#/como-funciona'); await route('#/clinicas');
    check('error state gives a focused heading and recovery link', await evaluate(`document.querySelector('main h1').textContent.includes('Algo saiu') && document.activeElement===document.querySelector('main h1') && !!document.querySelector('main a')`));
    await screenshot('error');
    await evaluate(`api.listClinics=window.__originalClinics`);
    await route('#/como-funciona'); await route('#/');
    await evaluate(`window.__clinic=api.db.clinicas[0];window.__oldName=window.__clinic.nome;window.__oldDescription=window.__clinic.descricao;window.__clinic.nome='Centro de Atendimento Multidisciplinar e Especialidades Integradas para Todas as Famílias';window.__clinic.descricao='Atendimento e cuidado. '.repeat(80)`);
    await route('#/clinicas');
    for (const value of [360,390,768,1024,1440]) {
      await width(value); await delay(100);
      check(`long clinic text fits ${value}`, await evaluate(`document.documentElement.scrollWidth<=innerWidth`));
    }
    await evaluate(`window.__clinic.nome=window.__oldName;window.__clinic.descricao=window.__oldDescription`);
    await width(1440);
    await evaluate(`await api.signIn('ana.silva@email.com','demo123')`);
    await route('#/paciente/historico');
    const id = await evaluate(`(()=>{const b=document.querySelector('[data-reschedule]');window.__rescheduleButton=b;b.focus();b.click();return b.dataset.reschedule})()`);
    await waitFor(`!!document.querySelector('#rs-ok')`);
    await delay(150);
    check('reschedule modal has accessible name and initial focus', await evaluate(`!!document.querySelector('[role=dialog][aria-labelledby]') && !!document.activeElement.closest('[role=dialog]')`));
    await evaluate(`document.querySelector('#rs-ok').focus()`);
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    check('modal traps keyboard focus', await evaluate(`document.activeElement.matches('[data-close]')`));
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
    check('closing modal restores action focus', await evaluate(`!document.querySelector('[role=dialog]') && document.activeElement===window.__rescheduleButton`));
    await evaluate(`window.__rescheduleButton.click()`);
    await delay(200);
    await evaluate(`(async()=>{const u=await import('/js/lib/utils.js');for(let n=8;n<20;n++){const d=u.plusDaysISO(n);if(!await api.hasAppointmentOnDay(api.getSession().id,d)&&(await api.availableSlots('cli_sol',d)).some(s=>!s.taken)){const input=document.querySelector('[role=dialog] [name=data]');input.value=d;input.dispatchEvent(new Event('change'));window.__rescheduleDate=d;break}}})()`);
    await waitFor(`!!document.querySelector('#rs-slots button')`);
    await evaluate(`document.querySelector('#rs-slots button').click();document.querySelector('#rs-ok').click()`);
    await waitFor(`!document.querySelector('[role=dialog]')`);
    check('reschedule updates appointment', await evaluate(`(await api.getAppointment(${JSON.stringify(id)})).data_hora.startsWith(window.__rescheduleDate)`));
    await delay(200);
    check('reschedule refreshes history in place and retains focus', await evaluate(`document.querySelector('[data-reschedule="${id}"]')===window.__rescheduleButton && document.activeElement===window.__rescheduleButton && window.__rescheduleButton.closest('tr').textContent.includes((await import('/js/lib/utils.js')).formatDateTime((await api.getAppointment(${JSON.stringify(id)})).data_hora))`));
    await route('#/paciente'); await route('#/paciente/historico');
    await evaluate(`window.confirm=()=>true;document.querySelector('[data-cancel="${id}"]').click()`);
    await delay(400);
    check('cancel removes pending actions and records status', await evaluate(`(await api.getAppointment(${JSON.stringify(id)})).status==='Cancelada' && !document.querySelector('[data-cancel="${id}"]')`));
    for (const value of [360,390,768,1024,1440]) {
      await width(value);
      for (const hash of ['#/paciente','#/paciente/fila','#/paciente/historico']) { await route(hash); check(`${hash} fits ${value}`, await evaluate(`document.documentElement.scrollWidth<=innerWidth`)); }
      await screenshot(`patient-${value}`);
    }
    await width(1440);
    await evaluate(`await api.signIn('ricardo@clinicasol.com','demo123')`);
    await route('#/gestor');
    await evaluate(`window.__header=document.querySelector('.site-header');window.__next=document.querySelector('[data-next]');window.__next.focus();window.__heading=document.querySelector('main h1');await api.callNext('cli_sol')`);
    await delay(500);
    check('call-next retains focused button and page nodes', await evaluate(`document.activeElement===window.__next && window.__next.isConnected && document.querySelector('main h1')===window.__heading && document.querySelector('.site-header')===window.__header`));
    await route('#/gestor/fila');
    await evaluate(`document.querySelector('[data-finish]').click()`); await delay(300);
    await evaluate(`document.querySelector('[data-start]').click()`); await delay(300);
    check('start service action still works', await evaluate(`!!document.querySelector('[data-finish]')`));
    await route('#/gestor/clinica');
    await evaluate(`window.__windows=document.querySelectorAll('[data-windows=seg] .hours-window').length;document.querySelector('[data-add=seg]').click()`);
    check('hours editor adds interval', await evaluate(`document.querySelectorAll('[data-windows=seg] .hours-window').length===window.__windows+1`));
    await evaluate(`document.querySelectorAll('[data-windows=seg] [data-del]')[window.__windows].click()`);
    check('hours editor removes interval', await evaluate(`document.querySelectorAll('[data-windows=seg] .hours-window').length===window.__windows`));
    await evaluate(`api.setSession({...api.getSession(),principal:false})`);
    await route('#/gestor/pacientes'); await route('#/gestor/clinica');
    check('secondary manager sees read-only clinic', await evaluate(`!document.querySelector('#cli') && document.body.innerText.includes('Somente o primeiro gestor')`));
    await evaluate(`location.hash='#/gestor/novo-gestor'`);
    await waitFor(`location.hash==='#/gestor' && !document.querySelector('#app[aria-busy]')`);
    check('first-manager route guard remains enforced', true);
    await evaluate(`await api.signOut()`);
    await route('#/solicitar-clinica');
    await evaluate(`(()=>{const data={nome_clinica:'Clínica de teste local',cnpj:'11222333000181',responsavel:'Responsável Local',email_responsavel:'local@example.test',telefone_responsavel:'85999990000',telefone_clinica:'8533330000',especialidades:'Clínica Geral',rua:'Rua Local',numero:'10',bairro:'Centro',cidade:'Fortaleza',cep:'60000000',descricao:'Cadastro de validação local'};const f=document.querySelector('#clinic-request');for(const [k,v] of Object.entries(data)) f.elements.namedItem(k).value=v;f.requestSubmit()})()`);
    await waitFor(`location.hash==='#/' && !document.querySelector('#app[aria-busy]')`);
    check('clinic request submits all grouped fields', await evaluate(`api.db.solicitacoes.some(r=>r.nome_clinica==='Clínica de teste local' && r.email_responsavel==='local@example.test')`));
    await route('#/convite/invalido');
    check('invalid invite gives readable state', await evaluate(`document.body.innerText.includes('Convite indisponível')`));
    await route('#/admin-vezz');
    check('admin sign-in remains restricted', await evaluate(`!!document.querySelector('#admin-login') && !document.querySelector('[data-approve]')`));
    await evaluate(`location.hash='#/paciente'`);
    await waitFor(`location.hash.startsWith('#/login') && !document.querySelector('#app[aria-busy]')`);
    check('unauthenticated patient route redirects to login', true);
  } finally { await writeFile(path.join(output,process.argv.includes('--layouts-only')?'layout-verification.json':'extended-verification.json'),JSON.stringify(results,null,2)); }
  console.log(`${results.length} extended browser checks passed`);
}
