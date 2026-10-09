# Registro de decisões técnicas

Decisões tomadas durante o desenvolvimento, com o motivo. Ordem cronológica.

---

## D01 — Provedor fiscal: ACBr API no lugar da Nuvem Fiscal

**Problema concreto encontrado:** a Nuvem Fiscal publicou o comunicado
["Comunicado de Desativação do Serviço Nuvem Fiscal"](https://www.nuvemfiscal.com.br/suporte/) informando que o serviço
**seria desativado em 31/07/2026** (aviso de 22/04/2026). O suporte foi migrado para o Projeto ACBr, e a API continuou como
**ACBr API** (`https://dev.acbr.api.br`), que publicou o guia oficial
["Migrando da Nuvem Fiscal para a ACBr API"](https://dev.acbr.api.br/docs/migrando-da-nuvem-fiscal-para-a-acbr-api/).

**Verificação feita:** comparei o SDK oficial gerado do OpenAPI da Nuvem Fiscal (NuGet `NuvemFiscal.Sdk` 2.70.0) com o SDK gerado
do OpenAPI da ACBr API (`@alijunior/acbr-api-sdk-node` 2.3.6, jul/2026). Os endpoints, nomes de operação e modelos são os mesmos
(`POST /nfse/dps`, `POST /nfce`, `POST /nfe`, `POST /nfe/{id}/carta-correcao`, `PUT /empresas/{cpf_cnpj}/certificado`,
`GET /nfse/cidades/{codigo_ibge}` etc.). Mudam apenas:

| | Nuvem Fiscal (legado) | ACBr API (atual) |
|---|---|---|
| Token OAuth2 | `https://auth.nuvemfiscal.com.br/oauth/token` | `https://auth.acbr.api.br/realms/ACBrAPI/protocol/openid-connect/token` |
| Produção | `https://api.nuvemfiscal.com.br` | `https://prod.acbr.api.br` |
| Homologação/sandbox | `https://api.sandbox.nuvemfiscal.com.br` | `https://hom.acbr.api.br` |

**Decisão:** implementar um único provedor HTTP (`ProvedorApiFiscal`) compatível com as duas APIs, escolhido por
`FISCAL_PROVIDER=acbr` (padrão de produção) ou `FISCAL_PROVIDER=nuvemfiscal` (legado). Tudo fica atrás da interface
`FiscalProvider`, como pedido — trocar para Focus NFe no futuro continua sendo só escrever outra implementação.

## D02 — Webhooks fiscais: assinatura HMAC própria + sincronização periódica como garantia

Nem a documentação da Nuvem Fiscal nem a do ACBr API (até o SDK de jul/2026) expõem cadastro de webhooks; o próprio suporte
orientava usar *polling* (`GET /nfse/{id}`, `/nfe/{id}`...). Por isso:

- **Sincronização periódica** (`/api/cron/fiscal-sync`) consulta as notas em processamento com recuo progressivo
  (10 s, 30 s, 1 min, 5 min, 15 min...). É o mecanismo principal com a ACBr API.
- **Webhook** em `/api/fiscal/webhook` já pronto, com verificação de assinatura **HMAC-SHA256** (cabeçalho
  `x-fiscal-signature: t=<timestamp>,v1=<hex>` sobre `"<timestamp>.<corpo>"`, tolerância de 5 minutos, comparação em tempo
  constante). O `FiscalProviderMock` envia webhooks assinados assim, e qualquer provedor que suporte webhooks com segredo
  compartilhado (ex.: Focus NFe) pode ser plugado mapeando o formato no método `interpretarWebhook` do provedor.
- A tela da nota também consulta o status sozinha enquanto a nota está "em processamento".

## D03 — NFS-e: padrão nacional e provedor municipal

A API recebe a NFS-e sempre no layout da **DPS** (`POST /nfse/dps`) e escolhe o destino pelo campo `provedor`:
`"nacional"` (Ambiente de Dados Nacional — Sistema Nacional NFS-e) ou `"padrao"` (provedor da prefeitura). A configuração da
empresa tem `nfse_provedor = auto | nacional | padrao`. Em `auto`, o sistema consulta `GET /nfse/cidades/{codigo_ibge}` e usa
`nacional` quando o provedor do município for o nacional, `padrao` caso contrário. O endpoint antigo baseado em RPS
(`POST /nfse`) não é usado — a própria API o trata como legado.

## D04 — Reforma tributária (IBS/CBS)

A API já aceita os grupos `IBSCBS` (NF-e/NFC-e, por item) e `IBSCBS`/`tribAbrasf` (NFS-e). O modelo de dados está preparado:
`cst_ibs_cbs` e `cclass_trib` em produtos e serviços; alíquotas (`aliquota_ibs_uf`, `aliquota_ibs_mun`, `aliquota_cbs`) na
configuração fiscal; valores por item e por nota (`valor_ibs_centavos`, `valor_cbs_centavos`). Em 2026 os valores são
informativos (0,1% IBS e 0,9% CBS). O envio dos grupos é controlado por `informar_ibs_cbs` (ligado por padrão só para
Regime Normal), porque empresas do Simples Nacional têm regras próprias de transição — **validar com o contador**.

## D05 — CNPJ alfanumérico

A Receita Federal passou a emitir CNPJ alfanumérico a partir de julho/2026 (IN RFB 2.229/2024). Validação, máscara e
restrições do banco aceitam 12 posições alfanuméricas + 2 dígitos verificadores, com o cálculo oficial (valor do caractere =
código ASCII − 48).

## D06 — Next.js 16 sem Cache Components

O `create-next-app` 16.4 liga `cacheComponents` por padrão. O sistema é 100% autenticado e cada tela depende do usuário (RLS),
então todas as rotas são dinâmicas. Desligamos `cacheComponents`/`partialPrefetching` para evitar exigências de `Suspense`
sem ganho real. O antigo `middleware.ts` virou `src/proxy.ts` (convenção nova do Next 16).

## D07 — Versões das bibliotecas

- **TypeScript 5.9** (não a 7.0): o Next 16 ainda usa a API JS do compilador para o plugin de tipos; a 7.0 (porta nativa) não a expõe.
- **TanStack Table 8.21** (não a 9.x): a v9 mudou a API (features modulares). A v8 é estável e suficiente.
- **ESLint 9**: o `eslint-config-next` 16 ainda declara compatibilidade com ESLint 9.
- **Playwright 1.56.1**: versão fixada para casar com o Chromium pré-instalado no ambiente de desenvolvimento; no CI o
  navegador é baixado pelo `npx playwright install`.
- **Vitest 5**: a 4.1.11 quebrava a instalação do npm (bug de *peer set* com `@vitest/browser-playwright`).

## D08 — Componentes shadcn/ui escritos no repositório

O registro do shadcn (`ui.shadcn.com`) não estava acessível na rede de desenvolvimento. Como o shadcn/ui é, por definição,
código copiado para o projeto, os componentes foram escritos em `src/components/ui` seguindo o mesmo padrão (Radix UI via
pacote `radix-ui`, `class-variance-authority`, Tailwind v4). Fontes do sistema (sem Google Fonts) pelo mesmo motivo e para
carregar mais rápido no celular.

## D09 — Regras de negócio: onde ficam

- **Cálculos** (preço por categoria, m², consumo de película, descontos, rateio, comissão, parcelas, IBS/CBS) ficam em
  `src/lib/dominio/calculos.ts`, funções puras com testes unitários.
- **Operações que precisam ser atômicas** ficam no banco (funções `concluir_os`, `gerar_os_de_orcamento`,
  `registrar_entrada_estoque`, `baixar_conta_receber`, caixa...). A aplicação calcula parcelas e comissões e a função valida
  (ex.: soma das parcelas = total da OS) antes de gravar tudo numa transação.
- **Permissões**: RLS em todas as tabelas (a migração falha se alguma tabela pública ficar sem RLS). O papel do usuário vem
  da tabela `perfis`. Funções `SECURITY DEFINER` verificam empresa e papel explicitamente.

## D10 — Estoque

- Movimentações são um livro-razão imutável (gatilho bloqueia UPDATE/DELETE); correções são feitas por **ajuste com motivo**.
- Película em rolo: cada entrada cria um rolo com metragem inicial; a baixa consome do rolo mais antigo para o mais novo e
  pode dividir entre rolos.
- **Estoque pode ficar negativo** na conclusão da OS (o serviço já foi feito; bloquear a conclusão atrapalharia a oficina).
  O produto aparece no alerta de estoque do painel para correção.
- Número de série: exigido na conclusão para produtos marcados; se a série não foi registrada na entrada, ela é registrada na
  saída (comum em oficinas que não cadastram séries na compra). Série já vendida é bloqueada.

## D11 — Comissão

Percentual: sobre o valor líquido do item (depois do desconto do item e do rateio do desconto no total). Fixo: valor por
unidade executada; em serviços cobrados por m², o fixo vale pelo serviço inteiro. O instalador do item tem prioridade sobre o
instalador da OS.

## D12 — Parcelas

À vista (dinheiro, Pix, débito, crédito à vista) ou forma "a definir": 1 título vencendo na conclusão. Crédito parcelado:
N parcelas a cada 30 dias (prazo típico de repasse). Boleto: N parcelas mensais, a primeira 30 dias depois. Centavos que
sobram na divisão vão para as primeiras parcelas. Recebimento em dinheiro exige caixa aberto; as demais formas entram no caixa
aberto, se houver, para a conferência por forma de pagamento.

## D13 — Um usuário, uma empresa (Fase 1)

`perfis.id` = `auth.users.id`, com `empresa_id`. Simplifica RLS e login. Para um contador/consultor atender várias oficinas
no futuro, basta trocar a chave primária por `(usuario_id, empresa_id)` e guardar a "empresa ativa" no perfil.

## D14 — Segredos

- Certificado A1 (.pfx) e senha: enviados **direto do servidor para a API fiscal** (`PUT /empresas/{cnpj}/certificado`) e
  **nunca gravados** no banco nem no Storage. Guardamos apenas validade, titular e número de série retornados pela API.
- CSC da NFC-e: criptografado com AES-256-GCM (`APP_ENCRYPTION_KEY`) antes de ir para o banco, e também enviado para a API
  fiscal na configuração da empresa.
- Chave secreta do Supabase usada apenas no servidor (`import "server-only"`), para links públicos, webhooks, rotinas e
  criação de usuários.

## D15 — Supabase local via Docker Hub quando o ECR estiver bloqueado

O Supabase CLI baixa imagens de `public.ecr.aws` por padrão. O script `scripts/supabase.mjs` tenta de novo pelo Docker Hub
(`SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io`) se o primeiro `start` falhar — útil em redes com bloqueio.

## D16 — Seed em TypeScript

O seed (`scripts/seed.ts`, executado com `tsx`) usa a API do Supabase com a chave secreta e reaproveita as mesmas funções de
cálculo do sistema, para que orçamentos e OS de exemplo tenham totais coerentes.

## D17 — Rotinas agendadas: Vercel (diária) + GitHub Actions (10 minutos)

O plano Hobby da Vercel só aceita cron **uma vez por dia** e uma expressão mais frequente faz o deploy falhar
(documentação de uso e preços dos Cron Jobs da Vercel). Por isso:
- `vercel.json` agenda só `/api/cron/diario` (06:00 de Brasília): expira orçamentos e faz uma sincronização fiscal completa.
- `.github/workflows/sincronizacao-fiscal.yml` chama `/api/cron/fiscal-sync` a cada 10 minutos; fica inativo até os segredos
  `APP_URL` e `CRON_SECRET` serem cadastrados no GitHub.
- A tela da nota consulta o provedor sozinha enquanto ela está em processamento (2 s, crescendo até 15 s), então o usuário
  quase nunca depende das rotinas. No plano Pro da Vercel dá para trocar o GitHub Actions por um cron `*/5` no `vercel.json`.

## D18 — Emissor simulado nunca emite em produção

O `FiscalProviderMock` recusa pedidos com ambiente `producao`. Assim, uma loja configurada em produção num servidor
esquecido com `FISCAL_PROVIDER=mock` recebe um erro claro em vez de uma "nota autorizada" sem valor fiscal.
O `deploy:supabase` já grava `FISCAL_PROVIDER=acbr` no `.env.producao`; sem credenciais, a emissão falha com
"Credenciais da API fiscal não configuradas".

## D19 — Senhas sem e-mail na Fase 1

Não há servidor de e-mail (SMTP) configurado, então não existe "esqueci minha senha" por e-mail: o administrador da loja
redefine a senha em *Configurações › Usuários* e cada usuário troca a própria em *Minha conta* (com a senha atual).
A conferência da senha atual usa um cliente Supabase separado e encerra só aquela sessão (`signOut({ scope: "local" })` —
o padrão `global` derrubaria também a sessão do navegador). O cadastro público do Supabase Auth fica desligado
(`enable_signup = false`, aplicado na nuvem pelo `supabase config push`).

## D20 — Publicação por scripts e `.env.producao`

`deploy:supabase` usa a Supabase CLI do projeto (`projects create`, `link`, `db push`, `config push`, `projects api-keys`);
`deploy:vercel` usa a Vercel CLI com versão fixa (63.1.0: `link`, `env add --value --sensitive`, `deploy --prod`).
Opções conferidas no `--help` das versões instaladas. Os valores ficam num `.env.producao` local (ignorado pelo Git) que
é a fonte única para a Vercel e para o `empresa:nova`. Segredos existentes são reaproveitados a cada execução —
trocar a `APP_ENCRYPTION_KEY` tornaria ilegíveis os CSCs já salvos.

## D21 — Cadastro de lojas por script

Na Fase 1 não há autoatendimento: a Órion cadastra cada loja com `npm run empresa:nova` (consulta o CNPJ na BrasilAPI,
cria empresa e administrador com senha temporária e desfaz tudo se algum passo falhar). Um e-mail pertence a uma só loja (D13).

## D22 — Consultas de CEP e CNPJ

CEP: ViaCEP e, se falhar, BrasilAPI; CNPJ: BrasilAPI (endpoint `/api/cnpj/v1`). São serviços públicos sem contrato de
disponibilidade, então qualquer falha devolve "não encontrado" e a pessoa preenche à mão. O mapeamento dos campos
(endereço, regime Simples/MEI, CNAE, código IBGE) foi feito a partir das respostas públicas desses serviços.

## D23 — Supabase local com Studio

O `db:start` desliga serviços que o sistema não usa (realtime, edge functions, logs, imgproxy, pooler) para baixar menos
imagens, mas mantém o `postgres-meta`, necessário para o Supabase Studio (<http://127.0.0.1:54323>) funcionar.
