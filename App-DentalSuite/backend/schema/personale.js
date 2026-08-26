'use strict';

const ORARI = `
CREATE TABLE IF NOT EXISTS staff_orari (
    id TEXT PRIMARY KEY,
    staff_id TEXT NOT NULL,
    giorno_settimana INTEGER DEFAULT 0,
    data_specifica TEXT DEFAULT '',
    ora_inizio TEXT NOT NULL DEFAULT '09:00',
    ora_fine TEXT NOT NULL DEFAULT '13:00',
    sede_id TEXT DEFAULT '',
    poltrona_id TEXT DEFAULT '',
    valido_dal TEXT DEFAULT '',
    valido_al TEXT DEFAULT '',
    note TEXT DEFAULT '',
    autore_id TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_staff_orari_staff ON staff_orari(staff_id, giorno_settimana);
CREATE INDEX IF NOT EXISTS idx_staff_orari_data ON staff_orari(data_specifica);
`;

const ASSENZE = `
CREATE TABLE IF NOT EXISTS staff_assenze (
    id TEXT PRIMARY KEY,
    staff_id TEXT NOT NULL,
    tipo TEXT DEFAULT 'ferie',
    data_inizio TEXT NOT NULL,
    data_fine TEXT NOT NULL,
    giornata_intera INTEGER DEFAULT 1,
    ora_inizio TEXT DEFAULT '',
    ora_fine TEXT DEFAULT '',
    stato TEXT DEFAULT 'richiesta',
    motivo TEXT DEFAULT '',
    approvato_da TEXT DEFAULT '',
    approvato_il INTEGER DEFAULT 0,
    note TEXT DEFAULT '',
    autore_id TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_staff_assenze_staff ON staff_assenze(staff_id, data_inizio);
CREATE INDEX IF NOT EXISTS idx_staff_assenze_periodo ON staff_assenze(stato, data_inizio, data_fine);
`;

const FORZATURA = `
ALTER TABLE appuntamenti ADD COLUMN forzato INTEGER DEFAULT 0;
ALTER TABLE appuntamenti ADD COLUMN motivo_forzatura TEXT DEFAULT '';
`;

module.exports = [ORARI, ASSENZE, FORZATURA];
