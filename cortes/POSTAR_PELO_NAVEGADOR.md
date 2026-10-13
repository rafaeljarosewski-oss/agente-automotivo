# Postar os cortes pelo navegador (Brave + extensão do Claude)

É o mesmo esquema do canal do Rombo: o Claude Code roda **no seu computador** e controla o
**seu Brave**, que já está logado no YouTube, TikTok e Instagram. Não precisa de API, chave nem
auditoria, e o vídeo sai público na hora.

## Uma vez só (preparação)

1. **Brave logado nas contas certas**
   - YouTube: entre em <https://studio.youtube.com> e confira se o canal selecionado é o
     **cortou.bombou** (foto do perfil → *Trocar de conta*).
   - TikTok: <https://www.tiktok.com/upload> abrindo logado na conta onde vai postar.
   - Instagram: <https://www.instagram.com> logado na conta onde vai postar.
   - Clipfy: logado na campanha "Rafael Cabral - Outubro".

2. **Extensão do Claude no Brave**
   - Em `brave://extensions` confirme que a extensão **Claude** está instalada e **ativada**
     (versão 1.0.36 ou mais nova).
   - Abra a extensão e confira se está logada na **mesma conta e organização** do Claude Code.

3. **Claude Code atualizado e logado**
   - No terminal (PowerShell no Windows, Terminal no Mac): `claude --version`. Se estiver antigo,
     atualize com `claude update`.
   - Se você usa chave de API no Claude Code, a integração com o navegador não liga. Entre com
     `/login` usando a conta do claude.ai.

4. **Projeto no seu computador**
   - Se ainda não tem a pasta:
     ```
     git clone https://github.com/rafaeljarosewski-oss/agente-automotivo.git
     cd agente-automotivo
     ```
   - Pegue o código dos cortes:
     ```
     git fetch origin claude/vigilant-euler-63gtd9
     git checkout claude/vigilant-euler-63gtd9
     ```

5. **Vídeos na pasta certa**
   - Crie a pasta `cortes/trabalho/postar/` e salve nela os vídeos `.mp4` "para postar" que o
     Claude te mandou (todos com menos de 10 MB, que é o limite de upload pelo navegador).
   - Alternativa: peça ao Claude na sessão local "instala ffmpeg e Python e roda
     `python -m clipador baixar` e `python -m clipador renderizar` dentro de `cortes/`", e ele
     gera tudo de novo no seu computador.

## Toda vez que for postar

1. Deixe o **Brave aberto**.
2. No terminal, dentro da pasta `agente-automotivo`, rode:
   ```
   claude --chrome
   ```
   Na primeira vez aparece uma tela explicando a integração: aperte **Enter**.
3. Digite `/chrome` e confira **Status: Enabled** e **Extension: Installed**. Se tiver mais de
   um navegador, escolha **Select browser… → Brave**.
   - Se aparecer "Not detected": feche e abra o Brave de novo (na primeira vez ele precisa
     reiniciar para enxergar o Claude Code) e rode `/chrome` → **Reconnect extension**.
   - Para não precisar do `--chrome` toda vez: `/chrome` → **Enabled by default**.
4. Cole o prompt abaixo.
5. Quando aparecer **"Claude in Chrome wants to…"**, aprove e marque para permitir aquele site
   durante a sessão (YouTube, TikTok, Instagram e Clipfy).
6. Se algum site pedir login, código ou CAPTCHA, o Claude para e te chama: resolva no Brave e
   diga "continua".

## Prompt para colar

```
Leia cortes/ROTEIRO_DE_POSTAGEM.md e cortes/estado/publicados.json (se não existir, nada foi
postado ainda).
Pegue os próximos 2 cortes do roteiro que ainda não estão em publicados.json e, para cada um,
usando o vídeo de cortes/trabalho/postar/<id>.mp4, poste pelo meu navegador:

1. YouTube (studio.youtube.com, canal cortou.bombou): Criar → Enviar vídeos. Título e descrição
   exatamente como no roteiro. "Não, não é conteúdo para crianças". Visibilidade: Pública.
2. TikTok (tiktok.com/upload): legenda exatamente como no roteiro, começando por @rafael_cabral4.
   Comentários permitidos. Público.
3. Instagram (instagram.com → Criar → Post, sai como Reel): legenda exatamente como no roteiro,
   começando por @rafael_cabral. Compartilhar.

Regras: a marcação (@) tem que ser a primeira coisa da legenda; não mude as hashtags; poste antes
das 20h de Brasília; não deixe curtidas ocultas.
Depois de cada post, copie o link e envie na Clipfy (campanha "Rafael Cabral - Outubro" → Enviar
Post). Ao final, registre em cortes/estado/publicados.json o id do corte, a data e os 3 links, e
me mostre um resumo.
```

## Dicas

- O ranking da Clipfy é diário e considera envios até as 20h: 2 cortes por dia rende mais do
  que postar todos de uma vez.
- Para rodar todo dia sem você digitar: deixe o computador ligado com o Brave aberto e use as
  tarefas agendadas do app Claude Desktop ou da extensão, com o mesmo prompt.
