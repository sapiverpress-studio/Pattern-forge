"""Authenticated job broker for physical TexGen -> Blender -> Pillow wool renders.

Requires a dedicated container service (not a Netlify Function). One worker,
limited concurrency and rate ceilings keep GPU/CPU bills bounded. The output
lives on the worker filesystem, so this is a single-instance initial service.
"""
from __future__ import annotations

import hmac
import hashlib
import os
import secrets
import subprocess
import sys
import tempfile
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Request, Header
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, field_validator

ROOT = Path(__file__).resolve().parents[1]
ENGINE = ROOT / "knit-render"
STORE = Path(os.getenv("KNIT_STORAGE_ROOT", "/tmp/sapiver-knits"))
TOKEN = os.getenv("KNIT_RENDER_TOKEN", "")
SIGNER = os.getenv("KNIT_DOWNLOAD_SIGNING_KEY", "")
BLENDER = os.getenv("BLENDER_BIN", "blender")
MAX_JOBS_PER_HOUR = int(os.getenv("KNIT_JOBS_PER_HOUR", "5"))
MAX_RUNNING_OR_QUEUED = int(os.getenv("KNIT_MAX_ACTIVE", "2"))
TIMEOUT_SECONDS = int(os.getenv("KNIT_RENDER_TIMEOUT_SECONDS", "1200"))
TTL_SECONDS = 3600

app = FastAPI(title="Sapiver Textile Renderer", docs_url=None, redoc_url=None, openapi_url=None)
_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="knit-render")
_lock = threading.RLock()
_jobs: dict[str, "Job"] = {}
_history: list[float] = []


class Params(BaseModel):
    style: Literal["stockinette"] = "stockinette"
    gauge: Literal["mega", "super", "chunky"] = "mega"
    colour: str = "#ead7b6"
    yarn_type: Literal["roving", "twisted"] = "roving"
    size: int = Field(default=5000, ge=256, le=5000)
    samples: int = Field(default=12, ge=4, le=64)

    @field_validator("colour")
    @classmethod
    def valid_colour(cls, value: str) -> str:
        if len(value) != 7 or value[0] != "#" or any(c not in "0123456789abcdefABCDEF" for c in value[1:]):
            raise ValueError("colour must be #RRGGBB")
        return value.lower()


@dataclass
class Job:
    id: str
    settings: Params
    status: str = "queued"
    created: float = field(default_factory=time.time)
    updated: float = field(default_factory=time.time)
    file: Path | None = None
    error: str | None = None


def configured() -> bool:
    return len(TOKEN) >= 24 and len(SIGNER) >= 32 and TOKEN != SIGNER


def auth(value: str | None) -> None:
    if not configured():
        raise HTTPException(status_code=503, detail="Renderer credentials not configured")
    if not value or not value.startswith("Bearer ") or not hmac.compare_digest(value[7:], TOKEN):
        raise HTTPException(status_code=401, detail="Unauthorized")


def clean_old(now: float) -> None:
    for jid, job in list(_jobs.items()):
        if job.created + TTL_SECONDS < now and job.status in ("ready", "error"):
            if job.file is not None:
                job.file.unlink(missing_ok=True)
            del _jobs[jid]
    _history[:] = [t for t in _history if now - t < 3600]


def run_checked(argv: list[str], timeout: int, cwd: Path, name: str) -> None:
    log = cwd / f"{name}.log"
    with log.open("wb") as handle:
        completed = subprocess.run(argv, cwd=str(ROOT), stdout=handle, stderr=subprocess.STDOUT,
                                   timeout=timeout, check=False, shell=False)
    if completed.returncode != 0:
        tail = log.read_bytes()[-4000:].decode("utf-8", errors="replace")
        raise RuntimeError(f"{name} failed with exit {completed.returncode}: {tail[-500:]}")


def worker(jid: str) -> None:
    with _lock:
        job = _jobs[jid]
        job.status = "rendering"
        job.updated = time.time()
        settings = job.settings
    output_dir = STORE / jid
    try:
        output_dir.mkdir(parents=True, exist_ok=True)
        tex = output_dir / "texgen.json"
        raw = output_dir / "wool-raw.png"
        final = output_dir / "wool-5000.png"
        wales = {"mega": 6, "super": 10, "chunky": 16}[settings.gauge]
        run_checked([sys.executable, str(ENGINE / "texgen_geometry.py"),
                     "--wales", str(wales), "--courses", str(wales), "--output", str(tex)],
                    120, output_dir, "texgen")
        run_checked([BLENDER, "-b", "-noaudio", "--python-exit-code", "5", "--python",
                     str(ENGINE / "render_blender.py"), "--", "--style", settings.style,
                     "--gauge", settings.gauge, "--yarn-type", settings.yarn_type,
                     "--colour", settings.colour, "--size", str(settings.size),
                     "--samples", str(settings.samples), "--engine", "cycles",
                     "--texgen-json", str(tex), "--output", str(raw)],
                    TIMEOUT_SECONDS, output_dir, "blender")
        run_checked([sys.executable, str(ENGINE / "finish.py"), str(raw), str(final),
                     "--size", str(settings.size)], 90, output_dir, "pillow")
        raw.unlink(missing_ok=True)
        with _lock:
            job.status = "ready"
            job.file = final
            job.updated = time.time()
    except Exception:
        # Internal stack traces and filesystem paths are never returned to
        # public callers. Operators can inspect process logs on the worker.
        with _lock:
            job.status = "error"
            job.error = "Render could not complete. Try a smaller output or contact support."
            job.updated = time.time()


def sign(jid: str, expires: int) -> str:
    payload = f"{jid}.{expires}".encode("ascii")
    return hmac.new(SIGNER.encode(), payload, hashlib.sha256).hexdigest()


@app.get("/v1/health")
def health():
    return {"ok": configured(), "engine": "texgen-blender-pillow", "service": "render-jobs"}


@app.post("/v1/renders", status_code=202)
def create_render(payload: Params, authorization: str | None = Header(default=None)):
    auth(authorization)
    now = time.time()
    with _lock:
        clean_old(now)
        active = sum(j.status in ("queued", "rendering") for j in _jobs.values())
        if active >= MAX_RUNNING_OR_QUEUED or len(_history) >= MAX_JOBS_PER_HOUR:
            raise HTTPException(status_code=429, detail="Render capacity reached; try again later")
        jid = secrets.token_hex(16)
        _jobs[jid] = Job(jid, payload)
        _history.append(now)
        _executor.submit(worker, jid)
    return {"id": jid, "status": "queued"}


@app.get("/v1/renders/{jid}")
def render_status(jid: str, request: Request, authorization: str | None = Header(default=None)):
    auth(authorization)
    with _lock:
        clean_old(time.time())
        job = _jobs.get(jid)
        if not job:
            raise HTTPException(status_code=404, detail="Render not found")
        result = {"id": jid, "status": job.status, "size": job.settings.size,
                  "created": job.created}
        if job.status == "ready":
            expires = int(time.time() + 15 * 60)
            result["download_url"] = str(request.url_for("download_render", jid=jid)) + f"?exp={expires}&sig={sign(jid, expires)}"
        if job.status == "error":
            result["message"] = job.error
    return result


@app.get("/v1/renders/{jid}/download", name="download_render")
def download_render(jid: str, exp: int, sig: str):
    if not configured() or exp < time.time() or exp > time.time() + 3600 or not hmac.compare_digest(sig, sign(jid, exp)):
        raise HTTPException(status_code=403, detail="Invalid or expired link")
    with _lock:
        job = _jobs.get(jid)
        if not job or job.status != "ready" or job.file is None or not job.file.is_file():
            raise HTTPException(status_code=404, detail="Image unavailable")
        target = job.file
        name = f"sapiver-knit-{job.settings.gauge}-{job.settings.size}px-300dpi.png"
    return FileResponse(target, media_type="image/png", filename=name)
