/** Motion is owned by the current view, including observers and media listeners. */
import { setBotExpression } from "./bot-sprite.js";
const preference = () => matchMedia("(prefers-reduced-motion: reduce)");
const reduced = () => preference().matches;
let stopReveal = () => {};
export function initMotion() { document.documentElement.classList.add("js"); }
export function stopMotion() { stopReveal(); stopReveal = () => {}; }

export function initReveal(root) {
  stopMotion();
  if (!root) return;
  const media = preference(), pending = new Set(), ambient = new Set(), frames = new Set();
  const reveal = el => {
    el.classList.add("in");
    el.querySelectorAll("[data-count]").forEach(animateCount);
    if (el.matches("[data-count]")) animateCount(el);
  };
  const observer = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    reveal(en.target); pending.delete(en.target); observer.unobserve(en.target);
  }), { threshold: 0, rootMargin: "0px 0px -24px 0px" });
  const ambience = new IntersectionObserver(entries => entries.forEach(en => {
    en.target.classList.toggle("motion-paused", !en.isIntersecting || document.hidden);
  }));
  const sync = () => {
    if (media.matches) pending.forEach(reveal);
    ambient.forEach(el => el.classList.toggle("motion-paused", document.hidden || el.getBoundingClientRect().bottom < 0 || el.getBoundingClientRect().top > innerHeight));
  };
  const register = () => {
    root.querySelectorAll("main h1, .page > .wrap-s > h2, .page > .wrap-s > p, .clinic-card, .dash-top, .auth-visual > h2, .auth-visual > p, .auth-form > h1, .grid-2 > .card, .grid-2 > aside, .queue-board > section, .kpi-grid > .kpi, .j-step").forEach((el, i) => {
      if (el.closest(".jornada.is-enhanced") || el.closest(".reveal") || el.matches("form")) return;
      el.classList.add("reveal");
      el.style.setProperty("--d", `${Math.min(i % 4, 3) * 65}ms`);
    });
    root.querySelectorAll(".reveal:not(.motion-ready)").forEach(el => {
      el.classList.add("motion-ready");
      if (el.matches("form") || el.querySelector("input, select, textarea") || media.matches) reveal(el);
      else { pending.add(el); observer.observe(el); }
    });
    root.querySelectorAll(".hero-stage, .j-visual, .auth-bot, .cta-bot, .hero-badge, .stats, .bot-float, .badge.live").forEach(el => {
      if (ambient.has(el)) return;
      ambient.add(el); ambience.observe(el);
    });
  };
  register();
  const mutations = new MutationObserver(() => {
    const frame = requestAnimationFrame(() => { frames.delete(frame); register(); });
    frames.add(frame);
  });
  mutations.observe(root, { childList: true, subtree: true });
  media.addEventListener("change", sync);
  document.addEventListener("visibilitychange", sync);
  stopReveal = () => {
    observer.disconnect(); ambience.disconnect(); mutations.disconnect();
    media.removeEventListener("change", sync); document.removeEventListener("visibilitychange", sync);
    frames.forEach(cancelAnimationFrame); pending.forEach(reveal);
  };
}

export function animateCount(el) {
  if (!el || el.dataset.counted) return;
  el.dataset.counted = "1";
  const to = Number(el.dataset.count);
  if (!Number.isFinite(to)) return;
  if (reduced()) { el.textContent = to; return; }
  const start = performance.now();
  const frame = t => {
    if (!el.isConnected) return;
    const p = reduced() ? 1 : Math.min(1, (t - start) / 650);
    el.textContent = Math.round(to * (1 - (1 - p) ** 3));
    if (p < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

export function tick(el) {
  if (!el || reduced()) return;
  el.animate?.([{ opacity: 0.45, transform: "translateY(5px)" }, { opacity: 1, transform: "none" }], { duration: 300, easing: "ease-out" });
}

export function initParallax(stage) {
  if (!stage) return () => {};
  const layers = [...stage.querySelectorAll("[data-depth]")];
  let raf = 0;
  const reset = () => layers.forEach(el => el.style.removeProperty("translate"));
  const move = e => {
    if (reduced() || !matchMedia("(pointer: fine)").matches || raf) return;
    const { clientX, clientY } = e;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const r = stage.getBoundingClientRect();
      if (!r.width) return;
      layers.forEach(el => {
        const d = Number(el.dataset.depth || 0.5);
        el.style.translate = `${(-(clientX - r.left - r.width / 2) / r.width * d * 24).toFixed(1)}px ${(-(clientY - r.top - r.height / 2) / r.height * d * 18).toFixed(1)}px`;
      });
    });
  };
  stage.addEventListener("pointermove", move); stage.addEventListener("pointerleave", reset);
  const media = preference(); media.addEventListener("change", reset);
  return () => { cancelAnimationFrame(raf); reset(); stage.removeEventListener("pointermove", move); stage.removeEventListener("pointerleave", reset); media.removeEventListener("change", reset); };
}

const names = [["Ana Clara", "Cardiologia"], ["Bruno Lima", "Clínica Geral"], ["Carla Mendes", "Pediatria"]];
const tickets = ["A-042", "B-017", "C-103", "A-058"];
export function startQueueDemo(stage) {
  if (!stage) return () => {};
  const find = s => stage.querySelector(s);
  let pos = 3, index = 0, timer, visible = false;
  const render = (animate = false) => {
    const you = pos === 0;
    find("#demoTicket").textContent = tickets[index % tickets.length];
    find("#demoPosLabel").textContent = you ? "É a sua vez" : "Sua posição";
    find("#demoPos").textContent = you ? "✓" : pos;
    if (animate) tick(find("#demoPos"));
    find("#demoBar").style.width = `${you ? 100 : (4 - pos) * 33}%`;
    find("#demoWait").textContent = `${Math.max(0, pos - 1) * 18} min`;
    find(".demo-main").classList.toggle("is-you", you);
    setBotExpression(find("#heroBot svg"), you ? "joy" : "calm");
    find("#demoRows").innerHTML = names.map(([name, specialty], k) => `<li class="${k === 0 ? "is-now" : ""}"><span class="avatar">${name.split(" ").map(n => n[0]).join("")}</span><span class="who"><b>${name}</b><span>${k === 0 ? `Em atendimento · ${specialty}` : `Posição ${k + Math.max(1, pos)}`}</span></span><b>${k === 0 ? "0" : k + Math.max(1, pos)}</b></li>`).join("");
  };
  const media = preference();
  const sync = () => {
    clearInterval(timer);
    if (!visible || document.hidden || media.matches) return;
    timer = setInterval(() => { if (pos === 0) { pos = 3; index++; } else pos--; render(true); }, 3200);
  };
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); });
  observer.observe(stage);
  document.addEventListener("visibilitychange", sync); media.addEventListener("change", sync);
  render();
  return () => { clearInterval(timer); observer.disconnect(); document.removeEventListener("visibilitychange", sync); media.removeEventListener("change", sync); };
}

export function initJornada(section) {
  if (!section) return () => {};
  const steps = [...section.querySelectorAll(".j-step")];
  const buttons = [...section.querySelectorAll(".j-nav button")];
  const fill = section.querySelector("#jornadaFill");
  const media = matchMedia("(min-width: 961px) and (min-height: 650px) and (prefers-reduced-motion: no-preference)");
  let raf = 0, previous = -1;
  const update = () => {
    raf = 0;
    section.classList.toggle("is-enhanced", media.matches);
    const r = section.getBoundingClientRect();
    const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header")) || 72;
    const p = Math.min(1, Math.max(0, (header - r.top) / Math.max(1, r.height - innerHeight + header)));
    const index = media.matches ? Math.min(3, Math.floor(p * 4)) : 0;
    if (index !== previous) {
      previous = index;
      steps.forEach((step, i) => step.classList.toggle("is-active", i === index));
      buttons.forEach((button, i) => button.setAttribute("aria-current", i === index ? "step" : "false"));
    }
    steps.forEach((step, i) => { step.inert = media.matches && i !== index; step.setAttribute("aria-hidden", String(step.inert)); });
    if (fill) fill.style.transform = `scaleX(${p})`;
  };
  const scroll = () => { if (!raf) raf = requestAnimationFrame(update); };
  const handlers = buttons.map((button, i) => {
    const handler = () => {
      if (!media.matches) return;
      const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header")) || 72;
      const total = section.offsetHeight - innerHeight + header;
      window.scrollTo({ top: section.getBoundingClientRect().top + scrollY - header + total * (i + 0.2) / 4, behavior: "smooth" });
    };
    button.addEventListener("click", handler); return handler;
  });
  window.addEventListener("scroll", scroll, { passive: true }); window.addEventListener("resize", scroll);
  media.addEventListener("change", update); update();
  return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", scroll); window.removeEventListener("resize", scroll); media.removeEventListener("change", update); buttons.forEach((b, i) => b.removeEventListener("click", handlers[i])); };
}
