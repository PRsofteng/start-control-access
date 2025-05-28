---
title: 20250528T161500\_\_create\_core\_schema\_hikvision\_memorial
linked\_script: 20250528T161500\_\_create\_core\_schema\_hikvision.sql
created: 2025-05-28T16:20:00-03:00
tags: \[memorial, PostgreSQL, access-control]
---------------------------------------------

## Introdução

Este memorial descreve **bloco a bloco** o script `create_core_schema_hikvision.sql`, que cria um banco de dados do zero para um sistema de controle de acesso híbrido (RFID + terminais faciais Hikvision). Mantém compatibilidade com a arquitetura antiga baseada em ESP32, ampliando colunas/ENUMs e particionamento para suportar eventos `FACE`, `DOORBELL` e comandos manuais.

---

## 0 · Extensões

| Extensão    | Finalidade                                                                                                                  |
| ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| `uuid-ossp` | Gera UUIDs (`gen_random_uuid()`), eliminando colisão de chaves primárias entre ambientes.                                   |
| `pgcrypto`  | Disponibiliza funções criptográficas para hash seguro de senhas (`usuario_sistema.senha_hash`) e geração de tokens futuros. |

---

## 1 · Funções utilitárias

### 1.1 `trg_set_updated_at()`

`BEFORE UPDATE` · Preenche `atualizado_em` em cada modificação, garantindo trilha de auditoria automática.

### 1.2 `create_event_partition(p_year, p_month)`

Cria dinamicamente partições mensais de `evento_acesso`.

* Calcula intervalo `[início do mês, início + 1 mês)`.
* Executa `CREATE TABLE … PARTITION OF …` se não existir.
* Manutenção simplificada: basta chamar uma vez por mês (já incluído no próprio script).

### 1.3 `lgpd_pseudonimizar()`

Job de conformidade LGPD que anonimiza dados pessoais **inativos há 2 anos**.

* Zera PII, desativa registro e atualiza timestamp.
* Pode ser agendado via `pg_cron` (exemplo incluído).

---

## 2 · ENUMs

* **`pessoa_tipo`** – `funcionario`, `visitante`.
* **`leitor_direcao` / `evento_direcao`** – `entrada`, `saida`.
* **`evento_result`** – `permitido`, `negado`.
* **`evento_tipo`** – agora inclui `rfid`, `face`, `doorbell`, `manual`, `outro` (suporte Hikvision).
* **`comando_status`** – `enviado`, `executado`, `falhou` (workflow de abertura remota).

ENUMs criados condicionalmente (`IF NOT EXISTS`) para evitar conflitos em upgrades.

---

## 3 · Tabelas principais

### 3.1 `pessoa`

* **PK** UUID.
* Nova coluna `hik_user_id` (BIGINT) armazena ID interno do terminal facial.
* Trigger `trg_set_updated_at()`.

### 3.2 `tag_rfid`

* `uid` BIGINT físico.
* FK opcional `pessoa_id` (`ON DELETE SET NULL`).
* Campo `bloqueada` permite soft-ban sem apagar histórico.

### 3.3 `leitor`

* Metadados de hardware — adicionadas colunas `fabricante` (default `Hikvision`) e `modelo`.
* Mantém `direcao`, `ip`, `localizacao`, `ativo`.

### 3.4 `usuario_sistema`

* Armazena credenciais de operadores/admin.
* `senha_hash` deve receber *bcrypt* ou *pbkdf2* (aplicação).

### 3.5 `evento_acesso` (particionada)

| Coluna                    | Função                                                   |
| ------------------------- | -------------------------------------------------------- |
| `instante`                | Chave de particionamento RANGE (mensal).                 |
| `evento_tipo`             | Origem (`rfid`, `face` …). Default posterior = `rfid`.   |
| `hik_major` / `hik_minor` | Códigos nativos ISAPI para rastrear eventos Hikvision.   |
| `hik_event_desc`          | Descrição textual do ISAPI.                              |
| `payload_raw`             | JSONB contendo pacote bruto (XML parseado, se desejado). |

Índices replicados (`tag_uid`, `pessoa_id`) preservam performance nas consultas mais comuns.

### 3.6 `comando_porta`

Loga comandos manuais (APP/web) para abertura de porta.

* Armazena timestamps request/ack, status e detalhes.
* FK para `leitor` e `usuario_sistema` garante rastreabilidade.

---

## 4 · Particionamento

* Tabela raiz `evento_acesso` definida `PARTITION BY RANGE (instante)`.
* `evento_acesso_default` recebe qualquer registro fora de partições mensais.
* Partição do mês corrente criada automaticamente no fim do script.
* Aplicações futuras devem agendar `create_event_partition` (CRON) para prevenir *spill* na default.

---

## 5 · View anonimizada — `v_evento_acesso_anon`

Mantém colunas operacionais + `evento_tipo` removendo identificação pessoal.

* Permite dashboards públicos sem violar LGPD.
* Consulta típica: totais de `face` vs `rfid` por dia.

---

## 6 · Agendamento LGPD via `pg_cron`

Exemplo comentado no fim do script:

```sql
SELECT cron.schedule('0 3 1 * *', $$CALL lgpd_pseudonimizar();$$);
```

Executa todo dia 1º às 03h00 mantendo dados de PII sob retenção controlada.

---

## 7 · Benefícios gerais

* **Escalabilidade** – partições mensais mantêm índices enxutos.
* **Compatibilidade** – continua aceitando RFID/ESP32 enquanto amplia suporte Hikvision.
* **Segurança & LGPD** – enum `evento_tipo` + coluna JSONB preserva detalhes sem expor PII; função de pseudonimização garante compliance.
* **Manutenção simplificada** – funções internas gerenciam partições e timestamps; admins só agendam jobs.

---

## 8 · Próximos passos sugeridos

1. **RLS (Row Level Security)** para API multi-tenant se necessário.
2. **Cascata de partições** para guardar apenas 24 meses online e arquivar partições antigas.
3. **Triggers LISTEN/NOTIFY** publicando eventos para micro-serviço de filas em tempo real.
4. **Índice GIN** em `payload_raw` se consultas por chave do XML se tornarem frequentes.

---

> **Conclusão** – O esquema atualizado fornece uma base única para controle de acesso híbrido, conciliando hardware legado e terminais faciais, com crescimento controlado e mecanismos nativos de auditoria e privacidade.
