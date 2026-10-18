/**
 * VEZZ — cadastro, login e recuperação de senha (, , , , ).
 */
import { APP, DEFAULT_HOURS, isSupabaseEnabled } from "../config.js";
import { db } from "../lib/db.js";
import { applyErrors, validarCNPJ, validarCPF, validarEmail, validarNome, validarSenha, validarTelefone, validarCEP } from "../lib/validators.js";
import { bindMasks, bindPhotoUpload, bindSubmit, bot, field, groupForm, header, photoUpload, toast } from "../lib/ui.js";
import { escapeHtml } from "../lib/utils.js";

function authLayout(session, visual, form, botExpr = "calm") {
  return `
    ${header(session)}
    <main class="auth-shell">
      <section class="auth-visual">
        <span class="auth-bot">${bot(botExpr, "bot-glow bot-float")}</span>
        ${visual}
      </section>
      <section class="auth-form">${form}</section>
    </main>
  `;
}

export function renderLogin(root, { session, query }) {
  if (session) {
    location.hash = session.role === "admin" ? "#/admin-vezz" : session.role === "gestor" ? "#/gestor" : "#/paciente";
    return;
  }
  root.innerHTML = authLayout(
    session,
    `<div class="kicker kicker-light">Bem-vindo de volta</div>
     <h2>Entre para ver a sua vez na fila.</h2>
     <p>Pacientes acompanham a espera. Gestores conduzem o dia da clínica.</p>`,
    `<div class="kicker">Acesso</div>
     <h1>Entrar</h1>
     ${!isSupabaseEnabled() ? `<div class="demo-box">
       <strong>Acesso rápido</strong><br>
       Paciente <code>ana.silva@email.com</code> · Gestor <code>ricardo@clinicasol.com</code><br>
       Senha de ambos: <code>${APP.demoPassword}</code>
     </div>` : ""}
     <form id="login">
       ${field({ name: "email", label: "E-mail", type: "email", autocomplete: "username", required: true })}
       ${field({ name: "senha", label: "Senha", type: "password", autocomplete: "current-password", required: true })}
       <button class="btn btn-lg btn-block" type="submit">Entrar</button>
     </form>
     <p style="margin-top:16px"><a href="#/recuperar-senha">Recuperar senha</a> · <a href="#/cadastro">Criar conta</a></p>`,
    "calm"
  );
  const form = root.querySelector("#login");
  bindSubmit(form, async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    const senha = form.senha.value;
    const errors = {};
    if (!validarEmail(email)) errors.email = "Informe um e-mail válido.";
    if (!senha) errors.senha = "Informe a senha.";
    if (!applyErrors(form, errors)) return;
    try {
      const s = await db().signIn(email, senha);
      toast(`Olá, ${s.nome.split(" ")[0]}.`, "ok");
      location.hash = query.redirect || (s.role === "gestor" ? "#/gestor" : "#/paciente");
    } catch (err) {
      toast(err.message, "danger");
    }
  });
}

export function renderRegisterPatient(root, { session }) {
  if (session) {
    location.hash = session.role === "admin" ? "#/admin-vezz" : session.role === "gestor" ? "#/gestor" : "#/paciente";
    return;
  }
  root.innerHTML = authLayout(
    session,
    `<div class="kicker kicker-light">Novo por aqui</div>
     <h2>Uma conta. Todas as suas consultas.</h2>
     <p>Use o VEZZ para pesquisar clínicas em Fortaleza, agendar e acompanhar a fila no dia.</p>`,
    `<div class="kicker">Cadastro de paciente</div>
     <h1>Criar conta</h1>
     <form id="reg">
       ${field({ name: "nome", label: "Nome completo", placeholder: "Ana Clara Silva", required: true, autocomplete: "name" })}
       <div class="field-row">
         ${field({ name: "cpf", label: "CPF", placeholder: "000.000.000-00", required: true })}
         ${field({ name: "telefone", label: "Telefone", placeholder: "(85) 98888-0000", required: true })}
       </div>
       ${field({ name: "email", label: "E-mail", type: "email", required: true, autocomplete: "email" })}
       ${field({ name: "senha", label: "Senha", type: "password", hint: "Use pelo menos 6 caracteres.", required: true, autocomplete: "new-password" })}
       <button class="btn btn-lg btn-block" type="submit">Cadastrar</button>
       <p><a href="#/">Cancelar</a> · Já tem conta? <a href="#/login">Entrar</a></p>
       <p class="muted">Para cadastrar uma clínica, <a href="#/solicitar-clinica">envie uma solicitação</a>.</p>
     </form>`,
    "shy"
  );
  const form = root.querySelector("#reg");
  groupForm(form, [["Seus dados", ["nome", "cpf", "telefone"]], ["Seu acesso", ["email", "senha"]]]);
  bindMasks(form);
  bindSubmit(form, async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const errors = {};
    if (!validarNome(data.nome)) errors.nome = "Informe nome e sobrenome.";
    if (!validarCPF(data.cpf)) errors.cpf = "CPF inválido.";
    if (!validarTelefone(data.telefone)) errors.telefone = "Telefone inválido.";
    if (!validarEmail(data.email)) errors.email = "E-mail inválido.";
    if (!validarSenha(data.senha)) errors.senha = "A senha precisa ter ao menos 6 caracteres.";
    if (!applyErrors(form, errors)) return;
    try {
      await db().signUpPatient(data);
      toast("Conta criada. Bem-vindo ao VEZZ.", "ok");
      location.hash = "#/paciente";
    } catch (err) {
      toast(err.message, "danger");
    }
  });
}

export async function renderRegisterManager(root, { session }) {
  const clinics = await db().listClinics();
  root.innerHTML = authLayout(
    session,
    `<div class="kicker kicker-light">Gestão de clínica</div>
     <h2>A clínica inteira, em um painel.</h2>
     <p>Cadastre-se como gestor e, se quiser, abra uma nova clínica no VEZZ.</p>`,
    `<div class="kicker">Cadastro de gestor</div>
     <h1>Administrar uma clínica</h1>
     <form id="regg">
       ${field({ name: "nome", label: "Nome completo", required: true })}
       <div class="field-row">
         ${field({ name: "email", label: "E-mail", type: "email", required: true })}
         ${field({ name: "senha", label: "Senha", type: "password", required: true })}
       </div>
       ${field({ name: "cargo", label: "Cargo", placeholder: "Diretor clínico, recepção…", value: "Gestor" })}
       <div class="field">
         <label for="modo">Clínica</label>
         <select id="modo" name="modo">
           <option value="existente">Vincular a uma clínica existente</option>
           <option value="nova">Cadastrar uma nova clínica</option>
         </select>
       </div>
       <div id="existente">
         <div class="field">
           <label for="id_clinica">Clínica</label>
           <select id="id_clinica" name="id_clinica">
             ${clinics.map((c) => `<option value="${c.id_clinica}">${escapeHtml(c.nome)} — ${escapeHtml(c.endereco?.bairro || "")}</option>`).join("")}
           </select>
         </div>
       </div>
       <div id="nova" hidden>
         ${field({ name: "clinica_nome", label: "Nome da clínica" })}
         <div class="field-row">
           ${field({ name: "cnpj", label: "CNPJ", placeholder: "00.000.000/0000-00" })}
           ${field({ name: "clinica_telefone", label: "Telefone" })}
         </div>
         ${field({ name: "descricao", label: "Descrição" })}
         ${field({ name: "rua", label: "Rua" })}
         <div class="field-row">
           ${field({ name: "numero", label: "Número" })}
           ${field({ name: "bairro", label: "Bairro" })}
         </div>
         <div class="field-row">
           ${field({ name: "cidade", label: "Cidade", value: "Fortaleza" })}
           ${field({ name: "cep", label: "CEP", placeholder: "00000-000" })}
         </div>
         ${photoUpload({ id: "new-clinic-photo", src: "assets/images/hero-clinic.jpg", label: "Foto da clínica" })}
       </div>
       <button class="btn btn-lg btn-block" type="submit">Cadastrar gestor</button>
       <p><a href="#/">Cancelar</a> · <a href="#/login">Já tenho conta</a></p>
     </form>`
  );

  const form = root.querySelector("#regg");
  bindMasks(form);
  let novaFoto = "";
  bindPhotoUpload(form, "new-clinic-photo", (url) => {
    novaFoto = url;
  });
  const toggle = () => {
    const nova = form.modo.value === "nova";
    form.querySelector("#nova").hidden = !nova;
    form.querySelector("#existente").hidden = nova;
  };
  form.modo.addEventListener("change", toggle);

  bindSubmit(form, async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const errors = {};
    if (!validarNome(data.nome)) errors.nome = "Informe nome e sobrenome.";
    if (!validarEmail(data.email)) errors.email = "E-mail inválido.";
    if (!validarSenha(data.senha)) errors.senha = "Mínimo de 6 caracteres.";
    let clinica = null;
    if (data.modo === "nova") {
      if (!data.clinica_nome || data.clinica_nome.trim().length < 3) errors.clinica_nome = "Informe o nome da clínica.";
      if (!validarCNPJ(data.cnpj)) errors.cnpj = "CNPJ inválido.";
      if (!validarTelefone(data.clinica_telefone)) errors.clinica_telefone = "Telefone inválido.";
      if (!data.rua) errors.rua = "Informe a rua.";
      if (!data.bairro) errors.bairro = "Informe o bairro.";
      if (!validarCEP(data.cep)) errors.cep = "CEP inválido.";
      clinica = {
        nome: data.clinica_nome,
        cnpj: data.cnpj,
        telefone: data.clinica_telefone,
        descricao: data.descricao,
        rua: data.rua,
        numero: data.numero,
        bairro: data.bairro,
        cidade: data.cidade,
        cep: data.cep,
        horarios: DEFAULT_HOURS,
        foto: novaFoto || "assets/images/hero-clinic.jpg",
      };
    }
    if (!applyErrors(form, errors)) return;
    try {
      await db().signUpManager({
        nome: data.nome,
        email: data.email,
        senha: data.senha,
        cargo: data.cargo,
        id_clinica: data.modo === "existente" ? data.id_clinica : null,
        clinica,
      });
      toast("Gestor cadastrado.", "ok");
      location.hash = "#/gestor";
    } catch (err) {
      toast(err.message, "danger");
    }
  });
}

export function renderRecover(root, { session, query }) {
  const token = query.token;
  root.innerHTML = authLayout(
    session,
    `<div class="kicker kicker-light">Senha</div>
     <h2>A gente te devolve o acesso, sem drama.</h2>
     <p>Receba um link no e-mail da sua conta para definir uma nova senha.</p>`,
    token
      ? `<div class="kicker">Nova senha</div>
         <h1>Redefinir</h1>
         <form id="newp">
           ${field({ name: "senha", label: "Nova senha", type: "password", required: true })}
           <button class="btn btn-block" type="submit">Salvar senha</button>
         </form>`
      : `<div class="kicker">Recuperar senha</div>
         <h1>Esqueceu a senha?</h1>
         <form id="rec">
           ${field({ name: "email", label: "E-mail da conta", type: "email", required: true })}
           <button class="btn btn-block" type="submit">Enviar instruções</button>
         </form>
         <p><a href="#/login">Voltar ao login</a></p>`,
    "worried"
  );

  const rec = root.querySelector("#rec");
  bindSubmit(rec, async (e) => {
    e.preventDefault();
    const email = rec.email.value.trim();
    if (!validarEmail(email)) return toast("E-mail inválido.", "danger");
    try {
      const res = await db().requestPasswordReset(email);
      if (res.demo && res.token) {
        toast("Link de recuperação gerado.", "ok");
        location.hash = `#/recuperar-senha?token=${res.token}`;
      } else {
        toast("Se o e-mail existir, você receberá as instruções.", "ok");
      }
    } catch (err) {
      toast(err.message, "danger");
    }
  });

  const np = root.querySelector("#newp");
  bindSubmit(np, async (e) => {
    e.preventDefault();
    if (!validarSenha(np.senha.value)) return toast("Mínimo de 6 caracteres.", "danger");
    try {
      await db().confirmPasswordReset(token, np.senha.value);
      toast("Senha atualizada. Entre novamente.", "ok");
      location.hash = "#/login";
    } catch (err) {
      toast(err.message, "danger");
    }
  });
}
