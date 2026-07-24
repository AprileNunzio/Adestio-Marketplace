'use strict';

// Utility condivise per gli handler di Adestio Business Suite.
// Il DB e' quello cifrato di Adestio (via AppDbManager, iniettato da AppLoader
// al caricamento), non un file sqlite proprio: nessun driver nativo da
// portarsi dietro nello zip, e coerenza con backup/crittografia del nodo.

const crypto = require('crypto');

const DB_DOMAIN = 'app_adestio_business_suite';
let _adestioDb = null;

function configure(adestioDb) {
    _adestioDb = adestioDb;
}

function db() {
    return _adestioDb.getDB(DB_DOMAIN);
}

async function persist() {
    await _adestioDb.saveDB(DB_DOMAIN);
}

// Ragione sociale, P.IVA e Codice Fiscale sono l'identita' fiscale della STESSA
// azienda gia' configurata in Adestio > Amministratore > Dati Azienda: non ha
// senso che l'utente li reinserisca qui, e tenerne una copia locale li farebbe
// andare fuori sincro alla prima modifica in Amministrazione. Si leggono quindi
// sempre dal vivo, in sola lettura (readConfig e' l'unica funzione iniettata
// da AppLoader per questo scopo: niente saveConfig, quindi nessuna scrittura
// possibile da qui). Indirizzo/CAP/Citta/Provincia restano invece propri di
// Business Suite: FatturaPA li richiede come campi separati, mentre in Adestio
// e' un unico indirizzo libero non strutturato.
function getAdestioIdentita() {
    try {
        if (!_adestioDb || typeof _adestioDb.readConfig !== 'function') return {};
        const cfg = _adestioDb.readConfig() || {};
        return {
            ragione_sociale_azienda: cfg.istituto_nome || '',
            piva_azienda: cfg.istituto_piva || '',
            codice_fiscale_azienda: cfg.istituto_cf || ''
        };
    } catch (e) {
        return {};
    }
}

function newId() {
    return crypto.randomUUID();
}

function now() {
    return Date.now();
}

// Factory per un CRUD semplice con soft-delete su una tabella con colonne fisse.
function buildSimpleCrud(tableName, fields, options = {}) {
    const orderBy = options.orderBy || 'last_modified DESC';

    async function getAll(event, args = {}) {
        try {
            const includeDeleted = args && args.includeDeleted;
            const rows = db().query(
                `SELECT * FROM ${tableName} WHERE is_deleted <= ? ORDER BY ${orderBy}`,
                [includeDeleted ? 1 : 0]
            );
            return { success: true, data: rows };
        } catch (e) {
            console.error(`[BusinessSuite:${tableName}] getAll error:`, e.message);
            return { success: false, error: e.message };
        }
    }

    async function getById(event, args) {
        try {
            const { id } = args || {};
            if (!id) return { success: false, error: 'ID mancante' };
            const rows = db().query(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
            if (rows.length === 0) return { success: false, error: 'Non trovato' };
            return { success: true, data: rows[0] };
        } catch (e) {
            console.error(`[BusinessSuite:${tableName}] getById error:`, e.message);
            return { success: false, error: e.message };
        }
    }

    async function create(event, args = {}) {
        try {
            const id = newId();
            const ts = now();
            const cols = ['id', ...fields, 'created_at', 'last_modified', 'is_deleted'];
            const vals = [id, ...fields.map(f => args[f] !== undefined ? args[f] : ''), ts, ts, 0];
            const placeholders = cols.map(() => '?').join(', ');
            db().run(`INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders})`, vals);
            await persist();
            return { success: true, data: { id } };
        } catch (e) {
            console.error(`[BusinessSuite:${tableName}] create error:`, e.message);
            return { success: false, error: e.message };
        }
    }

    async function update(event, args = {}) {
        try {
            const { id } = args;
            if (!id) return { success: false, error: 'ID mancante' };
            const ts = now();
            const setClause = fields.map(f => `${f} = ?`).join(', ');
            const vals = [...fields.map(f => args[f] !== undefined ? args[f] : ''), ts, id];
            db().run(`UPDATE ${tableName} SET ${setClause}, last_modified = ? WHERE id = ?`, vals);
            await persist();
            return { success: true };
        } catch (e) {
            console.error(`[BusinessSuite:${tableName}] update error:`, e.message);
            return { success: false, error: e.message };
        }
    }

    async function remove(event, args = {}) {
        try {
            const { id } = args;
            if (!id) return { success: false, error: 'ID mancante' };
            db().run(`UPDATE ${tableName} SET is_deleted = 1, last_modified = ? WHERE id = ?`, [now(), id]);
            await persist();
            return { success: true };
        } catch (e) {
            console.error(`[BusinessSuite:${tableName}] remove error:`, e.message);
            return { success: false, error: e.message };
        }
    }

    async function restore(event, args = {}) {
        try {
            const { id } = args;
            if (!id) return { success: false, error: 'ID mancante' };
            db().run(`UPDATE ${tableName} SET is_deleted = 0, last_modified = ? WHERE id = ?`, [now(), id]);
            await persist();
            return { success: true };
        } catch (e) {
            console.error(`[BusinessSuite:${tableName}] restore error:`, e.message);
            return { success: false, error: e.message };
        }
    }

    return { getAll, getById, create, update, remove, restore };
}

module.exports = { configure, db, persist, newId, now, DB_DOMAIN, buildSimpleCrud, getAdestioIdentita };
