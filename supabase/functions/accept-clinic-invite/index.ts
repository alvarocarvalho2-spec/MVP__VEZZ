import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) return json({ error: "Token ausente." }, 400);

    const { data: invite, error: inviteError } = await admin
      .from("convite_gestor")
      .select("*, solicitacao_clinica(*)")
      .eq("token", token)
      .eq("usado", false)
      .maybeSingle();
    if (inviteError) throw inviteError;
    if (!invite || invite.solicitacao_clinica?.status !== "Aprovada") return json({ error: "Convite inválido ou já utilizado." }, 404);

    if (req.method === "GET") {
      return json({ request: invite.solicitacao_clinica });
    }

    const body = await req.json();
    const nome = String(body.nome || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const senha = String(body.senha || "");
    const cargo = String(body.cargo || "Gestor").trim();
    if (nome.length < 3 || !email || senha.length < 6) return json({ error: "Informe nome, e-mail e uma senha de ao menos 6 caracteres." }, 400);

    const request = invite.solicitacao_clinica;
    const { data: auth, error: authError } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { nome, role: "gestor" } });
    if (authError) throw authError;

    const { data: clinic, error: clinicError } = await admin.from("clinica").insert({
      nome: request.nome_clinica, cnpj: request.cnpj, telefone: request.telefone_clinica,
      descricao: request.descricao || "", especialidades: String(request.especialidades || "Clínica Geral").split(",").map((x) => x.trim()).filter(Boolean),
      horarios: { seg: ["08:00-12:00", "14:00-18:00"], ter: ["08:00-12:00", "14:00-18:00"], qua: ["08:00-12:00", "14:00-18:00"], qui: ["08:00-12:00", "14:00-18:00"], sex: ["08:00-12:00", "14:00-18:00"], sab: ["08:00-12:00"], dom: [] },
    }).select().single();
    if (clinicError) throw clinicError;

    const { error: addressError } = await admin.from("endereco").insert({ rua: request.rua, numero: request.numero, bairro: request.bairro, cidade: request.cidade, cep: request.cep, id_clinica: clinic.id_clinica });
    if (addressError) throw addressError;
    const { error: managerError } = await admin.from("gestor").insert({ auth_id: auth.user.id, nome, email, senha: "supabase-auth", cargo, id_clinica: clinic.id_clinica, principal: true });
    if (managerError) throw managerError;
    const { error: usedError } = await admin.from("convite_gestor").update({ usado: true, usado_em: new Date().toISOString() }).eq("id_convite", invite.id_convite);
    if (usedError) throw usedError;

    return json({ ok: true, clinic_id: clinic.id_clinica });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Não foi possível concluir o convite." }, 400);
  }
});
