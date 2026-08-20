const crypto = require('crypto');
const { db, persist } = require('./db_utils');

async function getAppuntamenti(event, args = {}) {
    try {
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const { dateFrom, dateTo, medico_id, poltrona } = args || {};
        let sql = `SELECT a.*, p.nome as paziente_nome, p.cognome as paziente_cognome, p.telefono as paziente_telefono, p.codice_fiscale as paziente_cf, s.nome as medico_nome, s.cognome as medico_cognome, s.colore_calendario, cp.nome as prestazione_nome
                    FROM appuntamenti a
                    LEFT JOIN pazienti p ON p.id = a.paziente_id
                    LEFT JOIN staff_clinico s ON s.id = a.medico_id
                    LEFT JOIN catalogo_prestazioni cp ON cp.id = a.prestazione_id
                    WHERE a.is_deleted = 0`;
        const params = [];
        if (dateFrom) { sql += ' AND a.data_ora_inizio >= ?'; params.push(Number(dateFrom)); }
        if (dateTo) { sql += ' AND a.data_ora_inizio <= ?'; params.push(Number(dateTo)); }
        if (medico_id) { sql += ' AND a.medico_id = ?'; params.push(medico_id); }
        if (poltrona) { sql += ' AND a.poltrona = ?'; params.push(poltrona); }
        sql += ' ORDER BY a.data_ora_inizio ASC';
        const rows = d.query(sql, params);
        return { success: true, data: rows || [] };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function createAppuntamento(event, payload = {}) {
    try {
        const { paziente_id, medico_id, data_ora_inizio, data_ora_fine } = payload || {};
        if (!paziente_id || !medico_id || !data_ora_inizio) {
            return { success: false, error: 'Paziente, Medico e Data/Ora sono obbligatori' };
        }
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const id = crypto.randomUUID();
        const now = Date.now();
        const start = Number(data_ora_inizio);
        const end = Number(data_ora_fine) || (start + 30 * 60 * 1000);
        d.run(
            "INSERT INTO appuntamenti (id, paziente_id, medico_id, prestazione_id, data_ora_inizio, data_ora_fine, poltrona, motivo, stato, note, created_at, last_modified, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
            [
                id, paziente_id, medico_id, payload.prestazione_id || '',
                start, end, payload.poltrona || 'Unità 1',
                payload.motivo || '', payload.stato || 'confermato',
                payload.note || '', now, now
            ]
        );
        await persist();
        return { success: true, id };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function updateAppuntamento(event, payload = {}) {
    try {
        const { id, data_ora_inizio, data_ora_fine } = payload || {};
        if (!id) return { success: false, error: 'ID mancante' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const now = Date.now();
        const start = Number(data_ora_inizio);
        const end = Number(data_ora_fine) || (start + 30 * 60 * 1000);
        d.run(
            "UPDATE appuntamenti SET paziente_id = ?, medico_id = ?, prestazione_id = ?, data_ora_inizio = ?, data_ora_fine = ?, poltrona = ?, motivo = ?, stato = ?, note = ?, last_modified = ? WHERE id = ?",
            [
                payload.paziente_id, payload.medico_id, payload.prestazione_id || '',
                start, end, payload.poltrona || 'Unità 1',
                payload.motivo || '', payload.stato || 'confermato',
                payload.note || '', now, id
            ]
        );
        await persist();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function updateStato(event, payload = {}) {
    try {
        const { id, stato } = payload || {};
        if (!id || !stato) return { success: false, error: 'Parametri mancanti' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        d.run("UPDATE appuntamenti SET stato = ?, last_modified = ? WHERE id = ?", [stato, Date.now(), id]);
        await persist();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function deleteAppuntamento(event, args = {}) {
    try {
        const { id } = args || {};
        if (!id) return { success: false, error: 'ID mancante' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        d.run("UPDATE appuntamenti SET is_deleted = 1, last_modified = ? WHERE id = ?", [Date.now(), id]);
        await persist();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = { getAppuntamenti, createAppuntamento, updateAppuntamento, updateStato, deleteAppuntamento };
