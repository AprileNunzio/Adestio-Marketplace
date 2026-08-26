'use strict';

const RAPPORTO_STAFF = `
ALTER TABLE staff ADD COLUMN compenso_mensile REAL DEFAULT 0;
ALTER TABLE staff ADD COLUMN tipo_rapporto TEXT DEFAULT 'collaboratore';
`;

const ACCORDI = `
CREATE TABLE IF NOT EXISTS accordi_compenso (
    id TEXT PRIMARY KEY,
    staff_id TEXT NOT NULL,
    ruolo TEXT NOT NULL DEFAULT 'medico',
    ambito TEXT NOT NULL DEFAULT 'tutte',
    riferimento TEXT DEFAULT '',
    etichetta TEXT DEFAULT '',
    tipo TEXT NOT NULL DEFAULT 'percentuale',
    valore REAL DEFAULT 0,
    valido_dal TEXT DEFAULT '',
    valido_al TEXT DEFAULT '',
    attivo INTEGER DEFAULT 1,
    note TEXT DEFAULT '',
    autore_id TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_accordi_staff ON accordi_compenso(staff_id, ruolo, attivo);
CREATE INDEX IF NOT EXISTS idx_accordi_ambito ON accordi_compenso(ambito, riferimento);
`;

const MENSILITA = `
CREATE TABLE IF NOT EXISTS liquidazioni_mensilita (
    id TEXT PRIMARY KEY,
    liquidazione_id TEXT NOT NULL,
    staff_id TEXT NOT NULL,
    periodo TEXT NOT NULL,
    giorni_coperti INTEGER DEFAULT 0,
    giorni_mese INTEGER DEFAULT 0,
    importo REAL DEFAULT 0,
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_mensilita_liquidazione ON liquidazioni_mensilita(liquidazione_id);
`;

const TOTALI_LIQUIDAZIONE = `
ALTER TABLE liquidazioni_staff ADD COLUMN totale_mensilita REAL DEFAULT 0;
ALTER TABLE liquidazioni_staff ADD COLUMN totale_variabile REAL DEFAULT 0;
`;

module.exports = [RAPPORTO_STAFF, ACCORDI, MENSILITA, TOTALI_LIQUIDAZIONE];
