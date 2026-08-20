const crypto = require('crypto');
const { db, persist } = require('./db_utils');

async function getPreventivi(event, args = {}) {
    try {
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const { paziente_id } = args || {};
        let sql = `SELECT pr.*, p.nome as paziente_nome, p.cognome as paziente_cognome, p.codice_fiscale as paziente_cf, s.nome as medico_nome, s.cognome as medico_cognome
                    FROM preventivi pr
                    LEFT JOIN pazienti p ON p.id = pr.paziente_id
                    LEFT JOIN staff_clinico s ON s.id = pr.medico_id
                    WHERE pr.is_deleted = 0`;
        const params = [];
        if (paziente_id) { sql += ' AND pr.paziente_id = ?'; params.push(paziente_id); }
        sql += ' ORDER BY pr.data_emissione DESC';
        const rows = d.query(sql, params);
        return { success: true, data: rows || [] };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function createPreventivo(event, payload = {}) {
    try {
        const { paziente_id, totale_netto, voci_json } = payload || {};
        if (!paziente_id) return { success: false, error: 'Paziente mancante' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const id = crypto.randomUUID();
        const now = Date.now();
        const year = new Date().getFullYear();
        const count = d.query("SELECT COUNT(*) as c FROM preventivi WHERE is_deleted = 0")[0].c + 1;
        const num = `PREV-${year}-${String(count).padStart(4, '0')}`;
        d.run(
            "INSERT INTO preventivi (id, numero_preventivo, paziente_id, medico_id, data_emissione, stato, totale_lordo, sconto_percentuale, totale_netto, voci_json, note, created_at, last_modified, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
            [
                id, num, paziente_id, payload.medico_id || '',
                payload.data_emissione || new Date().toISOString().split('T')[0],
                payload.stato || 'bozza',
                Number(payload.totale_lordo) || Number(totale_netto) || 0,
                Number(payload.sconto_percentuale) || 0,
                Number(totale_netto) || 0,
                typeof voci_json === 'string' ? voci_json : JSON.stringify(voci_json || []),
                payload.note || '', now, now
            ]
        );
        await persist();
        return { success: true, id, numero_preventivo: num };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function updatePreventivo(event, payload = {}) {
    try {
        const { id } = payload || {};
        if (!id) return { success: false, error: 'ID mancante' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const now = Date.now();
        d.run(
            "UPDATE preventivi SET stato = ?, totale_lordo = ?, sconto_percentuale = ?, totale_netto = ?, voci_json = ?, note = ?, last_modified = ? WHERE id = ?",
            [
                payload.stato || 'bozza',
                Number(payload.totale_lordo) || 0,
                Number(payload.sconto_percentuale) || 0,
                Number(payload.totale_netto) || 0,
                typeof payload.voci_json === 'string' ? payload.voci_json : JSON.stringify(payload.voci_json || []),
                payload.note || '', now, id
            ]
        );
        await persist();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function deletePreventivo(event, args = {}) {
    try {
        const { id } = args || {};
        if (!id) return { success: false, error: 'ID mancante' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        d.run("UPDATE preventivi SET is_deleted = 1, last_modified = ? WHERE id = ?", [Date.now(), id]);
        await persist();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function getIncassi(event, args = {}) {
    try {
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const { paziente_id, dateFrom, dateTo } = args || {};
        let sql = `SELECT pi.*, p.nome as paziente_nome, p.cognome as paziente_cognome, p.codice_fiscale as paziente_cf
                    FROM pagamenti_incassi pi
                    LEFT JOIN pazienti p ON p.id = pi.paziente_id
                    WHERE pi.is_deleted = 0`;
        const params = [];
        if (paziente_id) { sql += ' AND pi.paziente_id = ?'; params.push(paziente_id); }
        if (dateFrom) { sql += ' AND pi.data_pagamento >= ?'; params.push(dateFrom); }
        if (dateTo) { sql += ' AND pi.data_pagamento <= ?'; params.push(dateTo); }
        sql += ' ORDER BY pi.data_pagamento DESC';
        const rows = d.query(sql, params);
        return { success: true, data: rows || [] };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function registraIncasso(event, payload = {}) {
    try {
        const { paziente_id, importo } = payload || {};
        if (!paziente_id || !importo) return { success: false, error: 'Paziente e Importo sono obbligatori' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const id = crypto.randomUUID();
        const now = Date.now();
        const year = new Date().getFullYear();
        const count = d.query("SELECT COUNT(*) as c FROM pagamenti_incassi WHERE is_deleted = 0")[0].c + 1;
        const numDoc = payload.numero_documento || `RIC-${year}-${String(count).padStart(4, '0')}`;
        d.run(
            "INSERT INTO pagamenti_incassi (id, paziente_id, preventivo_id, trattamento_id, data_pagamento, importo, metodo_pagamento, tipo_documento, numero_documento, note, created_at, last_modified, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
            [
                id, paziente_id, payload.preventivo_id || '', payload.trattamento_id || '',
                payload.data_pagamento || new Date().toISOString().split('T')[0],
                Number(importo) || 0,
                payload.metodo_pagamento || 'pos',
                payload.tipo_documento || 'ricevuta_sanitaria',
                numDoc, payload.note || '', now, now
            ]
        );
        await persist();
        return { success: true, id, numero_documento: numDoc };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function getSpese(event, args = {}) {
    try {
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const { dateFrom, dateTo, categoria } = args || {};
        let sql = "SELECT * FROM spese_studio WHERE is_deleted = 0";
        const params = [];
        if (categoria) { sql += ' AND categoria = ?'; params.push(categoria); }
        if (dateFrom) { sql += ' AND data_spesa >= ?'; params.push(dateFrom); }
        if (dateTo) { sql += ' AND data_spesa <= ?'; params.push(dateTo); }
        sql += ' ORDER BY data_spesa DESC';
        const rows = d.query(sql, params);
        return { success: true, data: rows || [] };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function registraSpesa(event, payload = {}) {
    try {
        const { categoria, descrizione, importo } = payload || {};
        if (!categoria || !descrizione || !importo) return { success: false, error: 'Dati spesa incompleti' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const id = crypto.randomUUID();
        const now = Date.now();
        d.run(
            "INSERT INTO spese_studio (id, categoria, descrizione, fornitore, data_spesa, importo, metodo_pagamento, numero_fattura, note, created_at, last_modified, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
            [
                id, categoria, descrizione, payload.fornitore || '',
                payload.data_spesa || new Date().toISOString().split('T')[0],
                Number(importo) || 0,
                payload.metodo_pagamento || 'bonifico',
                payload.numero_fattura || '',
                payload.note || '', now, now
            ]
        );
        await persist();
        return { success: true, id };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function deleteSpesa(event, args = {}) {
    try {
        const { id } = args || {};
        if (!id) return { success: false, error: 'ID mancante' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        d.run("UPDATE spese_studio SET is_deleted = 1, last_modified = ? WHERE id = ?", [Date.now(), id]);
        await persist();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = {
    getPreventivi, createPreventivo, updatePreventivo, deletePreventivo,
    getIncassi, registraIncasso, getSpese, registraSpesa, deleteSpesa
};
