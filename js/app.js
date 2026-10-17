/**
 * VEZZ — bootstrap da aplicação (SPA em hash).
 * Controla sessão, rotas, guarda de acesso (RNF009) e eventos globais.
 */
import { initDb, db } from "./lib/db.js";
import { initMotion, initReveal, stopMotion } from "./lib/motion.js";
import { injectBotSprite } from "./lib/bot-sprite.js";
import { match, startRouter } from "./lib/router.js";
import { bot, toast } from "./lib/ui.js";
import { escapeHtml } from "./lib/utils.js";
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

async function renderNotFound(view) {
  view.innerHTML = `
    <main class="page"><div class="wrap-xs card card-pad" style="text-align:center">
      <div class="nf-bot">${bot("surprised", "bot-lg bot-glow bot-float")}</div>
      <div class="kicker">404</div>
      <h1>Esta página não existe.</h1>
      <p>O endereço saiu da fila.</p>
      <a class="btn" href="#/">Voltar ao início</a>
    </div></main>`;
}

let navigation = 0;
async function onRoute(route) {
  const current = ++navigation;
  stopPatientLive();
  stopManagerLive();
  stopScheduleLive();
  stopHeroDemo();
  stopMotion();
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

  if (found?.role && !session) {
    location.hash = `#/login?redirect=${encodeURIComponent("#" + route.path)}`;
    return;
  }
  if (found?.role && session.role !== found.role) {
    toast("Esta área é restrita ao perfil correto.", "warn");
    location.hash = session.role === "gestor" ? "#/gestor" : "#/paciente";
    return;
  }
  if (found?.principalOnly && session?.role === "gestor" && !session?.principal) {
    toast("Somente o primeiro gestor da clínica pode cadastrar novos gestores.", "warn");
    location.hash = "#/gestor";
    return;
  }

  const media = matchMedia("(prefers-reduced-motion: reduce)");
  const oldMain = root.querySelector("main");
  if (oldMain && !media.matches) {
    const exit = oldMain.animate([{ opacity: 1 }, { opacity: 0, transform: "translateY(-8px)" }], { duration: 150, easing: "ease-out" });
    await exit.finished.catch(() => {});
  }
  if (current !== navigation) return;
  const view = document.createElement("div");
  view.className = "route-view";
  view.innerHTML = `<main class="page"><div class="wrap"><p class="kicker">VEZZ</p><p role="status">Preparando seu próximo passo…</p></div></main>`;
  root.replaceChildren(view);
  root.setAttribute("data-route", route.path);
  root.setAttribute("aria-busy", "true");
  window.scrollTo({ top: 0, behavior: "instant" });
  try {
    if (found) await found.render(view, { session, params, query: route.query, path: route.path });
    else await renderNotFound(view);
    if (current !== navigation) return;
    highlightNav(route.path);
    initReveal(view);
    const main = view.querySelector("main");
    if (!media.matches) main?.animate([{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], { duration: 320, easing: "cubic-bezier(.22,.68,.22,1)" });
    const heading = main?.querySelector("h1") || main;
    if (heading) { heading.setAttribute("tabindex", "-1"); heading.focus({ preventScroll: true }); }
    document.title = `${heading?.innerText?.trim().replace(/\s+/g, " ") || "VEZZ"} · VEZZ`;
  } catch (err) {
    if (current !== navigation) return;
    console.error(err);
    view.innerHTML = `<main class="page"><div class="wrap card card-pad"><div class="nf-bot">${bot("worried", "bot-md bot-glow")}</div><h1 tabindex="-1">Algo saiu do ritmo.</h1><p>${escapeHtml(err.message)}</p><a class="btn" href="#/">Início</a></div></main>`;
    view.querySelector("h1")?.focus({ preventScroll: true });
  } finally {
    if (current === navigation) root.removeAttribute("aria-busy");
  }
}

function highlightNav(path) {
  document.querySelectorAll(".nav-links a, .bottom-nav a").forEach((a) => {
    const href = a.getAttribute("href") || "";
    const clean = href.replace("#", "") || "/";
    a.classList.toggle("is-active", clean === path || (clean !== "/" && path.startsWith(clean)));
    if (clean === path) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

document.addEventListener("click", async (e) => {
  if (e.target.closest(".skip")) {
    e.preventDefault();
    const main = root.querySelector("main");
    main?.setAttribute("tabindex", "-1");
    main?.focus({ preventScroll: true });
    main?.scrollIntoView({ behavior: "instant" });
    return;
  }
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
    const open = document.getElementById("mobile-nav")?.classList.toggle("open");
    menu.setAttribute("aria-expanded", String(Boolean(open)));
  }
});

document.addEventListener("click", (e) => {
  const link = e.target.closest(".mobile-nav a");
  if (link) {
    document.getElementById("mobile-nav")?.classList.remove("open");
    document.querySelector("[data-action=menu]")?.setAttribute("aria-expanded", "false");
  }
});

document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  const nav = document.getElementById("mobile-nav");
  if (!nav?.classList.contains("open")) return;
  nav.classList.remove("open");
  const menu = document.querySelector("[data-action=menu]");
  menu?.setAttribute("aria-expanded", "false");
  menu?.focus();
});

initDb()
  .then(() => {
    startRouter(onRoute);
  })
  .catch((err) => {
    console.error(err);
    root.innerHTML = `<main class="page"><div class="wrap card card-pad"><h1>Falha ao iniciar</h1><p>${(err && err.message) || err}</p><p class="muted">Tente recarregar. Se persistir, limpe os dados locais do navegador e tente novamente.</p></div></main>`;
  });
