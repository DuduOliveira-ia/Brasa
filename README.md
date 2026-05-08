# Brasa Nobre · Advisor

App web interno para os sócios da Brasa Nobre (Helder e Bárbara) usarem como
advisor de marketing e negócios. Stack: Next.js 16 + Tailwind + Vercel AI SDK
+ OpenRouter + Supabase.

> **Status:** Fase 2 em construção — chat com persona, auth Google OAuth,
> persistência de conversas em Supabase. Próxima fase: RAG dos PDFs do Drive.

## Setup local

### 1. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
cp .env.example .env.local
```

- `OPENROUTER_API_KEY` — chave em https://openrouter.ai/keys.
- `OPENROUTER_MODEL` — confira o slug atual em https://openrouter.ai/models.
- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` —
  Project Settings → API no dashboard do Supabase.
- `APP_ALLOWED_EMAILS` — e-mails Google de Helder e Bárbara, separados por
  vírgula. Camada extra de segurança além do trigger no banco.

### 2. Banco (Supabase)

No SQL Editor do projeto, cole e rode o conteúdo de
`supabase/migrations/20260508193611_init.sql`.

Depois, ainda no SQL Editor, **adicione os e-mails autorizados**:

```sql
insert into public.allowed_emails (email, display_name) values
  ('helder@exemplo.com', 'Helder'),
  ('barbara@exemplo.com', 'Bárbara');
```

> Sem isso, o trigger rejeita o signup e a pessoa cai em `/login` com erro.

### 3. Google OAuth

Passo a passo em [`docs/oauth-setup.md`](./docs/oauth-setup.md).

### 4. Rodar

```bash
npm install
npm run dev
```

Abra http://localhost:3000 → cai em `/login` → "Entrar com Google".

## Estrutura

- `src/lib/persona.ts` — system prompt do advisor + `buildSystemPrompt(name)`.
- `src/lib/supabase/` — clientes browser/server e helper de proxy de sessão.
- `src/proxy.ts` — Next 16 Proxy (ex-middleware): refresca sessão e protege
  rotas autenticadas.
- `src/app/login/`, `src/app/auth/{callback,signout}/` — fluxo OAuth.
- `src/app/(app)/` — área autenticada (sidebar com conversas + chat).
- `src/app/api/chat/route.ts` — streaming + persistência em Supabase.
- `src/components/chat.tsx` — componente de chat (input, mensagens, streaming).
- `supabase/migrations/` — SQL do schema (users/conversations/messages/facts +
  RLS).

## Próximas fases

- **Fase 3** — RAG sobre PDFs da pasta do Google Drive (vector search via
  pgvector no Supabase).
- **Fase 4** — Detector de "modo atualização" (ex.: "kit X agora custa Y" →
  grava na tabela `facts`, persiste entre Helder e Bárbara).

## Decisões fechadas

- Hospedagem: Vercel.
- API: OpenRouter (modelo configurável via env).
- Banco/auth: Supabase + Google OAuth, allowlist via DB + env.
- Knowledge base (fase 3): PDFs no Google Drive + RAG.
