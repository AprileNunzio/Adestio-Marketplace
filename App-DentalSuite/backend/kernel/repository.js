'use strict';

const { db, persist, newId, now } = require('./database');
const { validationError, notFoundError } = require('./errors');
const criteri = require('./criteri');

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

    const colonneAmmesse = ['id', 'created_at', 'last_modified', 'is_deleted']
        .concat(columns)
        .concat(systemColumns);

    function condizioni(criteria) {
        const uguaglianze = criteri.costruisci(criteria.where || {}, colonneAmmesse);
        const avanzate = criteri.costruisci(criteria.filtri || [], colonneAmmesse);
        return {
            sql: `${uguaglianze.sql} ${avanzate.sql}`.trim(),
            parametri: uguaglianze.parametri.concat(avanzate.parametri)
        };
    }

    function corpoSelezione(criteria) {
        const dove = condizioni(criteria);
        return {
            sql: `${baseSelect(criteria.includeArchived)} ${dove.sql}`.trim(),
            parametri: dove.parametri
        };
    }

    function findAll(criteria = {}) {
        const base = corpoSelezione(criteria);
        const ordine = criteri.ordinamento(criteria.ordina, colonneAmmesse, orderBy);
        return db().query(`${base.sql} ORDER BY ${ordine}`, base.parametri) || [];
    }

    function findPage(criteria = {}) {
        const base = corpoSelezione(criteria);
        const ordine = criteri.ordinamento(criteria.ordina, colonneAmmesse, orderBy);
        const finestra = criteri.finestra(criteria);
        const righe = db().query(
            `${base.sql} ORDER BY ${ordine} LIMIT ? OFFSET ?`,
            base.parametri.concat([finestra.dimensione, finestra.scarto])
        ) || [];
        const totale = count(criteria);
        return {
            righe,
            totale,
            pagina: finestra.pagina,
            dimensione: finestra.dimensione,
            pagine: Math.max(Math.ceil(totale / finestra.dimensione), 1)
        };
    }

    function findFirst(criteria = {}) {
        const righe = findPage({ ...criteria, pagina: 1, dimensione: 1 }).righe;
        return righe.length > 0 ? righe[0] : null;
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
        const base = corpoSelezione(criteria);
        const rows = db().query(
            `SELECT COUNT(*) AS total FROM (${base.sql}) AS conteggio`,
            base.parametri
        );
        return rows.length > 0 ? rows[0].total : 0;
    }

    function aggregate(espressioni, criteria = {}) {
        const base = corpoSelezione(criteria);
        const proiezione = Object.keys(espressioni).map(alias => {
            assertIdentifier(alias, 'Alias di aggregazione');
            return `${espressioni[alias]} AS ${alias}`;
        }).join(', ');
        const rows = db().query(
            `SELECT ${proiezione} FROM (${base.sql}) AS insieme`,
            base.parametri
        );
        return rows.length > 0 ? rows[0] : {};
    }

    return {
        table,
        columns,
        findAll,
        findPage,
        findFirst,
        aggregate,
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
