'use strict';

const { db, buildSimpleCrud } = require('./db_utils');

const FIELDS = [
    'ragione_sociale', 'piva', 'codice_fiscale', 'email', 'telefono',
    'indirizzo', 'citta', 'cap', 'provincia', 'iban', 'note'
];

const crud = buildSimpleCrud('fornitori', FIELDS, { orderBy: 'ragione_sociale ASC' });

async function search(event, args = {}) {
    try {
        const query = (args && args.query ? String(args.query) : '').trim();
        if (!query) return { success: true, data: [] };
        const like = `%${query}%`;
        const rows = db().query(
            `SELECT * FROM fornitori WHERE is_deleted = 0 AND (ragione_sociale LIKE ? OR piva LIKE ?) ORDER BY ragione_sociale LIMIT 20`,
            [like, like]
        );
        return { success: true, data: rows };
    } catch (e) {
        console.error('[BusinessSuite:fornitori] search error:', e.message);
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
    search
};
