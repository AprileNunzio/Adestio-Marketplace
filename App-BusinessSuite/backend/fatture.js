'use strict';

const { db, persist, newId, now } = require('./db_utils');
const calc = require('./calc');

const HEADER_FIELDS = [
    'tipo_documento', 'preventivo_id', 'cliente_id', 'cliente_ragione_sociale', 'cliente_piva',
    'cliente_codice_fiscale', 'cliente_email', 'cliente_pec', 'cliente_codice_destinatario',
    'cliente_indirizzo', 'cliente_citta', 'cliente_cap', 'cliente_provincia', 'cliente_nazione',
    'data_emissione', 'regime_fiscale',
    'ritenuta_acconto_attiva', 'ritenuta_acconto_percentuale',
    'cassa_previdenziale_attiva', 'cassa_previdenziale_percentuale',
    'split_payment', 'bollo_virtuale', 'importo_bollo',
    'codice_cig', 'codice_cup', 'modalita_pagamento', 'note'
];

const NUMERO_PREFIX = { TD01: 'FT', TD04: 'NC', TD05: 'ND', TD24: 'PA' };

function generateNumero(tipoDocumento) {
    const anno = new Date().getFullYear();
    const prefix = NUMERO_PREFIX[tipoDocumento] || 'FT';
    const like = `${prefix}-${anno}-%`;
    const rows = db().query(
        'SELECT numero FROM fatture WHERE numero LIKE ? AND anno = ? ORDER BY progressivo DESC LIMIT 1',
        [like, anno]
    );
    let progressivo = 1;
    if (rows.length > 0) {
        const match = (rows[0].numero || '').match(/(\d+)$/);
        if (match) progressivo = parseInt(match[1], 10) + 1;
    }
    return { numero: `${prefix}-${anno}-${String(progressivo).padStart(4, '0')}`, anno, progressivo };
}

function ricalcolaEPersisti(fatturaId) {
    const rows = db().query('SELECT * FROM fatture WHERE id = ?', [fatturaId]);
    if (rows.length === 0) throw new Error('Fattura non trovata');
    const fattura = rows[0];

    const vociRows = db().query(
        'SELECT * FROM voci_fatture WHERE fattura_id = ? AND is_deleted = 0 ORDER BY ordine ASC, last_modified ASC',
        [fatturaId]
    );
    const righeCalcolate = vociRows.map(v => {
        const r = calc.calcolaRigaFattura(v, fattura.regime_fiscale);
        db().run(
            'UPDATE voci_fatture SET totale_riga = ?, natura_iva = ?, last_modified = ? WHERE id = ?',
            [r.totale_riga, r.natura_iva_effettiva, now(), v.id]
        );
        return { ...v, totale_riga: r.totale_riga, aliquota_iva_effettiva: r.aliquota_iva_effettiva };
    });

    const tasse = calc.calcolaTasseFattura(fattura, righeCalcolate);
    db().run(
        `UPDATE fatture SET totale_imponibile = ?, totale_iva = ?, totale_documento = ?, cassa_previdenziale_importo = ?, ritenuta_acconto_importo = ?, importo_bollo = ?, bollo_virtuale = ?, last_modified = ? WHERE id = ?`,
        [
            tasse.totale_imponibile, tasse.totale_iva, tasse.totale_documento,
            tasse.cassa_previdenziale_importo, tasse.ritenuta_acconto_importo,
            tasse.importo_bollo, tasse.bollo_virtuale, now(), fatturaId
        ]
    );
    return tasse;
}

async function getAll(event, args = {}) {
    try {
        const stato = args && args.stato;
        const includeDeleted = args && args.includeDeleted;
        const rows = stato
            ? db().query('SELECT * FROM fatture WHERE is_deleted <= ? AND stato = ? ORDER BY created_at DESC', [includeDeleted ? 1 : 0, stato])
            : db().query('SELECT * FROM fatture WHERE is_deleted <= ? ORDER BY created_at DESC', [includeDeleted ? 1 : 0]);
        return { success: true, data: rows };
    } catch (e) {
        console.error('[BusinessSuite:fatture] getAll error:', e.message);
        return { success: false, error: e.message };
    }
}

async function getById(event, args = {}) {
    try {
        const { id } = args;
        if (!id) return { success: false, error: 'ID mancante' };
        const rows = db().query('SELECT * FROM fatture WHERE id = ?', [id]);
        if (rows.length === 0) return { success: false, error: 'Fattura non trovata' };
        const voci = db().query('SELECT * FROM voci_fatture WHERE fattura_id = ? AND is_deleted = 0 ORDER BY ordine ASC', [id]);
        const scadenze = db().query('SELECT * FROM scadenze_pagamento WHERE fattura_id = ? AND is_deleted = 0 ORDER BY numero_rata ASC', [id]);
        return { success: true, data: { fattura: rows[0], voci, scadenze } };
    } catch (e) {
        console.error('[BusinessSuite:fatture] getById error:', e.message);
        return { success: false, error: e.message };
    }
}

async function create(event, args = {}) {
    try {
        const tipoDocumento = args.tipo_documento || 'TD01';
        const { numero, anno, progressivo } = generateNumero(tipoDocumento);
        const id = newId();
        const ts = now();
        const cols = ['id', 'numero', 'anno', 'progressivo', ...HEADER_FIELDS, 'stato', 'created_at', 'last_modified', 'is_deleted'];
        const vals = [
            id, numero, anno, progressivo,
            ...HEADER_FIELDS.map(f => {
                if (args[f] !== undefined) return args[f];
                if (f === 'tipo_documento') return tipoDocumento;
                if (f === 'regime_fiscale') return 'RF01';
                if (f === 'cliente_nazione') return 'Italia';
                if (f === 'modalita_pagamento') return 'MP05';
                if (f === 'ritenuta_acconto_percentuale') return 20;
                if (f === 'cassa_previdenziale_percentuale') return 4;
                if (f === 'importo_bollo') return 2;
                return '';
            }),
            'bozza', ts, ts, 0
        ];
        db().run(`INSERT INTO fatture (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, vals);
        await persist();
        return { success: true, data: { id, numero } };
    } catch (e) {
        console.error('[BusinessSuite:fatture] create error:', e.message);
        return { success: false, error: e.message };
    }
}

async function createFromPreventivo(event, args = {}) {
    try {
        const { preventivoId } = args;
        if (!preventivoId) return { success: false, error: 'ID preventivo mancante' };
        const preventiviHandler = require('./preventivi');
        const preventivoRes = await preventiviHandler.getById(event, { id: preventivoId });
        if (!preventivoRes.success) return preventivoRes;
        const { preventivo, voci, assegnazioni } = preventivoRes.data;

        const createRes = await create(event, {
            preventivo_id: preventivoId,
            cliente_id: preventivo.cliente_id,
            cliente_ragione_sociale: preventivo.cliente_ragione_sociale,
            cliente_piva: preventivo.cliente_piva,
            cliente_codice_fiscale: preventivo.cliente_codice_fiscale,
            cliente_email: preventivo.cliente_email,
            cliente_pec: preventivo.cliente_pec,
            cliente_codice_destinatario: preventivo.cliente_codice_destinatario,
            cliente_indirizzo: preventivo.cliente_indirizzo,
            cliente_citta: preventivo.cliente_citta,
            cliente_cap: preventivo.cliente_cap,
            cliente_provincia: preventivo.cliente_provincia,
            cliente_nazione: preventivo.cliente_nazione,
            data_emissione: new Date().toISOString().slice(0, 10)
        });
        if (!createRes.success) return createRes;
        const fatturaId = createRes.data.id;

        let ordine = 0;
        voci.forEach(v => {
            const vid = newId();
            db().run(
                `INSERT INTO voci_fatture (id, fattura_id, descrizione, quantita, unita_misura, prezzo_unitario, sconto_percentuale, aliquota_iva, ordine, last_modified, is_deleted)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
                [vid, fatturaId, v.descrizione, v.quantita, v.unita_misura, v.prezzo_vendita, v.sconto_percentuale, v.aliquota_iva, ordine++, now()]
            );
        });
        assegnazioni.forEach(a => {
            const importo = Number(a.prezzo_al_cliente) > 0 ? Number(a.prezzo_al_cliente) : Number(a.compenso_calcolato) || 0;
            if (importo <= 0) return;
            const vid = newId();
            db().run(
                `INSERT INTO voci_fatture (id, fattura_id, descrizione, quantita, unita_misura, prezzo_unitario, sconto_percentuale, aliquota_iva, ordine, last_modified, is_deleted)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
                [vid, fatturaId, a.titolo_voce || 'Servizio', 1, 'pz', importo, 0, preventivo.aliquota_iva || 22, ordine++, now()]
            );
        });

        ricalcolaEPersisti(fatturaId);
        const fatturaRows = db().query('SELECT * FROM fatture WHERE id = ?', [fatturaId]);
        const scadenze = calc.generatePaymentSchedule(fatturaRows[0]);
        scadenze.forEach(s => {
            db().run(
                'INSERT INTO scadenze_pagamento (id, fattura_id, numero_rata, totale_rate, data_scadenza, importo_rata, importo_pagato, stato, last_modified, is_deleted) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 0)',
                [newId(), fatturaId, s.numero_rata, s.totale_rate, s.data_scadenza, s.importo_rata, 'pending', now()]
            );
        });
        await persist();
        return { success: true, data: { id: fatturaId } };
    } catch (e) {
        console.error('[BusinessSuite:fatture] createFromPreventivo error:', e.message);
        return { success: false, error: e.message };
    }
}

async function update(event, args = {}) {
    try {
        const { id } = args;
        if (!id) return { success: false, error: 'ID mancante' };
        const setClause = HEADER_FIELDS.map(f => `${f} = ?`).join(', ');
        const vals = [...HEADER_FIELDS.map(f => args[f] !== undefined ? args[f] : ''), now(), id];
        db().run(`UPDATE fatture SET ${setClause}, last_modified = ? WHERE id = ?`, vals);
        const tasse = ricalcolaEPersisti(id);
        await persist();
        return { success: true, data: tasse };
    } catch (e) {
        console.error('[BusinessSuite:fatture] update error:', e.message);
        return { success: false, error: e.message };
    }
}

async function setStato(event, args = {}) {
    try {
        const { id, stato } = args;
        if (!id || !stato) return { success: false, error: 'Parametri mancanti' };
        db().run('UPDATE fatture SET stato = ?, last_modified = ? WHERE id = ?', [stato, now(), id]);
        await persist();
        return { success: true };
    } catch (e) {
        console.error('[BusinessSuite:fatture] setStato error:', e.message);
        return { success: false, error: e.message };
    }
}

async function remove(event, args = {}) {
    try {
        const { id } = args;
        if (!id) return { success: false, error: 'ID mancante' };
        const rows = db().query('SELECT stato FROM fatture WHERE id = ?', [id]);
        if (rows.length > 0 && rows[0].stato !== 'bozza') {
            return { success: false, error: 'Solo le fatture in bozza possono essere eliminate' };
        }
        db().run('UPDATE fatture SET is_deleted = 1, last_modified = ? WHERE id = ?', [now(), id]);
        await persist();
        return { success: true };
    } catch (e) {
        console.error('[BusinessSuite:fatture] remove error:', e.message);
        return { success: false, error: e.message };
    }
}

async function addVoce(event, args = {}) {
    try {
        const { fatturaId } = args;
        if (!fatturaId) return { success: false, error: 'ID fattura mancante' };
        const id = newId();
        const maxOrdine = db().query('SELECT MAX(ordine) as m FROM voci_fatture WHERE fattura_id = ?', [fatturaId]);
        const ordine = (maxOrdine.length > 0 && maxOrdine[0].m !== null) ? maxOrdine[0].m + 1 : 0;
        db().run(
            `INSERT INTO voci_fatture (id, fattura_id, descrizione, quantita, unita_misura, prezzo_unitario, sconto_percentuale, aliquota_iva, natura_iva, ordine, last_modified, is_deleted)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [id, fatturaId, args.descrizione || '', Number(args.quantita) || 1, args.unita_misura || 'pz', Number(args.prezzo_unitario) || 0, Number(args.sconto_percentuale) || 0, Number(args.aliquota_iva) || 22, args.natura_iva || '', ordine, now()]
        );
        const tasse = ricalcolaEPersisti(fatturaId);
        await persist();
        return { success: true, data: { id, tasse } };
    } catch (e) {
        console.error('[BusinessSuite:fatture] addVoce error:', e.message);
        return { success: false, error: e.message };
    }
}

async function updateVoce(event, args = {}) {
    try {
        const { id, fatturaId } = args;
        if (!id || !fatturaId) return { success: false, error: 'Parametri mancanti' };
        db().run(
            `UPDATE voci_fatture SET descrizione = ?, quantita = ?, unita_misura = ?, prezzo_unitario = ?, sconto_percentuale = ?, aliquota_iva = ?, natura_iva = ?, last_modified = ? WHERE id = ?`,
            [args.descrizione || '', Number(args.quantita) || 1, args.unita_misura || 'pz', Number(args.prezzo_unitario) || 0, Number(args.sconto_percentuale) || 0, Number(args.aliquota_iva) || 22, args.natura_iva || '', now(), id]
        );
        const tasse = ricalcolaEPersisti(fatturaId);
        await persist();
        return { success: true, data: tasse };
    } catch (e) {
        console.error('[BusinessSuite:fatture] updateVoce error:', e.message);
        return { success: false, error: e.message };
    }
}

async function removeVoce(event, args = {}) {
    try {
        const { id, fatturaId } = args;
        if (!id || !fatturaId) return { success: false, error: 'Parametri mancanti' };
        db().run('UPDATE voci_fatture SET is_deleted = 1, last_modified = ? WHERE id = ?', [now(), id]);
        const tasse = ricalcolaEPersisti(fatturaId);
        await persist();
        return { success: true, data: tasse };
    } catch (e) {
        console.error('[BusinessSuite:fatture] removeVoce error:', e.message);
        return { success: false, error: e.message };
    }
}

async function getScadenze(event, args = {}) {
    try {
        const stato = args && args.stato;
        const rows = stato
            ? db().query(
                `SELECT s.*, f.numero as fattura_numero, f.cliente_ragione_sociale FROM scadenze_pagamento s
                 JOIN fatture f ON f.id = s.fattura_id
                 WHERE s.is_deleted = 0 AND s.stato = ? ORDER BY s.data_scadenza ASC`,
                [stato]
              )
            : db().query(
                `SELECT s.*, f.numero as fattura_numero, f.cliente_ragione_sociale FROM scadenze_pagamento s
                 JOIN fatture f ON f.id = s.fattura_id
                 WHERE s.is_deleted = 0 ORDER BY s.data_scadenza ASC`
              );
        return { success: true, data: rows };
    } catch (e) {
        console.error('[BusinessSuite:fatture] getScadenze error:', e.message);
        return { success: false, error: e.message };
    }
}

async function registraIncasso(event, args = {}) {
    try {
        const { id, importo, dataPagamento } = args;
        if (!id) return { success: false, error: 'ID scadenza mancante' };
        const rows = db().query('SELECT * FROM scadenze_pagamento WHERE id = ?', [id]);
        if (rows.length === 0) return { success: false, error: 'Scadenza non trovata' };
        const s = rows[0];
        const nuovoPagato = Math.round(((Number(s.importo_pagato) || 0) + (Number(importo) || 0)) * 100) / 100;
        const nuovoStato = nuovoPagato >= Number(s.importo_rata) ? 'pagata' : 'parziale';
        db().run(
            'UPDATE scadenze_pagamento SET importo_pagato = ?, data_pagamento = ?, stato = ?, last_modified = ? WHERE id = ?',
            [nuovoPagato, dataPagamento || new Date().toISOString().slice(0, 10), nuovoStato, now(), id]
        );
        const altreScadenze = db().query(
            "SELECT COUNT(*) as c FROM scadenze_pagamento WHERE fattura_id = ? AND is_deleted = 0 AND stato != 'pagata'",
            [s.fattura_id]
        );
        if (altreScadenze.length > 0 && altreScadenze[0].c === 0) {
            db().run("UPDATE fatture SET stato = 'pagata', last_modified = ? WHERE id = ?", [now(), s.fattura_id]);
        }
        await persist();
        return { success: true };
    } catch (e) {
        console.error('[BusinessSuite:fatture] registraIncasso error:', e.message);
        return { success: false, error: e.message };
    }
}

module.exports = {
    getAll, getById, create, createFromPreventivo, update, setStato, remove,
    addVoce, updateVoce, removeVoce,
    getScadenze, registraIncasso,
    ricalcolaEPersisti, generateNumero
};
