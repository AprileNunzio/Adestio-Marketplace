module.exports = [
    {
        version: 1,
        sql: `
            CREATE TABLE IF NOT EXISTS pazienti (
                id TEXT PRIMARY KEY,
                codice_fiscale TEXT NOT NULL DEFAULT '',
                nome TEXT NOT NULL DEFAULT '',
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
                gruppo_sanguigno TEXT DEFAULT '',
                note TEXT DEFAULT '',
                created_at INTEGER NOT NULL,
                last_modified INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_pazienti_cf ON pazienti(codice_fiscale);
            CREATE INDEX IF NOT EXISTS idx_pazienti_cognome ON pazienti(cognome, nome);

            CREATE TABLE IF NOT EXISTS anamnesi (
                id TEXT PRIMARY KEY,
                paziente_id TEXT NOT NULL,
                allergie_farmaci TEXT DEFAULT '',
                patologie_cardiovascolari INTEGER DEFAULT 0,
                terapia_anticoagulanti INTEGER DEFAULT 0,
                diabete INTEGER DEFAULT 0,
                ipertensione INTEGER DEFAULT 0,
                epatiti_hiv INTEGER DEFAULT 0,
                fumatore INTEGER DEFAULT 0,
                gravidanza INTEGER DEFAULT 0,
                ansia_odontoiatrica INTEGER DEFAULT 0,
                altre_patologie TEXT DEFAULT '',
                terapie_in_corso TEXT DEFAULT '',
                note_mediche TEXT DEFAULT '',
                data_compilazione TEXT DEFAULT '',
                last_modified INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_anamnesi_paziente ON anamnesi(paziente_id);

            CREATE TABLE IF NOT EXISTS odontogramma (
                id TEXT PRIMARY KEY,
                paziente_id TEXT NOT NULL,
                numero_dente INTEGER NOT NULL,
                superfici TEXT DEFAULT '[]',
                stato TEXT NOT NULL DEFAULT 'sano',
                materiale TEXT DEFAULT '',
                note TEXT DEFAULT '',
                last_modified INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_odontogramma_paziente ON odontogramma(paziente_id, numero_dente);

            CREATE TABLE IF NOT EXISTS trattamenti_paziente (
                id TEXT PRIMARY KEY,
                paziente_id TEXT NOT NULL,
                prestazione_id TEXT DEFAULT '',
                descrizione TEXT NOT NULL DEFAULT '',
                dente INTEGER DEFAULT 0,
                superfici TEXT DEFAULT '',
                medico_id TEXT DEFAULT '',
                segretaria_id TEXT DEFAULT '',
                poltrona TEXT DEFAULT 'Unità 1',
                data_trattamento TEXT NOT NULL,
                stato TEXT NOT NULL DEFAULT 'completato',
                importo REAL NOT NULL DEFAULT 0,
                quota_medico REAL NOT NULL DEFAULT 0,
                quota_segretaria REAL NOT NULL DEFAULT 0,
                costo_materiali REAL NOT NULL DEFAULT 0,
                note TEXT DEFAULT '',
                created_at INTEGER NOT NULL,
                last_modified INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_trattamenti_paziente ON trattamenti_paziente(paziente_id);
            CREATE INDEX IF NOT EXISTS idx_trattamenti_medico ON trattamenti_paziente(medico_id);

            CREATE TABLE IF NOT EXISTS prescrizioni_farmaci (
                id TEXT PRIMARY KEY,
                paziente_id TEXT NOT NULL,
                medico_id TEXT DEFAULT '',
                farmaco TEXT NOT NULL,
                principio_attivo TEXT DEFAULT '',
                dosaggio TEXT DEFAULT '',
                posologia TEXT NOT NULL,
                durata_giorni INTEGER DEFAULT 5,
                data_prescrizione TEXT NOT NULL,
                note TEXT DEFAULT '',
                created_at INTEGER NOT NULL,
                last_modified INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_prescrizioni_paziente ON prescrizioni_farmaci(paziente_id);

            CREATE TABLE IF NOT EXISTS allegati_diagnostici (
                id TEXT PRIMARY KEY,
                paziente_id TEXT NOT NULL,
                tipo TEXT NOT NULL DEFAULT 'rx',
                titolo TEXT NOT NULL,
                data_esame TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_size INTEGER DEFAULT 0,
                mime_type TEXT DEFAULT '',
                note TEXT DEFAULT '',
                created_at INTEGER NOT NULL,
                last_modified INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_allegati_paziente ON allegati_diagnostici(paziente_id);

            CREATE TABLE IF NOT EXISTS staff_clinico (
                id TEXT PRIMARY KEY,
                nome TEXT NOT NULL,
                cognome TEXT NOT NULL,
                ruolo TEXT NOT NULL,
                codice_fiscale TEXT DEFAULT '',
                albo_numero TEXT DEFAULT '',
                specializzazione TEXT DEFAULT '',
                telefono TEXT DEFAULT '',
                email TEXT DEFAULT '',
                colore_calendario TEXT DEFAULT '#0d9488',
                tipo_compenso_default TEXT DEFAULT 'percentuale',
                valore_compenso_default REAL DEFAULT 0,
                attivo INTEGER DEFAULT 1,
                created_at INTEGER NOT NULL,
                last_modified INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS catalogo_prestazioni (
                id TEXT PRIMARY KEY,
                codice TEXT DEFAULT '',
                branca TEXT NOT NULL,
                nome TEXT NOT NULL,
                descrizione TEXT DEFAULT '',
                durata_minuti INTEGER DEFAULT 30,
                prezzo_paziente REAL NOT NULL DEFAULT 0,
                tipo_quota_medico TEXT DEFAULT 'fisso',
                valore_quota_medico REAL DEFAULT 0,
                tipo_quota_segretaria TEXT DEFAULT 'fisso',
                valore_quota_segretaria REAL DEFAULT 0,
                costo_materiale_stimato REAL DEFAULT 0,
                attivo INTEGER DEFAULT 1,
                created_at INTEGER NOT NULL,
                last_modified INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS appuntamenti (
                id TEXT PRIMARY KEY,
                paziente_id TEXT NOT NULL,
                medico_id TEXT NOT NULL,
                prestazione_id TEXT DEFAULT '',
                data_ora_inizio INTEGER NOT NULL,
                data_ora_fine INTEGER NOT NULL,
                poltrona TEXT DEFAULT 'Unità 1',
                motivo TEXT DEFAULT '',
                stato TEXT NOT NULL DEFAULT 'confermato',
                note TEXT DEFAULT '',
                created_at INTEGER NOT NULL,
                last_modified INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_appuntamenti_paziente ON appuntamenti(paziente_id);
            CREATE INDEX IF NOT EXISTS idx_appuntamenti_medico ON appuntamenti(medico_id);
            CREATE INDEX IF NOT EXISTS idx_appuntamenti_data ON appuntamenti(data_ora_inizio);

            CREATE TABLE IF NOT EXISTS preventivi (
                id TEXT PRIMARY KEY,
                numero_preventivo TEXT NOT NULL,
                paziente_id TEXT NOT NULL,
                medico_id TEXT DEFAULT '',
                data_emissione TEXT NOT NULL,
                stato TEXT NOT NULL DEFAULT 'bozza',
                totale_lordo REAL DEFAULT 0,
                sconto_percentuale REAL DEFAULT 0,
                totale_netto REAL DEFAULT 0,
                voci_json TEXT NOT NULL DEFAULT '[]',
                note TEXT DEFAULT '',
                created_at INTEGER NOT NULL,
                last_modified INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS pagamenti_incassi (
                id TEXT PRIMARY KEY,
                paziente_id TEXT NOT NULL,
                preventivo_id TEXT DEFAULT '',
                trattamento_id TEXT DEFAULT '',
                data_pagamento TEXT NOT NULL,
                importo REAL NOT NULL,
                metodo_pagamento TEXT NOT NULL DEFAULT 'pos',
                tipo_documento TEXT DEFAULT 'ricevuta_sanitaria',
                numero_documento TEXT DEFAULT '',
                note TEXT DEFAULT '',
                created_at INTEGER NOT NULL,
                last_modified INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_pagamenti_paziente ON pagamenti_incassi(paziente_id);

            CREATE TABLE IF NOT EXISTS spese_studio (
                id TEXT PRIMARY KEY,
                categoria TEXT NOT NULL,
                descrizione TEXT NOT NULL,
                fornitore TEXT DEFAULT '',
                data_spesa TEXT NOT NULL,
                importo REAL NOT NULL,
                metodo_pagamento TEXT DEFAULT 'bonifico',
                numero_fattura TEXT DEFAULT '',
                note TEXT DEFAULT '',
                created_at INTEGER NOT NULL,
                last_modified INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS liquidazioni_staff (
                id TEXT PRIMARY KEY,
                staff_id TEXT NOT NULL,
                periodo_riferimento TEXT NOT NULL,
                data_liquidazione TEXT NOT NULL,
                totale_competenze REAL NOT NULL,
                trattamenti_inclusi_json TEXT DEFAULT '[]',
                stato TEXT NOT NULL DEFAULT 'liquidato',
                metodo_pagamento TEXT DEFAULT 'bonifico',
                note TEXT DEFAULT '',
                created_at INTEGER NOT NULL,
                last_modified INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0
            );
        `
    }
];
