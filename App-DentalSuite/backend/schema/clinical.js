'use strict';

const PAZIENTI = `
CREATE TABLE IF NOT EXISTS pazienti (
    id TEXT PRIMARY KEY,
    codice_fiscale TEXT NOT NULL DEFAULT '',
    nome TEXT NOT NULL DEFAULT '',
    secondo_nome TEXT DEFAULT '',
    cognome TEXT NOT NULL DEFAULT '',
    data_nascita TEXT DEFAULT '',
    luogo_nascita TEXT DEFAULT '',
    sesso TEXT DEFAULT '',
    telefono TEXT DEFAULT '',
    email TEXT DEFAULT '',
    indirizzo TEXT DEFAULT '',
    cap TEXT DEFAULT '',
    citta TEXT DEFAULT '',
    provincia TEXT DEFAULT '',
    esenzioni TEXT DEFAULT '',
    assicurazione TEXT DEFAULT '',
    numero_polizza TEXT DEFAULT '',
    gruppo_sanguigno TEXT DEFAULT '',
    professione TEXT DEFAULT '',
    stato_civile TEXT DEFAULT '',
    canale_preferito TEXT DEFAULT 'whatsapp',
    consenso_promemoria INTEGER DEFAULT 1,
    consenso_privacy INTEGER DEFAULT 0,
    data_consenso_privacy TEXT DEFAULT '',
    codice_sdi TEXT DEFAULT '',
    pec TEXT DEFAULT '',
    medico_curante TEXT DEFAULT '',
    tel_medico_curante TEXT DEFAULT '',
    contatto_emergenza_nome TEXT DEFAULT '',
    contatto_emergenza_parentela TEXT DEFAULT '',
    contatto_emergenza_tel TEXT DEFAULT '',
    preferenze_orari TEXT DEFAULT '',
    pacemaker INTEGER DEFAULT 0,
    note TEXT DEFAULT '',
    autore_id TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_pazienti_cf ON pazienti(codice_fiscale);
CREATE INDEX IF NOT EXISTS idx_pazienti_cognome ON pazienti(cognome, nome);
CREATE INDEX IF NOT EXISTS idx_pazienti_attivi ON pazienti(is_deleted, cognome);
`;

const ANAMNESI = `
CREATE TABLE IF NOT EXISTS anamnesi (
    id TEXT PRIMARY KEY,
    paziente_id TEXT NOT NULL,
    allergie_farmaci TEXT DEFAULT '',
    allergie_materiali TEXT DEFAULT '',
    patologie_cardiovascolari INTEGER DEFAULT 0,
    terapia_anticoagulanti INTEGER DEFAULT 0,
    diabete INTEGER DEFAULT 0,
    ipertensione INTEGER DEFAULT 0,
    epatiti_hiv INTEGER DEFAULT 0,
    osteoporosi_bifosfonati INTEGER DEFAULT 0,
    fumatore INTEGER DEFAULT 0,
    gravidanza INTEGER DEFAULT 0,
    ansia_odontoiatrica INTEGER DEFAULT 0,
    bruxismo INTEGER DEFAULT 0,
    altre_patologie TEXT DEFAULT '',
    terapie_in_corso TEXT DEFAULT '',
    note_mediche TEXT DEFAULT '',
    data_compilazione TEXT DEFAULT '',
    autore_id TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_anamnesi_paziente ON anamnesi(paziente_id);
`;

const ODONTOGRAMMA = `
CREATE TABLE IF NOT EXISTS odontogramma (
    id TEXT PRIMARY KEY,
    paziente_id TEXT NOT NULL,
    numero_dente TEXT NOT NULL,
    dentizione TEXT DEFAULT 'permanente',
    superfici TEXT DEFAULT '',
    stato TEXT DEFAULT 'sano',
    materiale TEXT DEFAULT '',
    mobilita TEXT DEFAULT '',
    note TEXT DEFAULT '',
    autore_id TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_odontogramma_dente ON odontogramma(paziente_id, numero_dente);
`;

const TRATTAMENTI = `
CREATE TABLE IF NOT EXISTS trattamenti_paziente (
    id TEXT PRIMARY KEY,
    paziente_id TEXT NOT NULL,
    prestazione_id TEXT DEFAULT '',
    descrizione TEXT DEFAULT '',
    dente TEXT DEFAULT '',
    superfici TEXT DEFAULT '',
    medico_id TEXT DEFAULT '',
    segretaria_id TEXT DEFAULT '',
    poltrona_id TEXT DEFAULT '',
    data_trattamento TEXT DEFAULT '',
    stato TEXT DEFAULT 'pianificato',
    importo REAL DEFAULT 0,
    quota_medico REAL DEFAULT 0,
    quota_segretaria REAL DEFAULT 0,
    costo_materiali REAL DEFAULT 0,
    liquidazione_id TEXT DEFAULT '',
    note TEXT DEFAULT '',
    autore_id TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_trattamenti_paziente ON trattamenti_paziente(paziente_id, data_trattamento);
CREATE INDEX IF NOT EXISTS idx_trattamenti_medico ON trattamenti_paziente(medico_id, stato);
CREATE INDEX IF NOT EXISTS idx_trattamenti_liquidazione ON trattamenti_paziente(liquidazione_id);
`;

const PRESCRIZIONI = `
CREATE TABLE IF NOT EXISTS prescrizioni_farmaci (
    id TEXT PRIMARY KEY,
    paziente_id TEXT NOT NULL,
    medico_id TEXT DEFAULT '',
    farmaco TEXT NOT NULL DEFAULT '',
    principio_attivo TEXT DEFAULT '',
    dosaggio TEXT DEFAULT '',
    posologia TEXT DEFAULT '',
    durata_giorni INTEGER DEFAULT 0,
    data_prescrizione TEXT DEFAULT '',
    note TEXT DEFAULT '',
    autore_id TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_prescrizioni_paziente ON prescrizioni_farmaci(paziente_id, data_prescrizione);
`;

const ALLEGATI = `
CREATE TABLE IF NOT EXISTS allegati_diagnostici (
    id TEXT PRIMARY KEY,
    paziente_id TEXT NOT NULL,
    tipo TEXT DEFAULT 'altro',
    titolo TEXT DEFAULT '',
    file_name TEXT DEFAULT '',
    file_path TEXT DEFAULT '',
    file_size INTEGER DEFAULT 0,
    mime_type TEXT DEFAULT '',
    data_esame TEXT DEFAULT '',
    note TEXT DEFAULT '',
    autore_id TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    last_modified INTEGER NOT NULL,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_allegati_paziente ON allegati_diagnostici(paziente_id, data_esame);
`;

module.exports = [PAZIENTI, ANAMNESI, ODONTOGRAMMA, TRATTAMENTI, PRESCRIZIONI, ALLEGATI];
