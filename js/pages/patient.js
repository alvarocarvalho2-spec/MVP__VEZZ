/**
 * VEZZ — área do paciente: painel, fila ao vivo e histórico.
 * , , , .
 */
import { APP } from "../config.js";
import { db, onDbChange } from "../lib/db.js";
import {
  avatar,
  badge,
  bindSlotPicker,
  bot,
  bottomNav,
  emptyState,
  footer,
  header,
  modal,
  renderSlotButtons,
  ticketCard,
  toast,
} from "../lib/ui.js";
import {
  escapeHtml,
  formatDateTime,
  formatMinutes,
  formatRelativeDay,
  formatTime,
  isPastDay,
  plusDaysISO,
  startOfDay,
  todayISO,
} from "../lib/utils.js";

let unsub = null;
let poll = null;

export function stopPatientLive() {
  unsub?.();
  unsub = null;
  if (poll) clearInterval(poll);
  poll = null;
}

function startLive(render) {
  stopPatientLive();
  unsub = onDbChange(render);
  poll = setInterval(render, APP.pollMs);
}

export async function renderPatientHome(root, { session }) {
  let last = "";
  const paint = async (fromPoll = false) => {
    const list = await db().listAppointments({ id_paciente: session.id });
    const queue = await db().getPatientQueue(session.id);
    const stamp = JSON.stringify({
      ids: list.map((c) => `${c.id_consulta}:${c.status}:${c.data_hora}`),
      q: queue && { p: queue.posicao, s: queue.consulta?.status, e: queue.estimativa },
    });
    if (fromPoll && stamp === last) return;
    last = stamp;
    const upcoming = list.filter((c) => {
      if (c.status !== "Agendada" && c.status !== "Em Atendimento") return false;
      return startOfDay(c.data_hora) >= startOfDay(new Date());
    });
    const next = upcoming[0];
    const hist = list.filter((c) => c.status === "Finalizada" || c.status === "Cancelada").slice().reverse();

    root.innerHTML = `
      ${header(session)}
      <main class="page page-app">
        <div class="wrap">
          <div class="dash-top">
            <div>
              <div class="kicker">Olá, ${escapeHtml(session.nome.split(" ")[0])}</div>
              <h1>${queue ? "Sua vez está andando." : "Pronto para o próximo cuidado."}</h1>
            </div>
            <a class="btn" href="#/clinicas">Agendar consulta</a>
          </div>

          <div class="grid-2">
            <section>
              ${
                queue
                  ? `<div class="card card-pad now-card">
                       <div style="display:flex;justify-content:space-between;align-items:center">
                         <span style="display:inline-flex;align-items:center;gap:10px"><span class="q-bot">${bot(queue.consulta.status === "Em Atendimento" ? "joy" : "calm", "bot-glow")}</span><span class="kicker" style="margin:0">Fila ao vivo</span></span>
                         <span class="badge live">atualiza sozinha</span>
                       </div>
                       ${ticketCard({ consulta: queue.consulta, posicao: queue.posicao || "agora", estimativa: queue.estimativa, status: queue.consulta.status })}
                       <p style="margin-top:14px">${
                         queue.consulta.status === "Em Atendimento"
                           ? "É a sua vez. Dirija-se ao consultório."
                           : `<strong>${queue.aFrente}</strong> paciente(s) à frente · espera estimada <strong>${formatMinutes(queue.estimativa)}</strong>`
                       }</p>
                       <a class="btn btn-ghost" href="#/paciente/fila">Abrir acompanhamento</a>
                     </div>`
                  : `<div class="card card-pad">
                       <div class="kicker">Próxima consulta</div>
                       ${
                         next
                           ? `<h2>${escapeHtml(next.clinica?.nome || "")}</h2>
                              <p>${escapeHtml(next.especialidade)} · ${formatRelativeDay(next.data_hora)} às ${formatTime(next.data_hora)}</p>
                              ${badge(next.status)}
                              <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px">
                                <button class="btn btn-ghost btn-sm" data-cancel="${next.id_consulta}">Cancelar</button>
                                <button class="btn btn-sm" data-reschedule="${next.id_consulta}">Reagendar</button>
                              </div>`
                           : emptyState("Nenhuma consulta à vista", "Pesquise uma clínica e reserve um horário.", `<a class="btn" href="#/clinicas">Pesquisar clínicas</a>`)
                       }
                     </div>`
              }
            </section>
            <aside class="card card-pad">
              <div class="kicker">Agendamentos</div>
              <h3>Próximas</h3>
              <div class="list">
                ${
                  upcoming.length
                    ? upcoming
                        .map(
                          (c) => `<article class="row-item">
                            ${avatar(c.clinica?.nome)}
                            <div>
                              <h4>${escapeHtml(c.clinica?.nome)}</h4>
                              <p>${formatRelativeDay(c.data_hora)} · ${formatTime(c.data_hora)} · ${escapeHtml(c.especialidade || "")}</p>
                            </div>
                            ${badge(c.status)}
                          </article>`
                        )
                        .join("")
                    : `<p class="muted">Nada agendado.</p>`
                }
              </div>
            </aside>
          </div>

          <section style="margin-top:22px">
            <div class="section-head">
              <h2>Histórico</h2>
              <a href="#/paciente/historico">Ver tudo</a>
            </div>
            ${
              hist.length
                ? `<div class="table-wrap"><table class="data">
                    <thead><tr><th>Quando</th><th>Clínica</th><th>Especialidade</th><th>Status</th></tr></thead>
                    <tbody>${hist
                      .slice(0, 5)
                      .map(
                        (c) => `<tr>
                          <td>${formatDateTime(c.data_hora)}</td>
                          <td>${escapeHtml(c.clinica?.nome || "")}</td>
                          <td>${escapeHtml(c.especialidade || "")}</td>
                          <td>${badge(c.status)}</td>
                        </tr>`
                      )
                      .join("")}</tbody></table></div>`
                : `<p class="muted">Seu histórico aparece aqui após a primeira consulta.</p>`
            }
          </section>
        </div>
      </main>
      ${footer()}
      ${bottomNav(session, "#/paciente")}
    `;

    root.querySelector("[data-cancel]")?.addEventListener("click", async (e) => {
      if (!confirm("Cancelar esta consulta?")) return;
      try {
        await db().cancelAppointment(e.currentTarget.dataset.cancel);
        toast("Consulta cancelada.", "ok");
        paint();
      } catch (err) {
        toast(err.message, "danger");
      }
    });
    root.querySelector("[data-reschedule]")?.addEventListener("click", (e) => {
      openReschedule(e.currentTarget.dataset.reschedule, paint);
    });
  };

  await paint(false);
  startLive(() => paint(true));
}

export async function renderPatientQueue(root, { session }) {
  let last = "";
  const paint = async (fromPoll = false) => {
    const queue = await db().getPatientQueue(session.id);
    const stamp = JSON.stringify(queue && { p: queue.posicao, s: queue.consulta?.status, e: queue.estimativa, t: queue.total });
    if (fromPoll && stamp === last) return;
    last = stamp;
    root.innerHTML = `
      ${header(session)}
      <main class="page page-app">
        <div class="wrap" style="max-width:720px">
          <div class="kicker"></div>
          <h1>Acompanhamento da fila</h1>
          ${
            queue
              ? `<div class="card card-pad ${queue.consulta.status === "Em Atendimento" ? "is-you" : ""}">
                   <div style="display:flex;justify-content:space-between;align-items:center">
                     <span style="display:inline-flex;align-items:center;gap:10px"><span class="q-bot">${bot(queue.consulta.status === "Em Atendimento" ? "joy" : "calm", "bot-glow")}</span><span class="badge live">tempo real</span></span>
                     <span class="muted">${escapeHtml(queue.consulta.clinica?.nome || "")}</span>
                   </div>
                   ${ticketCard({ consulta: queue.consulta, posicao: queue.posicao || "agora", estimativa: queue.estimativa })}
                   <div class="kpi-grid" style="margin-top:18px">
                     <div class="card kpi"><b class="pos-num">${queue.posicao === 0 ? "—" : queue.posicao}</b><span>Sua posição</span></div>
                     <div class="card kpi"><b>${queue.aFrente}</b><span>À frente</span></div>
                     <div class="card kpi"><b>${formatMinutes(queue.estimativa)}</b><span>Espera estimada</span></div>
                     <div class="card kpi"><b>${queue.total}</b><span>Na fila agora</span></div>
                   </div>
                   <div class="progress" style="margin-top:16px"><i style="width:${Math.max(8, 100 - (queue.aFrente / Math.max(queue.total, 1)) * 100)}%"></i></div>
                   <p class="muted" style="margin-top:10px">
                     ${
                       queue.consulta.status === "Em Atendimento"
                         ? "Atendimento iniciado. Compareça à sala."
                         : queue.atual
                           ? `Agora: ${escapeHtml(queue.atual.paciente?.nome?.split(" ")[0] || "paciente")} está em atendimento.`
                           : "Aguardando o início dos atendimentos."
                     }
                   </p>
                 </div>`
              : emptyState("Você não está em nenhuma fila hoje", "Quando a consulta for hoje, a senha aparece aqui automaticamente.", `<a class="btn" href="#/paciente">Ir ao painel</a>`)
          }
        </div>
      </main>
      ${footer()}
      ${bottomNav(session, "#/paciente/fila")}
    `;
  };
  await paint(false);
  startLive(() => paint(true));
}

export async function renderHistory(root, { session }) {
  const list = (await db().listAppointments({ id_paciente: session.id })).slice().reverse();
  root.innerHTML = `
    ${header(session)}
    <main class="page page-app">
      <div class="wrap">
        <div class="kicker"></div>
        <h1>Consultas</h1>
        ${
          list.length
            ? `<div class="table-wrap"><table class="data">
                <thead><tr><th>Data</th><th>Clínica</th><th>Especialidade</th><th>Status</th><th></th></tr></thead>
                <tbody>${list
                  .map((c) => {
                    const can = c.status === "Agendada";
                    return `<tr>
                      <td>${formatDateTime(c.data_hora)}</td>
                      <td>${escapeHtml(c.clinica?.nome || "")}</td>
                      <td>${escapeHtml(c.especialidade || "")}</td>
                      <td>${badge(c.status)}</td>
                      <td>${
                        can
                          ? `<button class="btn btn-ghost btn-sm" data-cancel="${c.id_consulta}">Cancelar</button>
                             <button class="btn btn-sm" data-reschedule="${c.id_consulta}">Reagendar</button>`
                          : ""
                      }</td>
                    </tr>`;
                  })
                  .join("")}</tbody></table></div>`
            : emptyState("Sem consultas", "Agende a primeira para começar o histórico.")
        }
      </div>
    </main>
    ${footer()}
    ${bottomNav(session, "#/paciente/historico")}
  `;

  root.querySelectorAll("[data-cancel]").forEach((b) =>
    b.addEventListener("click", async () => {
      if (!confirm("Cancelar esta consulta?")) return;
      await db().cancelAppointment(b.dataset.cancel);
      toast("Consulta cancelada.", "ok");
      renderHistory(root, { session });
    })
  );
  root.querySelectorAll("[data-reschedule]").forEach((b) =>
    b.addEventListener("click", () => openReschedule(b.dataset.reschedule, () => location.hash = "#/paciente/historico"))
  );
}

async function openReschedule(id, onDone) {
  const ap = await db().getAppointment(id);
  if (!ap) return;
  const m = modal({
    title: "Reagendar consulta",
    body: `
      <p class="muted">${escapeHtml(ap.clinica?.nome)} · ${escapeHtml(ap.especialidade || "")}</p>
      <div class="field"><label>Nova data</label><input type="date" name="data" value="${todayISO()}" min="${todayISO()}" max="${plusDaysISO(90)}"></div>
      <div class="field"><label>Horários</label><div class="slots" id="rs-slots"></div><input type="hidden" name="horario"></div>
    `,
    actions: `<button class="btn btn-ghost" data-close>Fechar</button><button class="btn" id="rs-ok">Confirmar</button>`,
  });
  const slotsBox = m.el.querySelector("#rs-slots");
  const dateInput = m.el.querySelector("[name=data]");
  const hidden = m.el.querySelector("[name=horario]");
  const load = async () => {
    hidden.value = "";
    const d = dateInput.value;
    if (!d) {
      slotsBox.innerHTML = `<p class="muted">Escolha uma data.</p>`;
      return;
    }
    if (isPastDay(d)) {
      slotsBox.innerHTML = `<p class="muted">Essa data já passou. Escolha hoje ou um dia futuro.</p>`;
      return;
    }
    if (await db().hasAppointmentOnDay(ap.id_paciente, d, ap.id_consulta)) {
      slotsBox.innerHTML = `<p class="muted">Você já possui outra consulta neste dia.</p>`;
      return;
    }
    const slots = await db().availableSlots(ap.id_clinica, d, { excludeId: ap.id_consulta });
    if (!slots.length) {
      slotsBox.innerHTML = `<p class="muted">A clínica não atende neste dia.</p>`;
      return;
    }
    if (!slots.some((s) => !s.taken)) {
      slotsBox.innerHTML = `<p class="muted">Não há horários livres neste dia.</p>`;
      return;
    }
    slotsBox.innerHTML = renderSlotButtons(slots);
  };
  await load();
  dateInput.addEventListener("change", load);
  bindSlotPicker(slotsBox, hidden);
  m.el.querySelector("#rs-ok").addEventListener("click", async () => {
    if (!hidden.value) return toast("Escolha um horário.", "warn");
    try {
      await db().rescheduleAppointment(id, dateInput.value, hidden.value);
      toast("Consulta reagendada.", "ok");
      m.close();
      onDone?.();
    } catch (err) {
      toast(err.message, "danger");
    }
  });
}
