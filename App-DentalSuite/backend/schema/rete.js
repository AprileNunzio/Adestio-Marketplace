'use strict';

const POSTAZIONE = `
CREATE TABLE IF NOT EXISTS rete_postazione (
    id TEXT PRIMARY KEY,
    nome TEXT DEFAULT '',
    ruolo TEXT DEFAULT 'segreteria',
    porta INTEGER DEFAULT 7345,
    chiave_pubblica TEXT DEFAULT '',
    chiave_privata TEXT DEFAULT '',
    impronta TEXT DEFAULT '',
    attiva INTEGER DEFAULT 0,
    indirizzo_archivio TEXT DEFAULT '',
    autore_id TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
`;

const PARI = `
CREATE TABLE IF NOT EXISTS rete_pari (
    id TEXT PRIMARY KEY,
    nome TEXT DEFAULT '',
    ruolo TEXT DEFAULT '',
    chiave_pubblica TEXT DEFAULT '',
    impronta TEXT DEFAULT '',
    ultimo_indirizzo TEXT DEFAULT '',
    ultima_porta INTEGER DEFAULT 0,
    ultimo_contatto INTEGER DEFAULT 0,
    stato TEXT DEFAULT 'accoppiata',
    autore_id TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_rete_pari_stato ON rete_pari(stato, ultimo_contatto);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rete_pari_impronta ON rete_pari(impronta);
`;

const ACCOPPIAMENTI = `
CREATE TABLE IF NOT EXISTS rete_accoppiamenti (
    id TEXT PRIMARY KEY,
    impronta_codice TEXT NOT NULL,
    sale TEXT NOT NULL,
    scade_il INTEGER NOT NULL,
    tentativi INTEGER DEFAULT 0,
    consumato INTEGER DEFAULT 0,
    pari_id TEXT DEFAULT '',
    autore_id TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_rete_accoppiamenti_scadenza ON rete_accoppiamenti(consumato, scade_il);
`;

const CODA = `
CREATE TABLE IF NOT EXISTS rete_coda (
    id TEXT PRIMARY KEY,
    destinatario_id TEXT DEFAULT '',
    tipo TEXT DEFAULT '',
    contenuto TEXT DEFAULT '',
    tentativi INTEGER DEFAULT 0,
    ultimo_errore TEXT DEFAULT '',
    stato TEXT DEFAULT 'in_attesa',
    autore_id TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_rete_coda_stato ON rete_coda(stato, created_at);
`;

module.exports = [POSTAZIONE, PARI, ACCOPPIAMENTI, CODA];
