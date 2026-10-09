# Órion Oficina

Sistema de gestão para lojas de **películas automotivas e residenciais, lâmpadas, alarmes, acessórios e
ar-condicionado veicular**, desenvolvido pela **Órion Automação Inteligente**. É multiempresa: uma única
instalação atende várias lojas, cada uma vendo só os próprios dados.

**Fase 1:** clientes e veículos · catálogo com tabela de películas por categoria de veículo · orçamentos
com PDF e link pelo WhatsApp · ordens de serviço · estoque (inclusive rolos de película e importação de XML
de compra) · NFS-e, NFC-e e NF-e · contas a receber/pagar e caixa do dia · painel e relatórios.

> Documentos do projeto: [plano](docs/PLANO.md) · [decisões técnicas](docs/DECISOES.md) ·
> [pendências que dependem de você](docs/PENDENCIAS.md) · [acessos de demonstração](docs/ACESSOS_DEMO.md)

---

## Rodar no seu computador

Requisitos: **Node.js 20.9+** (<https://nodejs.org>), **Docker Desktop** aberto (<https://www.docker.com/products/docker-desktop/>) e **Git**.

```bash
git clone https://github.com/rafaeljarosewski-oss/agente-automotivo.git
cd agente-automotivo
npm run setup     # instala tudo, sobe o banco local, aplica as migrações e carrega os dados de exemplo
npm run dev       # abre o sistema em http://localhost:3000
```

Entre com `admin@demo.orion.app` / `Demo@2026` (os outros logins estão em [docs/ACESSOS_DEMO.md](docs/ACESSOS_DEMO.md)).
Na primeira vez o `setup` baixa as imagens do Supabase (~2 GB) e leva alguns minutos.

Painel do banco local (Supabase Studio): <http://127.0.0.1:54323>.

### Comandos

| Comando | O que faz |
|---|---|
| `npm run setup` | Instalação completa (pode rodar de novo: recria o banco local do zero) |
| `npm run dev` | Sistema em modo de desenvolvimento |
| `npm run db:start` / `db:stop` | Liga/desliga o Supabase local |
| `npm run db:reset` | Recria o banco local (migrações) — rode `npm run db:seed` em seguida para os dados de exemplo |
| `npm run db:types` | Regenera os tipos TypeScript a partir do banco |
| `npm run lint` · `npm run typecheck` | Padrões de código e checagem de tipos |
| `npm test` | Testes unitários (cálculos, fiscal com emissor simulado, XML, CSV, criptografia) |
| `npm run test:db` | Testes do banco: isolamento entre empresas (RLS) e conclusão de OS |
| `npm run test:e2e` | Testes ponta a ponta no navegador (Playwright) |
| `npm run build` | Build de produção |
| `npm run deploy:supabase` · `npm run deploy:vercel` | Publicação (ver abaixo) |
| `npm run empresa:nova` | Cadastra uma nova loja cliente (ver abaixo) |

O GitHub Actions roda lint, tipos e testes unitários a cada push; em seguida sobe um Supabase descartável e
roda os testes de banco e os ponta a ponta.

---

## Publicar (Supabase + Vercel)

Faça uma vez, na pasta do projeto. Detalhes de cada conta em [docs/PENDENCIAS.md](docs/PENDENCIAS.md).

1. **Banco na nuvem**
   ```bash
   npx supabase login
   npm run deploy:supabase
   ```
   Cria o projeto (região São Paulo), aplica as migrações, desativa o cadastro público de usuários e grava
   URL, chaves e segredos gerados em `.env.producao` (arquivo local, fora do Git — guarde uma cópia num cofre de senhas).
   Para usar um projeto que já existe: `SUPABASE_PROJECT_REF=<ref> SUPABASE_DB_PASSWORD=<senha> npm run deploy:supabase`.

2. **Site na Vercel**
   ```bash
   npx vercel login
   npm run deploy:vercel
   ```
   Cria/vincula o projeto, cadastra as variáveis de ambiente e publica em produção.

3. **Sincronização fiscal a cada 10 minutos** — no GitHub: *Settings › Secrets and variables › Actions ›
   New repository secret*, crie `APP_URL` (endereço do sistema) e `CRON_SECRET` (copie do `.env.producao`).
   A Vercel (plano gratuito) roda a rotina diária; a de 10 minutos fica no GitHub Actions.

4. **Emissão fiscal real** — com a conta da ACBr API, preencha `FISCAL_CLIENT_ID` e `FISCAL_CLIENT_SECRET`
   no `.env.producao` e rode `npm run deploy:vercel` de novo.

Atualizações futuras: `git push` (a Vercel publica sozinha se o repositório estiver conectado em
*Vercel › Project › Settings › Git*) e `npm run deploy:supabase` quando houver migrações novas.

---

## Cadastrar uma nova loja cliente

```bash
npm run empresa:nova -- --env .env.producao \
  --cnpj 12.345.678/0001-95 --admin-nome "Maria Souza" --admin-email maria@lojadamaria.com.br
```

O script consulta o CNPJ (razão social, endereço, regime), cria a empresa com as categorias de veículo padrão
e o usuário administrador, e mostra uma **senha temporária**. Envie o acesso ao dono da loja e combine:

1. **Minha conta** (clique no nome, no menu): trocar a senha temporária.
2. **Configurações › Empresa**: conferir os dados e enviar o logotipo (aparece nos PDFs).
3. **Configurações › Usuários**: criar atendentes e instaladores (cada e-mail pertence a uma única loja).
4. **Catálogo**: produtos, serviços e tabela de películas (linha × categoria de veículo).
5. **Configurações › Fiscal**, com o contador: certificado A1, CSC da NFC-e, séries e próximos números,
   códigos de serviço e alíquota de ISS; validar NCM/CFOP/CSOSN dos produtos.
6. Emitir uma nota de teste em **homologação**; estando tudo certo, mudar o ambiente para **produção**.

Sem `--env`, o script usa o `.env.local` (banco local).

---

## Emissão fiscal

- `FISCAL_PROVIDER=mock` (padrão local): emissor **simulado**, sem credenciais. Autoriza após ~1,5 s, gera XML e PDF
  de exemplo e simula rejeições. Recusa emitir quando a loja está em **produção**.
- `FISCAL_PROVIDER=acbr`: [ACBr API](https://dev.acbr.api.br), sucessora da Nuvem Fiscal (desativada em 31/07/2026).
  `FISCAL_CREDENCIAL=sandbox|producao` escolhe o servidor da API; o ambiente da SEFAZ/prefeitura
  (homologação × produção) é escolhido por loja em *Configurações › Fiscal*.
- Toda a integração passa pela interface `FiscalProvider` (`src/lib/fiscal/tipos.ts`): trocar de fornecedor
  (ex.: Focus NFe) é escrever uma nova classe, sem mexer nas telas.
- O status das notas é atualizado pela própria tela (consulta automática), pelo webhook assinado
  `POST /api/fiscal/webhook` e pelas rotinas agendadas. Veja D01–D04 em [docs/DECISOES.md](docs/DECISOES.md).

---

## Como o código está organizado

```
src/app/(app)/        telas do sistema (uma pasta por módulo, com as server actions em actions.ts)
src/app/p/            páginas públicas (orçamento e nota pelo link do WhatsApp)
src/app/api/          PDFs, CSV, webhook fiscal e rotinas agendadas
src/lib/dominio/      regras puras: dinheiro em centavos, documentos, placa, cálculos de preço/m²/comissão/parcelas
src/lib/fiscal/       FiscalProvider, emissor simulado, ACBr/Nuvem Fiscal, mapeamento DPS/NF-e, tradução de rejeições
src/lib/servidor/     sessão, padrão das ações, tradução de erros, criptografia, CSV
supabase/migrations/  esquema, RLS e funções (conclusão de OS, estoque, caixa e relatórios rodam no banco, em transação)
scripts/              setup, seed, deploy e cadastro de loja
tests/                unit · db (RLS) · e2e (Playwright)
```

Segurança e multiempresa: toda tabela de negócio tem `empresa_id` e RLS (a migração falha se alguma tabela
pública ficar sem RLS); papéis admin/atendente/instalador são checados no banco e nas telas; o certificado A1 vai
direto para a API fiscal e nunca é gravado; o CSC é criptografado (AES-256-GCM).

> `index.html`, `og.png` e `.nojekyll` na raiz são a página de proposta publicada no GitHub Pages e não fazem
> parte do sistema.
