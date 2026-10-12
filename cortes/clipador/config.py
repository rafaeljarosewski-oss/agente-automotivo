"""Caminhos e leitura da configuração da campanha."""

import json
import os
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CAMPANHA_ARQ = RAIZ / "campanha.json"
FONTES_TTF = RAIZ / "fontes"
PLANOS = RAIZ / "planos"
TRANSCRICOES = RAIZ / "transcricoes"
ESTADO = RAIZ / "estado" / "publicados.json"

# Tudo que é pesado (vídeos baixados e renderizados) fica fora do git.
TRABALHO = Path(os.environ.get("CORTES_TRABALHO", RAIZ / "trabalho"))
VIDEOS_FONTE = TRABALHO / "fontes"
RENDERIZADOS = TRABALHO / "renderizados"
TEMP = TRABALHO / "tmp"

LARGURA, ALTURA, FPS = 1080, 1920, 30


def campanha() -> dict:
    return json.loads(CAMPANHA_ARQ.read_text(encoding="utf-8"))


def garantir_pastas() -> None:
    for p in (PLANOS, TRANSCRICOES, ESTADO.parent, VIDEOS_FONTE, RENDERIZADOS, TEMP):
        p.mkdir(parents=True, exist_ok=True)


def ler_json(caminho: Path, padrao):
    if caminho.exists():
        return json.loads(caminho.read_text(encoding="utf-8"))
    return padrao


def gravar_json(caminho: Path, dados) -> None:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_text(json.dumps(dados, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
