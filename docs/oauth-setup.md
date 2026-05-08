# Setup do Google OAuth no Supabase

Os passos abaixo são feitos uma vez, no dashboard. Depois disso, o app
funciona com login Google nativo.

## 1. Criar credencial OAuth no Google Cloud Console

1. Acesse https://console.cloud.google.com/apis/credentials.
2. Crie um projeto novo se ainda não tem (sugestão: "Brasa Nobre Advisor").
3. **APIs & Services → OAuth consent screen**:
   - User type: **External**.
   - App name: `Brasa Nobre Advisor`.
   - User support email: e-mail do dono.
   - Developer contact: idem.
   - **Test users** (enquanto o app estiver em "Testing"): adicione os
     e-mails de Helder e Bárbara. Sem isso, o Google nega o login.
4. **APIs & Services → Credentials → + Create credentials → OAuth client ID**:
   - Application type: **Web application**.
   - Name: `Brasa Nobre Advisor — Web`.
   - Authorized JavaScript origins:
     - `http://localhost:3000`
     - URL de produção (Vercel) quando existir.
   - **Authorized redirect URIs**:
     - `https://mfdfpyyxrolnwcoufqye.supabase.co/auth/v1/callback`
       (URL do projeto Supabase + `/auth/v1/callback` — Supabase é quem
       recebe o callback do Google, não o app diretamente).
5. Copie **Client ID** e **Client Secret**.

## 2. Habilitar Google no Supabase

1. Dashboard do projeto → **Authentication → Providers → Google**.
2. Toggle **Enable Sign in with Google** = on.
3. Cole **Client ID** e **Client Secret** copiados acima.
4. Salve.

## 3. URLs de redirect no Supabase

1. Dashboard → **Authentication → URL Configuration**.
2. **Site URL**: `http://localhost:3000` em dev, URL de produção depois.
3. **Redirect URLs** (additional): adicione todas as origens que o app pode
   usar. Mínimo:
   - `http://localhost:3000/**`
   - URL de produção + `/**` quando subir.

## 4. Allowlist de e-mails (no banco)

No SQL Editor:

```sql
insert into public.allowed_emails (email, display_name) values
  ('helder@exemplo.com', 'Helder'),
  ('barbara@exemplo.com', 'Bárbara');
```

> O trigger `on_auth_user_created` checa essa tabela. Se o e-mail não tá
> aqui, o signup falha e a pessoa cai em `/login` com mensagem de erro.

Em paralelo, popule `APP_ALLOWED_EMAILS` no `.env.local` com os mesmos
e-mails (camada extra, validada no callback do app):

```
APP_ALLOWED_EMAILS=helder@exemplo.com,barbara@exemplo.com
```

## 5. Teste

1. `npm run dev`.
2. Abra http://localhost:3000 → redireciona pra `/login`.
3. "Entrar com Google" → escolhe a conta autorizada → volta logado.
4. Tente uma conta fora da allowlist: deve cair em `/login` com erro.

## Em produção (Vercel)

- Adicione as mesmas envs (`NEXT_PUBLIC_SUPABASE_*`, `APP_ALLOWED_EMAILS`,
  `OPENROUTER_*`) no Vercel.
- No Google Cloud Console, adicione a URL de produção em **Authorized
  JavaScript origins** (sem `/**`).
- No Supabase, adicione `https://seu-dominio.vercel.app/**` em
  **Authentication → URL Configuration → Redirect URLs**.
- Atualize **Site URL** pra a URL de produção (ou deixe localhost se for
  desenvolver mais e a redirect URL já cobrir prod).
