module.exports = [
    {
        version: 1,
        sql: `
            CREATE TABLE IF NOT EXISTS clienti (
                id TEXT PRIMARY KEY,
                tipo TEXT NOT NULL DEFAULT 'b2b',
                ragione_sociale TEXT NOT NULL DEFAULT '',
                nome TEXT DEFAULT '',
                cognome TEXT DEFAULT '',
                piva TEXT DEFAULT '',
                codice_fiscale TEXT DEFAULT '',
                email TEXT DEFAULT '',
                pec TEXT DEFAULT '',
                codice_destinatario TEXT DEFAULT '',
                telefono TEXT DEFAULT '',
                indirizzo TEXT DEFAULT '',
                citta TEXT DEFAULT '',
                cap TEXT DEFAULT '',
                provincia TEXT DEFAULT '',
                nazione TEXT DEFAULT 'Italia',
                iban TEXT DEFAULT '',
                condizioni_pagamento TEXT DEFAULT '',
                note TEXT DEFAULT '',
                created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_clienti_ragione_sociale ON clienti(ragione_sociale);
            CREATE INDEX IF NOT EXISTS idx_clienti_piva ON clienti(piva);

            CREATE TABLE IF NOT EXISTS fornitori (
                id TEXT PRIMARY KEY,
                ragione_sociale TEXT NOT NULL DEFAULT '',
                piva TEXT DEFAULT '',
                codice_fiscale TEXT DEFAULT '',
                email TEXT DEFAULT '',
                telefono TEXT DEFAULT '',
                indirizzo TEXT DEFAULT '',
                citta TEXT DEFAULT '',
                cap TEXT DEFAULT '',
                provincia TEXT DEFAULT '',
                iban TEXT DEFAULT '',
                note TEXT DEFAULT '',
                created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_fornitori_ragione_sociale ON fornitori(ragione_sociale);

            CREATE TABLE IF NOT EXISTS categorie_prodotti (
                id TEXT PRIMARY KEY,
                nome TEXT NOT NULL DEFAULT '',
                descrizione TEXT DEFAULT '',
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS prodotti (
                id TEXT PRIMARY KEY,
                categoria_id TEXT DEFAULT '',
                codice TEXT DEFAULT '',
                descrizione TEXT NOT NULL DEFAULT '',
                descrizione_estesa TEXT DEFAULT '',
                unita_misura TEXT DEFAULT 'pz',
                prezzo_acquisto REAL DEFAULT 0,
                prezzo_vendita REAL DEFAULT 0,
                aliquota_iva REAL DEFAULT 22,
                attivo INTEGER DEFAULT 1,
                created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_prodotti_categoria ON prodotti(categoria_id);
            CREATE INDEX IF NOT EXISTS idx_prodotti_descrizione ON prodotti(descrizione);

            CREATE TABLE IF NOT EXISTS collaboratori (
                id TEXT PRIMARY KEY,
                nome TEXT DEFAULT '',
                cognome TEXT DEFAULT '',
                ruolo TEXT DEFAULT '',
                piva TEXT DEFAULT '',
                codice_fiscale TEXT DEFAULT '',
                iban TEXT DEFAULT '',
                percentuale_commissione_default REAL DEFAULT 0,
                attivo INTEGER DEFAULT 1,
                note TEXT DEFAULT '',
                created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS pagamenti_collaboratori (
                id TEXT PRIMARY KEY,
                collaboratore_id TEXT NOT NULL,
                importo REAL DEFAULT 0,
                data TEXT DEFAULT '',
                metodo TEXT DEFAULT '',
                note TEXT DEFAULT '',
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0,
                FOREIGN KEY(collaboratore_id) REFERENCES collaboratori(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_pagamenti_collaboratore ON pagamenti_collaboratori(collaboratore_id);

            CREATE TABLE IF NOT EXISTS preventivi (
                id TEXT PRIMARY KEY,
                numero TEXT DEFAULT '',
                cliente_id TEXT DEFAULT '',
                cliente_ragione_sociale TEXT DEFAULT '',
                cliente_piva TEXT DEFAULT '',
                cliente_codice_fiscale TEXT DEFAULT '',
                cliente_email TEXT DEFAULT '',
                cliente_pec TEXT DEFAULT '',
                cliente_codice_destinatario TEXT DEFAULT '',
                cliente_telefono TEXT DEFAULT '',
                cliente_indirizzo TEXT DEFAULT '',
                cliente_citta TEXT DEFAULT '',
                cliente_cap TEXT DEFAULT '',
                cliente_provincia TEXT DEFAULT '',
                cliente_nazione TEXT DEFAULT 'Italia',
                titolo TEXT DEFAULT '',
                data_emissione TEXT DEFAULT '',
                data_scadenza TEXT DEFAULT '',
                stato TEXT DEFAULT 'bozza',
                versione INTEGER DEFAULT 1,
                aliquota_iva REAL DEFAULT 22,
                arrotonda INTEGER DEFAULT 0,
                totale_imponibile REAL DEFAULT 0,
                totale_iva REAL DEFAULT 0,
                totale_ivato REAL DEFAULT 0,
                totale_costo REAL DEFAULT 0,
                margine_euro REAL DEFAULT 0,
                margine_percentuale REAL DEFAULT 0,
                condizioni_pagamento TEXT DEFAULT '',
                note TEXT DEFAULT '',
                created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0
            );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_preventivi_numero ON preventivi(numero) WHERE numero != '' AND is_deleted = 0;
            CREATE INDEX IF NOT EXISTS idx_preventivi_stato ON preventivi(stato);
            CREATE INDEX IF NOT EXISTS idx_preventivi_cliente ON preventivi(cliente_id);

            CREATE TABLE IF NOT EXISTS voci_preventivo (
                id TEXT PRIMARY KEY,
                preventivo_id TEXT NOT NULL,
                prodotto_id TEXT DEFAULT '',
                descrizione TEXT DEFAULT '',
                descrizione_estesa TEXT DEFAULT '',
                quantita REAL DEFAULT 1,
                unita_misura TEXT DEFAULT 'pz',
                prezzo_acquisto REAL DEFAULT 0,
                prezzo_vendita REAL DEFAULT 0,
                spese_accessorie REAL DEFAULT 0,
                sconto_percentuale REAL DEFAULT 0,
                aliquota_iva REAL DEFAULT 22,
                totale_voce REAL DEFAULT 0,
                margine_euro REAL DEFAULT 0,
                margine_percentuale REAL DEFAULT 0,
                opzionale INTEGER DEFAULT 0,
                ordine INTEGER DEFAULT 0,
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0,
                FOREIGN KEY(preventivo_id) REFERENCES preventivi(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_voci_preventivo_preventivo ON voci_preventivo(preventivo_id);

            CREATE TABLE IF NOT EXISTS assegnazioni_preventivo (
                id TEXT PRIMARY KEY,
                preventivo_id TEXT NOT NULL,
                collaboratore_id TEXT NOT NULL,
                titolo_voce TEXT DEFAULT '',
                tipo_compenso TEXT DEFAULT 'percentuale',
                compenso_fisso REAL DEFAULT 0,
                percentuale_applicata REAL DEFAULT 0,
                compenso_calcolato REAL DEFAULT 0,
                prezzo_al_cliente REAL DEFAULT 0,
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0,
                FOREIGN KEY(preventivo_id) REFERENCES preventivi(id) ON DELETE CASCADE,
                FOREIGN KEY(collaboratore_id) REFERENCES collaboratori(id)
            );
            CREATE INDEX IF NOT EXISTS idx_assegnazioni_preventivo ON assegnazioni_preventivo(preventivo_id);
            CREATE INDEX IF NOT EXISTS idx_assegnazioni_collaboratore ON assegnazioni_preventivo(collaboratore_id);

            CREATE TABLE IF NOT EXISTS revisioni_preventivo (
                id TEXT PRIMARY KEY,
                preventivo_id TEXT NOT NULL,
                versione INTEGER DEFAULT 1,
                snapshot_json TEXT DEFAULT '',
                motivo TEXT DEFAULT '',
                created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                FOREIGN KEY(preventivo_id) REFERENCES preventivi(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_revisioni_preventivo ON revisioni_preventivo(preventivo_id);

            CREATE TABLE IF NOT EXISTS fatture (
                id TEXT PRIMARY KEY,
                numero TEXT DEFAULT '',
                anno INTEGER DEFAULT 0,
                progressivo INTEGER DEFAULT 0,
                tipo_documento TEXT DEFAULT 'TD01',
                preventivo_id TEXT DEFAULT '',
                cliente_id TEXT DEFAULT '',
                cliente_ragione_sociale TEXT DEFAULT '',
                cliente_piva TEXT DEFAULT '',
                cliente_codice_fiscale TEXT DEFAULT '',
                cliente_email TEXT DEFAULT '',
                cliente_pec TEXT DEFAULT '',
                cliente_codice_destinatario TEXT DEFAULT '',
                cliente_indirizzo TEXT DEFAULT '',
                cliente_citta TEXT DEFAULT '',
                cliente_cap TEXT DEFAULT '',
                cliente_provincia TEXT DEFAULT '',
                cliente_nazione TEXT DEFAULT 'Italia',
                data_emissione TEXT DEFAULT '',
                regime_fiscale TEXT DEFAULT 'RF01',
                totale_imponibile REAL DEFAULT 0,
                totale_iva REAL DEFAULT 0,
                totale_documento REAL DEFAULT 0,
                ritenuta_acconto_attiva INTEGER DEFAULT 0,
                ritenuta_acconto_percentuale REAL DEFAULT 20,
                ritenuta_acconto_importo REAL DEFAULT 0,
                cassa_previdenziale_attiva INTEGER DEFAULT 0,
                cassa_previdenziale_percentuale REAL DEFAULT 4,
                cassa_previdenziale_importo REAL DEFAULT 0,
                split_payment INTEGER DEFAULT 0,
                bollo_virtuale INTEGER DEFAULT 0,
                importo_bollo REAL DEFAULT 2,
                codice_cig TEXT DEFAULT '',
                codice_cup TEXT DEFAULT '',
                modalita_pagamento TEXT DEFAULT 'MP05',
                stato TEXT DEFAULT 'bozza',
                stato_sdi TEXT DEFAULT '',
                note TEXT DEFAULT '',
                created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0
            );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_fatture_numero_anno ON fatture(numero, anno) WHERE numero != '' AND is_deleted = 0;
            CREATE INDEX IF NOT EXISTS idx_fatture_cliente ON fatture(cliente_id);
            CREATE INDEX IF NOT EXISTS idx_fatture_stato ON fatture(stato);

            CREATE TABLE IF NOT EXISTS voci_fatture (
                id TEXT PRIMARY KEY,
                fattura_id TEXT NOT NULL,
                descrizione TEXT DEFAULT '',
                quantita REAL DEFAULT 1,
                unita_misura TEXT DEFAULT 'pz',
                prezzo_unitario REAL DEFAULT 0,
                sconto_percentuale REAL DEFAULT 0,
                aliquota_iva REAL DEFAULT 22,
                natura_iva TEXT DEFAULT '',
                totale_riga REAL DEFAULT 0,
                ordine INTEGER DEFAULT 0,
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0,
                FOREIGN KEY(fattura_id) REFERENCES fatture(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_voci_fatture_fattura ON voci_fatture(fattura_id);

            CREATE TABLE IF NOT EXISTS scadenze_pagamento (
                id TEXT PRIMARY KEY,
                fattura_id TEXT NOT NULL,
                numero_rata INTEGER DEFAULT 1,
                totale_rate INTEGER DEFAULT 1,
                data_scadenza TEXT DEFAULT '',
                importo_rata REAL DEFAULT 0,
                importo_pagato REAL DEFAULT 0,
                data_pagamento TEXT DEFAULT '',
                stato TEXT DEFAULT 'pending',
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0,
                FOREIGN KEY(fattura_id) REFERENCES fatture(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_scadenze_fattura ON scadenze_pagamento(fattura_id);
            CREATE INDEX IF NOT EXISTS idx_scadenze_stato ON scadenze_pagamento(stato);
            CREATE INDEX IF NOT EXISTS idx_scadenze_data ON scadenze_pagamento(data_scadenza);

            CREATE TABLE IF NOT EXISTS ddt (
                id TEXT PRIMARY KEY,
                numero TEXT DEFAULT '',
                cliente_id TEXT DEFAULT '',
                cliente_ragione_sociale TEXT DEFAULT '',
                cliente_indirizzo TEXT DEFAULT '',
                cliente_citta TEXT DEFAULT '',
                cliente_cap TEXT DEFAULT '',
                cliente_provincia TEXT DEFAULT '',
                preventivo_id TEXT DEFAULT '',
                fattura_id TEXT DEFAULT '',
                data TEXT DEFAULT '',
                causale_trasporto TEXT DEFAULT 'Vendita',
                porto TEXT DEFAULT 'Franco',
                vettore TEXT DEFAULT '',
                colli INTEGER DEFAULT 1,
                peso REAL DEFAULT 0,
                note TEXT DEFAULT '',
                created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0
            );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_ddt_numero ON ddt(numero) WHERE numero != '' AND is_deleted = 0;

            CREATE TABLE IF NOT EXISTS voci_ddt (
                id TEXT PRIMARY KEY,
                ddt_id TEXT NOT NULL,
                descrizione TEXT DEFAULT '',
                quantita REAL DEFAULT 1,
                unita_misura TEXT DEFAULT 'pz',
                ordine INTEGER DEFAULT 0,
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0,
                FOREIGN KEY(ddt_id) REFERENCES ddt(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_voci_ddt_ddt ON voci_ddt(ddt_id);

            CREATE TABLE IF NOT EXISTS transazioni_finanziarie (
                id TEXT PRIMARY KEY,
                tipo TEXT NOT NULL DEFAULT 'entrata',
                importo REAL DEFAULT 0,
                data TEXT DEFAULT '',
                categoria TEXT DEFAULT '',
                descrizione TEXT DEFAULT '',
                cliente_id TEXT DEFAULT '',
                fornitore_id TEXT DEFAULT '',
                preventivo_id TEXT DEFAULT '',
                fattura_id TEXT DEFAULT '',
                collaboratore_id TEXT DEFAULT '',
                note TEXT DEFAULT '',
                created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_transazioni_tipo ON transazioni_finanziarie(tipo);
            CREATE INDEX IF NOT EXISTS idx_transazioni_data ON transazioni_finanziarie(data);

            CREATE TABLE IF NOT EXISTS impostazioni_business_suite (
                key_name TEXT PRIMARY KEY,
                key_value TEXT DEFAULT '',
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER))
            );
        `
    }
];
