# Pendências que dependem de você

> Tudo aqui precisa de uma conta, de um documento ou de uma decisão sua, do contador ou da loja.
> O sistema já funciona sem nada disto: localmente, com o **emissor fiscal simulado** e os dados de exemplo
> (`npm run setup` → <http://localhost:3000>). Marque `[x]` conforme for resolvendo.
>
> O sistema já está publicado. Falta: segurança (1), decisões de plano (2) e a parte fiscal e das lojas (3 a 5).

---

## ✅ Já feito (11/10/2026)

- [x] Banco na nuvem: Supabase, projeto **orion-oficina** (São Paulo) — <https://supabase.com/dashboard/project/wyfwenwibsrkysguuvjl>.
  Migrações aplicadas, RLS em todas as tabelas, cadastro público desligado.
- [x] Site no ar: **<https://orion-oficina.vercel.app>** (Vercel, time `orion-automacao`).
- [x] Sincronização fiscal a cada 10 minutos agendada dentro do banco (pg_cron) — não precisa de nada no GitHub.
- [x] Testado em produção: login (computador e celular), rotina protegida por segredo e agendamento chamando o site.

## 1. Segurança — faça agora

- [ ] **Guarde o arquivo `.env.producao`** (enviado para você na conversa) num cofre de senhas (1Password, Bitwarden…).
  Ele tem a senha do banco e as chaves do sistema; o ambiente onde ele foi gerado é temporário. Sem a `APP_ENCRYPTION_KEY`
  dele, os CSCs salvos pelas lojas teriam de ser digitados de novo.
- [ ] **Apague os tokens usados na publicação**:
  - Supabase: <https://supabase.com/dashboard/account/tokens> › lixeira em `orion-deploy` e `orion-deploy-2`.
  - Vercel: <https://vercel.com/account/settings/tokens> › lixeira em `orion-deploy`.
- [ ] **Gere novos códigos de recuperação da Vercel** (os antigos foram enviados na conversa):
  Vercel › **Account Settings** › **Authentication** › códigos de recuperação › gerar novos.

## 2. Recomendado antes de vender

- [ ] **Planos pagos**: o Vercel **Hobby** é só para uso não comercial e projetos Supabase **Free** são pausados após
  7 dias sem uso. Ao colocar a primeira loja pagante: Vercel **Pro** (Settings › Billing) e Supabase **Pro**
  (painel › Organization › Billing › Upgrade to Pro).
- [ ] **Publicar sozinho a cada `git push`** (opcional): Vercel › projeto **orion-oficina** › **Settings** › **Git** ›
  **Connect Git Repository** › `rafaeljarosewski-oss/agente-automotivo`. Sem isso, para publicar de novo:
  `SUPABASE_ACCESS_TOKEN=... VERCEL_TOKEN=... VERCEL_SCOPE=orion-automacao npm run publicar` (com o `.env.producao` na pasta).
- [ ] **Domínio próprio** (opcional, ex.: `sistema.orionautomacao.com.br`): Vercel › **Settings** › **Domains** › **Add** e siga as
  instruções de DNS. Depois rode `npm run publicar` de novo (ele detecta o domínio e atualiza os links do WhatsApp).
- [ ] **Rodar no seu computador** (opcional, para desenvolver/demonstrar offline): instale Node.js LTS (<https://nodejs.org>) e
  Docker Desktop, e na pasta do projeto rode `npm run setup` e `npm run dev`.

## 3. Emissão fiscal — conta da Órion na ACBr API

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
  e rode `npm run publicar` (com os tokens, como na seção 2). Para testar no seu computador, coloque as mesmas linhas no `.env.local` e reinicie o `npm run dev`.
- [ ] Quando a homologação estiver aprovada: gere as credenciais de **produção**, troque no `.env.producao`
  (`FISCAL_CREDENCIAL=producao` e os novos ID/Secret) e rode `npm run publicar` (com os tokens, como na seção 2).
- [ ] Pergunte ao suporte da ACBr API se eles oferecem **webhook** (aviso automático de autorização). Se sim, cadastre o endereço
  `https://<seu-endereço>/api/fiscal/webhook` e o segredo `FISCAL_WEBHOOK_SECRET` do `.env.producao`, e me envie o formato da
  assinatura que eles usam para eu ajustar (hoje o sistema consulta sozinho, então isso é só uma melhoria).
- [ ] **Responsável técnico** (exigido em algumas SEFAZ na NF-e/NFC-e): preencha no `.env.producao` o CNPJ, e-mail e telefone
  da Órion (`RESP_TECNICO_CNPJ`, `RESP_TECNICO_EMAIL`, `RESP_TECNICO_FONE`) e rode `npm run publicar` (com os tokens, como na seção 2).

## 4. Primeira loja (para cada cliente novo)

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

## 5. Com o contador da loja

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
