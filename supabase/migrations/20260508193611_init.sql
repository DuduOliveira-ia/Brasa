-- Brasa Nobre — schema inicial
-- Rodar no SQL Editor do Supabase (cole tudo, run).
-- Idempotente: pode rodar de novo sem quebrar.

-- =========================================================================
-- 1. Tabela auxiliar: allowlist de e-mails que podem entrar
-- =========================================================================
create table if not exists public.allowed_emails (
  email text primary key,
  display_name text not null,
  added_at timestamptz not null default now()
);

comment on table public.allowed_emails is
  'Allowlist de e-mails autorizados a logar via Google OAuth. Inserir Helder e Bárbara aqui.';

-- =========================================================================
-- 2. Perfil do usuário (espelho de auth.users)
-- =========================================================================
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

-- Trigger: ao criar usuário em auth.users, popular public.users a partir da allowlist.
-- Se o email não está na allowlist, levanta erro — bloqueia o signup.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
begin
  select display_name into v_display_name
  from public.allowed_emails
  where lower(email) = lower(new.email);

  if v_display_name is null then
    raise exception 'E-mail % não está na allowlist do Brasa Nobre Advisor.', new.email
      using errcode = '42501';
  end if;

  insert into public.users (id, email, display_name)
  values (new.id, new.email, v_display_name)
  on conflict (id) do update
    set email = excluded.email,
        display_name = excluded.display_name;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- =========================================================================
-- 3. Conversas
-- =========================================================================
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_user_id_updated_at_idx
  on public.conversations (user_id, updated_at desc);

-- =========================================================================
-- 4. Mensagens
-- =========================================================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_id_created_at_idx
  on public.messages (conversation_id, created_at asc);

-- Mantém conversations.updated_at em dia quando chega mensagem nova
create or replace function public.touch_conversation()
returns trigger
language plpgsql
as $$
begin
  update public.conversations
    set updated_at = now()
    where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists on_message_inserted on public.messages;
create trigger on_message_inserted
  after insert on public.messages
  for each row execute function public.touch_conversation();

-- =========================================================================
-- 5. Facts — atualizações ditas pelos sócios ("kit X agora custa Y")
--    Compartilhadas entre os dois — se Helder atualiza, Bárbara vê.
-- =========================================================================
create table if not exists public.facts (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value text not null,
  note text,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists facts_updated_at_idx
  on public.facts (updated_at desc);

-- =========================================================================
-- 6. Row Level Security
-- =========================================================================
alter table public.users         enable row level security;
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;
alter table public.facts         enable row level security;
alter table public.allowed_emails enable row level security;

-- users: todo authenticated lê (pra mostrar nome do autor); ninguém edita pelo client
drop policy if exists "users_select_authenticated" on public.users;
create policy "users_select_authenticated"
  on public.users for select
  to authenticated
  using (true);

-- conversations: cada um vê/edita só as próprias
drop policy if exists "conversations_owner_all" on public.conversations;
create policy "conversations_owner_all"
  on public.conversations for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- messages: acesso via conversation que pertence ao user
drop policy if exists "messages_owner_select" on public.messages;
create policy "messages_owner_select"
  on public.messages for select
  to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and c.user_id = (select auth.uid())
  ));

drop policy if exists "messages_owner_insert" on public.messages;
create policy "messages_owner_insert"
  on public.messages for insert
  to authenticated
  with check (exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and c.user_id = (select auth.uid())
  ));

-- facts: compartilhado — todos authenticated leem e escrevem
drop policy if exists "facts_select_all_authenticated" on public.facts;
create policy "facts_select_all_authenticated"
  on public.facts for select
  to authenticated
  using (true);

drop policy if exists "facts_upsert_authenticated" on public.facts;
create policy "facts_upsert_authenticated"
  on public.facts for insert
  to authenticated
  with check (updated_by = (select auth.uid()));

drop policy if exists "facts_update_authenticated" on public.facts;
create policy "facts_update_authenticated"
  on public.facts for update
  to authenticated
  using (true)
  with check (updated_by = (select auth.uid()));

-- allowed_emails: ninguém acessa pelo client. Gerenciar via SQL editor.
-- (RLS habilitada sem policy = bloqueia tudo do client)
