# 20250528T153000__hikvision-bridge.py
# Memorial: [[20250528T153000__hikvision-bridge_memorial.md]]
"""
Bridge REST micro‑service that links Hikvision facial terminals to the existing
Access‑Control backend.  It offers:

* Background task that keeps an alertStream connection open and persists events
  to PostgreSQL (same schema used by access‑control‑crud.py).
* REST endpoint `/door/open` that triggers the terminal relé via ISAPI.

The script is self‑contained: run with `uvicorn 20250528T153000__hikvision-bridge:app`.
"""

from __future__ import annotations

import asyncio
import logging
import os
import ssl
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import Annotated, Dict, Optional

import httpx
from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel
from requests.auth import HTTPDigestAuth  # type: ignore
from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Integer,
    String,
    Text,
    create_engine,
    Column,
    ForeignKey,
)
from sqlalchemy.orm import Session, declarative_base, sessionmaker

# ------------------------------------------------------------------
# Configuration (env overrides)
# ------------------------------------------------------------------
HIK_IP: str = os.getenv("HIK_IP", "172.30.140.247")
HIK_USER: str = os.getenv("HIK_USER", "api-door")
HIK_PASS: str = os.getenv("HIK_PASS", "Mud@r123")
HIK_PORT: int = int(os.getenv("HIK_PORT", "80"))
HIK_VERIFY_TLS: bool = bool(int(os.getenv("HIK_VERIFY_TLS", "0")))

PULL_MODE: bool = bool(int(os.getenv("HIK_PULL", "1")))  # 1 = pull alertStream
PUSH_SECRET: Optional[str] = os.getenv("HIK_PUSH_SECRET")  # validate push

# PostgreSQL (reuse same DSN as other service)
DB_DSN: str = os.getenv(
    "DB_URL",
    "postgresql+psycopg2://PedroRangel:M1N512qwas@$@localhost:5434/doterra-db",
)

engine = create_engine(DB_DSN, pool_size=5, max_overflow=10, echo=False)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()

# ------------------------------------------------------------------
# ORM fragment (only the table we need: evento_acesso)
# ------------------------------------------------------------------


class EventoAcesso(Base):
    __tablename__ = "evento_acesso"

    id = Column(Integer, primary_key=True, autoincrement=True)
    instante = Column(DateTime, default=datetime.utcnow)
    tag_uid = Column(Integer)  # may be 0 when not RFID
    pessoa_id = Column(String, nullable=True)
    leitor_id = Column(String)  # hik terminal name or "hik1"
    resultado = Column(String, nullable=False)
    motivo = Column(Text, nullable=True)


class Pessoa(Base):
    __tablename__ = "pessoa"

    id = Column(String, primary_key=True)
    tipo = Column(String, nullable=False)
    nome = Column(String, nullable=False)
    documento = Column(String)
    depto = Column(String)
    cargo = Column(String)
    hik_user_id = Column(Integer, unique=True)
    validade_fim = Column(Date)
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow)


class TagRFID(Base):
    __tablename__ = "tag_rfid"

    uid = Column(Integer, primary_key=True)
    pessoa_id = Column(String, ForeignKey("pessoa.id"))
    apelido = Column(String)
    bloqueada = Column(Boolean, default=False)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow)


# ------------------------------------------------------------------
# FastAPI
# ------------------------------------------------------------------
app = FastAPI(title="Hikvision Bridge", version="1.0.0")


def get_session() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ------------------------------------------------------------------
# Health endpoints
# ------------------------------------------------------------------

@app.get("/health/db")
async def health_db() -> Dict[str, str]:
    """Open and close a DB session to confirm connectivity."""
    try:
        with SessionLocal() as db:
            db.execute("SELECT 1")
    except Exception as exc:  # pragma: no cover - simple health check
        logging.error("DB health check failed: %s", exc)
        raise HTTPException(500, "database unavailable")
    return {"status": "ok"}


# ------------------------------------------------------------------
# Door open endpoint
# ------------------------------------------------------------------
class DoorRequest(BaseModel):
    motivo: str = "manual"


@app.post("/door/open", status_code=204)
async def door_open(req: DoorRequest, db: Annotated[Session, Depends(get_session)]):
    """Trigger remote open via ISAPI and log the operation."""
    auth = HTTPDigestAuth(HIK_USER, HIK_PASS)
    url = f"http://{HIK_IP}:{HIK_PORT}/ISAPI/AccessControl/RemoteControl/door/1"
    async with httpx.AsyncClient(auth=auth, verify=HIK_VERIFY_TLS, timeout=5) as cli:
        r = await cli.put(url, content=b"open")
        if r.status_code != 200:
            raise HTTPException(502, "Hikvision did not accept command")

    evt = EventoAcesso(
        tag_uid=0,
        pessoa_id=None,
        leitor_id="hik1",
        resultado="comando",
        motivo=req.motivo,
    )
    db.add(evt)
    db.commit()
    return None


# ------------------------------------------------------------------
# Pessoa & Tag endpoints
# ------------------------------------------------------------------


class PessoaIn(BaseModel):
    tipo: str
    nome: str
    documento: Optional[str] = None
    depto: Optional[str] = None
    cargo: Optional[str] = None
    hik_user_id: Optional[int] = None
    validade_fim: Optional[str] = None
    ativo: bool = True


class PessoaUpdate(BaseModel):
    tipo: Optional[str] = None
    nome: Optional[str] = None
    documento: Optional[str] = None
    depto: Optional[str] = None
    cargo: Optional[str] = None
    hik_user_id: Optional[int] = None
    validade_fim: Optional[str] = None
    ativo: Optional[bool] = None


class TagIn(BaseModel):
    uid: int
    pessoa_id: Optional[str] = None
    bloqueada: bool = False
    apelido: Optional[str] = None


class TagUpdate(BaseModel):
    pessoa_id: Optional[str] = None
    bloqueada: Optional[bool] = None
    apelido: Optional[str] = None


@app.get("/pessoa")
def list_pessoas(db: Annotated[Session, Depends(get_session)]):
    return db.query(Pessoa).order_by(Pessoa.nome).all()


@app.get("/pessoa/{pid}")
def get_pessoa(pid: str, db: Annotated[Session, Depends(get_session)]):
    pessoa = db.get(Pessoa, pid)
    if not pessoa:
        raise HTTPException(404, "Pessoa not found")
    return pessoa


@app.post("/pessoa", status_code=201)
def create_pessoa(data: PessoaIn, db: Annotated[Session, Depends(get_session)]):
    pessoa = Pessoa(**data.dict())
    db.add(pessoa)
    db.commit()
    db.refresh(pessoa)
    return pessoa


@app.patch("/pessoa/{pid}")
def update_pessoa(
    pid: str, data: PessoaUpdate, db: Annotated[Session, Depends(get_session)]
):
    pessoa = db.get(Pessoa, pid)
    if not pessoa:
        raise HTTPException(404, "Pessoa not found")
    for k, v in data.dict(exclude_unset=True).items():
        setattr(pessoa, k, v)
    db.commit()
    db.refresh(pessoa)
    return pessoa


@app.get("/tag")
def list_tags(db: Annotated[Session, Depends(get_session)]):
    return db.query(TagRFID).all()


@app.get("/tag/{uid}")
def get_tag(uid: int, db: Annotated[Session, Depends(get_session)]):
    tag = db.get(TagRFID, uid)
    if not tag:
        raise HTTPException(404, "Tag not found")
    return tag


@app.post("/tag", status_code=201)
def create_tag(data: TagIn, db: Annotated[Session, Depends(get_session)]):
    tag = db.get(TagRFID, data.uid)
    if tag:
        for k, v in data.dict(exclude_unset=True).items():
            setattr(tag, k, v)
    else:
        tag = TagRFID(**data.dict())
        db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@app.patch("/tag/{uid}")
def update_tag(uid: int, data: TagUpdate, db: Annotated[Session, Depends(get_session)]):
    tag = db.get(TagRFID, uid)
    if not tag:
        raise HTTPException(404, "Tag not found")
    for k, v in data.dict(exclude_unset=True).items():
        setattr(tag, k, v)
    db.commit()
    db.refresh(tag)
    return tag


class VerifyRequest(BaseModel):
    uid: int
    leitor_id: str


class VerifyResponse(BaseModel):
    allowed: bool
    pessoa_id: Optional[str] = None
    motivo: str


@app.post("/verify-tag", response_model=VerifyResponse)
def verify_tag(req: VerifyRequest, db: Annotated[Session, Depends(get_session)]):
    tag = db.get(TagRFID, req.uid)
    if not tag:
        return VerifyResponse(allowed=False, motivo="TAG desconhecida")
    if tag.bloqueada:
        return VerifyResponse(
            allowed=False, pessoa_id=tag.pessoa_id, motivo="TAG bloqueada"
        )
    if not tag.pessoa_id:
        return VerifyResponse(allowed=False, motivo="TAG sem pessoa")
    return VerifyResponse(allowed=True, pessoa_id=tag.pessoa_id, motivo="ok")


# ------------------------------------------------------------------
# Background task: alertStream pull (if enabled)
# ------------------------------------------------------------------
async def fanout_event(xml_raw: bytes, db: Session):
    """Parse XML and persist."""
    try:
        root = ET.fromstring(xml_raw)
    except ET.ParseError:
        return  # ignore keep‑alives

    minor = root.findtext(".//Minor")
    major = root.findtext(".//Major")
    ts = root.findtext(".//dateTime")
    desc = root.findtext(".//eventDescription")

    # We only log doorbell / access events (major 5)
    if major != "5":
        return

    evt = EventoAcesso(
        instante=datetime.strptime(ts, "%Y-%m-%dT%H:%M:%S"),
        tag_uid=0,
        pessoa_id=None,
        leitor_id="hik1",
        resultado="evento",
        motivo=f"minor={minor} desc={desc}",
    )
    db.add(evt)
    db.commit()


async def pull_alertstream():
    if not PULL_MODE:
        return

    auth = HTTPDigestAuth(HIK_USER, HIK_PASS)
    boundary = None
    url = f"http://{HIK_IP}:{HIK_PORT}/ISAPI/Event/notification/alertStream"
    while True:
        try:
            async with httpx.AsyncClient(
                auth=auth, verify=HIK_VERIFY_TLS, timeout=None
            ) as cli:
                async with cli.stream("GET", url) as r:
                    ctype = r.headers.get("Content-Type", "")
                    if "boundary=" in ctype:
                        boundary = ctype.split("boundary=")[-1].encode()
                    buffer = b""
                    async for chunk in r.aiter_bytes():
                        buffer += chunk
                        if boundary and boundary in buffer:
                            part, buffer = buffer.split(boundary, 1)
                            async with SessionLocal() as db:
                                await fanout_event(part, db)
        except Exception as exc:
            logging.error("alertStream error: %s", exc)
            await asyncio.sleep(3)


@app.on_event("startup")
async def _startup():
    Base.metadata.create_all(bind=engine)
    logging.basicConfig(level=logging.INFO)

    # launch background task
    asyncio.create_task(pull_alertstream())
