"""Envio de Shorts pela YouTube Data API v3 (upload resumível).

Credenciais (variáveis de ambiente / segredos do GitHub):
  YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN
O refresh token é gerado uma única vez com `python -m clipador autorizar-youtube`.

Atenção: projetos do Google Cloud não verificados só conseguem publicar vídeos como PRIVADOS.
Para publicar como público é preciso passar pela auditoria da API do YouTube
(https://support.google.com/youtube/contact/yt_api_form).
"""

import json
import os
import secrets
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse

import requests

TOKEN_URL = "https://oauth2.googleapis.com/token"
AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos"
ESCOPOS = "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly"


def configurado() -> bool:
    return all(os.environ.get(k) for k in ("YT_CLIENT_ID", "YT_CLIENT_SECRET", "YT_REFRESH_TOKEN"))


def _token() -> str:
    r = requests.post(TOKEN_URL, data={
        "client_id": os.environ["YT_CLIENT_ID"],
        "client_secret": os.environ["YT_CLIENT_SECRET"],
        "refresh_token": os.environ["YT_REFRESH_TOKEN"],
        "grant_type": "refresh_token",
    }, timeout=30)
    r.raise_for_status()
    return r.json()["access_token"]


def enviar(video: Path, titulo: str, descricao: str, tags: list[str], privacidade: str = "public") -> dict:
    token = _token()
    meta = {
        "snippet": {
            "title": titulo[:100],
            "description": descricao[:5000],
            "tags": tags,
            "categoryId": "24",  # Entretenimento
            "defaultLanguage": "pt-BR",
            "defaultAudioLanguage": "pt-BR",
        },
        "status": {"privacyStatus": privacidade, "selfDeclaredMadeForKids": False, "embeddable": True},
    }
    inicio = requests.post(
        UPLOAD_URL,
        params={"uploadType": "resumable", "part": "snippet,status"},
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Type": "video/mp4",
            "X-Upload-Content-Length": str(video.stat().st_size),
        },
        data=json.dumps(meta),
        timeout=60,
    )
    inicio.raise_for_status()
    with video.open("rb") as f:
        r = requests.put(inicio.headers["Location"], data=f,
                         headers={"Authorization": f"Bearer {token}", "Content-Type": "video/mp4"}, timeout=1800)
    r.raise_for_status()
    dados = r.json()
    status = dados.get("status", {})
    return {
        "id": dados["id"],
        "url": f"https://www.youtube.com/shorts/{dados['id']}",
        "privacidade": status.get("privacyStatus"),
    }


def autorizar(client_secret_json: Path, porta: int = 8765) -> None:
    """Fluxo OAuth no navegador (rodar no seu computador, logado na conta do canal)."""
    cfg = json.loads(client_secret_json.read_text())
    cfg = cfg.get("installed") or cfg.get("web")
    redirect = f"http://127.0.0.1:{porta}/"
    estado = secrets.token_urlsafe(16)
    url = AUTH_URL + "?" + urlencode({
        "client_id": cfg["client_id"], "redirect_uri": redirect, "response_type": "code",
        "scope": ESCOPOS, "access_type": "offline", "prompt": "consent", "state": estado,
    })
    recebido: dict = {}

    class Retorno(BaseHTTPRequestHandler):
        def do_GET(self):  # noqa: N802
            q = parse_qs(urlparse(self.path).query)
            recebido.update({k: v[0] for k, v in q.items()})
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write("Autorizado. Pode fechar esta aba e voltar ao terminal.".encode())

        def log_message(self, *_):
            pass

    print("Abra este link no navegador e entre com a conta do canal cortou.bombou:\n" + url)
    webbrowser.open(url)
    servidor = HTTPServer(("127.0.0.1", porta), Retorno)
    while "code" not in recebido and "error" not in recebido:
        servidor.handle_request()
    if recebido.get("state") != estado or "code" not in recebido:
        raise SystemExit(f"Autorização falhou: {recebido.get('error', 'state inválido')}")
    r = requests.post(TOKEN_URL, data={
        "code": recebido["code"], "client_id": cfg["client_id"], "client_secret": cfg["client_secret"],
        "redirect_uri": redirect, "grant_type": "authorization_code",
    }, timeout=30)
    r.raise_for_status()
    tok = r.json()
    if "refresh_token" not in tok:
        raise SystemExit("O Google não devolveu refresh_token. Revogue o acesso em myaccount.google.com/permissions e tente de novo.")
    print("\nCadastre estes 3 segredos no GitHub (Settings → Secrets and variables → Actions):")
    print(f"YT_CLIENT_ID={cfg['client_id']}")
    print(f"YT_CLIENT_SECRET={cfg['client_secret']}")
    print(f"YT_REFRESH_TOKEN={tok['refresh_token']}")
