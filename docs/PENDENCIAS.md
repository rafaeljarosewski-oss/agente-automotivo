# Pendências que dependem de você

> Tudo aqui precisa de uma conta, de um documento ou de uma decisão sua, do contador ou da loja.
> O sistema já funciona sem nada disto: localmente, com o **emissor fiscal simulado** e os dados de exemplo
> (`npm run setup` → <http://localhost:3000>). Marque `[x]` conforme for resolvendo.
>
> Ordem sugerida: 1 → 2 → 3 → 4 (publicar) e, em paralelo, 5 a 7 (fiscal e loja).

---

## 1. Programas no seu computador

- [ ] **Node.js 20.9 ou mais novo** — baixe a versão "LTS" em <https://nodejs.org> e instale com as opções padrão.
- [ ] **Docker Desktop** — <https://www.docker.com/products/docker-desktop/>. Instale e **deixe aberto** sempre que for usar o sistema localmente (o banco local roda nele).
- [ ] **jq** e **openssl** (só para o script de publicação do banco):
  - Mac: `brew install jq` (o openssl já vem instalado).
  - Windows: use o terminal **Git Bash** ou o **WSL**; no WSL: `sudo apt install jq openssl`.
- [ ] Testar: na pasta do projeto, rode `npm run setup` e depois `npm run dev`. Abra <http://localhost:3000> e entre com `admin@demo.orion.app` / `Demo@2026`.

## 2. Banco de dados na nuvem (Supabase)

- [ ] Crie uma conta gratuita em <https://supabase.com/dashboard/sign-up> (pode entrar com o GitHub).
- [ ] No terminal, na pasta do projeto:
  ```bash
  npx supabase login
  ```
  O navegador abre pedindo autorização → clique **Authorize**. Volte ao terminal.
- [ ] Rode:
  ```bash
  npm run deploy:supabase
  ```
  Ele cria o projeto **orion-oficina** em São Paulo, aplica o banco e gera o arquivo `.env.producao`.
  Se aparecer "Há mais de uma organização", copie o código da organização listada e rode
  `SUPABASE_ORG_ID=<código> npm run deploy:supabase`.
- [ ] **Guarde uma cópia do `.env.producao`** num cofre de senhas (1Password, Bitwarden…). Ele tem a senha do banco
  e a chave que protege os CSCs — se perder a `APP_ENCRYPTION_KEY`, os CSCs das lojas terão de ser digitados de novo.
- [ ] Conferir no painel do Supabase (<https://supabase.com/dashboard> › orion-oficina › **Authentication** › **Sign In / Providers**)
  que **"Allow new users to sign up" está desligado**. O script já faz isso; confira uma vez.
- [ ] (Opcional) Em **Authentication › URL Configuration › Site URL**, troque `http://localhost:3000` pelo endereço do
  sistema (passo 3). Hoje o sistema não envia e-mails, então isso só importa no futuro.

## 3. Site no ar (Vercel)

- [ ] Crie uma conta em <https://vercel.com/signup> (plano **Hobby**, gratuito, entrando com o GitHub).
- [ ] No terminal:
  ```bash
  npx vercel login
  ```
  Escolha **Continue with GitHub** e confirme no navegador.
- [ ] Rode:
  ```bash
  npm run deploy:vercel
  ```
  No fim aparece o endereço publicado.
- [ ] Abra <https://vercel.com/dashboard> › **orion-oficina** › **Settings** › **Domains** e veja o endereço de produção
  (ex.: `orion-oficina.vercel.app`). Se for diferente do `NEXT_PUBLIC_APP_URL` que está no `.env.producao`, corrija
  essa linha no arquivo e rode `npm run deploy:vercel` de novo (esse endereço vai nos links do WhatsApp).
- [ ] Para publicar sozinho a cada `git push`: no mesmo projeto, **Settings › Git › Connect Git Repository** → escolha
  `rafaeljarosewski-oss/agente-automotivo`.
- [ ] (Opcional) Domínio próprio (ex.: `sistema.orionautomacao.com.br`): **Settings › Domains › Add** e siga as instruções de DNS
  no seu provedor de domínio. Depois atualize `NEXT_PUBLIC_APP_URL` e rode `npm run deploy:vercel`.
- [ ] Plano: o **Hobby** é só para uso não comercial. Para vender o sistema às lojas, assine o **Pro** (Vercel ›
  Settings › Billing). No Pro dá para rodar a sincronização fiscal pela própria Vercel; no Hobby ela fica no GitHub (passo 4).

## 4. Sincronização fiscal automática (GitHub)

- [ ] No GitHub, abra o repositório › **Settings** › **Secrets and variables** › **Actions** › **New repository secret** e crie:
  - `APP_URL` = endereço do sistema (ex.: `https://orion-oficina.vercel.app`, sem barra no final)
  - `CRON_SECRET` = valor da linha `CRON_SECRET=` do `.env.producao`
- [ ] Teste: aba **Actions** › **Sincronização fiscal** › **Run workflow**. Deve terminar com ✓ verde.

## 5. Emissão fiscal — conta da Órion na ACBr API

A Nuvem Fiscal foi desativada em 31/07/2026; a sucessora oficial é a **ACBr API** (mesma API). Veja `docs/DECISOES.md`, D01.

- [ ] Crie a conta da **Órion** em <https://www.acbr.api.br> (documentação: <https://dev.acbr.api.br>).
  Uma conta atende todas as lojas clientes; cada loja é cadastrada pelo próprio sistema.
- [ ] No painel da ACBr API, gere as **credenciais de API (OAuth2 "client credentials")** do ambiente **sandbox** e copie o
  **Client ID** e o **Client Secret**. *Não consegui abrir o painel daqui para conferir o nome exato dos menus — procure por
  "Credenciais", "Aplicações" ou "API keys".*
- [ ] Coloque no `.env.producao`:
  ```
  FISCAL_PROVIDER=acbr
  FISCAL_CREDENCIAL=sandbox
  FISCAL_CLIENT_ID=<cole aqui>
  FISCAL_CLIENT_SECRET=<cole aqui>
  ```
  e rode `npm run deploy:vercel`. Para testar no seu computador, coloque as mesmas linhas no `.env.local` e reinicie o `npm run dev`.
- [ ] Quando a homologação estiver aprovada: gere as credenciais de **produção**, troque no `.env.producao`
  (`FISCAL_CREDENCIAL=producao` e os novos ID/Secret) e rode `npm run deploy:vercel`.
- [ ] Pergunte ao suporte da ACBr API se eles oferecem **webhook** (aviso automático de autorização). Se sim, cadastre o endereço
  `https://<seu-endereço>/api/fiscal/webhook` e o segredo `FISCAL_WEBHOOK_SECRET` do `.env.producao`, e me envie o formato da
  assinatura que eles usam para eu ajustar (hoje o sistema consulta sozinho, então isso é só uma melhoria).
- [ ] **Responsável técnico** (exigido em algumas SEFAZ na NF-e/NFC-e): preencha no `.env.producao` o CNPJ, e-mail e telefone
  da Órion (`RESP_TECNICO_CNPJ`, `RESP_TECNICO_EMAIL`, `RESP_TECNICO_FONE`) e rode `npm run deploy:vercel`.

## 6. Primeira loja (para cada cliente novo)

- [ ] Cadastrar a loja:
  ```bash
  npm run empresa:nova -- --env .env.producao --cnpj <CNPJ> --admin-nome "<Nome do dono>" --admin-email <email>
  ```
  Envie ao dono o endereço, o e-mail e a **senha temporária** mostrada (ele troca em **Minha conta**).
- [ ] Da loja, você vai precisar de:
  - [ ] **Certificado digital A1** (arquivo `.pfx`) e a senha. O dono envia em **Configurações › Fiscal › Certificado**; o arquivo vai
    direto para a ACBr API e não fica guardado no sistema.
  - [ ] **Logotipo** (PNG ou JPG) — **Configurações › Empresa**.
  - [ ] **Inscrição estadual** (para NFC-e/NF-e) e **inscrição municipal** (para NFS-e).
  - [ ] Tabela de preços de películas e serviços, e a lista de produtos com estoque inicial.

## 7. Com o contador da loja

- [ ] Confirmar que a loja está **credenciada para emitir NFC-e e NF-e na SEFAZ-RS** (ou no estado dela).
- [ ] **CSC da NFC-e** (código de segurança do contribuinte) e o **ID do CSC**: gerado no portal da Receita Estadual com o
  certificado da loja. No RS, o contador costuma fazer isso pelo portal da Receita Estadual (serviços de NFC-e). Informe em
  **Configurações › Fiscal** (campos "ID do CSC" e "Código CSC"). A SEFAZ fornece um CSC para homologação e outro para
  produção: informe o de homologação nos testes e troque pelo de produção ao mudar o ambiente.
- [ ] **Séries e próximo número** de cada nota (se a loja já emitia por outro sistema, continuar a numeração de onde parou).
- [ ] **NFS-e**: confirmar se o município usa o **emissor nacional** (o sistema detecta sozinho em **Configurações › Fiscal ›
  Verificar município**), o **código de tributação** dos serviços (instalação de película, alarme, ar-condicionado…),
  a **alíquota de ISS** e o regime especial, se houver.
- [ ] **Produtos**: validar **NCM**, **CFOP**, **CSOSN/CST** e **origem** de cada produto. Depois de conferido, marque
  **"Dados fiscais validados pelo contador"** no cadastro do produto (o sistema avisa enquanto não estiver marcado).
- [ ] **Reforma tributária (IBS/CBS)**: confirmar se a loja deve destacar IBS/CBS em 2026 e com quais alíquotas e códigos
  (`cClassTrib`). O sistema já tem os campos; deixe **desligado** em **Configurações › Fiscal › Reforma tributária (IBS/CBS)** até o contador confirmar.
- [ ] Emitir uma nota de cada tipo em **homologação**, conferir com o contador e só então mudar o **Ambiente** para **Produção**.

---

### O que já está pronto e não depende de você

Sistema completo da Fase 1, testes automáticos (unitários, isolamento entre lojas e fluxo completo no navegador), dados de
demonstração, scripts de instalação e publicação, cadastro de lojas e esta documentação. Detalhes em `README.md`.
