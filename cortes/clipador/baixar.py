"""Baixa os vídeos-fonte listados em campanha.json para trabalho/fontes/<id>.mp4.

- TikTok: yt-dlp com impersonação de navegador (precisa do extra curl-cffi).
- YouTube: yt-dlp; em servidores (nuvem/GitHub Actions) o YouTube costuma exigir login,
  então aceita um arquivo de cookies em YT_COOKIES_ARQ (formato Netscape).
- Google Drive (arquivo ou pasta pública): gdown. Cada arquivo de uma pasta vira <id>_NN.mp4.
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

from .config import TEMP, VIDEOS_FONTE, campanha, garantir_pastas


def _yt_dlp(url: str, destino: Path, extra: list[str]) -> bool:
    modelo = str(destino.with_suffix("")) + ".%(ext)s"
    cmd = [
        sys.executable, "-m", "yt_dlp", "--no-playlist", "--no-progress",
        "-f", "bv*[height<=1920]+ba/b", "--merge-output-format", "mp4",
        "-o", modelo, *extra, url,
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0 or not destino.exists():
        erro = (r.stderr or r.stdout).strip().splitlines()
        print(f"  ! falhou: {erro[-1] if erro else 'erro desconhecido'}")
        return False
    return True


def _drive(url: str, fonte_id: str) -> list[Path]:
    import gdown

    pasta = TEMP / f"drive_{fonte_id}"
    shutil.rmtree(pasta, ignore_errors=True)
    pasta.mkdir(parents=True)
    if "/folders/" in url:
        gdown.download_folder(url=url, output=str(pasta), quiet=True)
    else:
        gdown.download(url=url, output=str(pasta) + "/", quiet=True, fuzzy=True)
    videos = sorted(p for p in pasta.rglob("*") if p.suffix.lower() in {".mp4", ".mov", ".m4v", ".webm", ".mkv"})
    saidas = []
    for i, v in enumerate(videos, 1):
        destino = VIDEOS_FONTE / (f"{fonte_id}_{i:02d}.mp4" if len(videos) > 1 or "/folders/" in url else f"{fonte_id}.mp4")
        if v.suffix.lower() == ".mp4":
            shutil.move(v, destino)
        else:
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(v), "-c", "copy", str(destino)], check=True)
        saidas.append(destino)
    shutil.rmtree(pasta, ignore_errors=True)
    return saidas


def baixar_tudo() -> list[Path]:
    """Baixa o que ainda não está em disco e devolve todos os vídeos-fonte disponíveis."""
    garantir_pastas()
    cookies = os.environ.get("YT_COOKIES_ARQ")
    for fonte in campanha()["fontes"]:
        fid, url = fonte["id"], fonte["url"]
        if "drive.google.com" in url:
            if any(VIDEOS_FONTE.glob(f"{fid}*.mp4")):
                continue
            print(f"- {fid}: baixando do Google Drive")
            try:
                for p in _drive(url, fid):
                    print(f"  ok {p.name}")
            except Exception as e:  # pasta privada, cota do Drive etc.
                print(f"  ! falhou: {e}")
            continue

        destino = VIDEOS_FONTE / f"{fid}.mp4"
        if destino.exists():
            continue
        print(f"- {fid}: baixando {url}")
        extra: list[str] = []
        if "tiktok.com" in url:
            extra = ["--impersonate", "chrome"]
        elif "youtu" in url:
            extra = ["--js-runtimes", "node"]
            if cookies:
                extra += ["--cookies", cookies]
        if _yt_dlp(url, destino, extra):
            print(f"  ok {destino.name}")
    return sorted(VIDEOS_FONTE.glob("*.mp4"))
