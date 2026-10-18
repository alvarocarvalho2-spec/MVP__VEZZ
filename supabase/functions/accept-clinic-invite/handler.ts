const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
});

// Dependency injection keeps all failure and concurrency tests off production.
export function createHandler(client: () => any) {
  return async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (!["GET", "POST"].includes(req.method)) return json({ error: "Método não permitido." }, 405);
    const admin = client();
    let claimed: string | null = null;
    let createdUser: string | null = null;
    let completed = false;
    let finalizationStarted = false;
    let rollbackConfirmed = false;
    try {
      const url = new URL(req.url);
      if (Number(req.headers.get("content-length")) > 16384) return json({ error: "Dados excedem o limite." }, 413);
      const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();
      let invite: any = null;
      let managerClinic: string | null = null;
      if (url.searchParams.get("action") === "create-manager") {
        if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
        const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return json({ error: "Entre novamente para continuar." }, 401);
        const { data, error } = await admin.auth.getUser(token);
        if (error || !data?.user?.email) return json({ error: "Sessão inválida." }, 401);
        const principal = await admin.from("gestor").select("id_clinica").eq("email", data.user.email).eq("principal", true).maybeSingle();
        if (principal.error || !principal.data) return json({ error: "Somente o gestor principal pode cadastrar gestores." }, 403);
        managerClinic = principal.data.id_clinica;
      } else {
        const token = url.searchParams.get("token");
        if (!token || token.length > 200) return json({ error: "Token inválido." }, 400);
        const lookup = await admin.from("convite_gestor").select("*,solicitacao_clinica(*)").eq("token", token).eq("usado", false).gt("criado_em", cutoff).maybeSingle();
        if (lookup.error) throw lookup.error;
        invite = lookup.data;
        if (!invite || invite.solicitacao_clinica?.status !== "Aprovada") return json({ error: "Convite inválido, expirado ou já utilizado." }, 404);
        if (req.method === "GET") return json({ request: { nome_clinica: invite.solicitacao_clinica.nome_clinica, email_responsavel: invite.solicitacao_clinica.email_responsavel } });
      }
      let body;
      try {
        const raw = await req.text();
        if (raw.length > 16384) return json({ error: "Dados excedem o limite." }, 413);
        body = JSON.parse(raw);
      } catch { return json({ error: "Dados inválidos." }, 400); }
      const nome = typeof body?.nome === "string" ? body.nome.trim() : "";
      const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
      const senha = typeof body?.senha === "string" ? body.senha : "";
      const cargo = typeof body?.cargo === "string" ? body.cargo.trim() : "Gestor";
      if (nome.length < 3 || nome.length > 160 || !/\S+\s+\S+/.test(nome) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || senha.length < 6 || senha.length > 128 || cargo.length > 100) {
        return json({ error: "Informe nome completo, e-mail válido e senha de 6 a 128 caracteres." }, 400);
      }
      if (managerClinic && body.id_clinica !== managerClinic) return json({ error: "Acesso restrito à sua clínica." }, 403);
      if (invite) {
        if (email !== String(invite.solicitacao_clinica.email_responsavel).trim().toLowerCase()) return json({ error: "Use o e-mail do responsável que recebeu o convite." }, 403);
        const claim = await admin.from("convite_gestor").update({ usado: true, usado_em: new Date().toISOString() }).eq("id_convite", invite.id_convite).eq("usado", false).gt("criado_em", cutoff).select("id_convite").maybeSingle();
        if (claim.error) throw claim.error;
        if (!claim.data) return json({ error: "Convite já utilizado ou em processamento." }, 409);
        claimed = invite.id_convite;
      }
      const auth = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { nome, role: "gestor" } });
      if (auth.error) throw auth.error;
      if (!auth.data?.user?.id) throw Error("User creation failed");
      createdUser = auth.data.user.id;
      let clinicId = managerClinic;
      if (invite) {
        finalizationStarted = true;
        const result = await admin.rpc("vezz_concluir_convite", { p_token: invite.token, p_auth_id: createdUser, p_nome: nome, p_email: email, p_cargo: cargo });
        if (result.error) { rollbackConfirmed = true; throw result.error; }
        if (!result.data) throw Error("Missing finalization result");
        clinicId = result.data;
      } else {
        finalizationStarted = true;
        const result = await admin.from("gestor").insert({ auth_id: createdUser, nome, email, cargo, id_clinica: managerClinic, principal: false });
        if (result.error) { rollbackConfirmed = true; throw result.error; }
      }
      completed = true;
      return json({ ok: true, clinic_id: clinicId });
    } catch {
      return json({ error: "Não foi possível concluir o cadastro. Confira os dados ou entre em contato com a clínica." }, 400);
    } finally {
      // A lost HTTP response does not prove that the database rolled back.
      if (!completed && (!finalizationStarted || rollbackConfirmed)) {
        let cleaned = true;
        if (createdUser) {
          try { const result = await admin.auth.admin.deleteUser(createdUser); cleaned = !result.error; }
          catch { cleaned = false; }
        }
        if (claimed && cleaned) {
          try { await admin.from("convite_gestor").update({ usado: false, usado_em: null }).eq("id_convite", claimed); }
          catch { /* A failed release remains closed for manual recovery. */ }
        }
      }
    }
  };
}
