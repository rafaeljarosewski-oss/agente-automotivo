# Postar os cortes pelo Brave (passo a passo detalhado)

O Claude Code roda no seu computador e controla o seu Brave, que já está logado nas redes.
O comando se chama `claude --chrome` e a extensão se chama "Claude in Chrome", mas são só
nomes: funcionam no Brave, que é feito sobre o Chrome. A documentação oficial lista o Brave como
compatível.

Os passos abaixo são para Windows. No Mac, troque "PowerShell" por "Terminal" e use os comandos
indicados como "(Mac)".

---

## PARTE 1: preparar o Brave (uma vez só, uns 5 minutos)

### 1.1 Conferir a extensão do Claude
1. Abra o Brave.
2. Na barra de endereço, digite `brave://extensions` e aperte Enter.
3. Procure o card **Claude**. A chavinha no canto de baixo do card tem que estar **ligada (azul)**.
4. Ainda nesse card, clique em **Detalhes** e confira **Versão: 1.0.36 ou maior**.
   - Se for menor: ligue o **Modo do desenvolvedor** (chave no canto superior direito) e
     clique em **Atualizar**.
5. Clique no ícone de quebra-cabeça (🧩) à direita da barra de endereço e no **alfinete** ao lado
   de "Claude", para o ícone do Claude ficar sempre visível.
6. Clique no ícone do Claude e confira se está logado com o **mesmo e-mail** que você usa no
   claude.ai.

### 1.2 Deixar as contas logadas no Brave
Abra cada link numa aba e confira se já entra logado. Se pedir login, faça agora.
1. `https://studio.youtube.com`: clique na sua foto (canto superior direito) → **Trocar de
   conta** → escolha o canal **cortou.bombou**. O nome do canal tem que aparecer no menu da
   esquerda.
2. `https://www.tiktok.com/upload`: tem que abrir a tela "Carregar vídeo", sem pedir login.
3. `https://www.instagram.com`: tem que abrir o feed, sem pedir login.
4. Site da Clipfy: entre na campanha **Rafael Cabral - Outubro** e veja se o botão
   **+ Enviar Post** aparece.

---

## PARTE 2: preparar a pasta com os vídeos (uma vez só)

1. Abra o **Explorador de Arquivos** e entre em **Documentos**.
2. Clique com o botão direito → **Novo** → **Pasta** e dê o nome **cortes-rafael**.
3. Baixe para dentro dessa pasta os **14 vídeos .mp4** que o Claude mandou no chat (versão
   "para postar", cada um com menos de 10 MB) e o arquivo **ROTEIRO_DE_POSTAGEM.md**.
4. No fim, a pasta tem 15 arquivos, por exemplo:
   ```
   Documentos\cortes-rafael\
     ROTEIRO_DE_POSTAGEM.md
     tt_ZSbRpaSCC_01.mp4
     tt_ZSbRpmkQw_01.mp4
     ... (14 vídeos)
   ```
   Não renomeie os vídeos: o roteiro usa esses nomes.

---

## PARTE 3: instalar o Claude Code (pule se já usa no canal do Rombo)

1. Aperte a tecla **Windows**, digite **PowerShell** e abra o **Windows PowerShell**.
2. Cole e aperte Enter:
   ```
   irm https://claude.ai/install.ps1 | iex
   ```
   (Mac) `curl -fsSL https://claude.ai/install.sh | bash`
3. Feche o PowerShell e abra de novo.
4. Digite `claude --version` e aperte Enter. Tem que aparecer um número de versão.
   - Se já tinha instalado: rode `claude update` para atualizar.

---

## PARTE 4: postar (sempre que for postar)

### 4.1 Abrir o Claude Code na pasta dos vídeos
1. Deixe o **Brave aberto** (pode ser minimizado).
2. Abra o **PowerShell**.
3. Entre na pasta (cole e aperte Enter):
   ```
   cd "$HOME\Documents\cortes-rafael"
   ```
   (Mac) `cd ~/Documents/cortes-rafael`
4. Inicie o Claude com acesso ao navegador:
   ```
   claude --chrome
   ```
5. Se perguntar **"Do you trust the files in this folder?"**, escolha **Yes**.
6. Na primeira vez aparece uma tela explicando a integração com o navegador: aperte **Enter**.
7. Se pedir login, digite `/login`, aperte Enter e entre com a conta do claude.ai (a mesma da
   extensão). Não use chave de API: com ela a integração com o navegador não liga.

### 4.2 Conferir a conexão com o Brave
1. Digite `/chrome` e aperte Enter.
2. Tem que aparecer:
   - **Status: Enabled**
   - **Extension: Installed**
3. Se aparecer **Select browser…**, entre nele e escolha **Brave**.
4. Escolha **Enabled by default**, para não precisar digitar `--chrome` nas próximas vezes.
5. Aperte **Esc** para sair do menu.

**Se der "Not detected" ou "Not connected":**
- Feche o Brave por completo (inclusive o ícone perto do relógio) e abra de novo. Na primeira vez
  isso é obrigatório: o Brave só enxerga o Claude Code depois de reiniciar.
- Volte ao PowerShell, digite `/chrome` → **Reconnect extension**.
- Ainda não foi? Em `brave://extensions`, desligue e ligue a extensão Claude e repita o
  `/chrome` → **Reconnect extension**.

### 4.3 Mandar postar
Cole este texto no Claude e aperte Enter:

```
Leia ROTEIRO_DE_POSTAGEM.md e publicados.txt nesta pasta (se publicados.txt não existir, nada
foi postado ainda). Pegue os próximos 2 cortes do roteiro que ainda não estão em publicados.txt
e, para cada um, usando o arquivo <id>.mp4 desta pasta, poste pelo meu navegador:

1. YouTube (studio.youtube.com, canal cortou.bombou): Criar → Enviar vídeos → selecione o
   arquivo. Título e descrição exatamente como no roteiro. Público-alvo: "Não, não é conteúdo
   para crianças". Avance até Visibilidade e marque Pública → Publicar.
2. TikTok (tiktok.com/upload): selecione o arquivo, legenda exatamente como no roteiro (começa
   com @rafael_cabral.mj), "Quem pode ver": Todos, comentários permitidos → Publicar.
3. Instagram (instagram.com → Criar → Post): selecione o arquivo, mantenha 9:16, legenda
   exatamente como no roteiro (começa com @rafael_cabral @mclivao @priscilacarolynneofc) → Compartilhar.

Regras: a marcação (@) tem que ser a primeira coisa da legenda; não mude hashtags; não oculte
curtidas.
Depois de cada post, copie o link e envie na Clipfy (campanha "Rafael Cabral - Outubro" →
Enviar Post → plataforma certa → cole o link).
No fim, acrescente em publicados.txt uma linha por corte com: id, data e hora, link do YouTube,
link do TikTok, link do Instagram. Me mostre um resumo.
```

### 4.4 Enquanto ele trabalha
- Vai aparecer **"Claude in Chrome wants to…"** no PowerShell. Escolha a opção de **permitir
  esse site durante a sessão** (aparece uma vez para YouTube, TikTok, Instagram e Clipfy).
- O Brave abre um grupo de abas novas e você vê o Claude clicando e preenchendo. Não mexa
  nessas abas enquanto ele trabalha.
- Se aparecer login, código por SMS ou CAPTCHA, o Claude para e avisa. Resolva no Brave e
  digite **continua** no PowerShell.
- Se uma janela de alerta do site travar a página, feche o alerta e digite **continua**.

### 4.5 Ao terminar
- Confira os links no resumo e no arquivo `publicados.txt`.
- Para sair do Claude: digite `/exit`.

---

## Rotina diária
- Os envios até as **20h** contam no ranking do dia. Rode o 4.1 e o 4.3 uma vez por dia, de
  preferência de manhã ou no começo da tarde.
- São 2 cortes por dia: os 14 cortes rendem 7 dias. Quando acabarem, peça novos cortes ao Claude
  com conteúdo novo do Rafael.
