'use strict';

const PRESTAZIONI = `
CREATE TABLE IF NOT EXISTS prestazioni_catalogo (
    id TEXT PRIMARY KEY,
    codice TEXT DEFAULT '',
    nome TEXT NOT NULL DEFAULT '',
    categoria TEXT DEFAULT '',
    branca TEXT DEFAULT '',
    durata_stimata_minuti INTEGER DEFAULT 30,
    prezzo_paziente REAL DEFAULT 0,
    tipo_quota_medico TEXT DEFAULT 'percentuale',
    valore_quota_medico REAL DEFAULT 0,
    tipo_quota_segretaria TEXT DEFAULT 'percentuale',
    valore_quota_segretaria REAL DEFAULT 0,
    costo_materiale_stimato REAL DEFAULT 0,
    colore_badge TEXT DEFAULT '#0d9488',
    attiva INTEGER DEFAULT 1,
    note TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_prestazioni_categoria ON prestazioni_catalogo(categoria);
CREATE INDEX IF NOT EXISTS idx_prestazioni_codice ON prestazioni_catalogo(codice);
`;

const STAFF = `
CREATE TABLE IF NOT EXISTS staff (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL DEFAULT '',
    secondo_nome TEXT DEFAULT '',
    cognome TEXT NOT NULL DEFAULT '',
    codice_fiscale TEXT DEFAULT '',
    partita_iva TEXT DEFAULT '',
    ruolo TEXT DEFAULT 'medico',
    specializzazione TEXT DEFAULT '',
    numero_albo TEXT DEFAULT '',
    utente_adestio_id TEXT DEFAULT '',
    percentuale_default REAL DEFAULT 0,
    costo_orario REAL DEFAULT 0,
    ritenuta_acconto_percentuale REAL DEFAULT 0,
    colore_agenda TEXT DEFAULT '#0d9488',
    telefono TEXT DEFAULT '',
    email TEXT DEFAULT '',
    attivo INTEGER DEFAULT 1,
    note TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_staff_ruolo ON staff(ruolo, is_deleted);
CREATE INDEX IF NOT EXISTS idx_staff_utente ON staff(utente_adestio_id);
`;

const LIQUIDAZIONI = `
CREATE TABLE IF NOT EXISTS liquidazioni_staff (
    id TEXT PRIMARY KEY,
    staff_id TEXT NOT NULL,
    periodo_dal TEXT DEFAULT '',
    periodo_al TEXT DEFAULT '',
    totale_competenze REAL DEFAULT 0,
    ritenuta_acconto REAL DEFAULT 0,
    totale_liquidato REAL DEFAULT 0,
    numero_trattamenti INTEGER DEFAULT 0,
    data_liquidazione TEXT DEFAULT '',
    metodo_pagamento TEXT DEFAULT '',
    note TEXT DEFAULT '',
    autore_id TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_liquidazioni_staff ON liquidazioni_staff(staff_id, periodo_dal);
`;

module.exports = [PRESTAZIONI, STAFF, LIQUIDAZIONI];
