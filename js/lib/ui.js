/**
 * VEZZ — componentes de interface reutilizáveis.
 */
import { APP } from "../config.js";
import { bot } from "./bot-sprite.js";
import { addressLine, compressImageFile, el, escapeHtml, formatDateTime, formatMinutes, initials, maskCEP, maskCNPJ, maskCPF, maskPhone, statusTone, ticketCode } from "./utils.js";

function icon(name) {
  const paths = {
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    user: '<circle cx="12" cy="8" r="3.2"/><path d="M5 19c1.4-3.2 4-4.8 7-4.8S17.6 15.8 19 19"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/>',
    queue: '<path d="M5 7h14M5 12h10M5 17h7"/>',
    check: '<path d="M5 12l4 4 10-10"/>',
    close: '<path d="M7 7l10 10M17 7L7 17"/>',
    logout: '<path d="M10 7V5a2 2 0 0 1 2-2h7v18h-7a2 2 0 0 1-2-2v-2M4 12h10M11 9l3 3-3 3"/>',
    plus: '<path d="M12 6v12M6 12h12"/>',
    home: '<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"/>',
    clinic: '<path d="M4 20V8l8-4 8 4v12H4zM12 20v-6"/><path d="M9 11h6M12 8v6"/>',
    people: '<circle cx="9" cy="9" r="2.4"/><circle cx="16" cy="10" r="2"/><path d="M4 18c.8-2.6 2.6-4 5-4s4.2 1.4 5 4M14 18c.4-1.6 1.4-2.6 3-2.6 1.4 0 2.4.8 3 2.6"/>',
    menu: '<path d="M5 8h14M5 12h14M5 16h14"/>',
  };
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || ""}</svg>`;
}

function brandMark() {
  return bot("calm", "bot-glow");
}

export function header(session) {
  const logged = Boolean(session);
  // Painel administrativo (#/admin-vezz) sem atalho na UI: somente por URL.
  const dash = session?.role === "gestor" ? "#/gestor" : session?.role === "admin" ? "#/" : "#/paciente";
  const painel = logged && session?.role !== "admin" ? `<a href="${dash}">Painel</a>` : "";
  return `
    <header class="site-header">
      <div class="wrap">
        <a class="brand" href="#/" aria-label="VEZZ início">${brandMark()}<span>VEZZ</span></a>
        <nav class="nav-links" aria-label="principal">
          <a href="#/clinicas">Clínicas</a>
          <a href="#/como-funciona">Como funciona</a>
          ${painel}
          ${session?.role === "gestor" ? `<a href="#/gestor/fila">Fila</a>` : ""}
          ${session?.role === "paciente" ? `<a href="#/paciente/fila">Minha fila</a>` : ""}
        </nav>
        <div class="header-actions">
          ${
            logged
              ? `<a class="user-chip" href="${dash}">
                   ${avatar(session.nome)}
                   <div><strong>${escapeHtml(session.nome.split(" ")[0])}</strong><small>${session.role === "gestor" ? "Gestor" : session.role === "admin" ? "Administrador VEZZ" : "Paciente"}</small></div>
                 </a>
                 <button class="btn btn-ghost btn-sm keep" data-action="logout">${icon("logout")} Sair</button>`
              : `<a class="btn btn-ghost keep" href="#/login">Entrar</a>
                 <a class="btn" href="#/cadastro">Cadastrar</a>`
          }
          <button class="menu-btn" data-action="menu" aria-label="Abrir menu">${icon("menu")}</button>
        </div>
      </div>
    </header>
    <div class="mobile-nav" id="mobile-nav">
      <a href="#/clinicas">Clínicas</a>
      <a href="#/como-funciona">Como funciona</a>
      ${logged ? `${painel}<button class="btn btn-ghost" data-action="logout">Sair</button>` : `<a href="#/login">Entrar</a><a class="btn" href="#/cadastro">Cadastrar</a>`}
    </div>
  `;
}

export function footer() {
  return `
    <footer class="site-footer">
      <div class="wrap">
        <div>
          <a class="brand" href="#/" style="color:#fff">${brandMark()}<span>VEZZ</span></a>
          <p style="color:#b7c4e4;max-width:34ch;margin-top:12px">Plataforma de gestão de atendimentos e filas para clínicas e consultórios. Menos espera, mais cuidado.</p>
        </div>
        <div>
          <h3>Produto</h3>
          <p><a href="#/clinicas">Pesquisar clínicas</a><br>
          <a href="#/cadastro">Sou paciente</a><br>
          <a href="#/como-funciona">Como funciona</a></p>
        </div>
        <div>
          <h3>VEZZ</h3>
          <p>v${APP.version} · Fortaleza, CE</p>
        </div>
        <div class="copy">© ${new Date().getFullYear()} VEZZ. Feito para clínicas que respeitam o tempo de quem espera.</div>
      </div>
    </footer>
  `;
}

export function bottomNav(session, active) {
  if (!session || session.role === "admin") return "";
  const items =
    session.role === "gestor"
      ? [
          ["#/gestor", "home", "Painel"],
          ["#/gestor/fila", "queue", "Fila"],
          ["#/gestor/consultas", "calendar", "Agenda"],
          ["#/gestor/pacientes", "people", "Pacientes"],
          ["#/gestor/clinica", "clinic", "Clínica"],
        ]
      : [
          ["#/paciente", "home", "Início"],
          ["#/clinicas", "clinic", "Clínicas"],
          ["#/paciente/fila", "queue", "Fila"],
          ["#/paciente/historico", "calendar", "Histórico"],
        ];
  return `<nav class="bottom-nav" aria-label="atalhos">${items
    .map(([href, ic, label]) => `<a href="${href}" class="${active === href ? "is-active" : ""}">${icon(ic)}${label}</a>`)
    .join("")}</nav>`;
}

export function avatar(name, _foto, size = "") {
  const cls = `avatar ${size}`.trim();
  return `<span class="${cls}">${escapeHtml(initials(name))}</span>`;
}

export function photoUpload({ id = "clinic-photo", src = "", label = "Enviar foto da clínica", name = "" } = {}) {
  return `
    <div class="photo-upload">
      <div class="photo-upload-frame" id="${id}-frame">
        ${src ? `<img id="${id}-preview" src="${escapeHtml(src)}" alt="Foto da clínica">` : `<span class="avatar xl">${escapeHtml(initials(name || "Clínica"))}</span>`}
      </div>
      <label class="btn btn-ghost btn-sm photo-upload-btn">
        ${escapeHtml(label)}
        <input type="file" id="${id}" accept="image/jpeg,image/png,image/webp" hidden>
      </label>
      <p class="hint">JPG, PNG ou WEBP · até 6 MB. A foto aparece na pesquisa e na página da clínica.</p>
    </div>`;
}

export function bindPhotoUpload(root, inputId, onChange) {
  const input = root.querySelector(`#${inputId}`);
  const frame = root.querySelector(`#${inputId}-frame`);
  input?.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const url = await compressImageFile(file);
      if (frame) frame.innerHTML = `<img src="${escapeHtml(url)}" alt="Foto da clínica">`;
      onChange?.(url);
    } catch (err) {
      toast(err.message, "danger");
    }
  });
}

export function renderSlotButtons(slots) {
  return slots
    .map((s) => {
      if (s.taken) {
        const why = s.reason === "passado" ? "Horário já passou" : "Horário ocupado";
        return `<span class="slot is-busy" title="${why}" aria-disabled="true">${escapeHtml(s.time)}</span>`;
      }
      return `<button type="button" class="slot" data-time="${escapeHtml(s.time)}">${escapeHtml(s.time)}</button>`;
    })
    .join("");
}

export function bindSlotPicker(box, hidden) {
  box.addEventListener("click", (e) => {
    const busy = e.target.closest(".slot.is-busy");
    if (busy) {
      e.preventDefault();
      return;
    }
    const btn = e.target.closest("button.slot");
    if (!btn || btn.disabled) return;
    box.querySelectorAll(".slot.is-on").forEach((b) => b.classList.remove("is-on"));
    btn.classList.add("is-on");
    hidden.value = btn.dataset.time || "";
  });
}

export function badge(status) {
  return `<span class="badge ${statusTone(status)}">${escapeHtml(status)}</span>`;
}

export function toast(message, type = "") {
  const host = document.getElementById("toasts");
  if (!host) return;
  const node = el(`<div class="toast ${type}" role="status">${escapeHtml(message)}</div>`);
  host.appendChild(node);
  setTimeout(() => {
    node.classList.add("out");
    setTimeout(() => node.remove(), 240);
  }, 3800);
}

export function modal({ title, body, actions = "" }) {
  const back = el(`
    <div class="modal-back" role="dialog" aria-modal="true">
      <div class="modal">
        <div style="display:flex;justify-content:space-between;align-items:start;gap:12px">
          <h3>${escapeHtml(title)}</h3>
          <button class="icon-btn" data-close>${icon("close")}</button>
        </div>
        <div class="modal-body">${body}</div>
        <div class="modal-actions" style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">${actions}</div>
      </div>
    </div>`);
  const close = () => back.remove();
  back.addEventListener("click", (e) => {
    if (e.target === back || e.target.closest("[data-close]")) close();
  });
  document.body.appendChild(back);
  return { el: back, close };
}

export function field({ name, label, type = "text", value = "", placeholder = "", hint = "", required = false, autocomplete = "", min = "", max = "" }) {
  return `
    <div class="field">
      <label for="${name}">${escapeHtml(label)}</label>
      <input id="${name}" name="${name}" type="${type}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" ${required ? "required" : ""} ${autocomplete ? `autocomplete="${autocomplete}"` : ""} ${min ? `min="${escapeHtml(min)}"` : ""} ${max ? `max="${escapeHtml(max)}"` : ""}>
      ${hint ? `<div class="hint">${hint}</div>` : ""}
      <div class="field-error" data-error-for="${name}" hidden></div>
    </div>`;
}

export function clinicCard(c) {
  const end = c.endereco;
  return `
    <article class="card clinic-card">
      <div class="thumb">
        ${c.foto ? `<img src="${escapeHtml(c.foto)}" alt="${escapeHtml(c.nome)}" loading="lazy">` : `<span class="avatar thumb-avatar">${escapeHtml(initials(c.nome))}</span>`}
        <span class="loc">${escapeHtml(end ? `${end.bairro}, ${end.cidade}` : "Fortaleza")}</span>
      </div>
      <div class="body">
        <h3>${escapeHtml(c.nome)}</h3>
        <p>${escapeHtml(c.descricao || "").slice(0, 140)}${(c.descricao || "").length > 140 ? "…" : ""}</p>
        <div class="chips">${(c.especialidades || []).slice(0, 3).map((s) => `<span class="chip">${escapeHtml(s)}</span>`).join("")}</div>
        <div class="actions">
          <a class="btn btn-ghost btn-sm" href="#/clinica/${c.id_clinica}">Ver clínica</a>
          <a class="btn btn-sm" href="#/agendar/${c.id_clinica}">Agendar</a>
        </div>
      </div>
    </article>`;
}

export function ticketCard({ consulta, posicao, estimativa, status }) {
  const you = (status || consulta?.status) === "Em Atendimento";
  return `
    <div class="ticket ${you ? "is-you" : ""}" aria-live="polite">
      <div class="kicker">${escapeHtml(consulta?.clinica?.nome || "VEZZ")}</div>
      <div class="code">${ticketCode(consulta)}</div>
      <div>${badge(status || consulta?.status)}</div>
      <p style="margin:10px 0 0">Senha de atendimento</p>
      <div class="meta">
        <span>Posição <b class="pos-num">${posicao ?? "—"}</b></span>
        <span>Espera <b>${formatMinutes(estimativa || 0)}</b></span>
        <span>${escapeHtml(formatDateTime(consulta?.data_hora))}</span>
      </div>
    </div>`;
}

export function emptyState(title, text, cta = "", botExpr = "thinking") {
  return `<div class="empty card card-pad"><span class="empty-bot">${bot(botExpr, "bot-md bot-glow")}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p>${cta}</div>`;
}

export function bindMasks(root) {
  const apply = (name, fn) =>
    root.querySelectorAll(`[name="${name}"]`).forEach((i) => {
      i.addEventListener("input", () => {
        i.value = fn(i.value);
      });
    });
  apply("cpf", maskCPF);
  apply("cnpj", maskCNPJ);
  apply("telefone", maskPhone);
  apply("cep", maskCEP);
}

export { addressLine };
export { bot };
