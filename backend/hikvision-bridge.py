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
from sqlalchemy import DateTime, Integer, String, Text, create_engine, Column, ForeignKey
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

    evt = EventoAcesso(tag_uid=0, pessoa_id=None, leitor_id="hik1", resultado="comando",
                       motivo=req.motivo)
    db.add(evt)
    db.commit()
    return None


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
            async with httpx.AsyncClient(auth=auth, verify=HIK_VERIFY_TLS, timeout=None) as cli:
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
