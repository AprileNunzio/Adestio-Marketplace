'use strict';

const TRASMISSIONI = `
CREATE TABLE IF NOT EXISTS trasmissioni (
    id TEXT PRIMARY KEY,
    paziente_id TEXT NOT NULL,
    pari_id TEXT DEFAULT '',
    sessione_id TEXT DEFAULT '',
    postazione_nome TEXT DEFAULT '',
    impronta_postazione TEXT DEFAULT '',
    stato TEXT DEFAULT 'aperta',
    aperta_il INTEGER DEFAULT 0,
    chiusa_il INTEGER DEFAULT 0,
    impronta_dossier TEXT DEFAULT '',
    motivo_chiusura TEXT DEFAULT '',
    autore_id TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_trasmissioni_paziente ON trasmissioni(paziente_id, created_at);
CREATE INDEX IF NOT EXISTS idx_trasmissioni_stato ON trasmissioni(stato, created_at);
`;

const ATTI = `
CREATE TABLE IF NOT EXISTS atti_ricevuti (
    id TEXT PRIMARY KEY,
    trasmissione_id TEXT DEFAULT '',
    atto_id TEXT NOT NULL,
    tipo TEXT DEFAULT '',
    paziente_id TEXT DEFAULT '',
    impronta_postazione TEXT DEFAULT '',
    contenuto TEXT DEFAULT '',
    esito TEXT DEFAULT '',
    messaggio TEXT DEFAULT '',
    applicato_il INTEGER DEFAULT 0,
    autore_id TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_atti_ricevuti_atto ON atti_ricevuti(atto_id);
CREATE INDEX IF NOT EXISTS idx_atti_ricevuti_paziente ON atti_ricevuti(paziente_id, created_at);
`;

module.exports = [TRASMISSIONI, ATTI];
