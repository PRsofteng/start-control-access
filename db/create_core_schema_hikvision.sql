-- 20250528T161500__create_core_schema_hikvision.sql
-- Memorial: [[20250528T161500__create_core_schema_hikvision_memorial.md]]

/* ------------------------------------------------------------------
EXTENSÕES
------------------------------------------------------------------ */
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

/* ------------------------------------------------------------------
FUNÇÃO-GATILHO: timestamp de atualização
------------------------------------------------------------------ */
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS BEGINNEW.atualizadoem:=NOW();RETURNNEW;ENDBEGINNEW.atualizadoe​m:=NOW();RETURNNEW;END;

/* ------------------------------------------------------------------
PARTIÇÃO AUTOMÁTICA – eventos mensais
------------------------------------------------------------------ */
CREATE OR REPLACE FUNCTION create_event_partition(p_year integer, p_month integer)
RETURNS void LANGUAGE plpgsql AS DECLAREstarttstimestamptz:=maketimestamptz(pyear,pmonth,1,0,0,0);endtstimestamptz:=(startts+INTERVAL′1month′);partnametext:=format(′eventoacessoBEGINEXECUTEformat(′CREATETABLEIFNOTEXISTSFORVALUESFROM(partname,startts,endts);ENDDECLAREstartt​stimestamptz:=maket​imestamptz(py​ear,pm​onth,1,0,0,0);endt​stimestamptz:=(startt​s+INTERVAL′1month′);partn​ametext:=format(′eventoa​cessoB​EGINEXECUTEformat(′CREATETABLEIFNOTEXISTSFORVALUESFROM(partn​ame,startt​s,endt​s);END;

/* ------------------------------------------------------------------
LIMPEZA LGPD – pseudonimização após 2 anos de inatividade
------------------------------------------------------------------ */
CREATE OR REPLACE FUNCTION lgpd_pseudonimizar()
RETURNS void LANGUAGE plpgsql AS BEGINUPDATEpessoaSETnome=′REMOVIDOLGPD′,documento=NULL,depto=NULL,cargo=NULL,ativo=FALSE,atualizadoem=NOW()WHEREatualizadoem<NOW()−INTERVAL′2years′ANDativoISTRUE;ENDBEGINUPDATEpessoaSETnome=′REMOVIDOLGPD′,documento=NULL,depto=NULL,cargo=NULL,ativo=FALSE,atualizadoe​m=NOW()WHEREatualizadoe​m<NOW()−INTERVAL′2years′ANDativoISTRUE;END;

/* ------------------------------------------------------------------
ENUMS
------------------------------------------------------------------ */
DO BEGINIFNOTEXISTS(SELECT1FROMpgtypeWHEREtypname=′pessoatipo′)THENCREATETYPEpessoatipoASENUM(′funcionario′,′visitante′);ENDIF;IFNOTEXISTS(SELECT1FROMpgtypeWHEREtypname=′leitordirecao′)THENCREATETYPEleitordirecaoASENUM(′entrada′,′saida′);ENDIF;IFNOTEXISTS(SELECT1FROMpgtypeWHEREtypname=′eventodirecao′)THENCREATETYPEeventodirecaoASENUM(′entrada′,′saida′);ENDIF;IFNOTEXISTS(SELECT1FROMpgtypeWHEREtypname=′eventoresult′)THENCREATETYPEeventoresultASENUM(′permitido′,′negado′);ENDIF;IFNOTEXISTS(SELECT1FROMpgtypeWHEREtypname=′eventotipo′)THENCREATETYPEeventotipoASENUM(′rfid′,′face′,′doorbell′,′manual′,′outro′);ENDIF;IFNOTEXISTS(SELECT1FROMpgtypeWHEREtypname=′comandostatus′)THENCREATETYPEcomandostatusASENUM(′enviado′,′executado′,′falhou′);ENDIF;ENDBEGINIFNOTEXISTS(SELECT1FROMpgt​ypeWHEREtypname=′pessoat​ipo′)THENCREATETYPEpessoat​ipoASENUM(′funcionario′,′visitante′);ENDIF;IFNOTEXISTS(SELECT1FROMpgt​ypeWHEREtypname=′leitord​irecao′)THENCREATETYPEleitord​irecaoASENUM(′entrada′,′saida′);ENDIF;IFNOTEXISTS(SELECT1FROMpgt​ypeWHEREtypname=′eventod​irecao′)THENCREATETYPEeventod​irecaoASENUM(′entrada′,′saida′);ENDIF;IFNOTEXISTS(SELECT1FROMpgt​ypeWHEREtypname=′eventor​esult′)THENCREATETYPEeventor​esultASENUM(′permitido′,′negado′);ENDIF;IFNOTEXISTS(SELECT1FROMpgt​ypeWHEREtypname=′eventot​ipo′)THENCREATETYPEeventot​ipoASENUM(′rfid′,′face′,′doorbell′,′manual′,′outro′);ENDIF;IFNOTEXISTS(SELECT1FROMpgt​ypeWHEREtypname=′comandos​tatus′)THENCREATETYPEcomandos​tatusASENUM(′enviado′,′executado′,′falhou′);ENDIF;END;

/* ------------------------------------------------------------------
TABELAS CADASTRAIS
------------------------------------------------------------------ */
CREATE TABLE pessoa (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
tipo pessoa_tipo NOT NULL,
nome TEXT NOT NULL,
documento TEXT,
depto TEXT,
cargo TEXT,
hik_user_id BIGINT UNIQUE,
validade_fim DATE,
ativo BOOLEAN NOT NULL DEFAULT TRUE,
criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_pessoa_updated
BEFORE UPDATE ON pessoa
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TABLE tag_rfid (
uid BIGINT PRIMARY KEY,
pessoa_id UUID REFERENCES pessoa(id) ON DELETE SET NULL,
apelido TEXT,
bloqueada BOOLEAN NOT NULL DEFAULT FALSE,
criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_tag_updated
BEFORE UPDATE ON tag_rfid
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TABLE leitor (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
nome TEXT NOT NULL,
direcao leitor_direcao NOT NULL,
ip INET,
fabricante TEXT DEFAULT 'Hikvision',
modelo TEXT,
localizacao TEXT,
ativo BOOLEAN NOT NULL DEFAULT TRUE,
criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_leitor_updated
BEFORE UPDATE ON leitor
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TABLE usuario_sistema (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
login TEXT UNIQUE NOT NULL,
nome TEXT,
senha_hash TEXT NOT NULL,
role TEXT CHECK (role IN ('admin','operador')),
criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_user_updated
BEFORE UPDATE ON usuario_sistema
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

/* ------------------------------------------------------------------
TABELA DE EVENTOS (particionada mensalmente)
------------------------------------------------------------------ */
CREATE TABLE evento_acesso (
id BIGSERIAL PRIMARY KEY,
instante TIMESTAMPTZ NOT NULL,
tag_uid BIGINT REFERENCES tag_rfid(uid),
pessoa_id UUID REFERENCES pessoa(id),
leitor_id UUID REFERENCES leitor(id),
direcao evento_direcao,
resultado evento_result,
evento_tipo evento_tipo,
hik_major SMALLINT,
hik_minor SMALLINT,
hik_event_desc TEXT,
motivo TEXT,
payload_raw JSONB
) PARTITION BY RANGE (instante);

CREATE TABLE evento_acesso_default
PARTITION OF evento_acesso DEFAULT;

CREATE INDEX evento_acesso_tag_idx ON evento_acesso(tag_uid);
CREATE INDEX evento_acesso_pess_idx ON evento_acesso(pessoa_id);

/* Cria partição do mês corrente */
SELECT create_event_partition(date_part('year', NOW())::int,
date_part('month', NOW())::int);

/* ------------------------------------------------------------------
LOG DE COMANDOS MANUAIS
------------------------------------------------------------------ */
CREATE TABLE comando_porta (
id BIGSERIAL PRIMARY KEY,
instante_req TIMESTAMPTZ NOT NULL DEFAULT NOW(),
instante_ack TIMESTAMPTZ,
leitor_id UUID REFERENCES leitor(id),
usuario_id UUID REFERENCES usuario_sistema(id),
status comando_status,
detalhes TEXT
);

/* ------------------------------------------------------------------
VIEW ANONIMIZADA PARA RELATÓRIOS PÚBLICOS
------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------
EXEMPLO DE AGENDAMENTO DO JOB LGPD (pg_cron)
------------------------------------------------------------------ */
-- SELECT cron.schedule('0 3 1 * *', CALLlgpdpseudonimizar();CALLlgpdp​seudonimizar(););
-- Para usar pg_cron é necessário instalar a extensão no cluster.

/* ------------------------------------------------------------------
FIM DO SCRIPT
------------------------------------------------------------------ */