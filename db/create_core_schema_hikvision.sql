/* ================================================================
   SCRIPT ÚNICO — CRIA ESQUEMA COMPLETO (RFID + HIKVISION)
   Basta colar no psql, tudo será criado em uma única transação.
   ================================================================ */
BEGIN;

/* ──────────────── Extensões ──────────────── */
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

/* ──────────────── Função gatilho updated_at ──────────────── */
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    NEW.atualizado_em := NOW();
    RETURN NEW;
END;
$$;

/* ──────────────── Função para criar partição mensal ──────────────── */
CREATE OR REPLACE FUNCTION create_event_partition(p_year INT, p_month INT)
RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
    start_ts  TIMESTAMPTZ := make_timestamptz(p_year, p_month, 1, 0, 0, 0);
    end_ts    TIMESTAMPTZ := start_ts + INTERVAL '1 month';
    part_name TEXT        := format('evento_acesso_%s_%s',
                                    p_year, lpad(p_month::TEXT, 2, '0'));
BEGIN
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF evento_acesso
         FOR VALUES FROM (%L) TO (%L);',
        part_name, start_ts, end_ts
    );
END;
$$;

/* ──────────────── Função LGPD ──────────────── */
CREATE OR REPLACE FUNCTION lgpd_pseudonimizar()
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE pessoa
       SET nome          = 'REMOVIDO LGPD',
           documento     = NULL,
           depto         = NULL,
           cargo         = NULL,
           ativo         = FALSE,
           atualizado_em = NOW()
     WHERE atualizado_em < NOW() - INTERVAL '2 years'
       AND ativo;
END;
$$;

/* ──────────────── ENUMs ──────────────── */
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pessoa_tipo')
    THEN CREATE TYPE pessoa_tipo AS ENUM ('funcionario','visitante'); END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leitor_direcao')
    THEN CREATE TYPE leitor_direcao AS ENUM ('entrada','saida'); END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'evento_direcao')
    THEN CREATE TYPE evento_direcao AS ENUM ('entrada','saida'); END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'evento_result')
    THEN CREATE TYPE evento_result AS ENUM ('permitido','negado'); END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'evento_tipo')
    THEN CREATE TYPE evento_tipo AS ENUM ('rfid','face','doorbell','manual','outro'); END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'comando_status')
    THEN CREATE TYPE comando_status AS ENUM ('enviado','executado','falhou'); END IF;
END;
$$;

/* ──────────────── Tabelas cadastrais ──────────────── */
CREATE TABLE IF NOT EXISTS pessoa (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo          pessoa_tipo NOT NULL,
    nome          TEXT NOT NULL,
    documento     TEXT,
    depto         TEXT,
    cargo         TEXT,
    hik_user_id   BIGINT UNIQUE,
    validade_fim  DATE,
    ativo         BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_pessoa_updated
BEFORE UPDATE ON pessoa
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TABLE IF NOT EXISTS tag_rfid (
    uid           BIGINT PRIMARY KEY,
    pessoa_id     UUID REFERENCES pessoa(id) ON DELETE SET NULL,
    apelido       TEXT,
    bloqueada     BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_tag_updated
BEFORE UPDATE ON tag_rfid
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TABLE IF NOT EXISTS leitor (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome          TEXT NOT NULL,
    direcao       leitor_direcao NOT NULL,
    ip            INET,
    fabricante    TEXT DEFAULT 'Hikvision',
    modelo        TEXT,
    localizacao   TEXT,
    ativo         BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_leitor_updated
BEFORE UPDATE ON leitor
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TABLE IF NOT EXISTS usuario_sistema (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    login         TEXT UNIQUE NOT NULL,
    nome          TEXT,
    senha_hash    TEXT NOT NULL,
    role          TEXT CHECK (role IN ('admin','operador')),
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_user_updated
BEFORE UPDATE ON usuario_sistema
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

/* ──────────────── Tabela de eventos (particionada) ──────────────── */
CREATE TABLE IF NOT EXISTS evento_acesso (
    id             BIGSERIAL,
    instante       TIMESTAMPTZ NOT NULL,
    tag_uid        BIGINT REFERENCES tag_rfid(uid),
    pessoa_id      UUID  REFERENCES pessoa(id),
    leitor_id      UUID  REFERENCES leitor(id),
    direcao        evento_direcao,
    resultado      evento_result,
    evento_tipo    evento_tipo,
    hik_major      SMALLINT,
    hik_minor      SMALLINT,
    hik_event_desc TEXT,
    motivo         TEXT,
    payload_raw    JSONB,
    PRIMARY KEY (instante, id)
) PARTITION BY RANGE (instante);

CREATE TABLE IF NOT EXISTS evento_acesso_default
    PARTITION OF evento_acesso DEFAULT;

CREATE INDEX IF NOT EXISTS evento_acesso_tag_idx  ON evento_acesso(tag_uid);
CREATE INDEX IF NOT EXISTS evento_acesso_pess_idx ON evento_acesso(pessoa_id);

/* cria partição do mês corrente */
SELECT create_event_partition(date_part('year', NOW())::INT,
                              date_part('month', NOW())::INT);

/* ──────────────── Log de comandos manuais ──────────────── */
CREATE TABLE IF NOT EXISTS comando_porta (
    id            BIGSERIAL PRIMARY KEY,
    instante_req  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    instante_ack  TIMESTAMPTZ,
    leitor_id     UUID REFERENCES leitor(id),
    usuario_id    UUID REFERENCES usuario_sistema(id),
    status        comando_status,
    detalhes      TEXT
);

/* ──────────────── View anonimizada ──────────────── */
CREATE OR REPLACE VIEW v_evento_acesso_anon AS
SELECT id,
       instante,
       tag_uid,
       leitor_id,
       direcao,
       resultado,
       evento_tipo,
       motivo
FROM evento_acesso;

COMMIT;
