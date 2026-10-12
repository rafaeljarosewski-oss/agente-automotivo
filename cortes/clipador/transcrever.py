"""Transcrição com marcação de tempo por palavra (faster-whisper), salva em transcricoes/<id>.json.

As transcrições são pequenas e ficam versionadas no git: assim o agendamento diário
não precisa transcrever de novo vídeos que já foram processados.
"""

import json
import os
import subprocess
from pathlib import Path

from .config import TRANSCRICOES

MODELO = os.environ.get("WHISPER_MODELO", "medium")
_modelo = None


def _audio(caminho: Path):
    import numpy as np

    bruto = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(caminho), "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(bruto, np.int16).astype(np.float32) / 32768.0


def transcricao_de(fonte_id: str) -> list[dict] | None:
    arq = TRANSCRICOES / f"{fonte_id}.json"
    return json.loads(arq.read_text(encoding="utf-8")) if arq.exists() else None


def transcrever(video: Path) -> list[dict]:
    global _modelo
    arq = TRANSCRICOES / f"{video.stem}.json"
    if arq.exists():
        return json.loads(arq.read_text(encoding="utf-8"))
    if _modelo is None:
        from faster_whisper import WhisperModel

        _modelo = WhisperModel(MODELO, device="cpu", compute_type="int8")
    print(f"- transcrevendo {video.name} (modelo {MODELO})")
    segmentos, _ = _modelo.transcribe(_audio(video), language="pt", word_timestamps=True, vad_filter=True)
    dados = [
        {
            "start": round(s.start, 2),
            "end": round(s.end, 2),
            "text": s.text.strip(),
            "words": [{"start": round(w.start, 2), "end": round(w.end, 2), "word": w.word.strip()} for w in s.words],
        }
        for s in segmentos
    ]
    TRANSCRICOES.mkdir(parents=True, exist_ok=True)
    arq.write_text(json.dumps(dados, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return dados


def palavras(transcricao: list[dict]) -> list[dict]:
    return [w for s in transcricao for w in s["words"] if w["word"]]
