# Cortes Clipfy — Rafael Cabral

Pipeline que transforma os conteúdos oficiais da campanha em Shorts/Reels/TikToks editados
para retenção e publica no canal **cortou.bombou**.

```
fontes (TikTok, Drive, YouTube) → transcrição por palavra → Claude escolhe os melhores momentos
→ edição vertical 1080x1920 → legenda de cada rede (regras da campanha) → upload no YouTube
```

## O que a edição faz

- Corta os silêncios (cortes secos) e alterna o zoom a cada 2–5 s, como troca de câmera.
- Legenda grande palavra a palavra, com a palavra falada em amarelo.
- Gancho em destaque nos 3 primeiros segundos e o nome "RAFAEL CABRAL" no topo.
- Barra de progresso no rodapé, áudio normalizado em -14 LUFS.
- Palavrões são silenciados e mascarados na legenda (a regra principal é fortalecer a imagem).
- Vídeo horizontal vira vertical com fundo desfocado.
- Música de fundo opcional com ducking (`renderizar(..., musica=Path("faixa.mp3"))`).

## Regras da campanha aplicadas automaticamente

Ficam em `campanha.json` (período, hashtags, @ por rede, temas proibidos):

- A marcação é a **primeira coisa** da legenda e só vai o @ da rede em que o vídeo foi postado
  (Instagram `@rafael_cabral`, TikTok `@rafael_cabral4`). No YouTube ele não tem perfil, então a
  legenda começa pelas hashtags `#rafaelcabralcy #mjmusiccy`, que também vão no título.
- Fora do período da campanha nada é publicado.
- O agendamento posta antes das 20h de Brasília (11:47 e 17:47).

## Uso local

```bash
cd cortes
pip install -r requirements.txt          # precisa de ffmpeg instalado
python -m clipador baixar
python -m clipador transcrever
python -m clipador planejar              # precisa de ANTHROPIC_API_KEY
python -m clipador renderizar            # vídeos + legendas em trabalho/renderizados/
python -m clipador publicar -n 1         # precisa dos segredos do YouTube
```

Os planos ficam em `planos/<fonte>.json` e podem ser editados à mão (trocar gancho, título,
ajustar tempos, juntar trechos com `"trechos": [[a, b], [c, d]]` ou marcar `"descartado": true`).
Para adicionar conteúdo novo, acrescente a URL em `campanha.json → fontes`.

## Ligar a publicação automática no YouTube (uma vez só)

1. No [Google Cloud Console](https://console.cloud.google.com/) crie um projeto, ative a
   **YouTube Data API v3** e configure a tela de consentimento OAuth (tipo "Externo", adicione o
   e-mail do canal como usuário de teste).
2. Em *Credenciais → Criar credenciais → ID do cliente OAuth → App para computador*, baixe o
   `client_secret.json`.
3. No seu computador: `python -m clipador autorizar-youtube client_secret.json` e entre com a
   conta Google dona do canal **cortou.bombou**. O comando imprime 3 valores.
4. No GitHub: *Settings → Secrets and variables → Actions* e cadastre `YT_CLIENT_ID`,
   `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN` (e `ANTHROPIC_API_KEY` para planejar fontes novas
   sozinho).
5. Pronto: o workflow **Cortes Clipfy** publica 2 cortes por dia. Dá para disparar na mão em
   *Actions → Cortes Clipfy → Run workflow*.

**Importante:** enquanto o projeto do Google Cloud não passa pela
[auditoria da API do YouTube](https://support.google.com/youtube/contact/yt_api_form), o YouTube
trava como **privado** todo vídeo enviado pela API. Peça a auditoria logo (é gratuita e leva de
alguns dias a algumas semanas). Até lá, os vídeos de `trabalho/renderizados/` podem ser postados à
mão — o `.txt` ao lado de cada vídeo já traz título e legenda de cada rede.

Fontes do YouTube: servidores em nuvem são bloqueados pelo YouTube ("confirme que não é um robô").
Para baixá-las no GitHub Actions, exporte os cookies do navegador logado (extensão
"Get cookies.txt LOCALLY") e cadastre o conteúdo no segredo `YT_COOKIES`.

## Postar pelo navegador (sem API)

Veja [POSTAR_PELO_NAVEGADOR.md](POSTAR_PELO_NAVEGADOR.md): Brave + extensão do Claude, posta nas 3
redes sem chaves nem auditoria. O `renderizar` também gera cópias com menos de 10 MB em
`trabalho/postar/` (limite de upload pelo navegador).

## TikTok e Instagram pela API

Os cortes e as legendas já saem prontos para as duas redes. A publicação automática exige:

- **TikTok:** app aprovado na Content Posting API (sem a auditoria do TikTok os posts saem só como
  privados).
- **Instagram:** conta Profissional ligada a uma Página do Facebook e um app da Meta com a
  permissão `instagram_content_publish`.

Depois que as contas existirem e os apps forem aprovados, dá para ligar essas redes no mesmo
agendamento.
