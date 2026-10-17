/**
 * VEZZ — roteador hash (#/rota). Compatível com hospedagem estática.
 */
function parseHash() {
  const raw = (location.hash || "#/").replace(/^#/, "") || "/";
  const [pathPart, qs] = raw.split("?");
  const clean = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
  const parts = clean.split("/").filter(Boolean);
  return {
    path: clean === "/" ? "/" : `/${parts.join("/")}`,
    parts,
    query: Object.fromEntries(new URLSearchParams(qs || "")),
  };
}

export function startRouter(onChange) {
  const run = () => onChange(parseHash());
  window.addEventListener("hashchange", run);
  if (!location.hash) history.replaceState(null, "", "#/");
  run();
  return () => window.removeEventListener("hashchange", run);
}

/**
 * Match simples: padrão "/clinica/:id" contra parts.
 */
export function match(path, pattern) {
  const a = path.split("/").filter(Boolean);
  const b = pattern.split("/").filter(Boolean);
  if (a.length !== b.length) return null;
  const params = {};
  for (let i = 0; i < b.length; i++) {
    if (b[i].startsWith(":")) params[b[i].slice(1)] = decodeURIComponent(a[i]);
    else if (b[i] !== a[i]) return null;
  }
  return params;
}
