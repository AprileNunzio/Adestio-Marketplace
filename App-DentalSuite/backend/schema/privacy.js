'use strict';

const DOCUMENTI_FIRMATI = `
CREATE TABLE IF NOT EXISTS documenti_firmati (
    id TEXT PRIMARY KEY,
    paziente_id TEXT NOT NULL,
    tipo_documento TEXT NOT NULL DEFAULT 'consenso',
    riferimento_id TEXT DEFAULT '',
    titolo TEXT DEFAULT '',
    testo TEXT DEFAULT '',
    impronta_testo TEXT NOT NULL,
    firmatario TEXT DEFAULT '',
    ruolo_firmatario TEXT DEFAULT 'paziente',
    firma_immagine TEXT DEFAULT '',
    metodo_firma TEXT DEFAULT 'grafometrica',
    data_firma TEXT DEFAULT '',
    impronta_documento TEXT NOT NULL,
    autore_id TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_firme_paziente ON documenti_firmati(paziente_id, data_firma);
CREATE INDEX IF NOT EXISTS idx_firme_riferimento ON documenti_firmati(tipo_documento, riferimento_id);
`;

const CANCELLAZIONI = `
CREATE TABLE IF NOT EXISTS registro_cancellazioni (
    id TEXT PRIMARY KEY,
    paziente_id TEXT NOT NULL,
    nominativo_cancellato TEXT DEFAULT '',
    motivo TEXT DEFAULT '',
    campi_anonimizzati INTEGER DEFAULT 0,
    atti_clinici_conservati INTEGER DEFAULT 0,
    conservazione_fino_al TEXT DEFAULT '',
    esito TEXT DEFAULT 'eseguita',
    autore_id TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_cancellazioni_paziente ON registro_cancellazioni(paziente_id);
`;

module.exports = [DOCUMENTI_FIRMATI, CANCELLAZIONI];
