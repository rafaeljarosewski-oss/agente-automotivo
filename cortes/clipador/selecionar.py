"""Escolhe os melhores momentos de cada vídeo-fonte usando o Claude e grava planos/<id>.json.

O plano também pode ser escrito ou ajustado à mão — o editor só lê o JSON.
Formato:
{
  "fonte": "tt_ZSbRpaSCC",
  "cortes": [
    {"id": "tt_ZSbRpaSCC_01", "inicio": 12.3, "fim": 58.0, "nota": 9,
     "gancho": "texto curto que aparece nos 3 primeiros segundos",
     "titulo": "título do Short", "descricao": "1-2 frases", "motivo": "por que prende"}
  ]
}
"""

from pydantic import BaseModel, Field

from .config import PLANOS, campanha, gravar_json, ler_json

MODELO = "claude-opus-5-5"


class Corte(BaseModel):
    inicio: float = Field(description="segundo de início no vídeo-fonte")
    fim: float = Field(description="segundo de fim no vídeo-fonte")
    nota: int = Field(description="1 a 10: potencial de retenção e de engajamento")
    gancho: str = Field(description="frase de impacto de até 8 palavras para os 3 primeiros segundos")
    titulo: str = Field(description="título do Short, até 70 caracteres, sem hashtags")
    descricao: str = Field(description="1 ou 2 frases para a legenda do post, sem hashtags nem @")
    motivo: str = Field(description="por que esse trecho prende e fortalece a imagem do Rafael Cabral")


class Plano(BaseModel):
    cortes: list[Corte]


def _linhas(transcricao: list[dict]) -> str:
    return "\n".join(f"[{s['start']:.1f}-{s['end']:.1f}] {s['text']}" for s in transcricao)


def _prompt(fonte_id: str, transcricao: list[dict], duracao: float) -> str:
    c = campanha()
    proibido = "; ".join(c["proibido"])
    return f"""Você é editor de cortes para Shorts/Reels/TikTok de uma campanha da Clipfy.
Influenciador: {c['influenciador']}. Objetivo da campanha: {c['objetivo']}
Proibido: {proibido}. {c['regra_principal']}
O ranking da campanha é por views × engajamento, então cada corte precisa de um começo que
prenda nos primeiros 2 segundos, uma ideia completa (começo, meio e fim) e um final que gere
comentário ou vontade de rever.

Vídeo-fonte "{fonte_id}" ({duracao:.0f}s). Transcrição com tempos em segundos:
{_linhas(transcricao)}

Escolha até 6 trechos entre 20 e 75 segundos, sem sobreposição, que funcionem sozinhos para
quem nunca viu o vídeo. Prefira histórias, frases fortes sobre carreira e negócios, bastidores,
humor leve e momentos de conquista. Comece cada trecho exatamente no início de uma fala
(nunca no meio de uma frase) e termine no fim de uma frase. Descarte qualquer trecho que
possa enfraquecer a imagem do Rafael Cabral. Se nada servir, devolva a lista vazia.
Escreva gancho, título e descrição em português do Brasil, sem emojis."""


def _alinhar(corte: Corte, transcricao: list[dict]) -> Corte:
    """Encaixa início/fim nas bordas de fala mais próximas da transcrição."""
    if not transcricao:
        return corte
    inicios = [s["start"] for s in transcricao]
    fins = [s["end"] for s in transcricao]
    corte.inicio = min(inicios, key=lambda t: abs(t - corte.inicio))
    corte.fim = min((t for t in fins if t > corte.inicio + 5), key=lambda t: abs(t - corte.fim), default=corte.fim)
    return corte


def planejar(fonte_id: str, transcricao: list[dict], duracao: float, refazer: bool = False) -> dict:
    arq = PLANOS / f"{fonte_id}.json"
    existente = ler_json(arq, None)
    if existente and not refazer:
        return existente
    if not transcricao:
        print(f"- {fonte_id}: sem fala transcrita, nada para planejar automaticamente")
        return {"fonte": fonte_id, "cortes": []}

    import anthropic

    cliente = anthropic.Anthropic()
    print(f"- {fonte_id}: pedindo ao Claude os melhores momentos")
    resposta = cliente.beta.messages.parse(
        model=MODELO,
        max_tokens=16000,
        thinking={"type": "adaptive"},
        output_config={"effort": "high"},
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        messages=[{"role": "user", "content": _prompt(fonte_id, transcricao, duracao)}],
        output_format=Plano,
    )
    if resposta.stop_reason == "refusal" or resposta.parsed_output is None:
        print(f"  ! o modelo não devolveu um plano (stop_reason={resposta.stop_reason})")
        return {"fonte": fonte_id, "cortes": []}

    cortes = sorted((_alinhar(c, transcricao) for c in resposta.parsed_output.cortes), key=lambda c: c.inicio)
    plano = {
        "fonte": fonte_id,
        "cortes": [{"id": f"{fonte_id}_{i:02d}", **c.model_dump()} for i, c in enumerate(cortes, 1)],
    }
    gravar_json(arq, plano)
    print(f"  ok {len(plano['cortes'])} cortes")
    return plano
