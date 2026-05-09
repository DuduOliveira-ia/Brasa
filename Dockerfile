# syntax=docker/dockerfile:1.7

# ----------------------------------------------------------------------------
# 1. deps — instala dependências usando o lockfile
# ----------------------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

# ----------------------------------------------------------------------------
# 2. builder — build de produção (Next standalone)
# ----------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* são inlined no bundle do client em build-time. O Easypanel
# desta versão não expõe Build Args na UI, então buildamos com placeholders
# e o entrypoint do runner substitui pelos valores reais em runtime.
ARG NEXT_PUBLIC_SUPABASE_URL=https://buildtime-placeholder.supabase.co
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_buildtime_placeholder_value
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

RUN npm run build

# ----------------------------------------------------------------------------
# 3. runner — imagem final, mínima
# ----------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Roda como usuário não-root
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

COPY --chown=nextjs:nodejs docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs
EXPOSE 3000

# server.js é gerado pelo `output: 'standalone'`
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
