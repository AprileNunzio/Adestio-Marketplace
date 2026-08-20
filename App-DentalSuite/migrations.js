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
                professione TEXT DEFAULT '',
                stato_civile TEXT DEFAULT '',
                canale_preferito TEXT DEFAULT 'whatsapp',
                consenso_promemoria INTEGER DEFAULT 1,
                codice_sdi TEXT DEFAULT '',
                pec TEXT DEFAULT '',
                numero_polizza TEXT DEFAULT '',
                medico_curante TEXT DEFAULT '',
                tel_medico_curante TEXT DEFAULT '',
                contatto_emergenza_nome TEXT DEFAULT '',
                contatto_emergenza_parentela TEXT DEFAULT '',
                contatto_emergenza_tel TEXT DEFAULT '',
                preferenze_orari TEXT DEFAULT '',
                pacemaker INTEGER DEFAULT 0,
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
                last_modified INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_trattamenti_paziente ON trattamenti_paziente(paziente_id);

            CREATE TABLE IF NOT EXISTS prestazioni_catalogo (
                id TEXT PRIMARY KEY,
                codice TEXT NOT NULL DEFAULT '',
                nome TEXT NOT NULL,
                categoria TEXT NOT NULL DEFAULT 'generale',
                durata_stimata_minuti INTEGER NOT NULL DEFAULT 30,
                prezzo_paziente REAL NOT NULL DEFAULT 0,
                tipo_quota_medico TEXT NOT NULL DEFAULT 'percentuale',
                valore_quota_medico REAL NOT NULL DEFAULT 0,
                tipo_quota_segretaria TEXT NOT NULL DEFAULT 'percentuale',
                valore_quota_segretaria REAL NOT NULL DEFAULT 0,
                costo_materiale_stimato REAL NOT NULL DEFAULT 0,
                colore_badge TEXT DEFAULT '#0d9488',
                note TEXT DEFAULT '',
                last_modified INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS appuntamenti (
                id TEXT PRIMARY KEY,
                paziente_id TEXT NOT NULL,
                medico_id TEXT NOT NULL,
                poltrona TEXT NOT NULL DEFAULT 'Unità 1',
                data_ora_inizio INTEGER NOT NULL,
                durata_minuti INTEGER NOT NULL DEFAULT 30,
                motivo_visita TEXT NOT NULL DEFAULT '',
                stato TEXT NOT NULL DEFAULT 'programmato',
                colore_calendario TEXT DEFAULT '#0d9488',
                note TEXT DEFAULT '',
                last_modified INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_appuntamenti_tempo ON appuntamenti(data_ora_inizio);

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
                last_modified INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS allegati_diagnostici (
                id TEXT PRIMARY KEY,
                paziente_id TEXT NOT NULL,
                tipo TEXT NOT NULL DEFAULT 'rx',
                titolo TEXT NOT NULL,
                file_name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_size INTEGER NOT NULL DEFAULT 0,
                mime_type TEXT DEFAULT 'image/jpeg',
                data_esame TEXT NOT NULL,
                note TEXT DEFAULT '',
                last_modified INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS preventivi (
                id TEXT PRIMARY KEY,
                paziente_id TEXT NOT NULL,
                medico_id TEXT DEFAULT '',
                numero_preventivo TEXT NOT NULL,
                data_emissione TEXT NOT NULL,
                stato TEXT NOT NULL DEFAULT 'bozza',
                totale_lordo REAL NOT NULL DEFAULT 0,
                sconto_percentuale REAL DEFAULT 0,
                totale_netto REAL NOT NULL DEFAULT 0,
                acconto_richiesto REAL DEFAULT 0,
                note TEXT DEFAULT '',
                last_modified INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS pagamenti_incassi (
                id TEXT PRIMARY KEY,
                paziente_id TEXT NOT NULL,
                preventivo_id TEXT DEFAULT '',
                numero_documento TEXT NOT NULL,
                tipo_documento TEXT NOT NULL DEFAULT 'ricevuta_sanitaria',
                metodo_pagamento TEXT NOT NULL DEFAULT 'pos',
                importo REAL NOT NULL,
                data_pagamento TEXT NOT NULL,
                note TEXT DEFAULT '',
                last_modified INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS spese_studio (
                id TEXT PRIMARY KEY,
                categoria TEXT NOT NULL,
                descrizione TEXT NOT NULL,
                fornitore TEXT DEFAULT '',
                numero_fattura TEXT DEFAULT '',
                importo REAL NOT NULL,
                data_spesa TEXT NOT NULL,
                metodo_pagamento TEXT DEFAULT 'bonifico',
                allegato_path TEXT DEFAULT '',
                note TEXT DEFAULT '',
                last_modified INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS staff (
                id TEXT PRIMARY KEY,
                nome TEXT NOT NULL,
                cognome TEXT NOT NULL,
                codice_fiscale TEXT DEFAULT '',
                ruolo TEXT NOT NULL DEFAULT 'medico',
                specializzazione TEXT DEFAULT '',
                percentuale_default REAL DEFAULT 0,
                costo_orario REAL DEFAULT 0,
                colore_agenda TEXT DEFAULT '#0d9488',
                telefono TEXT DEFAULT '',
                email TEXT DEFAULT '',
                note TEXT DEFAULT '',
                last_modified INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS liquidazioni_staff (
                id TEXT PRIMARY KEY,
                staff_id TEXT NOT NULL,
                periodo_riferimento TEXT NOT NULL,
                totale_competenze REAL NOT NULL,
                ritenuta_acconto REAL DEFAULT 0,
                totale_liquidato REAL NOT NULL,
                data_liquidazione TEXT NOT NULL,
                metodo_pagamento TEXT DEFAULT 'bonifico',
                note TEXT DEFAULT '',
                last_modified INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0
            );
        `
    },
    {
        version: 2,
        sql: `
            CREATE TABLE IF NOT EXISTS piani_rateali (
                id TEXT PRIMARY KEY,
                paziente_id TEXT NOT NULL,
                preventivo_id TEXT DEFAULT '',
                totale_piano REAL NOT NULL,
                acconto_iniziale REAL NOT NULL DEFAULT 0,
                numero_rate INTEGER NOT NULL DEFAULT 3,
                stato TEXT NOT NULL DEFAULT 'attivo',
                note TEXT DEFAULT '',
                created_at INTEGER NOT NULL,
                last_modified INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_piani_paziente ON piani_rateali(paziente_id);

            CREATE TABLE IF NOT EXISTS rate_scadenziario (
                id TEXT PRIMARY KEY,
                piano_id TEXT NOT NULL,
                paziente_id TEXT NOT NULL,
                numero_rata INTEGER NOT NULL,
                importo REAL NOT NULL,
                data_scadenza TEXT NOT NULL,
                data_pagamento TEXT DEFAULT '',
                stato TEXT NOT NULL DEFAULT 'in_scadenza',
                metodo_pagamento TEXT DEFAULT '',
                numero_ricevuta TEXT DEFAULT '',
                note TEXT DEFAULT '',
                last_modified INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_rate_piano ON rate_scadenziario(piano_id);

            CREATE TABLE IF NOT EXISTS log_notifiche (
                id TEXT PRIMARY KEY,
                paziente_id TEXT NOT NULL,
                tipo_canale TEXT NOT NULL,
                destinatario TEXT NOT NULL,
                messaggio TEXT NOT NULL,
                stato_esito TEXT NOT NULL DEFAULT 'inviato',
                data_invio TEXT NOT NULL,
                created_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_log_notif_paz ON log_notifiche(paziente_id);
        `
    },
    {
        version: 3,
        sql: `
            ALTER TABLE pazienti ADD COLUMN professione TEXT DEFAULT '';
            ALTER TABLE pazienti ADD COLUMN stato_civile TEXT DEFAULT '';
            ALTER TABLE pazienti ADD COLUMN canale_preferito TEXT DEFAULT 'whatsapp';
            ALTER TABLE pazienti ADD COLUMN consenso_promemoria INTEGER DEFAULT 1;
            ALTER TABLE pazienti ADD COLUMN codice_sdi TEXT DEFAULT '';
            ALTER TABLE pazienti ADD COLUMN pec TEXT DEFAULT '';
            ALTER TABLE pazienti ADD COLUMN numero_polizza TEXT DEFAULT '';
            ALTER TABLE pazienti ADD COLUMN medico_curante TEXT DEFAULT '';
            ALTER TABLE pazienti ADD COLUMN tel_medico_curante TEXT DEFAULT '';
            ALTER TABLE pazienti ADD COLUMN contatto_emergenza_nome TEXT DEFAULT '';
            ALTER TABLE pazienti ADD COLUMN contatto_emergenza_parentela TEXT DEFAULT '';
            ALTER TABLE pazienti ADD COLUMN contatto_emergenza_tel TEXT DEFAULT '';
            ALTER TABLE pazienti ADD COLUMN preferenze_orari TEXT DEFAULT '';
            ALTER TABLE pazienti ADD COLUMN pacemaker INTEGER DEFAULT 0;
        `
    },
    {
        version: 4,
        sql: `
            CREATE TABLE IF NOT EXISTS sedi_studio (
                id TEXT PRIMARY KEY,
                nome TEXT NOT NULL,
                codice TEXT DEFAULT '',
                indirizzo TEXT DEFAULT '',
                citta TEXT DEFAULT '',
                cap TEXT DEFAULT '',
                provincia TEXT DEFAULT '',
                telefono TEXT DEFAULT '',
                email TEXT DEFAULT '',
                direttore_sanitario TEXT DEFAULT '',
                is_principale INTEGER DEFAULT 0,
                last_modified INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS sale_studio (
                id TEXT PRIMARY KEY,
                sede_id TEXT NOT NULL,
                nome TEXT NOT NULL,
                tipo_sala TEXT DEFAULT 'operativa',
                piano TEXT DEFAULT '',
                codice_stanza TEXT DEFAULT '',
                dotazioni TEXT DEFAULT '',
                colore TEXT DEFAULT '#0d9488',
                last_modified INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_sale_sede ON sale_studio(sede_id);

            CREATE TABLE IF NOT EXISTS poltrone_studio (
                id TEXT PRIMARY KEY,
                sede_id TEXT NOT NULL,
                sala_id TEXT DEFAULT '',
                nome TEXT NOT NULL,
                codice_unita TEXT DEFAULT '',
                marca_modello TEXT DEFAULT '',
                matricola TEXT DEFAULT '',
                medico_default_id TEXT DEFAULT '',
                assistente_default_id TEXT DEFAULT '',
                colore_agenda TEXT DEFAULT '#0d9488',
                stato TEXT DEFAULT 'attiva',
                note TEXT DEFAULT '',
                last_modified INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_poltrone_sede ON poltrone_studio(sede_id);
            CREATE INDEX IF NOT EXISTS idx_poltrone_sala ON poltrone_studio(sala_id);
        `
    }
];
