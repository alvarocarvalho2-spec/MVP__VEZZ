// Playwright CLI run-code callback. Uses a fresh context and LocalAdapter only.
async page => {
  const results = [], errors = [], nativeDialogs = [];
  const check = (name, pass) => {
    results.push({ name, pass: Boolean(pass) });
    if (!pass) throw Error(JSON.stringify(results));
  };
  const context = await page.context().browser().newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'no-preference' });
  try {
    const test = await context.newPage();
    test.on('pageerror', error => errors.push(error.message));
    test.on('dialog', async dialog => { nativeDialogs.push(dialog.type()); await dialog.dismiss(); });
    await test.route('**/js/env.js', route => route.fulfill({ contentType: 'application/javascript', body: 'export const VEZZ_ENV={supabaseUrl:String(),supabaseAnonKey:String()};' }));
    await test.goto('http://localhost:8080/'); await test.waitForSelector('#jornada');
    await test.evaluate(async () => {
      window.api = (await import('/js/lib/db.js')).db();
      if (api.constructor.name !== 'LocalAdapter') throw Error('LocalAdapter required');
      await api.signIn('ana.silva@email.com', 'demo123');
      for (const appointment of await api.listAppointments({ id_paciente: api.getSession().id })) {
        if (['Agendada', 'Em Atendimento'].includes(appointment.status)) await api.cancelAppointment(appointment.id_consulta);
      }
    });
    const route = async hash => {
      await test.evaluate(value => { location.hash = value; }, hash);
      await test.waitForFunction(value => document.querySelector('#app').dataset.route === value.split('?')[0].slice(1) && !document.querySelector('#app[aria-busy]'), hash);
      await test.waitForTimeout(350);
    };
    const dates = await test.evaluate(async () => {
      const { plusDaysISO } = await import('/js/lib/utils.js'); const days = [];
      for (let i = 2; i < 30 && days.length < 5; i++) {
        const date = plusDaysISO(i);
        if ((await api.availableSlots('cli_sol', date)).filter(slot => !slot.taken).length > 3) days.push(date);
      }
      return days;
    });
    await route('#/agendar/cli_sol');
    const dateInput = test.locator('#book [name=data]');
    await dateInput.fill(dates[0]); await test.waitForSelector('#slots button');
    await test.locator('#book button[type=submit]').click();
    check('Missing slot produces a branded warning', await test.locator('.toast.warn .feedback-brand').innerText() === 'VEZZ');
    check('Validation directs focus to an available slot', await test.evaluate(() => document.activeElement.matches('#slots button')));
    check('Slot error is associated with the group', await test.locator('#slots').getAttribute('aria-invalid') === 'true' && await test.locator('#slot-error').isVisible());
    await test.waitForTimeout(320); await test.screenshot({ path: 'feedback-warning-desktop.png' });
    await test.locator('.toast-close').click(); await test.waitForTimeout(220);

    // An actual polling response is delayed while the person makes a selection.
    await test.evaluate(() => {
      window.originalSlots = api.availableSlots.bind(api);
      api.availableSlots = async (...args) => {
        const slots = (await originalSlots(...args)).map(slot => ({ ...slot }));
        slots.filter(slot => !slot.taken)[1].taken = true;
        return new Promise(resolve => { window.releasePoll = () => resolve(slots); });
      };
    });
    await test.waitForFunction(() => typeof window.releasePoll === 'function', null, { timeout: 7000 });
    const first = test.locator('#slots button').first();
    const time = await first.getAttribute('data-time'); await first.click();
    await test.evaluate(() => { releasePoll(); api.availableSlots = originalSlots; });
    await test.waitForTimeout(150);
    check('Delayed availability preserves the latest selection', await test.locator('#book [name=horario]').inputValue() === time);
    check('Visual and accessible selection match its value', await first.getAttribute('aria-pressed') === 'true' && (await first.getAttribute('class')).includes('is-on'));
    check('Selection feedback names the chosen time', (await test.locator('#slot-feedback').innerText()).includes(time));
    check('Choosing a slot clears validation', await test.locator('#slots').getAttribute('aria-invalid') === null && !await test.locator('#slot-error').isVisible());

    await test.evaluate(selected => {
      api.availableSlots = async (...args) => (await originalSlots(...args)).map(slot => ({ ...slot, taken: slot.taken || slot.time === selected }));
    }, time);
    await test.waitForFunction(() => document.querySelector('#book [name=horario]').value === '', null, { timeout: 7000 });
    check('A newly occupied selected slot is cleared', await test.locator('#slots [aria-pressed=true]').count() === 0);
    check('Occupied slot gives a specific explanation', (await test.locator('.toast.warn').allTextContents()).some(text => text.includes('acabou de ser ocupado')));
    await test.evaluate(() => { api.availableSlots = originalSlots; });

    // Responses for two different dates are intentionally resolved in reverse order.
    await test.evaluate(() => {
      window.pendingDates = {};
      api.availableSlots = async (...args) => {
        const slots = await originalSlots(...args);
        return new Promise(resolve => { pendingDates[args[1]] = () => resolve(slots); });
      };
    });
    await dateInput.fill(dates[1]);
    await test.waitForFunction(date => Boolean(pendingDates[date]), dates[1]);
    check('Changing date immediately clears the old selection', await test.locator('#book [name=horario]').inputValue() === '');
    check('Old date buttons are unavailable during date loading', await test.locator('#slots button').count() === 0);
    await dateInput.fill(dates[2]);
    await test.waitForFunction(date => Boolean(pendingDates[date]), dates[2]);
    await test.evaluate(date => pendingDates[date](), dates[2]); await test.waitForSelector('#slots button');
    const chosen = await test.locator('#slots button').first().getAttribute('data-time');
    await test.locator('#slots button').first().click();
    await test.evaluate(date => { pendingDates[date](); api.availableSlots = originalSlots; }, dates[1]);
    await test.waitForTimeout(120);
    check('A stale date response cannot overwrite the current selection', await dateInput.inputValue() === dates[2] && await test.locator('#book [name=horario]').inputValue() === chosen);
    await test.evaluate(() => {
      window.originalBook = api.bookAppointment.bind(api); window.bookCalls = 0;
      api.bookAppointment = async payload => { bookCalls++; await new Promise(resolve => setTimeout(resolve, 200)); const appointment = await originalBook(payload); window.bookedId = appointment.id_consulta; return appointment; };
    });
    await test.locator('#book button[type=submit]').dblclick();
    await test.waitForURL(/#\/paciente\?nova=/); await test.waitForSelector('[data-cancel]');
    check('Confirming stores the chosen date and time once', await test.evaluate(expected => bookCalls === 1 && new Date(api.getAppointment(bookedId).data_hora).getTime() === new Date(expected).getTime(), dates[2] + 'T' + chosen));
    check('Booking success uses VEZZ feedback', (await test.locator('.toast.ok').allTextContents()).some(text => text.includes('Consulta agendada.')));
    const bookedId = await test.evaluate(() => bookedId);
    const cancel = test.locator('[data-cancel="' + bookedId + '"]');
    await cancel.click(); await test.waitForTimeout(320);
    check('Cancellation opens the site dialog', await test.locator('[role=dialog] .feedback-brand').innerText() === 'VEZZ');
    check('Safe action receives initial focus', await test.evaluate(() => document.activeElement.textContent === 'Manter consulta'));
    check('Dialog isolates the page and locks background scrolling', await test.locator('#app').evaluate(el => el.inert) && await test.evaluate(() => document.body.style.overflow === 'hidden'));
    check('Old feedback cannot overlap the confirmation', await test.locator('#toasts .toast').count() === 0);
    check('Confirmation shows appointment details', (await test.locator('.confirmation-summary').innerText()).includes('Clínica Sol'));
    await test.screenshot({ path: 'cancel-dialog-desktop.png' });
    await test.locator('[data-modal-autofocus]').click(); await test.waitForSelector('[role=dialog]', { state: 'detached' });
    check('Keeping an appointment changes no data and returns focus', await test.evaluate(id => api.getAppointment(id).status === 'Agendada' && document.activeElement.dataset.cancel === id, bookedId));

    for (const [width, height] of [[320,568], [375,812], [768,1024], [1280,800], [1440,900]]) {
      await test.setViewportSize({ width, height }); await cancel.click(); await test.waitForTimeout(320);
      check('Dialog fits ' + width, await test.locator('.modal').evaluate(el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight && document.documentElement.scrollWidth <= innerWidth; }));
      await test.screenshot({ path: 'cancel-dialog-' + width + '.png' });
      await test.keyboard.press('Escape'); await test.waitForSelector('[role=dialog]', { state: 'detached' });
      check('Escape restores focus and page access ' + width, await test.evaluate(id => !document.querySelector('#app').inert && document.body.style.overflow === '' && document.activeElement.dataset.cancel === id, bookedId));
    }
    await test.emulateMedia({ reducedMotion: 'reduce' }); await cancel.click();
    check('Reduced motion keeps an accessible static dialog', await test.locator('.modal').evaluate(el => getComputedStyle(el).animationName === 'none' && Boolean(el.closest('[role=dialog][aria-modal=true]'))));
    await test.keyboard.press('Escape'); await test.waitForSelector('[role=dialog]', { state: 'detached' });
    await test.emulateMedia({ reducedMotion: 'no-preference' });
    await cancel.click(); await route('#/clinicas');
    check('Navigation dismisses the modal without cancelling', await test.locator('[role=dialog]').count() === 0 && await test.evaluate(id => !document.querySelector('#app').inert && api.getAppointment(id).status === 'Agendada', bookedId));
    await route('#/paciente/historico'); await test.locator('[data-cancel="' + bookedId + '"]').click();
    await test.locator('[data-confirm]').click(); await test.waitForSelector('[data-cancel="' + bookedId + '"]', { state: 'detached' });
    check('Confirming cancellation updates history', await test.evaluate(id => api.getAppointment(id).status === 'Cancelada', bookedId));

    const rescheduleId = await test.evaluate(async date => {
      const slots = await api.availableSlots('cli_sol', date);
      const appointment = await originalBook({ id_paciente: api.getSession().id, id_clinica: 'cli_sol', data: date, horario: slots.find(slot => !slot.taken).time, especialidade: 'Clínica Geral' });
      return appointment.id_consulta;
    }, dates[3]);
    await route('#/paciente'); await route('#/paciente/historico');
    const reschedule = test.locator('[data-reschedule="' + rescheduleId + '"]'); await reschedule.click();
    await test.waitForSelector('#rs-ok:not(:disabled)'); await test.locator('#rs-ok').click();
    check('Feedback inside a modal remains visible and operable', await test.locator('.modal-notices .toast.warn').isVisible());
    await test.locator('[role=dialog] [name=data]').fill(dates[4]); await test.waitForSelector('#rs-slots button');
    const newTime = await test.locator('#rs-slots button').first().getAttribute('data-time'); await test.locator('#rs-slots button').first().click();
    check('Rescheduling uses the accessible slot picker', await test.locator('#rs-slots [aria-pressed=true]').count() === 1);
    await test.locator('#rs-ok').click(); await test.waitForSelector('[role=dialog]', { state: 'detached' });
    check('Rescheduling retains the chosen time and returns focus', await test.evaluate(({ id, expected }) => new Date(api.getAppointment(id).data_hora).getTime() === new Date(expected).getTime() && document.activeElement.dataset.reschedule === id, { id: rescheduleId, expected: dates[4] + 'T' + newTime }));
    await test.setViewportSize({ width: 320, height: 568 });
    await test.evaluate(async () => { const { toast } = await import('/js/lib/ui.js'); toast('Escolha um horário para continuar.', 'warn'); }); await test.waitForTimeout(320);
    check('Mobile feedback stays inside the viewport', await test.locator('.toast').evaluateAll(nodes => nodes.every(el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })));
    check('Mobile feedback shows only the latest notice', await test.locator('.toast').count() === 1);
    await test.screenshot({ path: 'feedback-mobile-320.png' });
    check('All confirmations belong to the site', nativeDialogs.length === 0);
    check('No unexpected browser errors', errors.length === 0);
    return { results, errors, nativeDialogs };
  } finally { await context.close(); }
}
