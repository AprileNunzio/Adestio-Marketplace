'use strict';

const { db, persist, newId, now } = require('./db_utils');

const HEADER_FIELDS = [
    'cliente_id', 'cliente_ragione_sociale', 'cliente_indirizzo', 'cliente_citta',
    'cliente_cap', 'cliente_provincia', 'preventivo_id', 'fattura_id', 'data',
    'causale_trasporto', 'porto', 'vettore', 'colli', 'peso', 'note'
];

function generateNumero() {
    const anno = new Date().getFullYear();
    const prefix = `DDT-${anno}-`;
    const rows = db().query('SELECT numero FROM ddt WHERE numero LIKE ? ORDER BY numero DESC LIMIT 1', [`${prefix}%`]);
    let seq = 1;
    if (rows.length > 0) {
        const match = (rows[0].numero || '').match(/(\d+)$/);
        if (match) seq = parseInt(match[1], 10) + 1;
    }
    return `${prefix}${String(seq).padStart(4, '0')}`;
}

async function getAll(event, args = {}) {
    try {
        const includeDeleted = args && args.includeDeleted;
        const rows = db().query('SELECT * FROM ddt WHERE is_deleted <= ? ORDER BY created_at DESC', [includeDeleted ? 1 : 0]);
        return { success: true, data: rows };
    } catch (e) {
        console.error('[BusinessSuite:ddt] getAll error:', e.message);
        return { success: false, error: e.message };
    }
}

async function getById(event, args = {}) {
    try {
        const { id } = args;
        if (!id) return { success: false, error: 'ID mancante' };
        const rows = db().query('SELECT * FROM ddt WHERE id = ?', [id]);
        if (rows.length === 0) return { success: false, error: 'DDT non trovato' };
        const voci = db().query('SELECT * FROM voci_ddt WHERE ddt_id = ? AND is_deleted = 0 ORDER BY ordine ASC', [id]);
        return { success: true, data: { ddt: rows[0], voci } };
    } catch (e) {
        console.error('[BusinessSuite:ddt] getById error:', e.message);
        return { success: false, error: e.message };
    }
}

async function create(event, args = {}) {
    try {
        const id = newId();
        const ts = now();
        const numero = generateNumero();
        const cols = ['id', 'numero', ...HEADER_FIELDS, 'created_at', 'last_modified', 'is_deleted'];
        const vals = [
            id, numero,
            ...HEADER_FIELDS.map(f => {
                if (args[f] !== undefined) return args[f];
                if (f === 'causale_trasporto') return 'Vendita';
                if (f === 'porto') return 'Franco';
                if (f === 'colli') return 1;
                return '';
            }),
            ts, ts, 0
        ];
        db().run(`INSERT INTO ddt (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, vals);

        if (Array.isArray(args.voci)) {
            args.voci.forEach((v, idx) => {
                db().run(
                    'INSERT INTO voci_ddt (id, ddt_id, descrizione, quantita, unita_misura, ordine, last_modified, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
                    [newId(), id, v.descrizione || '', Number(v.quantita) || 1, v.unita_misura || 'pz', idx, ts]
                );
            });
        }
        await persist();
        return { success: true, data: { id, numero } };
    } catch (e) {
        console.error('[BusinessSuite:ddt] create error:', e.message);
        return { success: false, error: e.message };
    }
}

async function update(event, args = {}) {
    try {
        const { id } = args;
        if (!id) return { success: false, error: 'ID mancante' };
        const setClause = HEADER_FIELDS.map(f => `${f} = ?`).join(', ');
        const vals = [...HEADER_FIELDS.map(f => args[f] !== undefined ? args[f] : ''), now(), id];
        db().run(`UPDATE ddt SET ${setClause}, last_modified = ? WHERE id = ?`, vals);
        await persist();
        return { success: true };
    } catch (e) {
        console.error('[BusinessSuite:ddt] update error:', e.message);
        return { success: false, error: e.message };
    }
}

async function remove(event, args = {}) {
    try {
        const { id } = args;
        if (!id) return { success: false, error: 'ID mancante' };
        db().run('UPDATE ddt SET is_deleted = 1, last_modified = ? WHERE id = ?', [now(), id]);
        await persist();
        return { success: true };
    } catch (e) {
        console.error('[BusinessSuite:ddt] remove error:', e.message);
        return { success: false, error: e.message };
    }
}

async function addVoce(event, args = {}) {
    try {
        const { ddtId } = args;
        if (!ddtId) return { success: false, error: 'ID DDT mancante' };
        const id = newId();
        const maxOrdine = db().query('SELECT MAX(ordine) as m FROM voci_ddt WHERE ddt_id = ?', [ddtId]);
        const ordine = (maxOrdine.length > 0 && maxOrdine[0].m !== null) ? maxOrdine[0].m + 1 : 0;
        db().run(
            'INSERT INTO voci_ddt (id, ddt_id, descrizione, quantita, unita_misura, ordine, last_modified, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
            [id, ddtId, args.descrizione || '', Number(args.quantita) || 1, args.unita_misura || 'pz', ordine, now()]
        );
        await persist();
        return { success: true, data: { id } };
    } catch (e) {
        console.error('[BusinessSuite:ddt] addVoce error:', e.message);
        return { success: false, error: e.message };
    }
}

async function removeVoce(event, args = {}) {
    try {
        const { id } = args;
        if (!id) return { success: false, error: 'ID mancante' };
        db().run('UPDATE voci_ddt SET is_deleted = 1, last_modified = ? WHERE id = ?', [now(), id]);
        await persist();
        return { success: true };
    } catch (e) {
        console.error('[BusinessSuite:ddt] removeVoce error:', e.message);
        return { success: false, error: e.message };
    }
}

module.exports = { getAll, getById, create, update, remove, addVoce, removeVoce, generateNumero };
