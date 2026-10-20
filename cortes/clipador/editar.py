"""Renderiza um corte vertical 1080x1920 pronto para Shorts/Reels/TikTok.

Edição pensada para retenção:
- cortes secos nas pausas (silêncios longos são removidos);
- "punch-in": o zoom alterna a cada 2–5 s, simulando troca de câmera;
- legenda grande palavra a palavra, com a palavra falada em amarelo;
- gancho em destaque nos 3 primeiros segundos;
- barra de progresso no rodapé;
- áudio normalizado em -14 LUFS (padrão das plataformas) e música opcional com ducking.
Vídeo horizontal vira vertical com fundo desfocado do próprio vídeo.
"""

import json
import os
import re
import subprocess
from pathlib import Path

from .config import ALTURA, FONTES_TTF, FPS, LARGURA, TEMP
from .transcrever import palavras

PAUSA_MAX = 0.45  # silêncio acima disso vira corte seco
FOLGA_ANTES, FOLGA_DEPOIS = 0.08, 0.15
TOMADA_MAX = 4.5  # duração máxima de uma "tomada" antes de trocar o zoom
ZOOMS = [1.0, 1.14, 1.05, 1.2]
AMARELO = "&H0000D4FF&"  # ASS usa BGR: FFD400
# palavrões são silenciados no áudio e mascarados na legenda (imagem positiva da marca)
PALAVROES = {"porra", "caralho", "merda", "foda", "fodas", "foder", "fudeu", "fodeu", "puta", "putaria",
             "bosta", "cacete", "desgraça", "arrombado", "viado", "buceta", "piroca", "cu"}


def _probe(video: Path) -> tuple[int, int, float]:
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
         "stream=width,height:stream_side_data=rotation:format=duration", "-of", "json", str(video)],
        capture_output=True, text=True, check=True,
    )
    d = json.loads(r.stdout)
    s = d["streams"][0]
    w, h = s["width"], s["height"]
    rot = next((abs(int(sd.get("rotation", 0))) for sd in s.get("side_data_list", []) if "rotation" in sd), 0)
    if rot in (90, 270):
        w, h = h, w
    return w, h, float(d["format"]["duration"])


# ---------------------------------------------------------------- linha do tempo

def _tomadas(ini: float, fim: float, ws: list[dict]) -> list[tuple[float, float]]:
    """Trechos de fala dentro de [ini, fim], já sem as pausas longas e quebrados em tomadas curtas."""
    # o trecho manda em quais palavras entram; a tomada cobre a palavra inteira,
    # sem invadir a palavra vizinha que ficou de fora
    todas = ws
    ws = [w for w in todas if _no_trecho(w, ini, fim)]
    if not ws:  # sem fala (só música): mantém tudo, mas troca o zoom a cada TOMADA_MAX
        n = max(1, round((fim - ini) / TOMADA_MAX))
        passo = (fim - ini) / n
        return [(ini + i * passo, ini + (i + 1) * passo) for i in range(n)]
    blocos: list[list[dict]] = [[ws[0]]]
    for w in ws[1:]:
        if w["start"] - blocos[-1][-1]["end"] > PAUSA_MAX:
            blocos.append([w])
        else:
            blocos[-1].append(w)

    tomadas: list[tuple[float, float]] = []
    for b in blocos:
        a = max(0.0, b[0]["start"] - FOLGA_ANTES)
        z = b[-1]["end"] + FOLGA_DEPOIS
        antes = [w["end"] for w in todas if w["end"] <= b[0]["start"] and not _no_trecho(w, ini, fim)]
        depois = [w["start"] for w in todas if w["start"] >= b[-1]["end"] and not _no_trecho(w, ini, fim)]
        if antes:
            a = max(a, min(b[0]["start"], max(antes) + 0.02))
        if depois:
            z = min(z, max(b[-1]["end"], min(depois) - 0.02))
        # quebra blocos longos na maior pausa disponível perto de TOMADA_MAX
        inicio_atual = a
        for i in range(1, len(b)):
            if b[i]["start"] - inicio_atual >= TOMADA_MAX:
                corte = (b[i - 1]["end"] + b[i]["start"]) / 2
                if corte - inicio_atual > 1.2:
                    tomadas.append((inicio_atual, corte))
                    inicio_atual = corte
        tomadas.append((inicio_atual, z))

    # tomadas vizinhas podem se encostar (troca de zoom), mas nunca se sobrepor
    for i in range(1, len(tomadas)):
        a, z = tomadas[i]
        tomadas[i] = (max(a, tomadas[i - 1][1]), z)
    return [(a, z) for a, z in tomadas if z - a > 0.2]


def _no_trecho(w: dict, ini: float, fim: float) -> bool:
    return ini - 0.15 <= w["start"] < fim


def _mapear(t: float, tomadas: list[tuple[float, float]]) -> float | None:
    """Converte um tempo do vídeo-fonte para o tempo do corte final (None se caiu numa pausa removida)."""
    acumulado = 0.0
    for a, z in tomadas:
        if a <= t <= z:
            return acumulado + (t - a)
        acumulado += z - a
    return None


# ---------------------------------------------------------------- legendas (ASS)

def _ts(t: float) -> str:
    t = max(0.0, t)
    h, resto = divmod(t, 3600)
    m, s = divmod(resto, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def _palavrao(palavra: str) -> bool:
    return re.sub(r"[^\wà-ú]", "", palavra.lower()) in PALAVROES


def _limpar(palavra: str) -> str:
    p = re.sub(r"[\"“”,;:…]", "", palavra).strip()
    p = re.sub(r"\.+$", "", p)
    if _palavrao(p):
        p = p[0] + "*" * (len(p) - 1)
    return p.upper()


def _quebrar(texto: str, max_chars: int) -> str:
    linhas, atual = [], ""
    for p in texto.split():
        if atual and len(atual) + 1 + len(p) > max_chars:
            linhas.append(atual)
            atual = p
        else:
            atual = f"{atual} {p}".strip()
    linhas.append(atual)
    return r"\N".join(linhas)


def _ass(gancho: str, rotulo: str, duracao: float, ws_mapeadas: list[dict],
         selo: str = "", textos: list[dict] | None = None) -> str:
    cab = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {LARGURA}
PlayResY: {ALTURA}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Legenda,Anton,118,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,0,0,0,0,100,100,1,0,1,7,4,5,60,60,0,1
Style: Gancho,Anton,96,&H00101010,&H00FFFFFF,&H0000D4FF,&H00000000,0,0,0,0,100,100,1,0,3,22,0,8,70,70,250,1
Style: Rotulo,Anton,48,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,0,0,0,0,100,100,3,0,1,3,2,8,60,60,120,1
Style: Selo,Anton,58,&H00FFFFFF,&H00FFFFFF,&H002A1FE0,&H00000000,0,0,0,0,100,100,4,0,3,14,0,8,70,70,120,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev: list[str] = []
    fim_gancho = min(3.2, duracao)
    if gancho:
        txt = _quebrar(gancho.upper(), 16)
        ev.append(
            f"Dialogue: 2,{_ts(0)},{_ts(fim_gancho)},Gancho,,0,0,0,,"
            r"{\fscx70\fscy70\t(0,120,\fscx104\fscy104)\t(120,200,\fscx100\fscy100)\fad(0,180)}" + txt
        )
    if selo:  # tarja vermelha de notícia ("URGENTE", "EXCLUSIVO") junto com o gancho
        ev.append(f"Dialogue: 3,{_ts(0)},{_ts(fim_gancho)},Selo,,0,0,0,,{{\\fad(0,180)}}{selo.upper()}")
    # cartelas de texto ao longo do vídeo (estilo notícia), tempos no vídeo final
    for t in textos or []:
        txt = _quebrar(t["texto"].upper(), 16)
        ev.append(f"Dialogue: 2,{_ts(t['de'])},{_ts(min(t['ate'], duracao))},Gancho,,0,0,0,,"
                  r"{\fscx80\fscy80\t(0,110,\fscx100\fscy100)\fad(0,150)}" + txt)
    if rotulo:
        ocupado = [(0.0, fim_gancho if gancho else 0.0)] + [(t["de"], t["ate"]) for t in textos or []]
        livre_desde = 0.0
        for a, z in sorted(ocupado) + [(duracao, duracao)]:
            if a - livre_desde > 0.5:
                ev.append(f"Dialogue: 1,{_ts(livre_desde)},{_ts(a)},Rotulo,,0,0,0,,{{\\fad(250,0)}}{rotulo.upper()}")
            livre_desde = max(livre_desde, z)

    # agrupa em blocos de até 3 palavras / 18 caracteres, quebrando nas pausas e pontuação
    blocos: list[list[dict]] = []
    for w in ws_mapeadas:
        txt = _limpar(w["word"])
        if not txt:
            continue
        w = {**w, "txt": txt}
        if not blocos:
            blocos.append([w])
            continue
        b = blocos[-1]
        chars = sum(len(x["txt"]) + 1 for x in b) + len(txt)
        quebra = len(b) >= 3 or chars > 16 or w["start"] - b[-1]["end"] > 0.35 or re.search(r"[.?!]$", b[-1]["word"])
        if quebra:
            blocos.append([w])
        else:
            b.append(w)

    y = int(ALTURA * 0.66)
    for i, b in enumerate(blocos):
        fim_bloco = b[-1]["end"] + 0.1
        if i + 1 < len(blocos):
            fim_bloco = min(fim_bloco + 0.4, blocos[i + 1][0]["start"])
        for j, w in enumerate(b):
            ini = w["start"]
            fim = b[j + 1]["start"] if j + 1 < len(b) else fim_bloco
            if fim <= ini:
                continue
            partes = [(r"{\c" + AMARELO + r"}" + x["txt"] + r"{\c&H00FFFFFF&}") if k == j else x["txt"] for k, x in enumerate(b)]
            anim = r"\fscx82\fscy82\t(0,90,\fscx100\fscy100)" if j == 0 else ""
            ev.append(f"Dialogue: 0,{_ts(ini)},{_ts(fim)},Legenda,,0,0,0,,{{\\pos({LARGURA // 2},{y}){anim}}}" + " ".join(partes))
    return cab + "\n".join(ev) + "\n"


# ---------------------------------------------------------------- ffmpeg

def _esc_filtro(caminho: Path) -> str:
    return str(caminho).replace("\\", "/").replace(":", r"\:").replace("'", r"\'")


def renderizar(video: Path, transcricao: list[dict], corte: dict, saida: Path,
               rotulo: str = "Rafael Cabral", musica: Path | None = None, volume_musica: float = 0.10) -> Path:
    w, h, dur_fonte = _probe(video)
    # um corte pode juntar vários trechos do mesmo vídeo ("trechos": [[a, b], [c, d]])
    trechos = corte.get("trechos") or [[corte["inicio"], corte["fim"]]]
    trechos = [(max(0.0, float(a)), min(dur_fonte, float(b))) for a, b in trechos]
    tomadas = [t for a, b in trechos for t in _tomadas(a, b, palavras(transcricao))]
    for i in range(1, len(tomadas)):  # trechos colados não podem repetir imagem
        tomadas[i] = (max(tomadas[i][0], tomadas[i - 1][1]), tomadas[i][1])
    tomadas = [(a, min(z, dur_fonte)) for a, z in tomadas if min(z, dur_fonte) - a > 0.2]
    ini, fim = tomadas[0][0], max(z for _, z in tomadas)
    duracao = sum(z - a for a, z in tomadas)

    ws_map = []
    for wd in palavras(transcricao):
        if not any(_no_trecho(wd, a, b) for a, b in trechos):
            continue
        a = _mapear(wd["start"], tomadas)
        if a is None:
            continue
        z = _mapear(wd["end"], tomadas)
        z = z if z is not None and z > a else a + min(wd["end"] - wd["start"], 0.5)
        ws_map.append({**wd, "start": a, "end": z})

    mudos = [(w["start"] - 0.03, w["end"] + 0.03) for w in ws_map if _palavrao(w["word"])]

    TEMP.mkdir(parents=True, exist_ok=True)
    ass = TEMP / f"{corte['id']}.ass"
    ass.write_text(_ass(corte.get("gancho", ""), rotulo, duracao, ws_map,
                        selo=corte.get("selo", ""), textos=corte.get("textos")), encoding="utf-8")

    # O vídeo de entrada começa em `ini` (seek na entrada), então os tempos ficam relativos.
    n = len(tomadas)
    vertical = h / w >= 1.5
    partes = [f"[0:v]split={n}" + "".join(f"[s{i}]" for i in range(n)) if n > 1 else "[0:v]null[s0]",
              f"[0:a]asplit={n}" + "".join(f"[r{i}]" for i in range(n)) if n > 1 else "[0:a]anull[r0]"]
    for i, (a, z) in enumerate(tomadas):
        ra, rz = a - ini, z - ini
        zoom = ZOOMS[i % len(ZOOMS)]
        base = f"[s{i}]trim={ra:.3f}:{rz:.3f},setpts=PTS-STARTPTS,fps={FPS}"
        if vertical:
            sw, sh = int(LARGURA * zoom) // 2 * 2, int(ALTURA * zoom) // 2 * 2
            partes.append(
                f"{base},scale={sw}:{sh}:force_original_aspect_ratio=increase,"
                f"crop={LARGURA}:{ALTURA}:(iw-{LARGURA})/2:(ih-{ALTURA})*0.4,setsar=1[v{i}]"
            )
        else:
            fg_w = int(LARGURA * 1.3 * zoom) // 2 * 2
            partes.append(f"{base},split[bg{i}][fg{i}]")
            partes.append(
                f"[bg{i}]scale={LARGURA}:{ALTURA}:force_original_aspect_ratio=increase,crop={LARGURA}:{ALTURA},"
                f"gblur=sigma=30,eq=brightness=-0.12[bgb{i}]"
            )
            partes.append(f"[fg{i}]scale={fg_w}:-2,crop={LARGURA}:ih[fgc{i}]")
            partes.append(f"[bgb{i}][fgc{i}]overlay=0:(H-h)/2,setsar=1[v{i}]")
        dur = rz - ra
        # fade curto só onde houve corte de verdade (evita estalo sem "furar" áudio contínuo)
        fades = ""
        if i == 0 or abs(tomadas[i - 1][1] - a) > 1e-3:
            fades += ",afade=t=in:d=0.02"
        if i == n - 1 or abs(tomadas[i + 1][0] - z) > 1e-3:
            fades += f",afade=t=out:st={max(0.0, dur - 0.03):.3f}:d=0.03"
        partes.append(f"[r{i}]atrim={ra:.3f}:{rz:.3f},asetpts=PTS-STARTPTS{fades}[a{i}]")
    partes.append("".join(f"[v{i}][a{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=1[vc][acr]")
    silencio = "".join(f",volume=enable='between(t,{a:.2f},{z:.2f})':volume=0" for a, z in mudos)
    partes.append(f"[acr]anull{silencio}[ac]")

    # fotos de apoio (B-roll) por cima do vídeo, com zoom lento; tempos no vídeo final
    entradas_extra: list[str] = []
    prox_entrada = 2 if musica else 1
    atual = "vc"
    for k, b in enumerate(corte.get("broll") or []):
        de, ate = float(b["de"]), min(float(b["ate"]), duracao)
        img = video.parent / b["imagem"]
        entradas_extra += ["-loop", "1", "-framerate", str(FPS), "-t", f"{ate - de + 0.1:.3f}", "-i", str(img)]
        sw, sh = int(LARGURA * 1.1) // 2 * 2, int(ALTURA * 1.1) // 2 * 2
        partes.append(
            f"[{prox_entrada}:v]scale={sw}:{sh}:force_original_aspect_ratio=increase,crop={sw}:{sh},"
            f"zoompan=z='1+0.0012*on':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={LARGURA}x{ALTURA}:fps={FPS},"
            f"setsar=1,format=yuv420p,setpts=PTS-STARTPTS+{de:.3f}/TB[br{k}]"
        )
        partes.append(f"[{atual}][br{k}]overlay=enable='between(t,{de:.3f},{ate:.3f})':eof_action=pass[vb{k}]")
        atual = f"vb{k}"
        prox_entrada += 1

    fontes = _esc_filtro(FONTES_TTF)
    partes.append(f"[{atual}]ass='{_esc_filtro(ass)}':fontsdir='{fontes}'[vl]")
    partes.append(f"color=c=0xFFD400:s={LARGURA}x12:r={FPS}[barra]")
    partes.append(f"[vl][barra]overlay=x='-w+w*t/{duracao:.3f}':y=H-h:shortest=1,format=yuv420p[vout]")

    entradas = ["-ss", f"{ini:.3f}", "-t", f"{fim - ini + 0.5:.3f}", "-i", str(video)]
    if musica:
        entradas += ["-stream_loop", "-1", "-i", str(musica)]
        partes.append("[ac]asplit[voz][chave]")
        partes.append(f"[1:a]volume={volume_musica},aformat=channel_layouts=stereo[mus]")
        partes.append("[mus][chave]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=400[musd]")
        partes.append("[voz][musd]amix=inputs=2:duration=first:normalize=0[amix]")
        partes.append("[amix]loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[aout]")
    else:
        partes.append("[ac]loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[aout]")

    entradas += entradas_extra
    saida.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg", "-v", "error", "-y", *entradas,
        "-filter_complex", ";".join(partes),
        "-map", "[vout]", "-map", "[aout]", "-t", f"{duracao:.3f}",
        "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-profile:v", "high", "-r", str(FPS),
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", str(saida),
    ]
    subprocess.run(cmd, check=True)
    return saida


def versao_para_postar(entrada: Path, saida: Path, limite_mb: float = 9.5) -> Path:
    """Cópia com menos de 10 MB: é o máximo que a extensão do navegador consegue enviar por upload."""
    if entrada.stat().st_size <= limite_mb * 1024 * 1024:
        saida.parent.mkdir(parents=True, exist_ok=True)
        saida.write_bytes(entrada.read_bytes())
        return saida
    dur = _probe(entrada)[2]
    audio_k = 128
    video_k = int(limite_mb * 8 * 1024 * 0.97 / dur) - audio_k
    escala = [] if video_k >= 2500 else ["-vf", "scale=720:1280:flags=lanczos"]
    log = str(TEMP / f"{saida.stem}_2pass")
    comum = ["-c:v", "libx264", "-preset", "slow", "-b:v", f"{video_k}k", *escala, "-passlogfile", log]
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(entrada), *comum, "-pass", "1", "-an", "-f", "mp4", os.devnull], check=True)
    saida.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(entrada), *comum, "-pass", "2",
                    "-c:a", "aac", "-b:a", f"{audio_k}k", "-movflags", "+faststart", str(saida)], check=True)
    return saida
