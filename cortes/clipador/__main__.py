"""Pipeline de cortes da campanha Clipfy.

  python -m clipador baixar                 # baixa as fontes de campanha.json
  python -m clipador transcrever            # transcreve o que ainda não tem transcrição
  python -m clipador planejar [--refazer]   # Claude escolhe os melhores momentos (planos/*.json)
  python -m clipador renderizar [ids...]    # gera os vídeos + legendas em trabalho/renderizados
  python -m clipador publicar [-n 1]        # envia o próximo corte inédito ao YouTube
  python -m clipador diario                 # tudo acima, em sequência (usado no agendamento)
  python -m clipador autorizar-youtube client_secret.json
"""

import argparse
import datetime as dt
import json
import os
import sys
from pathlib import Path
from zoneinfo import ZoneInfo

from . import legendas, youtube
from .config import ESTADO, PLANOS, RENDERIZADOS, VIDEOS_FONTE, campanha, garantir_pastas, gravar_json, ler_json

FUSO = ZoneInfo("America/Sao_Paulo")


def _fontes() -> list[Path]:
    return sorted(VIDEOS_FONTE.glob("*.mp4"))


def _duracao(video: Path) -> float:
    from .editar import _probe

    return _probe(video)[2]


def cmd_baixar(_):
    from .baixar import baixar_tudo

    for v in baixar_tudo():
        print(f"  disponível: {v.name}")


def cmd_transcrever(_):
    from .transcrever import transcrever

    for v in _fontes():
        transcrever(v)


def cmd_planejar(args):
    from .selecionar import planejar
    from .transcrever import transcricao_de

    if not os.environ.get("ANTHROPIC_API_KEY"):
        faltando = [v.stem for v in _fontes() if not (PLANOS / f"{v.stem}.json").exists()]
        if faltando:
            print(f"- ANTHROPIC_API_KEY ausente; sem plano automático para: {', '.join(faltando)}")
        return
    for v in _fontes():
        transcricao = transcricao_de(v.stem)
        if transcricao is None:
            print(f"- {v.stem}: transcreva antes de planejar")
            continue
        planejar(v.stem, transcricao, _duracao(v), refazer=args.refazer)


def _todos_cortes() -> list[dict]:
    cortes = []
    for arq in sorted(PLANOS.glob("*.json")):
        plano = json.loads(arq.read_text(encoding="utf-8"))
        for c in plano.get("cortes", []):
            if not c.get("descartado"):
                cortes.append({**c, "fonte": plano["fonte"]})
    return cortes


def _renderizar(corte: dict) -> Path:
    from .editar import renderizar
    from .transcrever import transcricao_de

    saida = RENDERIZADOS / f"{corte['id']}.mp4"
    if not saida.exists():
        print(f"- renderizando {corte['id']}")
        renderizar(VIDEOS_FONTE / f"{corte['fonte']}.mp4", transcricao_de(corte["fonte"]) or [], corte, saida,
                   rotulo=campanha()["influenciador"])
    textos = legendas.todas(corte)
    (RENDERIZADOS / f"{corte['id']}.txt").write_text(
        f"YOUTUBE — título:\n{textos['youtube']['titulo']}\n\nYOUTUBE — descrição:\n{textos['youtube']['descricao']}\n\n"
        f"TIKTOK:\n{textos['tiktok']}\n\nINSTAGRAM:\n{textos['instagram']}\n",
        encoding="utf-8",
    )
    return saida


def cmd_renderizar(args):
    cortes = _todos_cortes()
    if args.ids:
        cortes = [c for c in cortes if c["id"] in args.ids]
    for c in cortes:
        if not (VIDEOS_FONTE / f"{c['fonte']}.mp4").exists():
            print(f"- {c['id']}: vídeo-fonte {c['fonte']} não baixado, pulando")
            continue
        print(f"  ok {_renderizar(c)}")


def cmd_publicar(args):
    c = campanha()
    hoje = dt.datetime.now(FUSO).date()
    if not (dt.date.fromisoformat(c["periodo"]["inicio"]) <= hoje <= dt.date.fromisoformat(c["periodo"]["fim"])):
        print(f"- fora do período da campanha ({c['periodo']['inicio']} a {c['periodo']['fim']}), nada publicado")
        return
    if not youtube.configurado():
        print("- segredos do YouTube (YT_CLIENT_ID/YT_CLIENT_SECRET/YT_REFRESH_TOKEN) não configurados")
        return
    estado = ler_json(ESTADO, {})
    feitos = estado.setdefault("youtube", {})
    fila = [k for k in _todos_cortes() if k["id"] not in feitos and (VIDEOS_FONTE / f"{k['fonte']}.mp4").exists()]
    fila.sort(key=lambda k: -k.get("nota", 0))
    if not fila:
        print("- nenhum corte inédito na fila")
        return
    for corte in fila[: args.n]:
        video = _renderizar(corte)
        meta = legendas.youtube(corte)
        r = youtube.enviar(video, meta["titulo"], meta["descricao"], meta["tags"], args.privacidade)
        feitos[corte["id"]] = {**r, "titulo": meta["titulo"], "publicado_em": dt.datetime.now(FUSO).isoformat(timespec="minutes")}
        gravar_json(ESTADO, estado)
        print(f"  publicado {corte['id']}: {r['url']} ({r['privacidade']})")
        if r["privacidade"] != args.privacidade:
            print("  ! o YouTube travou o vídeo como privado: o projeto da API ainda não passou pela auditoria")


def cmd_diario(args):
    cmd_baixar(args)
    cmd_transcrever(args)
    args.refazer = False
    cmd_planejar(args)
    cmd_publicar(args)


def cmd_autorizar(args):
    youtube.autorizar(Path(args.client_secret))


def main():
    p = argparse.ArgumentParser(prog="clipador", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("baixar").set_defaults(f=cmd_baixar)
    sub.add_parser("transcrever").set_defaults(f=cmd_transcrever)
    sp = sub.add_parser("planejar")
    sp.add_argument("--refazer", action="store_true", help="pede um plano novo mesmo se já existir")
    sp.set_defaults(f=cmd_planejar)
    sr = sub.add_parser("renderizar")
    sr.add_argument("ids", nargs="*")
    sr.set_defaults(f=cmd_renderizar)
    for nome, func in (("publicar", cmd_publicar), ("diario", cmd_diario)):
        s = sub.add_parser(nome)
        s.add_argument("-n", type=int, default=1, help="quantos cortes publicar nesta execução")
        s.add_argument("--privacidade", default="public", choices=["public", "unlisted", "private"])
        s.set_defaults(f=func)
    sa = sub.add_parser("autorizar-youtube")
    sa.add_argument("client_secret")
    sa.set_defaults(f=cmd_autorizar)
    args = p.parse_args()
    garantir_pastas()
    args.f(args)


if __name__ == "__main__":
    sys.exit(main())
