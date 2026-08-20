const crypto = require('crypto');
const { db, persist } = require('./db_utils');

async function logNotification(event, payload = {}) {
    try {
        const { paziente_id, tipo_canale, destinatario, messaggio } = payload || {};
        if (!paziente_id || !tipo_canale) return { success: false, error: 'Dati notifica incompleti' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };

        const id = crypto.randomUUID();
        const now = Date.now();
        const nowStr = new Date().toISOString();

        d.run(
            "INSERT INTO log_notifiche (id, paziente_id, appuntamento_id, tipo_canale, destinatario, template_usato, messaggio, data_invio, stato_esito, created_at, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
            [
                id, paziente_id, payload.appuntamento_id || '',
                tipo_canale, destinatario || '', payload.template_usato || '',
                messaggio || '', nowStr, payload.stato_esito || 'inviato', now
            ]
        );
        await persist();
        return { success: true, id };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function getLogsByPaziente(event, args = {}) {
    try {
        const { paziente_id } = args || {};
        if (!paziente_id) return { success: false, error: 'Paziente mancante' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };
        const rows = d.query("SELECT * FROM log_notifiche WHERE paziente_id = ? AND is_deleted = 0 ORDER BY created_at DESC", [paziente_id]);
        return { success: true, data: rows || [] };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = { logNotification, getLogsByPaziente };
