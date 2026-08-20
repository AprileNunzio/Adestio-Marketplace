'use strict';

const SEDI = `
CREATE TABLE IF NOT EXISTS sedi_studio (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL DEFAULT '',
    codice TEXT DEFAULT '',
    indirizzo TEXT DEFAULT '',
    citta TEXT DEFAULT '',
    cap TEXT DEFAULT '',
    provincia TEXT DEFAULT '',
    telefono TEXT DEFAULT '',
    email TEXT DEFAULT '',
    direttore_sanitario TEXT DEFAULT '',
    is_principale INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
`;

const SALE = `
CREATE TABLE IF NOT EXISTS sale_studio (
    id TEXT PRIMARY KEY,
    sede_id TEXT NOT NULL,
    nome TEXT NOT NULL DEFAULT '',
    tipo_sala TEXT DEFAULT 'operativa',
    piano TEXT DEFAULT '',
    codice_stanza TEXT DEFAULT '',
    dotazioni TEXT DEFAULT '',
    colore TEXT DEFAULT '#0d9488',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sale_sede ON sale_studio(sede_id);
`;

const POLTRONE = `
CREATE TABLE IF NOT EXISTS poltrone_studio (
    id TEXT PRIMARY KEY,
    sede_id TEXT NOT NULL,
    sala_id TEXT DEFAULT '',
    nome TEXT NOT NULL DEFAULT '',
    codice_unita TEXT DEFAULT '',
    marca_modello TEXT DEFAULT '',
    matricola TEXT DEFAULT '',
    medico_default_id TEXT DEFAULT '',
    assistente_default_id TEXT DEFAULT '',
    colore_agenda TEXT DEFAULT '#0d9488',
    stato TEXT DEFAULT 'attiva',
    note TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_poltrone_sede ON poltrone_studio(sede_id);
CREATE INDEX IF NOT EXISTS idx_poltrone_sala ON poltrone_studio(sala_id);
`;

const APPUNTAMENTI = `
CREATE TABLE IF NOT EXISTS appuntamenti (
    id TEXT PRIMARY KEY,
    paziente_id TEXT DEFAULT '',
    medico_id TEXT DEFAULT '',
    assistente_id TEXT DEFAULT '',
    poltrona_id TEXT DEFAULT '',
    sede_id TEXT DEFAULT '',
    prestazione_id TEXT DEFAULT '',
    data_ora_inizio INTEGER NOT NULL,
    durata_minuti INTEGER DEFAULT 30,
    motivo_visita TEXT DEFAULT '',
    stato TEXT DEFAULT 'programmato',
    colore_calendario TEXT DEFAULT '#0d9488',
    promemoria_inviato INTEGER DEFAULT 0,
    note TEXT DEFAULT '',
    autore_id TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_appuntamenti_inizio ON appuntamenti(data_ora_inizio);
CREATE INDEX IF NOT EXISTS idx_appuntamenti_poltrona ON appuntamenti(poltrona_id, data_ora_inizio);
CREATE INDEX IF NOT EXISTS idx_appuntamenti_medico ON appuntamenti(medico_id, data_ora_inizio);
CREATE INDEX IF NOT EXISTS idx_appuntamenti_paziente ON appuntamenti(paziente_id);
`;

module.exports = [SEDI, SALE, POLTRONE, APPUNTAMENTI];
