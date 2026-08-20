'use strict';

const LOG_AUDIT = `
CREATE TABLE IF NOT EXISTS log_audit (
    id TEXT PRIMARY KEY,
    sequenza INTEGER NOT NULL,
    azione TEXT NOT NULL,
    permesso TEXT DEFAULT '',
    muta INTEGER DEFAULT 0,
    attore_id TEXT DEFAULT '',
    entita TEXT DEFAULT '',
    entita_id TEXT DEFAULT '',
    paziente_id TEXT DEFAULT '',
    esito TEXT NOT NULL,
    codice_errore TEXT DEFAULT '',
    messaggio TEXT DEFAULT '',
    durata_ms INTEGER DEFAULT 0,
    impronta_precedente TEXT DEFAULT '',
    impronta TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_sequenza ON log_audit(sequenza);
CREATE INDEX IF NOT EXISTS idx_audit_istante ON log_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_attore ON log_audit(attore_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_paziente ON log_audit(paziente_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_esito ON log_audit(esito, created_at);
`;

const CONSENSI_MODELLI = `
CREATE TABLE IF NOT EXISTS consensi_modelli (
    id TEXT PRIMARY KEY,
    codice TEXT NOT NULL DEFAULT '',
    versione INTEGER NOT NULL DEFAULT 1,
    titolo TEXT NOT NULL DEFAULT '',
    ambito TEXT NOT NULL DEFAULT 'sanitario',
    testo TEXT DEFAULT '',
    obbligatorio INTEGER DEFAULT 0,
    validita_mesi INTEGER DEFAULT 0,
    in_vigore INTEGER DEFAULT 1,
    autore_id TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_consensi_modelli_codice ON consensi_modelli(codice, versione);
CREATE INDEX IF NOT EXISTS idx_consensi_modelli_ambito ON consensi_modelli(ambito, in_vigore);
`;

const CONSENSI_PAZIENTE = `
CREATE TABLE IF NOT EXISTS consensi_paziente (
    id TEXT PRIMARY KEY,
    paziente_id TEXT NOT NULL,
    modello_id TEXT NOT NULL,
    codice TEXT DEFAULT '',
    versione INTEGER NOT NULL DEFAULT 1,
    ambito TEXT NOT NULL DEFAULT 'sanitario',
    stato TEXT NOT NULL DEFAULT 'concesso',
    data_concessione TEXT DEFAULT '',
    data_revoca TEXT DEFAULT '',
    data_scadenza TEXT DEFAULT '',
    modalita_raccolta TEXT DEFAULT 'cartaceo',
    impronta_testo TEXT DEFAULT '',
    note TEXT DEFAULT '',
    autore_id TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_consensi_paziente ON consensi_paziente(paziente_id, ambito);
CREATE INDEX IF NOT EXISTS idx_consensi_stato ON consensi_paziente(stato, data_scadenza);
`;

module.exports = [LOG_AUDIT, CONSENSI_MODELLI, CONSENSI_PAZIENTE];
