#!/usr/bin/env bash
# =============================================================================
# Cria/vincula o projeto na Vercel, cadastra as variáveis de ambiente e publica.
#   npm run deploy:vercel
#
# Antes, uma única vez:  npx vercel login
# Requer o .env.producao gerado por `npm run deploy:supabase`.
#
# Variáveis opcionais:
#   NOME_PROJETO   nome do projeto na Vercel (padrão: orion-oficina)
#   VERCEL_SCOPE   time/conta da Vercel (se você tiver mais de um)
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

ARQ=".env.producao"
NOME_PROJETO="${NOME_PROJETO:-orion-oficina}"
VC="npx --yes vercel@63.1.0"
ESCOPO=()
[ -n "${VERCEL_SCOPE:-}" ] && ESCOPO=(--scope "$VERCEL_SCOPE")

erro() { echo "✖ $*" >&2; exit 1; }
info() { echo "→ $*"; }
ler() { grep -E "^$1=" "$ARQ" | tail -1 | cut -d= -f2- || true; }

[ -f "$ARQ" ] || erro "Arquivo $ARQ não encontrado. Rode antes: npm run deploy:supabase"

info "Verificando login na Vercel..."
$VC whoami ${ESCOPO[@]+"${ESCOPO[@]}"} >/dev/null 2>&1 || erro "Você não está logado. Rode: npx vercel login"

info "Vinculando o projeto \"$NOME_PROJETO\"..."
$VC project add "$NOME_PROJETO" ${ESCOPO[@]+"${ESCOPO[@]}"} >/dev/null 2>&1 || true # já existe? segue
$VC link --yes --project "$NOME_PROJETO" ${ESCOPO[@]+"${ESCOPO[@]}"}

# Públicas (vão para o navegador) e secretas (marcadas como "sensitive" na Vercel)
PUBLICAS=(NEXT_PUBLIC_APP_URL NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY FISCAL_PROVIDER FISCAL_CREDENCIAL RESP_TECNICO_CNPJ RESP_TECNICO_EMAIL RESP_TECNICO_FONE)
SECRETAS=(SUPABASE_SECRET_KEY APP_ENCRYPTION_KEY CRON_SECRET FISCAL_WEBHOOK_SECRET FISCAL_CLIENT_ID FISCAL_CLIENT_SECRET)

cadastrar() {
  local nome="$1" tipo="$2" valor
  valor=$(ler "$nome")
  if [ -z "$valor" ]; then
    echo "  - $nome: vazio, não cadastrado"
    return
  fi
  for ambiente in production preview; do
    $VC env add "$nome" "$ambiente" --value "$valor" --force --yes "--$tipo" ${ESCOPO[@]+"${ESCOPO[@]}"} >/dev/null
  done
  echo "  ✓ $nome"
}

info "Cadastrando variáveis de ambiente (produção e preview)..."
for v in "${PUBLICAS[@]}"; do cadastrar "$v" no-sensitive; done
for v in "${SECRETAS[@]}"; do cadastrar "$v" sensitive; done

info "Publicando em produção (build na Vercel, ~3 minutos)..."
URL=$($VC deploy --prod --yes ${ESCOPO[@]+"${ESCOPO[@]}"} | tail -1)

echo
echo "✔ Publicado: $URL"
echo "  Endereço fixo de produção: confira em https://vercel.com/dashboard › $NOME_PROJETO › Domains."
echo "  Se ele for diferente de $(ler NEXT_PUBLIC_APP_URL), corrija NEXT_PUBLIC_APP_URL no $ARQ e rode este script de novo"
echo "  (é o endereço usado nos links enviados por WhatsApp)."
echo "  Cadastre a primeira loja: npm run empresa:nova -- --env $ARQ --cnpj ... --admin-nome \"...\" --admin-email ..."
