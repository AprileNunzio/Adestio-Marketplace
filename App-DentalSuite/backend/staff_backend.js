const crypto = require('crypto');
const { db, persist } = require('./db_utils');

async function getAll(event, args = {}) {
    try {
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const rows = d.query("SELECT * FROM staff_clinico WHERE is_deleted = 0 ORDER BY ruolo, cognome, nome");
        if (!rows || rows.length === 0) {
            const defaults = [
                { nome: 'Direttore', cognome: 'Sanitario', ruolo: 'direttore_sanitario', spec: 'Odontoiatria e Chirurgia Orale', colore: '#0d9488' },
                { nome: 'Marco', cognome: 'Rossi', ruolo: 'medico_odontoiatra', spec: 'Conservativa ed Endodonzia', colore: '#2563eb' },
                { nome: 'Laura', cognome: 'Bianchi', ruolo: 'igienista_dentale', spec: 'Igiene e Profilassi', colore: '#16a34a' },
                { nome: 'Chiara', cognome: 'Verdi', ruolo: 'aso_assistente', spec: 'Assistenza alla Poltrona', colore: '#d97706' },
                { nome: 'Elena', cognome: 'Neri', ruolo: 'segretaria_receptionist', spec: 'Accoglienza e Amministrazione', colore: '#9333ea' }
            ];
            const now = Date.now();
            for (const s of defaults) {
                d.run(
                    "INSERT INTO staff_clinico (id, nome, cognome, ruolo, codice_fiscale, albo_numero, specializzazione, telefono, email, colore_calendario, tipo_compenso_default, valore_compenso_default, attivo, created_at, last_modified, is_deleted) VALUES (?, ?, ?, ?, '', '', ?, '', '', ?, 'percentuale', 35, 1, ?, ?, 0)",
                    [crypto.randomUUID(), s.nome, s.cognome, s.ruolo, s.spec, s.colore, now, now]
                );
            }
            await persist();
            return { success: true, data: d.query("SELECT * FROM staff_clinico WHERE is_deleted = 0 ORDER BY ruolo, cognome, nome") };
        }
        return { success: true, data: rows };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function create(event, payload = {}) {
    try {
        const { nome, cognome, ruolo } = payload || {};
        if (!nome || !cognome || !ruolo) return { success: false, error: 'Nome, Cognome e Ruolo sono obbligatori' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const id = crypto.randomUUID();
        const now = Date.now();
        d.run(
            "INSERT INTO staff_clinico (id, nome, cognome, ruolo, codice_fiscale, albo_numero, specializzazione, telefono, email, colore_calendario, tipo_compenso_default, valore_compenso_default, attivo, created_at, last_modified, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
            [
                id, nome, cognome, ruolo, payload.codice_fiscale || '',
                payload.albo_numero || '', payload.specializzazione || '',
                payload.telefono || '', payload.email || '',
                payload.colore_calendario || '#0d9488',
                payload.tipo_compenso_default || 'percentuale',
                Number(payload.valore_compenso_default) || 0,
                payload.attivo !== undefined ? (payload.attivo ? 1 : 0) : 1,
                now, now
            ]
        );
        await persist();
        return { success: true, id };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function update(event, payload = {}) {
    try {
        const { id, nome, cognome, ruolo } = payload || {};
        if (!id || !nome || !cognome || !ruolo) return { success: false, error: 'Dati incompleti' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const now = Date.now();
        d.run(
            "UPDATE staff_clinico SET nome = ?, cognome = ?, ruolo = ?, codice_fiscale = ?, albo_numero = ?, specializzazione = ?, telefono = ?, email = ?, colore_calendario = ?, tipo_compenso_default = ?, valore_compenso_default = ?, attivo = ?, last_modified = ? WHERE id = ?",
            [
                nome, cognome, ruolo, payload.codice_fiscale || '',
                payload.albo_numero || '', payload.specializzazione || '',
                payload.telefono || '', payload.email || '',
                payload.colore_calendario || '#0d9488',
                payload.tipo_compenso_default || 'percentuale',
                Number(payload.valore_compenso_default) || 0,
                payload.attivo ? 1 : 0,
                now, id
            ]
        );
        await persist();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function remove(event, args = {}) {
    try {
        const { id } = args || {};
        if (!id) return { success: false, error: 'ID mancante' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        d.run("UPDATE staff_clinico SET is_deleted = 1, last_modified = ? WHERE id = ?", [Date.now(), id]);
        await persist();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function getLiquidazioni(event, args = {}) {
    try {
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const { staff_id } = args || {};
        let sql = `SELECT l.*, s.nome as staff_nome, s.cognome as staff_cognome, s.ruolo as staff_ruolo
                    FROM liquidazioni_staff l
                    LEFT JOIN staff_clinico s ON s.id = l.staff_id
                    WHERE l.is_deleted = 0`;
        const params = [];
        if (staff_id) { sql += ' AND l.staff_id = ?'; params.push(staff_id); }
        sql += ' ORDER BY l.data_liquidazione DESC';
        const rows = d.query(sql, params);
        return { success: true, data: rows || [] };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function creaLiquidazione(event, payload = {}) {
    try {
        const { staff_id, periodo_riferimento, totale_competenze } = payload || {};
        if (!staff_id || !totale_competenze) return { success: false, error: 'Dati liquidazione incompleti' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const id = crypto.randomUUID();
        const now = Date.now();
        d.run(
            "INSERT INTO liquidazioni_staff (id, staff_id, periodo_riferimento, data_liquidazione, totale_competenze, trattamenti_inclusi_json, stato, metodo_pagamento, note, created_at, last_modified, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
            [
                id, staff_id, periodo_riferimento || new Date().toISOString().slice(0, 7),
                payload.data_liquidazione || new Date().toISOString().split('T')[0],
                Number(totale_competenze) || 0,
                payload.trattamenti_inclusi_json || '[]',
                payload.stato || 'liquidato',
                payload.metodo_pagamento || 'bonifico',
                payload.note || '', now, now
            ]
        );
        await persist();
        return { success: true, id };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = { getAll, create, update, remove, getLiquidazioni, creaLiquidazione };
