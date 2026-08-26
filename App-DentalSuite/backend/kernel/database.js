'use strict';

const crypto = require('crypto');
const contract = require('../../core/contract.json');
const host = require('./host');

const DB_DOMAIN = `app_${contract.dbNamespace}`;

function db() {
    return host.getDb(DB_DOMAIN);
}

async function persist() {
    return host.saveDb(DB_DOMAIN);
}

function newId() {
    return crypto.randomUUID();
}

function now() {
    return Date.now();
}

function tableExists(name) {
    try {
        const rows = db().query(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
            [name]
        );
        return rows.length > 0;
    } catch (e) {
        return false;
    }
}

module.exports = { db, persist, newId, now, tableExists, DB_DOMAIN };
