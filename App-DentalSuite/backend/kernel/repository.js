'use strict';

const { db, persist, newId, now } = require('./database');
const { validationError, notFoundError } = require('./errors');

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

function assertIdentifier(value, label) {
    if (!IDENTIFIER.test(String(value || ''))) {
        throw validationError(`${label} non valido: ${value}`);
    }
}

function pick(source, columns) {
    const result = {};
    columns.forEach(column => {
        if (source[column] !== undefined) result[column] = source[column];
    });
    return result;
}

function createRepository(table, columns, options = {}) {
    assertIdentifier(table, 'Tabella');
    columns.forEach(column => assertIdentifier(column, 'Colonna'));

    const orderBy = options.orderBy || 'last_modified DESC';
    const softDelete = options.softDelete !== false;
    const entityLabel = options.label || table;
    const systemColumns = options.systemColumns || [];
    systemColumns.forEach(column => assertIdentifier(column, 'Colonna di sistema'));

    function baseSelect(includeArchived) {
        return softDelete && !includeArchived
            ? `SELECT * FROM ${table} WHERE is_deleted = 0`
            : `SELECT * FROM ${table} WHERE 1 = 1`;
    }

    function findAll(criteria = {}) {
        const clauses = [];
        const params = [];
        Object.keys(criteria.where || {}).forEach(column => {
            assertIdentifier(column, 'Colonna filtro');
            clauses.push(`AND ${column} = ?`);
            params.push(criteria.where[column]);
        });
        const sql = `${baseSelect(criteria.includeArchived)} ${clauses.join(' ')} ORDER BY ${orderBy}`;
        return db().query(sql, params) || [];
    }

    function findById(id, criteria = {}) {
        if (!id) throw validationError('Identificativo mancante');
        const rows = db().query(`${baseSelect(criteria.includeArchived)} AND id = ?`, [id]);
        return rows.length > 0 ? rows[0] : null;
    }

    function requireById(id, criteria = {}) {
        const row = findById(id, criteria);
        if (!row) throw notFoundError(`${entityLabel} non trovato`);
        return row;
    }

    async function insert(data = {}, system = {}) {
        const payload = Object.assign(pick(data, columns), pick(system, systemColumns));
        const id = data.id || newId();
        const timestamp = now();
        const insertColumns = ['id', ...Object.keys(payload), 'created_at', 'last_modified'];
        const values = [id, ...Object.values(payload), timestamp, timestamp];
        if (softDelete) {
            insertColumns.push('is_deleted');
            values.push(0);
        }
        const placeholders = insertColumns.map(() => '?').join(', ');
        db().run(
            `INSERT INTO ${table} (${insertColumns.join(', ')}) VALUES (${placeholders})`,
            values
        );
        await persist();
        return id;
    }

    async function update(id, data = {}, system = {}) {
        requireById(id, { includeArchived: true });
        const payload = Object.assign(pick(data, columns), pick(system, systemColumns));
        const assignments = Object.keys(payload);
        if (assignments.length === 0) return id;
        const setClause = assignments.map(column => `${column} = ?`).join(', ');
        db().run(
            `UPDATE ${table} SET ${setClause}, last_modified = ? WHERE id = ?`,
            [...Object.values(payload), now(), id]
        );
        await persist();
        return id;
    }

    async function setDeletedFlag(id, flag) {
        if (!softDelete) throw validationError(`${entityLabel} non supporta l'archiviazione`);
        requireById(id, { includeArchived: true });
        db().run(
            `UPDATE ${table} SET is_deleted = ?, last_modified = ? WHERE id = ?`,
            [flag, now(), id]
        );
        await persist();
        return id;
    }

    function archive(id) {
        return setDeletedFlag(id, 1);
    }

    function restore(id) {
        return setDeletedFlag(id, 0);
    }

    async function hardRemove(id) {
        requireById(id, { includeArchived: true });
        db().run(`DELETE FROM ${table} WHERE id = ?`, [id]);
        await persist();
        return id;
    }

    async function removeWhere(column, value) {
        assertIdentifier(column, 'Colonna');
        db().run(`DELETE FROM ${table} WHERE ${column} = ?`, [value]);
        await persist();
    }

    function count(criteria = {}) {
        const rows = db().query(
            `SELECT COUNT(*) AS total FROM (${baseSelect(criteria.includeArchived)})`,
            []
        );
        return rows.length > 0 ? rows[0].total : 0;
    }

    return {
        table,
        columns,
        findAll,
        findById,
        requireById,
        insert,
        update,
        archive,
        restore,
        hardRemove,
        removeWhere,
        count
    };
}

module.exports = { createRepository, assertIdentifier };
