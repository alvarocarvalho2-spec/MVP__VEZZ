/**
 * VEZZ — mascote vetorial: sprite SVG com as 10 expressões oficiais dos robôs.
 * Tudo como VETOR (SVG inline): capacete/tela/orelhas compartilhados + rosto por
 * expressão. Sem imagem raster, sem dependência — <use> no mesmo documento.
 */
export const BOT_EXPRESSIONS = ["calm", "joy", "worried", "cool", "sad", "angry", "love", "thinking", "shy", "surprised"];

export const BOT_SPRITE = `
<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute;overflow:hidden" aria-hidden="true" focusable="false">
  <defs>
    <radialGradient id="bgHelmet" cx="0.35" cy="0.22" r="0.95">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.55" stop-color="#f1f4fb"/>
      <stop offset="1" stop-color="#c6d1e6"/>
    </radialGradient>
    <linearGradient id="bgScreen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0f1e46"/>
      <stop offset="0.55" stop-color="#081226"/>
      <stop offset="1" stop-color="#040a1a"/>
    </linearGradient>
    <linearGradient id="bgEar" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#243472"/>
      <stop offset="1" stop-color="#0c1533"/>
    </linearGradient>
    <linearGradient id="bgGlove" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#d5deee"/>
    </linearGradient>
    <filter id="fGlow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="2.6" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="fSoft" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="4"/>
    </filter>

    <!-- cabeça compartilhada: orelhas + capacete + tela -->
    <g id="botHead">
      <rect x="0" y="84" width="30" height="48" rx="15" fill="url(#bgEar)"/>
      <rect x="170" y="84" width="30" height="48" rx="15" fill="url(#bgEar)"/>
      <circle cx="13" cy="108" r="8" fill="none" stroke="#38d6ff" stroke-width="5" filter="url(#fGlow)"/>
      <circle cx="187" cy="108" r="8" fill="none" stroke="#38d6ff" stroke-width="5" filter="url(#fGlow)"/>
      <ellipse cx="100" cy="100" rx="80" ry="82" fill="url(#bgHelmet)"/>
      <ellipse cx="72" cy="60" rx="32" ry="18" fill="#ffffff" opacity="0.6" filter="url(#fSoft)"/>
      <ellipse cx="100" cy="168" rx="60" ry="17" fill="rgba(96,116,156,0.15)" filter="url(#fSoft)"/>
      <rect x="38" y="52" width="124" height="96" rx="44" fill="url(#bgScreen)"/>
      <ellipse cx="100" cy="60" rx="50" ry="13" fill="rgba(80,140,240,0.20)" filter="url(#fSoft)"/>
      <path d="M54 68 Q100 50 146 68" stroke="rgba(140,190,255,0.35)" stroke-width="7" fill="none" stroke-linecap="round"/>
    </g>

    <!-- rostos por expressão (brilho ciano #3fe6ff) -->
    <g id="botFace-calm" filter="url(#fGlow)">
      <path d="M62 104 Q75 115 88 104" fill="none" stroke="#3fe6ff" stroke-width="7" stroke-linecap="round"/>
      <path d="M112 104 Q125 115 138 104" fill="none" stroke="#3fe6ff" stroke-width="7" stroke-linecap="round"/>
      <circle cx="100" cy="131" r="7" fill="#3fe6ff"/>
    </g>
    <g id="botFace-joy" filter="url(#fGlow)">
      <path d="M60 106 Q75 90 90 106" fill="none" stroke="#3fe6ff" stroke-width="7" stroke-linecap="round"/>
      <path d="M110 106 Q125 90 140 106" fill="none" stroke="#3fe6ff" stroke-width="7" stroke-linecap="round"/>
      <path d="M76 117 Q100 151 124 117 Q100 129 76 117 Z" fill="#3fe6ff"/>
      <path d="M91 132 Q100 149 109 132 Q100 139 91 132 Z" fill="#3fe6ff"/>
    </g>
    <g id="botFace-worried" filter="url(#fGlow)">
      <ellipse cx="76" cy="103" rx="10" ry="15" fill="#3fe6ff"/>
      <ellipse cx="124" cy="103" rx="10" ry="15" fill="#3fe6ff"/>
      <path d="M90 130 Q95 126 100 130 Q105 134 110 130" fill="none" stroke="#3fe6ff" stroke-width="6" stroke-linecap="round"/>
    </g>
    <g id="botFace-cool" filter="url(#fGlow)">
      <g fill="#3fe6ff" shape-rendering="crispEdges">
        <path d="M50 92 h22 v8 h8 v-8 h14 v26 h-44 z"/>
        <path d="M150 92 h-22 v8 h-8 v-8 h-14 v26 h44 z"/>
        <rect x="92" y="99" width="16" height="6"/>
      </g>
      <path d="M90 132 Q100 140 110 132" fill="none" stroke="#3fe6ff" stroke-width="6" stroke-linecap="round"/>
    </g>
    <g id="botFace-sad" filter="url(#fGlow)">
      <path d="M62 100 Q75 112 88 100" fill="none" stroke="#3fe6ff" stroke-width="7" stroke-linecap="round"/>
      <path d="M112 100 Q125 112 138 100" fill="none" stroke="#3fe6ff" stroke-width="7" stroke-linecap="round"/>
      <path d="M88 134 Q100 124 112 134" fill="none" stroke="#3fe6ff" stroke-width="6" stroke-linecap="round"/>
    </g>
    <g id="botFace-angry" filter="url(#fGlow)">
      <path d="M58 92 L90 108" fill="none" stroke="#3fe6ff" stroke-width="8" stroke-linecap="round"/>
      <path d="M142 92 L110 108" fill="none" stroke="#3fe6ff" stroke-width="8" stroke-linecap="round"/>
      <path d="M88 134 Q100 125 112 134" fill="none" stroke="#3fe6ff" stroke-width="6" stroke-linecap="round"/>
    </g>
    <g id="botFace-love" filter="url(#fGlow)">
      <path d="M76 96 C 70 88, 60 92, 60 101 C 60 110, 68 115, 76 122 C 84 115, 92 110, 92 101 C 92 92, 82 88, 76 96 Z" fill="#3fe6ff"/>
      <path d="M124 96 C 118 88, 108 92, 108 101 C 108 110, 116 115, 124 122 C 132 115, 140 110, 140 101 C 140 92, 130 88, 124 96 Z" fill="#3fe6ff"/>
      <path d="M90 130 Q100 138 110 130" fill="none" stroke="#3fe6ff" stroke-width="6" stroke-linecap="round"/>
    </g>
    <g id="botFace-thinking">
      <g filter="url(#fGlow)">
        <ellipse cx="78" cy="101" rx="9" ry="14" fill="#3fe6ff"/>
        <ellipse cx="122" cy="101" rx="9" ry="14" fill="#3fe6ff"/>
        <path d="M92 128 Q100 124 108 128" fill="none" stroke="#3fe6ff" stroke-width="6" stroke-linecap="round"/>
      </g>
      <rect x="95" y="136" width="10" height="18" rx="5" fill="url(#bgGlove)"/>
      <ellipse cx="100" cy="158" rx="18" ry="13" fill="url(#bgGlove)"/>
      <ellipse cx="100" cy="158" rx="18" ry="13" fill="none" stroke="rgba(110,130,170,0.4)" stroke-width="1.5"/>
    </g>
    <g id="botFace-shy" filter="url(#fGlow)">
      <path d="M64 104 Q76 114 88 104" fill="none" stroke="#3fe6ff" stroke-width="6" stroke-linecap="round"/>
      <path d="M112 104 Q124 114 136 104" fill="none" stroke="#3fe6ff" stroke-width="6" stroke-linecap="round"/>
      <path d="M92 128 Q100 135 108 128" fill="none" stroke="#3fe6ff" stroke-width="6" stroke-linecap="round"/>
      <g stroke="#ff6b6b" stroke-width="5" stroke-linecap="round" opacity="0.75" fill="none">
        <path d="M52 116 l7 9"/><path d="M60 114 l7 9"/><path d="M68 112 l7 9"/>
        <path d="M148 116 l-7 9"/><path d="M140 114 l-7 9"/><path d="M132 112 l-7 9"/>
      </g>
    </g>
    <g id="botFace-surprised" filter="url(#fGlow)">
      <ellipse cx="78" cy="103" rx="8" ry="12" fill="#3fe6ff"/>
      <ellipse cx="122" cy="103" rx="8" ry="12" fill="#3fe6ff"/>
      <circle cx="100" cy="130" r="9" fill="#3fe6ff"/>
    </g>

    <!-- robôs completos por expressão -->
    <g id="bot-calm"><use href="#botHead"/><use href="#botFace-calm"/></g>
    <g id="bot-joy"><use href="#botHead"/><use href="#botFace-joy"/></g>
    <g id="bot-worried"><use href="#botHead"/><use href="#botFace-worried"/></g>
    <g id="bot-cool"><use href="#botHead"/><use href="#botFace-cool"/></g>
    <g id="bot-sad"><use href="#botHead"/><use href="#botFace-sad"/></g>
    <g id="bot-angry"><use href="#botHead"/><use href="#botFace-angry"/></g>
    <g id="bot-love"><use href="#botHead"/><use href="#botFace-love"/></g>
    <g id="bot-thinking"><use href="#botHead"/><use href="#botFace-thinking"/></g>
    <g id="bot-shy"><use href="#botHead"/><use href="#botFace-shy"/></g>
    <g id="bot-surprised"><use href="#botHead"/><use href="#botFace-surprised"/></g>
  </defs>
</svg>`;

let injected = false;

/** Injeta o sprite no documento (idempotente) — chamado uma vez no app.js. */
export function injectBotSprite() {
  if (injected || typeof document === "undefined" || !document.body) return;
  const host = document.createElement("div");
  host.id = "bot-sprite";
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
  host.innerHTML = BOT_SPRITE;
  document.body.appendChild(host);
  injected = true;
}

/** Marca o robô vetorial de uma expressão. */
export function bot(expression = "calm", cls = "") {
  const safe = BOT_EXPRESSIONS.includes(expression) ? expression : "calm";
  return `<svg class="bot ${cls}" viewBox="0 0 200 200" aria-hidden="true" focusable="false"><use href="#bot-${safe}"/></svg>`;
}

/** Troca a expressão de um robô já na tela (com pop). */
export function setBotExpression(svgEl, expression) {
  if (!svgEl) return;
  const safe = BOT_EXPRESSIONS.includes(expression) ? expression : "calm";
  const use = svgEl.querySelector("use");
  if (!use || use.getAttribute("href") === `#bot-${safe}`) return;
  use.setAttribute("href", `#bot-${safe}`);
  // A reação pertence ao rosto; a flutuação pertence ao mascote.
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    use.animate?.([{ opacity: 0.3 }, { opacity: 1 }], { duration: 320, easing: "ease-out" });
  }
}
