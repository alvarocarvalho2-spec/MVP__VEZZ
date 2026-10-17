-- =============================================================================
-- VEZZ — migração: gestor principal (primeiro gestor) + bucket de fotos
-- Rode INTEIRO no SQL Editor do projeto (idempotente — pode rodar de novo).
--
-- O que muda:
--   1) gestor ganha a coluna "principal" (só o primeiro gestor da clínica é principal)
--   2) só o gestor principal (ou o admin VEZZ) pode cadastrar novos gestores
--   3) só o gestor principal altera os dados da clínica e do endereço
--      (os demais gestores só visualizam)
--   4) bucket "fotos-clinicas" no Storage: leitura pública e upload só pelo
--      gestor principal da clínica — clínicas novas já nascem SEM foto e o
--      painel só deixa o primeiro gestor enviar/trocar a foto
--   5) gestor não pode alterar o próprio email / id_clinica / principal pela
--      API (senão um gestor comum poderia se promover a principal)
-- =============================================================================

-- 1) Coluna que marca o primeiro gestor da clínica
alter table public.gestor add column if not exists principal boolean not null default false;

-- 2) Se já existir clínica com gestor e nenhum principal, o mais antigo vira principal
update public.gestor g
set principal = true
where not exists (select 1 from public.gestor g2 where g2.id_clinica = g.id_clinica and g2.principal)
  and g.id_gestor = (
    select g3.id_gestor
    from public.gestor g3
    where g3.id_clinica = g.id_clinica
    order by g3.created_at asc, g3.id_gestor asc
    limit 1
  );

-- 3) Só o gestor principal (ou o admin VEZZ) cadastra novos gestores
drop policy if exists "gestor_insert" on public.gestor;
create policy "gestor_insert" on public.gestor for insert with check (
  public.vezz_is_admin()
  or exists (
    select 1 from public.gestor g
    where g.id_clinica = gestor.id_clinica
      and g.email = auth.jwt()->>'email'
      and g.principal
  )
);

-- 4) Só o gestor principal altera os dados da clínica (os demais só visualizam)
drop policy if exists "clinica_update_gestor" on public.clinica;
create policy "clinica_update_gestor" on public.clinica for update using (
  exists (
    select 1 from public.gestor g
    where g.id_clinica = clinica.id_clinica
      and g.email = auth.jwt()->>'email'
      and g.principal
  )
);

drop policy if exists "endereco_update_gestor" on public.endereco;
create policy "endereco_update_gestor" on public.endereco for update using (
  exists (
    select 1 from public.gestor g
    where g.id_clinica = endereco.id_clinica
      and g.email = auth.jwt()->>'email'
      and g.principal
  )
);

-- 5) Bucket público para as fotos das clínicas
insert into storage.buckets (id, name, public)
values ('fotos-clinicas', 'fotos-clinicas', true)
on conflict (id) do nothing;

-- qualquer visitante pode ver as fotos (o paciente precisa enxergar na pesquisa)
drop policy if exists "fotos-clinicas: leitura publica" on storage.objects;
create policy "fotos-clinicas: leitura publica" on storage.objects
  for select to public using (bucket_id = 'fotos-clinicas');

-- só o gestor principal da clínica dona da pasta pode enviar/substituir a foto
drop policy if exists "fotos-clinicas: enviar (gestor principal)" on storage.objects;
create policy "fotos-clinicas: enviar (gestor principal)" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'fotos-clinicas'
    and exists (
      select 1 from public.gestor g
      where g.id_clinica::text = (storage.foldername(name))[1]
        and g.email = auth.jwt()->>'email'
        and g.principal
    )
  );

drop policy if exists "fotos-clinicas: trocar (gestor principal)" on storage.objects;
create policy "fotos-clinicas: trocar (gestor principal)" on storage.objects
  for update to authenticated using (
    bucket_id = 'fotos-clinicas'
    and exists (
      select 1 from public.gestor g
      where g.id_clinica::text = (storage.foldername(name))[1]
        and g.email = auth.jwt()->>'email'
        and g.principal
    )
  ) with check (
    bucket_id = 'fotos-clinicas'
    and exists (
      select 1 from public.gestor g
      where g.id_clinica::text = (storage.foldername(name))[1]
        and g.email = auth.jwt()->>'email'
        and g.principal
    )
  );

-- 6) Gestor só edita o próprio cadastro (nome/foto/cargo/senha).
--    email, id_clinica e principal são IMUTÁVEIS pela API: sem isso, um gestor
--    comum poderia se promover a "principal" (e editar a clínica) ou trocar
--    a conta de clínica.
drop policy if exists "gestor_update_self" on public.gestor;
create policy "gestor_update_self" on public.gestor for update
  using (email = auth.jwt()->>'email')
  with check (email = auth.jwt()->>'email');
-- Privilégios: o Supabase concede UPDATE em NÍVEL DE TABELA por padrão —
-- revoke por coluna não restringe nada (um gestor comum ainda conseguia se
-- promover a principal ou trocar de clínica pela API). Revogamos UPDATE geral
-- (nível de tabela + todas as colunas) e re-concedemos SOMENTE o que o gestor
-- pode editar no próprio cadastro.
revoke update on public.gestor from authenticated;
revoke update on public.gestor from anon;
revoke update (id_gestor, auth_id, nome, email, senha, cargo, foto, principal, id_clinica, created_at) on public.gestor from authenticated;
revoke update (id_gestor, auth_id, nome, email, senha, cargo, foto, principal, id_clinica, created_at) on public.gestor from anon;
grant update (nome, cargo, foto, senha) on public.gestor to authenticated;
