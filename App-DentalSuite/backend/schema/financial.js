'use strict';

const PREVENTIVI = `
CREATE TABLE IF NOT EXISTS preventivi (
    id TEXT PRIMARY KEY,
    paziente_id TEXT NOT NULL,
    medico_id TEXT DEFAULT '',
    numero_preventivo TEXT DEFAULT '',
    data_emissione TEXT DEFAULT '',
    data_scadenza TEXT DEFAULT '',
    stato TEXT DEFAULT 'bozza',
    totale_lordo REAL DEFAULT 0,
    sconto_percentuale REAL DEFAULT 0,
    totale_netto REAL DEFAULT 0,
    acconto_richiesto REAL DEFAULT 0,
    note TEXT DEFAULT '',
    autore_id TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_preventivi_paziente ON preventivi(paziente_id, data_emissione);
CREATE INDEX IF NOT EXISTS idx_preventivi_stato ON preventivi(stato);
`;

const PREVENTIVI_RIGHE = `
CREATE TABLE IF NOT EXISTS preventivi_righe (
    id TEXT PRIMARY KEY,
    preventivo_id TEXT NOT NULL,
    prestazione_id TEXT DEFAULT '',
    descrizione TEXT DEFAULT '',
    dente TEXT DEFAULT '',
    quantita REAL DEFAULT 1,
    prezzo_unitario REAL DEFAULT 0,
    sconto_percentuale REAL DEFAULT 0,
    totale_riga REAL DEFAULT 0,
    ordine INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_preventivi_righe ON preventivi_righe(preventivo_id, ordine);
`;

const INCASSI = `
CREATE TABLE IF NOT EXISTS pagamenti_incassi (
    id TEXT PRIMARY KEY,
    paziente_id TEXT DEFAULT '',
    preventivo_id TEXT DEFAULT '',
    rata_id TEXT DEFAULT '',
    numero_documento TEXT DEFAULT '',
    tipo_documento TEXT DEFAULT 'ricevuta',
    metodo_pagamento TEXT DEFAULT 'contanti',
    importo REAL DEFAULT 0,
    data_pagamento TEXT DEFAULT '',
    note TEXT DEFAULT '',
    autore_id TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_incassi_data ON pagamenti_incassi(data_pagamento);
CREATE INDEX IF NOT EXISTS idx_incassi_paziente ON pagamenti_incassi(paziente_id);
`;

const SPESE = `
CREATE TABLE IF NOT EXISTS spese_studio (
    id TEXT PRIMARY KEY,
    categoria TEXT DEFAULT '',
    descrizione TEXT DEFAULT '',
    fornitore TEXT DEFAULT '',
    numero_fattura TEXT DEFAULT '',
    importo REAL DEFAULT 0,
    data_spesa TEXT DEFAULT '',
    metodo_pagamento TEXT DEFAULT '',
    ricorrente INTEGER DEFAULT 0,
    allegato_path TEXT DEFAULT '',
    note TEXT DEFAULT '',
    autore_id TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_spese_data ON spese_studio(data_spesa);
CREATE INDEX IF NOT EXISTS idx_spese_categoria ON spese_studio(categoria);
`;

const PIANI_RATEALI = `
CREATE TABLE IF NOT EXISTS piani_rateali (
    id TEXT PRIMARY KEY,
    paziente_id TEXT NOT NULL,
    preventivo_id TEXT DEFAULT '',
    totale_piano REAL DEFAULT 0,
    acconto_iniziale REAL DEFAULT 0,
    numero_rate INTEGER DEFAULT 0,
    stato TEXT DEFAULT 'attivo',
    note TEXT DEFAULT '',
    autore_id TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_piani_paziente ON piani_rateali(paziente_id, stato);
`;

const RATE = `
CREATE TABLE IF NOT EXISTS rate_scadenziario (
    id TEXT PRIMARY KEY,
    piano_id TEXT NOT NULL,
    paziente_id TEXT NOT NULL,
    numero_rata INTEGER DEFAULT 0,
    importo REAL DEFAULT 0,
    data_scadenza TEXT DEFAULT '',
    data_pagamento TEXT DEFAULT '',
    stato TEXT DEFAULT 'attesa',
    metodo_pagamento TEXT DEFAULT '',
    numero_ricevuta TEXT DEFAULT '',
    note TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_rate_piano ON rate_scadenziario(piano_id, numero_rata);
CREATE INDEX IF NOT EXISTS idx_rate_scadenza ON rate_scadenziario(stato, data_scadenza);
`;

const NOTIFICHE = `
CREATE TABLE IF NOT EXISTS log_notifiche (
    id TEXT PRIMARY KEY,
    paziente_id TEXT DEFAULT '',
    appuntamento_id TEXT DEFAULT '',
    tipo_canale TEXT DEFAULT '',
    destinatario TEXT DEFAULT '',
    messaggio TEXT DEFAULT '',
    stato_esito TEXT DEFAULT '',
    data_invio TEXT DEFAULT '',
    autore_id TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_notifiche_paziente ON log_notifiche(paziente_id, data_invio);
`;

module.exports = [PREVENTIVI, PREVENTIVI_RIGHE, INCASSI, SPESE, PIANI_RATEALI, RATE, NOTIFICHE];
