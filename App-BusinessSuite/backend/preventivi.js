'use strict';

const { db, persist, newId, now } = require('./db_utils');
const calc = require('./calc');

const HEADER_FIELDS = [
    'cliente_id', 'cliente_ragione_sociale', 'cliente_piva', 'cliente_codice_fiscale',
    'cliente_email', 'cliente_pec', 'cliente_codice_destinatario', 'cliente_telefono',
    'cliente_indirizzo', 'cliente_citta', 'cliente_cap', 'cliente_provincia', 'cliente_nazione',
    'titolo', 'data_emissione', 'data_scadenza', 'aliquota_iva', 'arrotonda',
    'condizioni_pagamento', 'note'
];

function generateNumero() {
    const anno = new Date().getFullYear();
    const prefix = `PRV-${anno}-`;
    const rows = db().query(
        `SELECT numero FROM preventivi WHERE numero LIKE ? ORDER BY numero DESC LIMIT 1`,
        [`${prefix}%`]
    );
    let seq = 1;
    if (rows.length > 0) {
        const last = rows[0].numero || '';
        const match = last.match(/(\d+)$/);
        if (match) seq = parseInt(match[1], 10) + 1;
    }
    return `${prefix}${String(seq).padStart(4, '0')}`;
}

function ricalcolaEPersisti(preventivoId) {
    const header = db().query('SELECT * FROM preventivi WHERE id = ?', [preventivoId]);
    if (header.length === 0) throw new Error('Preventivo non trovato');
    const preventivo = header[0];

    const vociRows = db().query(
        'SELECT * FROM voci_preventivo WHERE preventivo_id = ? AND is_deleted = 0 ORDER BY ordine ASC, last_modified ASC',
        [preventivoId]
    );
    const vociCalcolate = vociRows.map(v => {
        const r = calc.recalcVoce(v);
        db().run(
            'UPDATE voci_preventivo SET totale_voce = ?, margine_euro = ?, margine_percentuale = ?, last_modified = ? WHERE id = ?',
            [r.totale_voce, r.margine_euro, r.margine_percentuale, now(), v.id]
        );
        return { ...v, totale_voce: r.totale_voce, costo_voce: r.costo_voce };
    });

    const baseImponibileVoci = vociCalcolate.reduce((s, v) => s + (Number(v.totale_voce) || 0), 0);

    const assegnazioniRows = db().query(
        'SELECT * FROM assegnazioni_preventivo WHERE preventivo_id = ? AND is_deleted = 0',
        [preventivoId]
    );
    const assegnazioniCalcolate = assegnazioniRows.map(a => {
        const r = calc.recalcAssegnazione(a, baseImponibileVoci);
        db().run(
            'UPDATE assegnazioni_preventivo SET compenso_calcolato = ?, last_modified = ? WHERE id = ?',
            [r.compenso_calcolato, now(), a.id]
        );
        return { ...a, compenso_calcolato: r.compenso_calcolato, prezzo_al_cliente_effettivo: r.prezzo_al_cliente_effettivo };
    });

    const totali = calc.recalcPreventivo(preventivo, vociCalcolate, assegnazioniCalcolate);
    db().run(
        `UPDATE preventivi SET totale_imponibile = ?, totale_iva = ?, totale_ivato = ?, totale_costo = ?, margine_euro = ?, margine_percentuale = ?, last_modified = ? WHERE id = ?`,
        [totali.totale_imponibile, totali.totale_iva, totali.totale_ivato, totali.totale_costo, totali.margine_euro, totali.margine_percentuale, now(), preventivoId]
    );
    return totali;
}

async function getAll(event, args = {}) {
    try {
        const stato = args && args.stato;
        const includeDeleted = args && args.includeDeleted;
        let rows;
        if (stato) {
            rows = db().query(
                'SELECT * FROM preventivi WHERE is_deleted <= ? AND stato = ? ORDER BY created_at DESC',
                [includeDeleted ? 1 : 0, stato]
            );
        } else {
            rows = db().query(
                'SELECT * FROM preventivi WHERE is_deleted <= ? ORDER BY created_at DESC',
                [includeDeleted ? 1 : 0]
            );
        }
        return { success: true, data: rows };
    } catch (e) {
        console.error('[BusinessSuite:preventivi] getAll error:', e.message);
        return { success: false, error: e.message };
    }
}

async function getById(event, args = {}) {
    try {
        const { id } = args;
        if (!id) return { success: false, error: 'ID mancante' };
        const rows = db().query('SELECT * FROM preventivi WHERE id = ?', [id]);
        if (rows.length === 0) return { success: false, error: 'Preventivo non trovato' };
        const voci = db().query(
            'SELECT * FROM voci_preventivo WHERE preventivo_id = ? AND is_deleted = 0 ORDER BY ordine ASC, last_modified ASC',
            [id]
        );
        const assegnazioni = db().query(
            'SELECT * FROM assegnazioni_preventivo WHERE preventivo_id = ? AND is_deleted = 0',
            [id]
        );
        return { success: true, data: { preventivo: rows[0], voci, assegnazioni } };
    } catch (e) {
        console.error('[BusinessSuite:preventivi] getById error:', e.message);
        return { success: false, error: e.message };
    }
}

async function create(event, args = {}) {
    try {
        const id = newId();
        const ts = now();
        const numero = generateNumero();
        const cols = ['id', 'numero', ...HEADER_FIELDS, 'stato', 'versione', 'created_at', 'last_modified', 'is_deleted'];
        const vals = [
            id, numero,
            ...HEADER_FIELDS.map(f => args[f] !== undefined ? args[f] : (f === 'aliquota_iva' ? 22 : (f === 'cliente_nazione' ? 'Italia' : ''))),
            'bozza', 1, ts, ts, 0
        ];
        db().run(`INSERT INTO preventivi (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, vals);
        await persist();
        return { success: true, data: { id, numero } };
    } catch (e) {
        console.error('[BusinessSuite:preventivi] create error:', e.message);
        return { success: false, error: e.message };
    }
}

async function update(event, args = {}) {
    try {
        const { id } = args;
        if (!id) return { success: false, error: 'ID mancante' };
        const setClause = HEADER_FIELDS.map(f => `${f} = ?`).join(', ');
        const vals = [...HEADER_FIELDS.map(f => args[f] !== undefined ? args[f] : ''), now(), id];
        db().run(`UPDATE preventivi SET ${setClause}, last_modified = ? WHERE id = ?`, vals);
        const totali = ricalcolaEPersisti(id);
        await persist();
        return { success: true, data: totali };
    } catch (e) {
        console.error('[BusinessSuite:preventivi] update error:', e.message);
        return { success: false, error: e.message };
    }
}

async function setStato(event, args = {}) {
    try {
        const { id, stato } = args;
        if (!id || !stato) return { success: false, error: 'Parametri mancanti' };
        db().run('UPDATE preventivi SET stato = ?, last_modified = ? WHERE id = ?', [stato, now(), id]);
        await persist();
        return { success: true };
    } catch (e) {
        console.error('[BusinessSuite:preventivi] setStato error:', e.message);
        return { success: false, error: e.message };
    }
}

async function remove(event, args = {}) {
    try {
        const { id } = args;
        if (!id) return { success: false, error: 'ID mancante' };
        db().run('UPDATE preventivi SET is_deleted = 1, last_modified = ? WHERE id = ?', [now(), id]);
        await persist();
        return { success: true };
    } catch (e) {
        console.error('[BusinessSuite:preventivi] remove error:', e.message);
        return { success: false, error: e.message };
    }
}

async function duplica(event, args = {}) {
    try {
        const { id } = args;
        if (!id) return { success: false, error: 'ID mancante' };
        const rows = db().query('SELECT * FROM preventivi WHERE id = ?', [id]);
        if (rows.length === 0) return { success: false, error: 'Preventivo non trovato' };
        const original = rows[0];
        const newIdVal = newId();
        const ts = now();
        const numero = generateNumero();
        const cols = ['id', 'numero', ...HEADER_FIELDS, 'stato', 'versione', 'created_at', 'last_modified', 'is_deleted'];
        const vals = [newIdVal, numero, ...HEADER_FIELDS.map(f => original[f]), 'bozza', 1, ts, ts, 0];
        db().run(`INSERT INTO preventivi (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, vals);

        const voci = db().query('SELECT * FROM voci_preventivo WHERE preventivo_id = ? AND is_deleted = 0', [id]);
        voci.forEach(v => {
            const vid = newId();
            db().run(
                `INSERT INTO voci_preventivo (id, preventivo_id, prodotto_id, descrizione, descrizione_estesa, quantita, unita_misura, prezzo_acquisto, prezzo_vendita, spese_accessorie, sconto_percentuale, aliquota_iva, totale_voce, margine_euro, margine_percentuale, opzionale, ordine, last_modified, is_deleted)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
                [vid, newIdVal, v.prodotto_id, v.descrizione, v.descrizione_estesa, v.quantita, v.unita_misura, v.prezzo_acquisto, v.prezzo_vendita, v.spese_accessorie, v.sconto_percentuale, v.aliquota_iva, v.totale_voce, v.margine_euro, v.margine_percentuale, v.opzionale, v.ordine, ts]
            );
        });
        const assegnazioni = db().query('SELECT * FROM assegnazioni_preventivo WHERE preventivo_id = ? AND is_deleted = 0', [id]);
        assegnazioni.forEach(a => {
            const aid = newId();
            db().run(
                `INSERT INTO assegnazioni_preventivo (id, preventivo_id, collaboratore_id, titolo_voce, tipo_compenso, compenso_fisso, percentuale_applicata, compenso_calcolato, prezzo_al_cliente, last_modified, is_deleted)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
                [aid, newIdVal, a.collaboratore_id, a.titolo_voce, a.tipo_compenso, a.compenso_fisso, a.percentuale_applicata, a.compenso_calcolato, a.prezzo_al_cliente, ts]
            );
        });

        ricalcolaEPersisti(newIdVal);
        await persist();
        return { success: true, data: { id: newIdVal, numero } };
    } catch (e) {
        console.error('[BusinessSuite:preventivi] duplica error:', e.message);
        return { success: false, error: e.message };
    }
}

async function addVoce(event, args = {}) {
    try {
        const { preventivoId } = args;
        if (!preventivoId) return { success: false, error: 'ID preventivo mancante' };
        const id = newId();
        const maxOrdineRows = db().query('SELECT MAX(ordine) as m FROM voci_preventivo WHERE preventivo_id = ?', [preventivoId]);
        const ordine = (maxOrdineRows.length > 0 && maxOrdineRows[0].m !== null) ? maxOrdineRows[0].m + 1 : 0;
        db().run(
            `INSERT INTO voci_preventivo (id, preventivo_id, prodotto_id, descrizione, descrizione_estesa, quantita, unita_misura, prezzo_acquisto, prezzo_vendita, spese_accessorie, sconto_percentuale, aliquota_iva, opzionale, ordine, last_modified, is_deleted)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [
                id, preventivoId, args.prodotto_id || '', args.descrizione || '', args.descrizione_estesa || '',
                Number(args.quantita) || 1, args.unita_misura || 'pz', Number(args.prezzo_acquisto) || 0,
                Number(args.prezzo_vendita) || 0, Number(args.spese_accessorie) || 0, Number(args.sconto_percentuale) || 0,
                Number(args.aliquota_iva) || 22, args.opzionale ? 1 : 0, ordine, now()
            ]
        );
        const totali = ricalcolaEPersisti(preventivoId);
        await persist();
        return { success: true, data: { id, totali } };
    } catch (e) {
        console.error('[BusinessSuite:preventivi] addVoce error:', e.message);
        return { success: false, error: e.message };
    }
}

async function updateVoce(event, args = {}) {
    try {
        const { id, preventivoId } = args;
        if (!id || !preventivoId) return { success: false, error: 'Parametri mancanti' };
        db().run(
            `UPDATE voci_preventivo SET prodotto_id = ?, descrizione = ?, descrizione_estesa = ?, quantita = ?, unita_misura = ?, prezzo_acquisto = ?, prezzo_vendita = ?, spese_accessorie = ?, sconto_percentuale = ?, aliquota_iva = ?, opzionale = ?, last_modified = ? WHERE id = ?`,
            [
                args.prodotto_id || '', args.descrizione || '', args.descrizione_estesa || '',
                Number(args.quantita) || 1, args.unita_misura || 'pz', Number(args.prezzo_acquisto) || 0,
                Number(args.prezzo_vendita) || 0, Number(args.spese_accessorie) || 0, Number(args.sconto_percentuale) || 0,
                Number(args.aliquota_iva) || 22, args.opzionale ? 1 : 0, now(), id
            ]
        );
        const totali = ricalcolaEPersisti(preventivoId);
        await persist();
        return { success: true, data: totali };
    } catch (e) {
        console.error('[BusinessSuite:preventivi] updateVoce error:', e.message);
        return { success: false, error: e.message };
    }
}

async function removeVoce(event, args = {}) {
    try {
        const { id, preventivoId } = args;
        if (!id || !preventivoId) return { success: false, error: 'Parametri mancanti' };
        db().run('UPDATE voci_preventivo SET is_deleted = 1, last_modified = ? WHERE id = ?', [now(), id]);
        const totali = ricalcolaEPersisti(preventivoId);
        await persist();
        return { success: true, data: totali };
    } catch (e) {
        console.error('[BusinessSuite:preventivi] removeVoce error:', e.message);
        return { success: false, error: e.message };
    }
}

async function addAssegnazione(event, args = {}) {
    try {
        const { preventivoId, collaboratoreId } = args;
        if (!preventivoId || !collaboratoreId) return { success: false, error: 'Parametri mancanti' };
        const id = newId();
        db().run(
            `INSERT INTO assegnazioni_preventivo (id, preventivo_id, collaboratore_id, titolo_voce, tipo_compenso, compenso_fisso, percentuale_applicata, prezzo_al_cliente, last_modified, is_deleted)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [
                id, preventivoId, collaboratoreId, args.titolo_voce || '', args.tipo_compenso || 'percentuale',
                Number(args.compenso_fisso) || 0, Number(args.percentuale_applicata) || 0,
                Number(args.prezzo_al_cliente) || 0, now()
            ]
        );
        const totali = ricalcolaEPersisti(preventivoId);
        await persist();
        return { success: true, data: { id, totali } };
    } catch (e) {
        console.error('[BusinessSuite:preventivi] addAssegnazione error:', e.message);
        return { success: false, error: e.message };
    }
}

async function updateAssegnazione(event, args = {}) {
    try {
        const { id, preventivoId } = args;
        if (!id || !preventivoId) return { success: false, error: 'Parametri mancanti' };
        db().run(
            `UPDATE assegnazioni_preventivo SET titolo_voce = ?, tipo_compenso = ?, compenso_fisso = ?, percentuale_applicata = ?, prezzo_al_cliente = ?, last_modified = ? WHERE id = ?`,
            [args.titolo_voce || '', args.tipo_compenso || 'percentuale', Number(args.compenso_fisso) || 0, Number(args.percentuale_applicata) || 0, Number(args.prezzo_al_cliente) || 0, now(), id]
        );
        const totali = ricalcolaEPersisti(preventivoId);
        await persist();
        return { success: true, data: totali };
    } catch (e) {
        console.error('[BusinessSuite:preventivi] updateAssegnazione error:', e.message);
        return { success: false, error: e.message };
    }
}

async function removeAssegnazione(event, args = {}) {
    try {
        const { id, preventivoId } = args;
        if (!id || !preventivoId) return { success: false, error: 'Parametri mancanti' };
        db().run('UPDATE assegnazioni_preventivo SET is_deleted = 1, last_modified = ? WHERE id = ?', [now(), id]);
        const totali = ricalcolaEPersisti(preventivoId);
        await persist();
        return { success: true, data: totali };
    } catch (e) {
        console.error('[BusinessSuite:preventivi] removeAssegnazione error:', e.message);
        return { success: false, error: e.message };
    }
}

async function createRevision(event, args = {}) {
    try {
        const { preventivoId, motivo } = args;
        if (!preventivoId) return { success: false, error: 'ID preventivo mancante' };
        const preventivoRes = await getById(event, { id: preventivoId });
        if (!preventivoRes.success) return preventivoRes;
        const id = newId();
        const versione = (preventivoRes.data.preventivo.versione || 1);
        db().run(
            'INSERT INTO revisioni_preventivo (id, preventivo_id, versione, snapshot_json, motivo, created_at, last_modified) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, preventivoId, versione, JSON.stringify(preventivoRes.data), motivo || '', now(), now()]
        );
        db().run('UPDATE preventivi SET versione = ?, last_modified = ? WHERE id = ?', [versione + 1, now(), preventivoId]);
        await persist();
        return { success: true, data: { id } };
    } catch (e) {
        console.error('[BusinessSuite:preventivi] createRevision error:', e.message);
        return { success: false, error: e.message };
    }
}

async function getRevisions(event, args = {}) {
    try {
        const { preventivoId } = args;
        if (!preventivoId) return { success: false, error: 'ID preventivo mancante' };
        const rows = db().query(
            'SELECT id, preventivo_id, versione, motivo, created_at FROM revisioni_preventivo WHERE preventivo_id = ? ORDER BY versione DESC',
            [preventivoId]
        );
        return { success: true, data: rows };
    } catch (e) {
        console.error('[BusinessSuite:preventivi] getRevisions error:', e.message);
        return { success: false, error: e.message };
    }
}

module.exports = {
    getAll, getById, create, update, setStato, remove, duplica,
    addVoce, updateVoce, removeVoce,
    addAssegnazione, updateAssegnazione, removeAssegnazione,
    createRevision, getRevisions,
    ricalcolaEPersisti, generateNumero
};
