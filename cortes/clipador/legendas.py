"""Textos de cada plataforma seguindo as regras da campanha.

Regra da Clipfy: a marcação (@) precisa ser a PRIMEIRA coisa da legenda e só vale o @ da rede
onde o vídeo foi publicado. O Rafael Cabral não tem perfil no YouTube, então lá a legenda começa
direto pelas hashtags obrigatórias.
"""

from .config import campanha


def _hashtags() -> str:
    return " ".join(campanha()["hashtags"])


def legenda(plataforma: str, corte: dict) -> str:
    mencao = campanha()["mencoes"].get(plataforma)
    corpo = corte.get("descricao") or corte.get("titulo", "")
    inicio = f"{mencao} " if mencao else ""
    return f"{inicio}{_hashtags()} {corpo}".strip()


def youtube(corte: dict) -> dict:
    tags = _hashtags()
    titulo = corte.get("titulo") or corte.get("gancho") or campanha()["influenciador"]
    limite = 100 - len(tags) - 1
    if len(titulo) > limite:
        titulo = titulo[: limite - 1].rstrip() + "…"
    descricao = f"{tags}\n\n{corte.get('descricao', '')}\n\n#shorts"
    return {
        "titulo": f"{titulo} {tags}",
        "descricao": descricao.strip(),
        "tags": ["Rafael Cabral", "rafaelcabralcy", "mjmusiccy", "shorts"],
    }


def todas(corte: dict) -> dict:
    return {
        "youtube": youtube(corte),
        "tiktok": legenda("tiktok", corte),
        "instagram": legenda("instagram", corte),
    }
