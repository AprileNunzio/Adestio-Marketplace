'use strict';

const { db, persist, newId, now, buildSimpleCrud } = require('./db_utils');

const FIELDS = [
    'nome', 'cognome', 'ruolo', 'piva', 'codice_fiscale', 'iban',
    'percentuale_commissione_default', 'attivo', 'note'
];
const crud = buildSimpleCrud('collaboratori', FIELDS, { orderBy: 'cognome ASC, nome ASC' });

async function getLedger(event, args = {}) {
    try {
        const { collaboratoreId } = args;
        if (!collaboratoreId) return { success: false, error: 'ID collaboratore mancante' };

        const maturatoRows = db().query(
            `SELECT COALESCE(SUM(a.compenso_calcolato), 0) as totale
             FROM assegnazioni_preventivo a
             JOIN preventivi p ON p.id = a.preventivo_id
             WHERE a.collaboratore_id = ? AND a.is_deleted = 0 AND p.is_deleted = 0
               AND p.stato IN ('accettato', 'pagato')`,
            [collaboratoreId]
        );
        const totaleMaturato = maturatoRows.length > 0 ? Number(maturatoRows[0].totale) || 0 : 0;

        const pagamenti = db().query(
            'SELECT * FROM pagamenti_collaboratori WHERE collaboratore_id = ? AND is_deleted = 0 ORDER BY data DESC',
            [collaboratoreId]
        );
        const totalePagato = pagamenti.reduce((sum, p) => sum + (Number(p.importo) || 0), 0);

        return {
            success: true,
            data: {
                totale_maturato: Math.round(totaleMaturato * 100) / 100,
                totale_pagato: Math.round(totalePagato * 100) / 100,
                saldo: Math.round((totaleMaturato - totalePagato) * 100) / 100,
                pagamenti
            }
        };
    } catch (e) {
        console.error('[BusinessSuite:collaboratori] getLedger error:', e.message);
        return { success: false, error: e.message };
    }
}

async function addPagamento(event, args = {}) {
    try {
        const { collaboratoreId, importo, data, metodo, note } = args || {};
        if (!collaboratoreId) return { success: false, error: 'ID collaboratore mancante' };
        if (!(Number(importo) > 0)) return { success: false, error: 'Importo non valido' };
        const id = newId();
        db().run(
            'INSERT INTO pagamenti_collaboratori (id, collaboratore_id, importo, data, metodo, note, last_modified, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
            [id, collaboratoreId, Number(importo), data || '', metodo || '', note || '', now()]
        );
        await persist();
        return { success: true, data: { id } };
    } catch (e) {
        console.error('[BusinessSuite:collaboratori] addPagamento error:', e.message);
        return { success: false, error: e.message };
    }
}

async function removePagamento(event, args = {}) {
    try {
        const { id } = args;
        if (!id) return { success: false, error: 'ID mancante' };
        db().run('UPDATE pagamenti_collaboratori SET is_deleted = 1, last_modified = ? WHERE id = ?', [now(), id]);
        await persist();
        return { success: true };
    } catch (e) {
        console.error('[BusinessSuite:collaboratori] removePagamento error:', e.message);
        return { success: false, error: e.message };
    }
}

module.exports = {
    getAll: crud.getAll,
    getById: crud.getById,
    create: crud.create,
    update: crud.update,
    remove: crud.remove,
    restore: crud.restore,
    getLedger,
    addPagamento,
    removePagamento
};
