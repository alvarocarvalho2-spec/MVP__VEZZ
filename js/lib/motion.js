/**
 * VEZZ — motion: reveal on scroll, parallax, contadores e a demonstração da fila.
 * Tudo com transform/opacity (GPU) + IntersectionObserver. Respeita
 * prefers-reduced-motion em todos os pontos de entrada.
 */

import { setBotExpression } from "./bot-sprite.js";

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let revealObserver = null;

/** Marca o documento como "JS ativo" (habilita o estado inicial dos reveals). */
export function initMotion() {
  document.documentElement.classList.add("js");
}

/** Observa .reveal dentro de root; ao entrar, anima contadores [data-count]. */
export function initReveal(root) {
  if (!root) return;
  if (revealObserver) revealObserver.disconnect();
  if (reduced()) {
    root.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
    root.querySelectorAll("[data-count]").forEach(animateCount);
    return;
  }
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        if (en.target.matches("[data-count]")) animateCount(en.target);
        en.target.querySelectorAll("[data-count]").forEach(animateCount);
        revealObserver.unobserve(en.target);
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -40px 0px" }
  );
  root.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));
}

/** Contador com ease-out; trava em 1x por elemento. */
export function animateCount(el) {
  if (!el || el.dataset.counted) return;
  el.dataset.counted = "1";
  const to = Number(el.dataset.count || 0);
  if (reduced() || !Number.isFinite(to)) {
    el.textContent = to;
    return;
  }
  const dur = 900;
  const t0 = performance.now();
  const step = (t) => {
    const p = Math.min(1, (t - t0) / dur);
    el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Re-dispara o "pop" num elemento (ex.: posição que mudou). */
export function tick(el) {
  if (!el || reduced()) return;
  el.classList.remove("pop");
  void el.offsetWidth;
  el.classList.add("pop");
}

/** Parallax leve no palco do hero (só desktop com mouse; usa a prop `translate`). */
export function initParallax(stage) {
  if (!stage || reduced() || !window.matchMedia("(pointer: fine)").matches) return () => {};
  const layers = stage.querySelectorAll("[data-depth]");
  let raf = 0;
  const onMove = (e) => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      layers.forEach((el) => {
        const d = Number(el.dataset.depth || 0.5);
        el.style.translate = `${(-x * d * 18).toFixed(1)}px ${(-y * d * 12).toFixed(1)}px`;
      });
    });
  };
  stage.addEventListener("mousemove", onMove);
  return () => stage.removeEventListener("mousemove", onMove);
}

/* ----- demonstração da fila (hero) — dados ilustrativos, sem clínica real ----- */
const DEMO_NAMES = [
  ["Ana Clara", "Cardiologia"],
  ["Bruno Lima", "Clínica Geral"],
  ["Carla Mendes", "Pediatria"],
  ["Diego Rocha", "Ortopedia"],
  ["Elisa Prado", "Dermatologia"],
];
const DEMO_TICKETS = ["A-042", "B-017", "C-103", "A-058", "D-221", "B-064", "C-147"];

/**
 * Faz a fila da demonstração "andar": a posição desce, chega a vez, e o ciclo
 * recomeça com outra senha. Retorna a função de parar.
 */
export function startQueueDemo(stage) {
  if (!stage) return () => {};
  const posEl = stage.querySelector("#demoPos");
  const labelEl = stage.querySelector("#demoPosLabel");
  const barEl = stage.querySelector("#demoBar");
  const waitEl = stage.querySelector("#demoWait");
  const ticketEl = stage.querySelector("#demoTicket");
  const rowsEl = stage.querySelector("#demoRows");
  const main = stage.querySelector(".demo-main");
  const heroBotSvg = stage.querySelector("#heroBot svg");
  let i = 0;
  let pos = 3;
  let ticketIdx = 0;

  const renderMain = (you) => {
    if (ticketEl) ticketEl.textContent = DEMO_TICKETS[ticketIdx % DEMO_TICKETS.length];
    if (labelEl) labelEl.textContent = you ? "É a sua vez" : "Sua posição";
    if (posEl) {
      posEl.textContent = you ? "✓" : pos;
      tick(posEl);
    }
    if (barEl) barEl.style.width = you ? "100%" : `${(4 - pos) * 33}%`;
    if (waitEl) waitEl.textContent = you ? "0 min" : `${(pos - 1) * 18} min`;
    main?.classList.toggle("is-you", you);
    if (heroBotSvg) setBotExpression(heroBotSvg, you ? "joy" : "calm");
  };

  const renderRows = () => {
    if (!rowsEl) return;
    rowsEl.innerHTML = [0, 1, 2]
      .map((k) => {
        const [nome, esp] = DEMO_NAMES[(i + k) % DEMO_NAMES.length];
        const now = k === 0;
        const iniciais = nome.split(" ").map((w) => w[0]).join("");
        return `<li class="${now ? "is-now" : ""}">
          <span class="avatar">${iniciais}</span>
          <span class="who"><b>${nome}</b><span>${now ? "Em atendimento · " + esp : "Posição " + (k + Math.max(pos, 1))}</span></span>
          <b>${now ? "0" : k + Math.max(pos, 1)}</b>
        </li>`;
      })
      .join("");
  };

  renderMain(false);
  renderRows();
  if (reduced()) return () => {};
  const timer = setInterval(() => {
    i++;
    if (pos > 1) {
      pos--;
      renderMain(false);
    } else if (pos === 1) {
      pos = 0;
      renderMain(true);
    } else {
      pos = 3;
      ticketIdx++;
      renderMain(false);
    }
    renderRows();
  }, 2600);
  return () => clearInterval(timer);
}


/**
 * Jornada do atendimento (scroll storytelling): palco sticky, os passos
 * aparecem conforme a rolagem, com a trilha de progresso preenchendo.
 * Retorna a função de parar (remover o listener de scroll).
 */
export function initJornada(section) {
  if (!section) return () => {};
  const steps = [...section.querySelectorAll(".j-step")];
  const fill = section.querySelector("#jornadaFill");
  if (reduced() || !steps.length) return () => {};
  let ticking = false;
  const update = () => {
    ticking = false;
    const r = section.getBoundingClientRect();
    const total = Math.max(1, r.height - window.innerHeight);
    const p = Math.min(1, Math.max(0, -r.top / total));
    const idx = Math.min(steps.length - 1, Math.floor(p * steps.length));
    steps.forEach((s, i) => s.classList.toggle("is-active", i === idx));
    if (fill) fill.style.transform = `scaleY(${p})`;
  };
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  update();
  return () => window.removeEventListener("scroll", onScroll);
}
