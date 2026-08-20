const crypto = require('crypto');
const { db, persist } = require('./db_utils');

async function creaPianoRateale(event, payload = {}) {
    try {
        const { paziente_id, totale_importo, acconto_versato, rate, preventivo_id, note } = payload || {};
        if (!paziente_id || !totale_importo || !Array.isArray(rate) || rate.length === 0) {
            return { success: false, error: 'Dati piano rateale non validi.' };
        }
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };

        const pianoId = crypto.randomUUID();
        const now = Date.now();

        d.run(
            "INSERT INTO piani_rateali (id, preventivo_id, paziente_id, numero_rate, totale_importo, acconto_versato, stato, note, created_at, last_modified, is_deleted) VALUES (?, ?, ?, ?, ?, ?, 'attivo', ?, ?, ?, 0)",
            [
                pianoId, preventivo_id || '', paziente_id,
                rate.length, Number(totale_importo) || 0,
                Number(acconto_versato) || 0,
                note || '', now, now
            ]
        );

        if (Number(acconto_versato) > 0) {
            const incassoId = crypto.randomUUID();
            const year = new Date().getFullYear();
            const count = d.query("SELECT COUNT(*) as c FROM pagamenti_incassi WHERE is_deleted = 0")[0].c + 1;
            const numDoc = `ACC-${year}-${String(count).padStart(4, '0')}`;

            d.run(
                "INSERT INTO pagamenti_incassi (id, paziente_id, preventivo_id, data_pagamento, importo, metodo_pagamento, tipo_documento, numero_documento, note, created_at, last_modified, is_deleted) VALUES (?, ?, ?, ?, ?, ?, 'acconto', ?, 'Acconto iniziale piano rateale', ?, ?, 0)",
                [
                    incassoId, paziente_id, preventivo_id || '',
                    new Date().toISOString().split('T')[0],
                    Number(acconto_versato),
                    payload.metodo_pagamento_acconto || 'pos',
                    numDoc, now, now
                ]
            );
        }

        for (const r of rate) {
            const rataId = crypto.randomUUID();
            d.run(
                "INSERT INTO rate_scadenziario (id, piano_id, paziente_id, numero_rata, importo, data_scadenza, data_pagamento, stato, note, created_at, last_modified, is_deleted) VALUES (?, ?, ?, ?, ?, ?, '', 'in_scadenza', '', ?, ?, 0)",
                [
                    rataId, pianoId, paziente_id,
                    r.numero_rata, Number(r.importo),
                    r.data_scadenza, now, now
                ]
            );
        }

        await persist();
        return { success: true, pianoId };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function getPianiByPaziente(event, args = {}) {
    try {
        const { paziente_id } = args || {};
        if (!paziente_id) return { success: false, error: 'Paziente mancante' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };

        const piani = d.query("SELECT * FROM piani_rateali WHERE paziente_id = ? AND is_deleted = 0 ORDER BY created_at DESC", [paziente_id]);
        const rate = d.query("SELECT * FROM rate_scadenziario WHERE paziente_id = ? AND is_deleted = 0 ORDER BY numero_rata ASC", [paziente_id]);

        return { success: true, data: { piani: piani || [], rate: rate || [] } };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function pagaRata(event, payload = {}) {
    try {
        const { rata_id, metodo_pagamento } = payload || {};
        if (!rata_id) return { success: false, error: 'ID rata mancante' };
        const d = db();
        if (!d) return { success: false, error: 'Database non inizializzato' };

        const rRows = d.query("SELECT * FROM rate_scadenziario WHERE id = ? AND is_deleted = 0", [rata_id]);
        if (!rRows || rRows.length === 0) return { success: false, error: 'Rata non trovata' };
        const rata = rRows[0];

        const now = Date.now();
        const todayStr = new Date().toISOString().split('T')[0];

        d.run("UPDATE rate_scadenziario SET stato = 'pagata', data_pagamento = ?, last_modified = ? WHERE id = ?", [todayStr, now, rata_id]);

        const year = new Date().getFullYear();
        const count = d.query("SELECT COUNT(*) as c FROM pagamenti_incassi WHERE is_deleted = 0")[0].c + 1;
        const numDoc = `RAT-${year}-${String(count).padStart(4, '0')}`;

        const incId = crypto.randomUUID();
        d.run(
            "INSERT INTO pagamenti_incassi (id, paziente_id, rata_id, data_pagamento, importo, metodo_pagamento, tipo_documento, numero_documento, note, created_at, last_modified, is_deleted) VALUES (?, ?, ?, ?, ?, ?, 'rata', ?, ?, ?, ?, 0)",
            [
                incId, rata.paziente_id, rata_id, todayStr,
                rata.importo, metodo_pagamento || 'pos',
                numDoc, `Pagamento Rata ${rata.numero_rata}`, now, now
            ]
        );

        await persist();
        return { success: true, numero_documento: numDoc };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = { creaPianoRateale, getPianiByPaziente, pagaRata };
