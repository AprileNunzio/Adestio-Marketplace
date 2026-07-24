'use strict';

const { db, persist, newId, now, buildSimpleCrud } = require('./db_utils');

const PRODOTTO_FIELDS = [
    'categoria_id', 'codice', 'descrizione', 'descrizione_estesa',
    'unita_misura', 'prezzo_acquisto', 'prezzo_vendita', 'aliquota_iva', 'attivo'
];
const prodottiCrud = buildSimpleCrud('prodotti', PRODOTTO_FIELDS, { orderBy: 'descrizione ASC' });

async function getAllCategorie(event, args = {}) {
    try {
        const rows = db().query('SELECT * FROM categorie_prodotti WHERE is_deleted = 0 ORDER BY nome ASC');
        return { success: true, data: rows };
    } catch (e) {
        console.error('[BusinessSuite:prodotti] getAllCategorie error:', e.message);
        return { success: false, error: e.message };
    }
}

async function createCategoria(event, args = {}) {
    try {
        const id = newId();
        const ts = now();
        db().run(
            'INSERT INTO categorie_prodotti (id, nome, descrizione, last_modified, is_deleted) VALUES (?, ?, ?, ?, 0)',
            [id, args.nome || '', args.descrizione || '', ts]
        );
        await persist();
        return { success: true, data: { id } };
    } catch (e) {
        console.error('[BusinessSuite:prodotti] createCategoria error:', e.message);
        return { success: false, error: e.message };
    }
}

async function updateCategoria(event, args = {}) {
    try {
        const { id } = args;
        if (!id) return { success: false, error: 'ID mancante' };
        db().run(
            'UPDATE categorie_prodotti SET nome = ?, descrizione = ?, last_modified = ? WHERE id = ?',
            [args.nome || '', args.descrizione || '', now(), id]
        );
        await persist();
        return { success: true };
    } catch (e) {
        console.error('[BusinessSuite:prodotti] updateCategoria error:', e.message);
        return { success: false, error: e.message };
    }
}

async function removeCategoria(event, args = {}) {
    try {
        const { id } = args;
        if (!id) return { success: false, error: 'ID mancante' };
        const inUse = db().query('SELECT COUNT(*) as c FROM prodotti WHERE categoria_id = ? AND is_deleted = 0', [id]);
        if (inUse.length > 0 && inUse[0].c > 0) {
            return { success: false, error: 'Categoria in uso da uno o più prodotti' };
        }
        db().run('UPDATE categorie_prodotti SET is_deleted = 1, last_modified = ? WHERE id = ?', [now(), id]);
        await persist();
        return { success: true };
    } catch (e) {
        console.error('[BusinessSuite:prodotti] removeCategoria error:', e.message);
        return { success: false, error: e.message };
    }
}

async function search(event, args = {}) {
    try {
        const query = (args && args.query ? String(args.query) : '').trim();
        const like = `%${query}%`;
        const rows = query
            ? db().query(
                `SELECT * FROM prodotti WHERE is_deleted = 0 AND attivo = 1 AND (descrizione LIKE ? OR codice LIKE ?) ORDER BY descrizione LIMIT 30`,
                [like, like]
              )
            : db().query(`SELECT * FROM prodotti WHERE is_deleted = 0 AND attivo = 1 ORDER BY descrizione LIMIT 30`);
        return { success: true, data: rows };
    } catch (e) {
        console.error('[BusinessSuite:prodotti] search error:', e.message);
        return { success: false, error: e.message };
    }
}

module.exports = {
    getAll: prodottiCrud.getAll,
    getById: prodottiCrud.getById,
    create: prodottiCrud.create,
    update: prodottiCrud.update,
    remove: prodottiCrud.remove,
    restore: prodottiCrud.restore,
    search,
    getAllCategorie,
    createCategoria,
    updateCategoria,
    removeCategoria
};
