/** Motion is owned by the current view, including observers and media listeners. */
import { setBotExpression } from "./bot-sprite.js";
import { buildJourneyTimeline, clamp, journeyFrame } from "./motion-timing.js";
const preference = () => matchMedia("(prefers-reduced-motion: reduce)");
const reduced = () => preference().matches;
let stopReveal = () => {};
export function initMotion() { document.documentElement.classList.add("js"); }
export function stopMotion() { stopReveal(); stopReveal = () => {}; }

export function initReveal(root) {
  stopMotion();
  if (!root) return;
  const media = preference(), pending = new Set(), ambient = new Set();
  let registerFrame = 0, resizeFrame = 0;
  const observers = new Map();
  const reveal = el => {
    el.classList.add("in");
    pending.delete(el);
    el.querySelectorAll("[data-count]").forEach(animateCount);
    if (el.matches("[data-count]")) animateCount(el);
  };
  const profile = el => el.matches(".clinic-card, .kpi") ? "card" : el.matches('[data-reveal="scene"], .stats, .cta-card, .j-bot, .j-mock, .split article') ? "scene" : "text";
  const watch = el => {
    if (media.matches || !("IntersectionObserver" in window)) { reveal(el); return; }
    const kind = profile(el);
    if (!observers.has(kind)) {
      const inset = Math.round(Math.min(kind === "scene" ? 140 : 120, innerHeight * (kind === "scene" ? .22 : kind === "card" ? .16 : .12)));
      observers.set(kind, new IntersectionObserver(entries => entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        observers.get(kind)?.unobserve(entry.target);
      }), { threshold: kind === "card" ? .12 : kind === "scene" ? .06 : .08, rootMargin: `0px 0px -${inset}px 0px` }));
    }
    pending.add(el);
    observers.get(kind).observe(el);
  };
  const ambience = "IntersectionObserver" in window ? new IntersectionObserver(entries => entries.forEach(entry => {
    entry.target.classList.toggle("motion-paused", !entry.isIntersecting || document.hidden);
  })) : null;
  const sync = () => {
    if (media.matches) { observers.forEach(observer => observer.disconnect()); pending.forEach(reveal); }
    ambient.forEach(el => el.classList.toggle("motion-paused", document.hidden || el.getBoundingClientRect().bottom < 0 || el.getBoundingClientRect().top > innerHeight));
  };
  const register = () => {
    registerFrame = 0;
    root.querySelectorAll("main h1, .page > .wrap-s > h2, .page > .wrap-s > p, .clinic-card, .dash-top, .auth-visual > h2, .auth-visual > p, .auth-form > h1, .grid-2 > .card, .grid-2 > aside, .queue-board > section, .kpi-grid > .kpi, .j-copy, .j-bot, .j-mock").forEach(el => {
      if (el.closest(".jornada.is-enhanced") || el.closest(".reveal") || el.matches("form")) return;
      el.classList.add("reveal");
      const siblings = el.parentElement?.matches(".clinic-grid, .kpi-grid") ? [...el.parentElement.children] : [];
      el.style.setProperty("--d", `${Math.min(3, Math.max(0, siblings.indexOf(el))) * 85}ms`);
    });
    root.querySelectorAll(".reveal:not(.motion-ready)").forEach(el => {
      // Arm only after the observer has successfully registered the element.
      if (el.matches("form") || el.querySelector("input, select, textarea")) reveal(el);
      else watch(el);
      el.classList.add("motion-ready");
    });
    root.querySelectorAll(".hero-stage, .j-visual, .auth-bot, .cta-bot, .hero-badge, .stats, .bot-float, .badge.live").forEach(el => {
      if (ambient.has(el)) return;
      ambient.add(el); ambience?.observe(el);
    });
    // Detached live rows must not remain owned by an observer.
    pending.forEach(el => { if (!root.contains(el)) { observers.forEach(o => o.unobserve(el)); pending.delete(el); } });
    ambient.forEach(el => { if (!root.contains(el)) { ambience?.unobserve(el); ambient.delete(el); } });
  };
  const remeasure = () => {
    resizeFrame = 0;
    observers.forEach(observer => observer.disconnect()); observers.clear();
    [...pending].forEach(watch);
    register();
  };
  const resize = () => { if (!resizeFrame) resizeFrame = requestAnimationFrame(remeasure); };
  register();
  const mutations = new MutationObserver(records => {
    const structureChanged = records.some(record => [...record.addedNodes, ...record.removedNodes].some(node => node.nodeType === 1));
    if (structureChanged && !registerFrame) registerFrame = requestAnimationFrame(register);
  });
  mutations.observe(root, { childList: true, subtree: true });
  media.addEventListener("change", sync);
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", sync);
  stopReveal = () => {
    observers.forEach(observer => observer.disconnect()); ambience?.disconnect(); mutations.disconnect();
    media.removeEventListener("change", sync); document.removeEventListener("visibilitychange", sync); window.removeEventListener("resize", resize);
    cancelAnimationFrame(registerFrame); cancelAnimationFrame(resizeFrame); pending.forEach(reveal);
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
  const reset = () => { cancelAnimationFrame(raf); raf = 0; layers.forEach(el => el.style.removeProperty("translate")); };
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
  let pos = 3, index = 0, timer, visible = false, presented = false;
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
    timer = setInterval(() => { if (pos === 0) { pos = 3; index++; } else pos--; render(true); }, 4200);
  };
  const observer = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
    const entry = entries[0];
    const height = Math.min(entry.boundingClientRect.height, innerHeight);
    visible = entry.isIntersecting && entry.intersectionRect.height >= height * .45;
    if (visible && !presented) { presented = true; stage.classList.add("is-presented"); }
    sync();
  }, { threshold: [0, .15, .3, .45, .6] }) : null;
  if (observer) { stage.classList.add("is-armed"); observer.observe(stage); }
  else { visible = true; stage.classList.add("is-presented"); sync(); }
  document.addEventListener("visibilitychange", sync); media.addEventListener("change", sync);
  render();
  return () => { clearInterval(timer); observer?.disconnect(); document.removeEventListener("visibilitychange", sync); media.removeEventListener("change", sync); };
}

export function initJornada(section) {
  if (!section) return () => {};
  const steps = [...section.querySelectorAll(".j-step")];
  const stage = section.querySelector(".jornada-stage");
  const inner = section.querySelector(".jornada-inner");
  const buttons = [...section.querySelectorAll(".j-nav button")];
  const fill = section.querySelector("#jornadaFill");
  const media = matchMedia("(min-width: 961px) and (min-height: 650px) and (prefers-reduced-motion: no-preference)");
  const metrics = steps.map(step => ({ words: step.querySelector(".j-copy")?.textContent.trim().split(/\s+/).length || 0, details: step.querySelectorAll(".slot, .j-mock-row, .progress").length }));
  let frame = 0, measureFrame = 0, lastTime = 0, previous = -1, current = 0, geometry = null, disposed = false;
  const active = index => {
    if (index === previous) return;
    previous = index;
    steps.forEach((step, i) => {
      step.classList.toggle("is-active", i === index);
      step.inert = Boolean(geometry) && i !== index;
      step.setAttribute("aria-hidden", String(step.inert));
    });
    buttons.forEach((button, i) => button.setAttribute("aria-current", i === index ? "step" : "false"));
    section.dataset.step = String(index + 1);
  };
  const paint = () => {
    if (!geometry) return;
    const state = journeyFrame(geometry.timeline, current);
    state.frames.forEach((value, index) => {
      const style = steps[index].style;
      style.setProperty("--j-opacity", value.opacity.toFixed(4));
      style.setProperty("--j-copy", value.copy.toFixed(4));
      style.setProperty("--j-copy-y", `${value.copyY.toFixed(2)}px`);
      style.setProperty("--j-bot", value.bot.toFixed(4));
      style.setProperty("--j-bot-y", `${value.botY.toFixed(2)}px`);
      style.setProperty("--j-mock", value.mock.toFixed(4));
      style.setProperty("--j-mock-y", `${value.mockY.toFixed(2)}px`);
      style.setProperty("--j-mock-scale", value.mockScale.toFixed(4));
    });
    active(state.active);
    if (fill) fill.style.transform = `scaleX(${state.progress})`;
    section.dataset.progress = state.progress.toFixed(4);
  };
  const scrollDistance = () => {
    const distance = scrollY - geometry.start;
    return distance >= geometry.timeline.total - 1 ? geometry.timeline.total : distance <= 1 ? 0 : distance;
  };
  const update = time => {
    frame = 0;
    if (!geometry || disposed) return;
    const target = scrollDistance();
    const delta = time - lastTime;
    const jump = Math.abs(target - current) > geometry.height * .65;
    current = jump ? target : current + (target - current) * (1 - Math.exp(-Math.min(64, delta || 16) / 65));
    if (Math.abs(target - current) < .15) current = target;
    lastTime = time;
    paint();
    if (current !== target) frame = requestAnimationFrame(update);
  };
  const scroll = () => { if (geometry && !frame) { lastTime = performance.now() - 16; frame = requestAnimationFrame(update); } };
  const reset = () => {
    cancelAnimationFrame(frame); frame = 0; geometry = null;
    section.classList.remove("is-enhanced"); section.style.removeProperty("height");
    steps.forEach(step => {
      [...step.style].filter(name => name.startsWith("--j-")).forEach(name => step.style.removeProperty(name));
      step.inert = false;
      step.setAttribute("aria-hidden", "false");
    });
    previous = -1; active(0);
    if (fill) fill.style.removeProperty("transform");
    section.dataset.progress = "0";
  };
  const measure = () => {
    measureFrame = 0;
    if (disposed) return;
    if (!media.matches) { reset(); return; }
    section.classList.add("is-enhanced");
    const stageStyle = getComputedStyle(stage);
    const padding = parseFloat(stageStyle.paddingTop) + parseFloat(stageStyle.paddingBottom);
    // A short notebook/zoomed window gets the complete vertical narrative.
    if (inner.scrollHeight + padding > stage.clientHeight + 2) { reset(); return; }
    const timeline = buildJourneyTimeline(metrics, stage.offsetHeight);
    section.style.height = `${Math.ceil(stage.offsetHeight + timeline.total)}px`;
    // The route animates its main container with translateY. Its visual rect
    // is transient; use layout offsets so that entrance cannot shift the pin.
    let layoutTop = 0;
    for (let element = section; element; element = element.offsetParent) {
      layoutTop += element.offsetTop;
      if (element.offsetParent) layoutTop += element.offsetParent.clientTop;
    }
    geometry = { start: layoutTop - parseFloat(stageStyle.top), timeline, height: stage.offsetHeight };
    current = scrollDistance();
    previous = -1; paint();
  };
  const resize = () => { if (!measureFrame) measureFrame = requestAnimationFrame(measure); };
  const handlers = buttons.map((button, index) => {
    const handler = () => {
      if (!geometry) return;
      const step = geometry.timeline.steps[index];
      scrollTo({ top: geometry.start + (step.enterEnd + step.holdEnd) / 2, behavior: "smooth" });
    };
    button.addEventListener("click", handler); return handler;
  });
  window.addEventListener("scroll", scroll, { passive: true }); window.addEventListener("resize", resize);
  media.addEventListener("change", resize);
  const layoutObserver = "ResizeObserver" in window ? new ResizeObserver(resize) : null;
  // Changes above the story (including late fonts) move the pin start.
  [...section.parentElement.children].filter(element => element !== section).forEach(element => layoutObserver?.observe(element));
  document.fonts?.addEventListener("loadingdone", resize);
  document.fonts?.ready.then(() => { if (!disposed) resize(); });
  measure();
  return () => {
    disposed = true; cancelAnimationFrame(frame); cancelAnimationFrame(measureFrame);
    window.removeEventListener("scroll", scroll); window.removeEventListener("resize", resize); media.removeEventListener("change", resize);
    layoutObserver?.disconnect(); document.fonts?.removeEventListener("loadingdone", resize);
    buttons.forEach((button, index) => button.removeEventListener("click", handlers[index]));
  };
}
