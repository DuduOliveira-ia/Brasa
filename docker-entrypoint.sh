#!/bin/sh
set -e

# Workaround pro Easypanel não passar build args:
# Substitui placeholders baked-in no bundle JS pelos valores reais de runtime
# antes de subir o servidor. Funciona porque o Next inlina NEXT_PUBLIC_*
# no client bundle em build-time — não dá pra ler em runtime do client.

PLACEHOLDER_URL="https://buildtime-placeholder.supabase.co"
PLACEHOLDER_KEY="sb_publishable_buildtime_placeholder_value"

replace_in_bundle() {
  placeholder="$1"
  value="$2"
  if [ -z "$value" ] || [ "$value" = "$placeholder" ]; then
    return 0
  fi
  find /app/.next /app/server.js -type f \
    \( -name '*.js' -o -name '*.html' -o -name '*.json' \) \
    -exec sed -i "s|${placeholder}|${value}|g" {} +
}

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ "$NEXT_PUBLIC_SUPABASE_URL" = "$PLACEHOLDER_URL" ]; then
  echo "[entrypoint] WARN: NEXT_PUBLIC_SUPABASE_URL não definida — login Supabase vai falhar." >&2
fi
if [ -z "$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" ] || [ "$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" = "$PLACEHOLDER_KEY" ]; then
  echo "[entrypoint] WARN: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY não definida — login Supabase vai falhar." >&2
fi

replace_in_bundle "$PLACEHOLDER_URL" "$NEXT_PUBLIC_SUPABASE_URL"
replace_in_bundle "$PLACEHOLDER_KEY" "$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"

exec "$@"
