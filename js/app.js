/**
 * VEZZ — bootstrap da aplicação (SPA em hash).
 * Controla sessão, rotas, guarda de acesso (RNF009) e eventos globais.
 */
import { initDb, db } from "./lib/db.js";
import { initMotion, initReveal } from "./lib/motion.js";
import { injectBotSprite } from "./lib/bot-sprite.js";
import { match, startRouter } from "./lib/router.js";
import { bot, toast } from "./lib/ui.js";
import { renderHome, renderHow, renderClinics, renderClinic, renderSchedule, renderClinicRequest, stopScheduleLive, stopHeroDemo } from "./pages/public.js";
import { renderAdmin, renderInvite } from "./pages/admin.js";
import { renderNewManager } from "./pages/manager-access.js";
import { renderLogin, renderRegisterPatient, renderRecover } from "./pages/auth.js";
import { renderPatientHome, renderPatientQueue, renderHistory, stopPatientLive } from "./pages/patient.js";
import {
  renderManagerHome,
  renderQueue,
  renderAppointments,
  renderPatients,
  renderClinicAdmin,
  stopManagerLive,
} from "./pages/manager.js";

const root = document.getElementById("app");

initMotion();
injectBotSprite();
window.addEventListener("scroll", () => {
  document.querySelector(".site-header")?.classList.toggle("scrolled", window.scrollY > 8);
}, { passive: true });

const routes = [
  { pattern: "/", render: renderHome },
  { pattern: "/como-funciona", render: renderHow },
  { pattern: "/clinicas", render: renderClinics },
  { pattern: "/clinica/:id", render: renderClinic },
  { pattern: "/agendar/:id", render: renderSchedule },
  { pattern: "/login", render: renderLogin },
  { pattern: "/cadastro", render: renderRegisterPatient },
  { pattern: "/recuperar-senha", render: renderRecover },
  { pattern: "/solicitar-clinica", render: renderClinicRequest },
  { pattern: "/convite/:token", render: renderInvite },
  { pattern: "/admin-vezz", render: renderAdmin },
  { pattern: "/paciente", render: renderPatientHome, role: "paciente" },
  { pattern: "/paciente/fila", render: renderPatientQueue, role: "paciente" },
  { pattern: "/paciente/historico", render: renderHistory, role: "paciente" },
  { pattern: "/paciente/consultas", render: renderHistory, role: "paciente" },
  { pattern: "/gestor", render: renderManagerHome, role: "gestor" },
  { pattern: "/gestor/fila", render: renderQueue, role: "gestor" },
  { pattern: "/gestor/consultas", render: renderAppointments, role: "gestor" },
  { pattern: "/gestor/pacientes", render: renderPatients, role: "gestor" },
  { pattern: "/gestor/clinica", render: renderClinicAdmin, role: "gestor" },
  { pattern: "/gestor/novo-gestor", render: renderNewManager, role: "gestor", principalOnly: true },
];

function sessionOf() {
  try {
    return db().getSession();
  } catch {
    return null;
  }
}

async function renderNotFound() {
  root.innerHTML = `
    <main class="page"><div class="wrap-xs card card-pad" style="text-align:center">
      <div class="nf-bot">${bot("surprised", "bot-lg bot-glow bot-float")}</div>
      <div class="kicker">404</div>
      <h1>Esta página não existe.</h1>
      <p>O endereço saiu da fila.</p>
      <a class="btn" href="#/">Voltar ao início</a>
    </div></main>`;
}

async function onRoute(route) {
  stopPatientLive();
  stopManagerLive();
  stopScheduleLive();
  stopHeroDemo();
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  document.getElementById("mobile-nav")?.classList.remove("open");

  const session = sessionOf();
  let found = null;
  let params = {};
  for (const r of routes) {
    if (r.pattern === "/" && route.path === "/") {
      found = r;
      break;
    }
    const m = match(route.path, r.pattern);
    if (m) {
      found = r;
      params = m;
      break;
    }
  }

  if (!found) return renderNotFound();

  if (found.role && !session) {
    location.hash = `#/login?redirect=${encodeURIComponent("#" + route.path)}`;
    return;
  }
  if (found.role && session.role !== found.role) {
    toast("Esta área é restrita ao perfil correto.", "warn");
    location.hash = session.role === "gestor" ? "#/gestor" : "#/paciente";
    return;
  }
  if (found.principalOnly && session?.role === "gestor" && !session?.principal) {
    toast("Somente o primeiro gestor da clínica pode cadastrar novos gestores.", "warn");
    location.hash = "#/gestor";
    return;
  }

  root.setAttribute("data-route", route.path);
  try {
    await found.render(root, { session, params, query: route.query, path: route.path });
    highlightNav(route.path);
    initReveal(root);
    root.classList.remove("route-in");
    void root.offsetWidth;
    root.classList.add("route-in");
  } catch (err) {
    console.error(err);
    root.innerHTML = `<main class="page"><div class="wrap card card-pad" style="text-align:center"><div class="nf-bot">${bot("worried", "bot-md bot-glow")}</div><h1>Algo saiu do ritmo.</h1><p>${err.message}</p><a class="btn" href="#/">Início</a></div></main>`;
  }
}

function highlightNav(path) {
  document.querySelectorAll(".nav-links a, .bottom-nav a").forEach((a) => {
    const href = a.getAttribute("href") || "";
    const clean = href.replace("#", "") || "/";
    a.classList.toggle("is-active", clean === path || (clean !== "/" && path.startsWith(clean)));
  });
}

document.addEventListener("click", async (e) => {
  const logout = e.target.closest("[data-action=logout]");
  if (logout) {
    e.preventDefault();
    await db().signOut();
    toast("Sessão encerrada.", "ok");
    location.hash = "#/";
    return;
  }
  const menu = e.target.closest("[data-action=menu]");
  if (menu) {
    document.getElementById("mobile-nav")?.classList.toggle("open");
  }
});

document.addEventListener("click", (e) => {
  const link = e.target.closest(".mobile-nav a");
  if (link) document.getElementById("mobile-nav")?.classList.remove("open");
});

initDb()
  .then(() => {
    startRouter(onRoute);
  })
  .catch((err) => {
    console.error(err);
    root.innerHTML = `<main class="page"><div class="wrap card card-pad"><h1>Falha ao iniciar</h1><p>${(err && err.message) || err}</p><p class="muted">Tente recarregar. Se persistir, limpe os dados locais do navegador e tente novamente.</p></div></main>`;
  });
