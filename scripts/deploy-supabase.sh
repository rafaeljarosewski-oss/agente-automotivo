#!/usr/bin/env bash
# =============================================================================
# Cria (ou reaproveita) o projeto Supabase na nuvem e aplica as migrações.
#   npm run deploy:supabase
#
# Antes, uma única vez:  npx supabase login   (abre o navegador para autorizar)
#
# Variáveis opcionais:
#   SUPABASE_PROJECT_REF  ref de um projeto já existente (20 letras, aparece na URL do painel)
#   SUPABASE_ORG_ID       organização onde criar o projeto (se houver mais de uma)
#   SUPABASE_DB_PASSWORD  senha do banco (gerada automaticamente ao criar)
#   NOME_PROJETO          nome do projeto novo (padrão: orion-oficina)
#   REGIAO                região (padrão: sa-east-1 — São Paulo)
#
# Resultado: arquivo .env.producao (fora do Git) com URL e chaves, usado por
# `npm run deploy:vercel` e `npm run empresa:nova -- --env .env.producao ...`.
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

SB="npx --yes supabase"
ARQ=".env.producao"
NOME_PROJETO="${NOME_PROJETO:-orion-oficina}"
REGIAO="${REGIAO:-sa-east-1}"

erro() { echo "✖ $*" >&2; exit 1; }
info() { echo "→ $*"; }
command -v jq >/dev/null || erro "Instale o jq (https://jqlang.org/download/)."
command -v openssl >/dev/null || erro "Instale o openssl."

# Lê uma variável já salva no .env.producao (para não trocar segredos a cada execução)
ler() { [ -f "$ARQ" ] && grep -E "^$1=" "$ARQ" | tail -1 | cut -d= -f2- || true; }

info "Verificando login no Supabase..."
$SB projects list -o json >/dev/null 2>&1 || erro "Você não está logado. Rode: npx supabase login"

REF="${SUPABASE_PROJECT_REF:-$(ler SUPABASE_PROJECT_REF)}"
SENHA="${SUPABASE_DB_PASSWORD:-$(ler SUPABASE_DB_PASSWORD)}"

if [ -z "$REF" ]; then
  ORG="${SUPABASE_ORG_ID:-}"
  if [ -z "$ORG" ]; then
    ORGS=$($SB orgs list -o json)
    QTD=$(echo "$ORGS" | jq 'length')
    [ "$QTD" = "0" ] && erro "Nenhuma organização encontrada. Crie uma em https://supabase.com/dashboard."
    if [ "$QTD" != "1" ]; then
      echo "$ORGS" | jq -r '.[] | "  \(.id)  \(.name)"'
      erro "Há mais de uma organização. Rode de novo com SUPABASE_ORG_ID=<id> npm run deploy:supabase"
    fi
    ORG=$(echo "$ORGS" | jq -r '.[0].id')
  fi
  [ -n "$SENHA" ] || SENHA=$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)
  info "Criando o projeto \"$NOME_PROJETO\" em $REGIAO (leva ~2 minutos)..."
  $SB projects create "$NOME_PROJETO" --org-id "$ORG" --db-password "$SENHA" --region "$REGIAO" --yes
  REF=$($SB projects list -o json | jq -r --arg n "$NOME_PROJETO" '[.[] | select(.name == $n)][0] | (.ref // .id)')
  [ -n "$REF" ] && [ "$REF" != "null" ] || erro "Não consegui descobrir o ref do projeto criado. Veja no painel e rode com SUPABASE_PROJECT_REF=<ref>."
  info "Aguardando o banco ficar disponível..."
  sleep 60
fi
[ -n "$SENHA" ] || erro "Informe a senha do banco: SUPABASE_DB_PASSWORD=<senha> npm run deploy:supabase (Painel › Project Settings › Database)."

info "Vinculando o projeto $REF..."
for tentativa in 1 2 3 4 5; do
  $SB link --project-ref "$REF" --password "$SENHA" && break
  [ "$tentativa" = 5 ] && erro "Falha ao vincular o projeto."
  sleep 30
done

info "Aplicando as migrações..."
$SB db push --linked --password "$SENHA" --yes

info "Aplicando as configurações de autenticação (cadastro público desativado)..."
$SB config push --project-ref "$REF" --yes || echo "  (aviso) não foi possível aplicar a configuração; desative 'Allow new users to sign up' no painel."

info "Lendo as chaves de API..."
CHAVES=$($SB projects api-keys --project-ref "$REF" --reveal -o json)
PUBLICA=$(echo "$CHAVES" | grep -oE 'sb_publishable_[A-Za-z0-9_-]+' | head -1 || true)
SECRETA=$(echo "$CHAVES" | grep -oE 'sb_secret_[A-Za-z0-9_-]+' | head -1 || true)
[ -n "$PUBLICA" ] && [ -n "$SECRETA" ] || erro "Chaves publishable/secret não encontradas. Crie-as em Painel › Project Settings › API Keys e rode de novo."

# Segredos do app: reaproveita os existentes (trocar APP_ENCRYPTION_KEY invalida os CSCs salvos)
CRIPTO=$(ler APP_ENCRYPTION_KEY); [ -n "$CRIPTO" ] || CRIPTO=$(openssl rand -base64 32)
CRON=$(ler CRON_SECRET); [ -n "$CRON" ] || CRON=$(openssl rand -hex 24)
WEBHOOK=$(ler FISCAL_WEBHOOK_SECRET); [ -n "$WEBHOOK" ] || WEBHOOK=$(openssl rand -hex 24)
APP_URL=$(ler NEXT_PUBLIC_APP_URL); [ -n "$APP_URL" ] || APP_URL="https://$NOME_PROJETO.vercel.app"

umask 077
cat > "$ARQ" <<EOF
# Gerado por scripts/deploy-supabase.sh — NÃO versionar (contém segredos).
SUPABASE_PROJECT_REF=$REF
SUPABASE_DB_PASSWORD=$SENHA
NEXT_PUBLIC_APP_URL=$APP_URL
NEXT_PUBLIC_SUPABASE_URL=https://$REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$PUBLICA
SUPABASE_SECRET_KEY=$SECRETA
APP_ENCRYPTION_KEY=$CRIPTO
CRON_SECRET=$CRON
FISCAL_WEBHOOK_SECRET=$WEBHOOK
FISCAL_PROVIDER=$(ler FISCAL_PROVIDER | grep . || echo acbr)
FISCAL_CREDENCIAL=$(ler FISCAL_CREDENCIAL | grep . || echo sandbox)
FISCAL_CLIENT_ID=$(ler FISCAL_CLIENT_ID)
FISCAL_CLIENT_SECRET=$(ler FISCAL_CLIENT_SECRET)
RESP_TECNICO_CNPJ=$(ler RESP_TECNICO_CNPJ)
RESP_TECNICO_EMAIL=$(ler RESP_TECNICO_EMAIL)
RESP_TECNICO_FONE=$(ler RESP_TECNICO_FONE)
EOF

echo
echo "✔ Supabase pronto: https://supabase.com/dashboard/project/$REF"
echo "  Variáveis salvas em $ARQ (guarde a senha do banco num cofre de senhas)."
echo "  Preencha FISCAL_CLIENT_ID/FISCAL_CLIENT_SECRET nesse arquivo quando tiver a conta da ACBr API."
echo "  Próximo passo: npm run deploy:vercel"
