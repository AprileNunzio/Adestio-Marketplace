const path = require('path');
const fs = require('fs');

let dbPath = null;
let SQL = null;
let db = null;

function getDbPath(app) {
    try {
        const userDataPath = app ? app.getPath('userData') : (process.env.APPDATA || process.cwd());
        const appDir = path.join(userDataPath, 'AdestioApps', 'adestio_business_suite');
        if (!fs.existsSync(appDir)) {
            fs.mkdirSync(appDir, { recursive: true });
        }
        dbPath = path.join(appDir, 'business_suite.db');
        return dbPath;
    } catch (error) {
        console.error("getDbPath failure:", error);
        return path.join(process.cwd(), 'business_suite.db');
    }
}

function initDatabase(app) {
    try {
        const targetPath = getDbPath(app);
        const sqlite3 = require('sqlite3').verbose();
        db = new sqlite3.Database(targetPath);

        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS impostazioni (
                chiave TEXT PRIMARY KEY,
                valore TEXT NOT NULL,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS clienti (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                ragione_sociale TEXT DEFAULT '',
                piva TEXT DEFAULT '',
                cf TEXT DEFAULT '',
                email TEXT DEFAULT '',
                telefono TEXT DEFAULT '',
                indirizzo TEXT DEFAULT '',
                citta TEXT DEFAULT '',
                cap TEXT DEFAULT '',
                provincia TEXT DEFAULT '',
                nazione TEXT DEFAULT 'IT',
                codice_destinatario TEXT DEFAULT '0000000',
                pec TEXT DEFAULT '',
                is_pa INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS fornitori (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ragione_sociale TEXT NOT NULL,
                piva TEXT DEFAULT '',
                cf TEXT DEFAULT '',
                email TEXT DEFAULT '',
                telefono TEXT DEFAULT '',
                indirizzo TEXT DEFAULT '',
                citta TEXT DEFAULT '',
                cap TEXT DEFAULT '',
                note TEXT DEFAULT '',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS collaboratori (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                cognome TEXT NOT NULL,
                email TEXT DEFAULT '',
                telefono TEXT DEFAULT '',
                ruolo TEXT DEFAULT 'Collaboratore',
                commissione_pct REAL DEFAULT 0,
                attivo INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS prodotti_magazzino (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                codice_articolo TEXT UNIQUE NOT NULL,
                descrizione TEXT NOT NULL,
                categoria TEXT DEFAULT 'Generale',
                unita_misura TEXT DEFAULT 'pz',
                prezzo_acquisto REAL DEFAULT 0,
                prezzo_vendita REAL DEFAULT 0,
                aliquota_iva REAL DEFAULT 22,
                giacenza REAL DEFAULT 0,
                scorta_minima REAL DEFAULT 0,
                fornitore TEXT DEFAULT '',
                barcode TEXT DEFAULT '',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS preventivi (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                codice TEXT UNIQUE NOT NULL,
                titolo TEXT NOT NULL,
                cliente_id INTEGER,
                cliente_nome TEXT NOT NULL,
                data_creazione TEXT NOT NULL,
                data_scadenza TEXT DEFAULT '',
                stato TEXT DEFAULT 'bozza',
                condizioni_pagamento TEXT DEFAULT 'Rimessa Diretta',
                iva_percentuale REAL DEFAULT 22,
                totale_imponibile REAL DEFAULT 0,
                totale_iva REAL DEFAULT 0,
                totale_ivato REAL DEFAULT 0,
                totale_costo REAL DEFAULT 0,
                margine_euro REAL DEFAULT 0,
                margine_pct REAL DEFAULT 0,
                note TEXT DEFAULT '',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS voci_preventivo (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                preventivo_id INTEGER NOT NULL,
                prodotto_id INTEGER,
                descrizione TEXT NOT NULL,
                quantita REAL DEFAULT 1,
                unita_misura TEXT DEFAULT 'pz',
                prezzo_acquisto REAL DEFAULT 0,
                prezzo_vendita REAL DEFAULT 0,
                sconto_pct REAL DEFAULT 0,
                aliquota_iva REAL DEFAULT 22,
                totale_voce REAL DEFAULT 0,
                margine_euro REAL DEFAULT 0
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS ddt (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                numero TEXT UNIQUE NOT NULL,
                data_ddt TEXT NOT NULL,
                cliente_id INTEGER,
                cliente_nome TEXT NOT NULL,
                causale TEXT DEFAULT 'Vendita',
                vettore TEXT DEFAULT '',
                colli INTEGER DEFAULT 1,
                stato TEXT DEFAULT 'emesso',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS fatture (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                numero TEXT UNIQUE NOT NULL,
                anno INTEGER NOT NULL,
                preventivo_id INTEGER,
                ddt_id INTEGER,
                tipo_documento TEXT DEFAULT 'TD01',
                data_fattura TEXT NOT NULL,
                cliente_id INTEGER,
                cliente_nome TEXT NOT NULL,
                cliente_piva TEXT DEFAULT '',
                cliente_sdi TEXT DEFAULT '0000000',
                totale_imponibile REAL DEFAULT 0,
                totale_iva REAL DEFAULT 0,
                totale_fattura REAL DEFAULT 0,
                ritenuta_acconto REAL DEFAULT 0,
                cassa_previdenziale REAL DEFAULT 0,
                split_payment INTEGER DEFAULT 0,
                stato TEXT DEFAULT 'emessa',
                stato_sdi TEXT DEFAULT 'non_inviata',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS voci_fattura (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fattura_id INTEGER NOT NULL,
                descrizione TEXT NOT NULL,
                quantita REAL DEFAULT 1,
                prezzo_unitario REAL DEFAULT 0,
                aliquota_iva REAL DEFAULT 22,
                sconto_pct REAL DEFAULT 0,
                totale_riga REAL DEFAULT 0
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS transazioni_finanziarie (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tipo TEXT NOT NULL,
                categoria TEXT DEFAULT 'Generale',
                importo REAL DEFAULT 0,
                data_transazione TEXT NOT NULL,
                metodo TEXT DEFAULT 'Bonifico',
                descrizione TEXT DEFAULT '',
                fattura_id INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS pos_scontrini (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                numero_scontrino TEXT UNIQUE NOT NULL,
                data_ora TEXT DEFAULT CURRENT_TIMESTAMP,
                totale_lordo REAL DEFAULT 0,
                metodo_pagamento TEXT DEFAULT 'CONTANTI',
                importo_pagato REAL DEFAULT 0,
                resto REAL DEFAULT 0,
                operatore TEXT DEFAULT 'cassa'
            )`);
        });

        return { success: true, path: targetPath };
    } catch (error) {
        console.error("initDatabase error:", error);
        return { success: false, error: error.message };
    }
}

function queryAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        try {
            if (!db) {
                resolve([]);
                return;
            }
            db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error("queryAll error:", err);
                    resolve([]);
                } else {
                    resolve(rows || []);
                }
            });
        } catch (error) {
            console.error("queryAll exception:", error);
            resolve([]);
        }
    });
}

function queryRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        try {
            if (!db) {
                resolve({ success: false });
                return;
            }
            db.run(sql, params, function (err) {
                if (err) {
                    console.error("queryRun error:", err);
                    resolve({ success: false, error: err.message });
                } else {
                    resolve({ success: true, lastID: this.lastID, changes: this.changes });
                }
            });
        } catch (error) {
            console.error("queryRun exception:", error);
            resolve({ success: false, error: error.message });
        }
    });
}

module.exports = {
    getDbPath,
    initDatabase,
    queryAll,
    queryRun
};
