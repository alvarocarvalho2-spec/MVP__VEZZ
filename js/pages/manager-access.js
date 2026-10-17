import { db } from "../lib/db.js";
import { field, footer, header, toast } from "../lib/ui.js";

export function renderNewManager(root, { session }) {
  if (!session?.principal) {
    root.innerHTML = `${header(session)}<main class="page"><div class="wrap-xs card card-pad"><div class="kicker">Equipe da clínica</div><h1>Cadastrar novo gestor</h1><p>Somente o primeiro gestor da clínica pode cadastrar novos gestores.</p><a class="btn" href="#/gestor">Voltar ao painel</a></div></main>${footer()}`;
    return;
  }
  root.innerHTML = `${header(session)}<main class="page"><div class="wrap-xs card card-pad"><div class="kicker">Equipe da clínica</div><h1>Cadastrar novo gestor</h1><p>O novo gestor ficará vinculado à clínica que você administra.</p><form id="new-manager">${field({ name: "nome", label: "Nome completo", required: true })}${field({ name: "email", label: "E-mail", type: "email", required: true })}${field({ name: "cargo", label: "Cargo", value: "Gestor" })}${field({ name: "senha", label: "Senha provisória", type: "password", required: true })}<button class="btn btn-block">Cadastrar gestor</button></form></div></main>${footer()}`;
  root.querySelector("#new-manager").addEventListener("submit", async (e) => { e.preventDefault(); try { await db().createManager(Object.fromEntries(new FormData(e.target)), session.id_clinica); toast("Novo gestor cadastrado.", "ok"); location.hash = "#/gestor"; } catch (err) { toast(err.message, "danger"); } });
}
