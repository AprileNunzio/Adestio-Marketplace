'use strict';

const { db, persist, newId, now } = require('./db_utils');

const FIELDS = [
    'tipo', 'importo', 'data', 'categoria', 'descrizione',
    'cliente_id', 'fornitore_id', 'preventivo_id', 'fattura_id', 'collaboratore_id', 'note'
];

async function getAll(event, args = {}) {
    try {
        const { dataDa, dataA, tipo } = args || {};
        const clauses = ['is_deleted = 0'];
        const params = [];
        if (tipo) { clauses.push('tipo = ?'); params.push(tipo); }
        if (dataDa) { clauses.push('data >= ?'); params.push(dataDa); }
        if (dataA) { clauses.push('data <= ?'); params.push(dataA); }
        const rows = db().query(
            `SELECT * FROM transazioni_finanziarie WHERE ${clauses.join(' AND ')} ORDER BY data DESC, created_at DESC`,
            params
        );
        return { success: true, data: rows };
    } catch (e) {
        console.error('[BusinessSuite:finanze] getAll error:', e.message);
        return { success: false, error: e.message };
    }
}

async function create(event, args = {}) {
    try {
        const id = newId();
        const ts = now();
        const cols = ['id', ...FIELDS, 'created_at', 'last_modified', 'is_deleted'];
        const vals = [id, ...FIELDS.map(f => args[f] !== undefined ? args[f] : (f === 'tipo' ? 'entrata' : '')), ts, ts, 0];
        db().run(`INSERT INTO transazioni_finanziarie (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, vals);
        await persist();
        return { success: true, data: { id } };
    } catch (e) {
        console.error('[BusinessSuite:finanze] create error:', e.message);
        return { success: false, error: e.message };
    }
}

async function update(event, args = {}) {
    try {
        const { id } = args;
        if (!id) return { success: false, error: 'ID mancante' };
        const setClause = FIELDS.map(f => `${f} = ?`).join(', ');
        const vals = [...FIELDS.map(f => args[f] !== undefined ? args[f] : ''), now(), id];
        db().run(`UPDATE transazioni_finanziarie SET ${setClause}, last_modified = ? WHERE id = ?`, vals);
        await persist();
        return { success: true };
    } catch (e) {
        console.error('[BusinessSuite:finanze] update error:', e.message);
        return { success: false, error: e.message };
    }
}

async function remove(event, args = {}) {
    try {
        const { id } = args;
        if (!id) return { success: false, error: 'ID mancante' };
        db().run('UPDATE transazioni_finanziarie SET is_deleted = 1, last_modified = ? WHERE id = ?', [now(), id]);
        await persist();
        return { success: true };
    } catch (e) {
        console.error('[BusinessSuite:finanze] remove error:', e.message);
        return { success: false, error: e.message };
    }
}

async function getStats(event, args = {}) {
    try {
        const anno = (args && args.anno) || new Date().getFullYear();
        const rows = db().query(
            "SELECT tipo, data, importo FROM transazioni_finanziarie WHERE is_deleted = 0 AND substr(data, 1, 4) = ?",
            [String(anno)]
        );
        const monthly = Array.from({ length: 12 }, () => ({ entrate: 0, uscite: 0 }));
        let totaleEntrateAnno = 0;
        let totaleUsciteAnno = 0;
        rows.forEach(r => {
            const mese = parseInt((r.data || '').slice(5, 7), 10) - 1;
            const importo = Number(r.importo) || 0;
            if (mese >= 0 && mese < 12) {
                if (r.tipo === 'entrata') monthly[mese].entrate += importo;
                else monthly[mese].uscite += importo;
            }
            if (r.tipo === 'entrata') totaleEntrateAnno += importo; else totaleUsciteAnno += importo;
        });
        const categorieUscite = {};
        db().query(
            "SELECT categoria, importo FROM transazioni_finanziarie WHERE is_deleted = 0 AND tipo = 'uscita' AND substr(data, 1, 4) = ?",
            [String(anno)]
        ).forEach(r => {
            const cat = r.categoria || 'Altro';
            categorieUscite[cat] = (categorieUscite[cat] || 0) + (Number(r.importo) || 0);
        });
        return {
            success: true,
            data: {
                anno,
                monthly,
                totale_entrate: Math.round(totaleEntrateAnno * 100) / 100,
                totale_uscite: Math.round(totaleUsciteAnno * 100) / 100,
                profitto: Math.round((totaleEntrateAnno - totaleUsciteAnno) * 100) / 100,
                categorie_uscite: categorieUscite
            }
        };
    } catch (e) {
        console.error('[BusinessSuite:finanze] getStats error:', e.message);
        return { success: false, error: e.message };
    }
}

module.exports = { getAll, create, update, remove, getStats };
