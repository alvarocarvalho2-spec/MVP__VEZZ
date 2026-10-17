import { APP } from "../config.js";
import { db } from "../lib/db.js";
import { field, footer, toast } from "../lib/ui.js";
import { escapeHtml, formatDateTime } from "../lib/utils.js";

function shell(content) {
  return `<main class="page"><div class="wrap-s">${content}</div></main>`;
}

export async function renderAdmin(root, { session }) {
  if (!session || session.role !== "admin") {
    root.innerHTML = shell(`<div class="card card-pad"><div class="kicker">Acesso reservado</div><h1>Painel administrativo</h1><p>Entre com as credenciais administrativas VEZZ.</p><form id="admin-login">${field({ name: "email", label: "E-mail", type: "email", required: true })}${field({ name: "senha", label: "Senha", type: "password", required: true })}<button class="btn btn-lg btn-block">Entrar</button></form></div>`);
    root.querySelector("#admin-login").addEventListener("submit", async (e) => {
      e.preventDefault();
      try { await db().adminSignIn(e.target.email.value, e.target.senha.value); await renderAdmin(root, { session: db().getSession() }); } catch (err) { toast(err.message, "danger"); }
    });
    return;
  }
  const requests = await db().listClinicRequests();
  root.innerHTML = shell(`<div class="admin-head"><div><div class="kicker">VEZZ · Administração</div><h1>Solicitações de clínicas</h1><p>Aprove ou recuse novos cadastros e gere o convite do primeiro gestor.</p></div><button class="btn btn-ghost" id="admin-out">Sair</button></div><div class="list">${requests.length ? requests.map(requestCard).join("") : `<div class="empty card"><h3>Nenhuma solicitação ainda</h3><p>As novas solicitações aparecerão aqui.</p></div>`}</div>`);
  root.querySelector("#admin-out").addEventListener("click", async () => { await db().signOut(); location.hash = "#/"; });
  root.querySelectorAll("[data-approve]").forEach((button) => button.addEventListener("click", async () => {
    try { const result = await db().approveClinicRequest(button.dataset.approve); const link = `${location.origin}${location.pathname}#/convite/${result.invite.token}`; button.closest(".admin-request").querySelector(".request-result").innerHTML = `<p class="badge ok">Aprovada</p><p>Envie este convite ao responsável:</p><input readonly value="${escapeHtml(link)}">`; } catch (err) { toast(err.message, "danger"); }
  }));
  root.querySelectorAll("[data-reject]").forEach((button) => button.addEventListener("click", async () => { await db().rejectClinicRequest(button.dataset.reject); renderAdmin(root, { session: db().getSession() }); }));
}

function requestCard(r) {
  const status = r.status === "Pendente" ? `<div class="request-actions"><button class="btn btn-sm" data-approve="${r.id_solicitacao}">Aprovar e gerar convite</button><button class="btn btn-sm btn-ghost" data-reject="${r.id_solicitacao}">Recusar</button></div>` : `<p class="badge ${r.status === "Aprovada" ? "ok" : "danger"}">${escapeHtml(r.status)}</p>`;
  return `<article class="card card-pad admin-request"><div class="request-top"><div><h3>${escapeHtml(r.nome_clinica)}</h3><p class="muted">Solicitada em ${formatDateTime(r.criado_em)}</p></div><span class="badge">${escapeHtml(r.status)}</span></div><div class="request-details"><p><strong>Responsável:</strong> ${escapeHtml(r.responsavel)} · ${escapeHtml(r.email_responsavel)} · ${escapeHtml(r.telefone_responsavel)}</p><p><strong>CNPJ:</strong> ${escapeHtml(r.cnpj)} · <strong>Telefone:</strong> ${escapeHtml(r.telefone_clinica)}</p><p><strong>Endereço:</strong> ${escapeHtml([r.rua, r.numero, r.bairro, r.cidade, r.cep].filter(Boolean).join(", "))}</p><p><strong>Especialidades:</strong> ${escapeHtml(r.especialidades)}</p><p>${escapeHtml(r.descricao || "")}</p></div><div class="request-result">${status}</div></article>`;
}

export async function renderInvite(root, { params }) {
  const found = await db().getClinicInvite(params.token);
  if (!found) { root.innerHTML = shell(`<div class="card card-pad"><h1>Convite indisponível</h1><p>Este convite é inválido ou já foi utilizado.</p></div>`); return; }
  const r = found.request;
  root.innerHTML = shell(`<div class="card card-pad"><div class="kicker">Convite VEZZ</div><h1>Cadastrar primeiro gestor</h1><p>Complete os dados para administrar a clínica <strong>${escapeHtml(r.nome_clinica)}</strong>.</p><form id="invite-form">${field({ name: "nome", label: "Nome completo", required: true })}${field({ name: "email", label: "E-mail", type: "email", required: true })}${field({ name: "cargo", label: "Cargo", value: "Gestor" })}${field({ name: "senha", label: "Senha", type: "password", required: true })}<button class="btn btn-block">Concluir cadastro</button></form></div>`);
  root.querySelector("#invite-form").addEventListener("submit", async (e) => { e.preventDefault(); try { const s = await db().acceptClinicInvite(params.token, Object.fromEntries(new FormData(e.target))); toast("Cadastro concluído.", "ok"); location.hash = "#/gestor"; } catch (err) { toast(err.message, "danger"); } });
}
