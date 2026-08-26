'use strict';

const { db, buildSimpleCrud } = require('./db_utils');

const FIELDS = [
    'tipo', 'ragione_sociale', 'nome', 'cognome', 'piva', 'codice_fiscale',
    'email', 'pec', 'codice_destinatario', 'telefono', 'indirizzo', 'citta',
    'cap', 'provincia', 'nazione', 'iban', 'condizioni_pagamento', 'note'
];

const crud = buildSimpleCrud('clienti', FIELDS, { orderBy: 'ragione_sociale ASC' });

async function search(event, args = {}) {
    try {
        const query = (args && args.query ? String(args.query) : '').trim();
        if (!query) return { success: true, data: [] };
        const like = `%${query}%`;
        const rows = db().query(
            `SELECT * FROM clienti WHERE is_deleted = 0 AND (ragione_sociale LIKE ? OR nome LIKE ? OR cognome LIKE ? OR piva LIKE ? OR codice_fiscale LIKE ?) ORDER BY ragione_sociale LIMIT 20`,
            [like, like, like, like, like]
        );
        return { success: true, data: rows };
    } catch (e) {
        console.error('[BusinessSuite:clienti] search error:', e.message);
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
