'use strict';

const DATA_SU_ODONTOGRAMMA = `
ALTER TABLE odontogramma ADD COLUMN data_rilevazione TEXT DEFAULT '';
ALTER TABLE odontogramma ADD COLUMN rilevazione_id TEXT DEFAULT '';
`;

const RILEVAZIONI = `
CREATE TABLE IF NOT EXISTS odontogramma_storico (
    id TEXT PRIMARY KEY,
    paziente_id TEXT NOT NULL,
    numero_dente TEXT NOT NULL,
    dentizione TEXT DEFAULT 'permanente',
    stato TEXT NOT NULL DEFAULT 'sano',
    stato_precedente TEXT DEFAULT '',
    superfici TEXT DEFAULT '',
    materiale TEXT DEFAULT '',
    mobilita TEXT DEFAULT '',
    note TEXT DEFAULT '',
    trattamento_id TEXT DEFAULT '',
    data_rilevazione TEXT NOT NULL,
    autore_id TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_storico_paziente ON odontogramma_storico(paziente_id, data_rilevazione);
CREATE INDEX IF NOT EXISTS idx_storico_dente ON odontogramma_storico(paziente_id, numero_dente, data_rilevazione);
`;

module.exports = [DATA_SU_ODONTOGRAMMA, RILEVAZIONI];
