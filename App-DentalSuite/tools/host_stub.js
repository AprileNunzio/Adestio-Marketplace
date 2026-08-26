'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const AUTH_SCHEMA = `
CREATE TABLE users (id TEXT PRIMARY KEY, is_superadmin INTEGER DEFAULT 0);
CREATE TABLE groups (id TEXT PRIMARY KEY, is_superadmin INTEGER DEFAULT 0);
CREATE TABLE user_groups (user_id TEXT, group_id TEXT, is_deleted INTEGER DEFAULT 0);
CREATE TABLE user_permissions (user_id TEXT, permission_id TEXT, is_deleted INTEGER DEFAULT 0);
CREATE TABLE group_permissions (group_id TEXT, permission_id TEXT, is_deleted INTEGER DEFAULT 0);
`;

function adapt(database) {
    return {
        query(sql, params = []) {
            return database.prepare(sql).all(...params);
        },
        run(sql, params = []) {
            return database.prepare(sql).run(...params);
        },
        exec(sql) {
            return database.exec(sql);
        }
    };
}

function scriviSessionManager(radice, utenteId) {
    const cartella = path.join(radice, 'backend', 'core');
    fs.mkdirSync(cartella, { recursive: true });
    fs.writeFileSync(
        path.join(cartella, 'session_manager.js'),
        `module.exports = { getCurrentUserId: () => ${JSON.stringify(utenteId)}, isAuthenticated: () => true };`,
        'utf8'
    );
}

function creaHost(opzioni = {}) {
    const utenteId = opzioni.utenteId || 'utente-test';
    const radice = fs.mkdtempSync(path.join(os.tmpdir(), 'dental-host-'));
    scriviSessionManager(radice, utenteId);

    const appDb = new DatabaseSync(':memory:');
    const authDb = new DatabaseSync(':memory:');
    authDb.exec(AUTH_SCHEMA);
    authDb.prepare('INSERT INTO users (id, is_superadmin) VALUES (?, ?)')
        .run(utenteId, opzioni.superadmin ? 1 : 0);

    const migrations = require('../migrations.js');
    migrations.forEach(migrazione => appDb.exec(migrazione.sql));

    const domini = { app_dental_suite: adapt(appDb), auth: adapt(authDb) };
    let salvataggi = 0;

    return {
        utenteId,
        radice,
        concedi(permessi) {
            permessi.forEach(permesso => {
                authDb.prepare('INSERT INTO user_permissions (user_id, permission_id, is_deleted) VALUES (?, ?, 0)')
                    .run(utenteId, `adestio_dental_suite:${permesso}`);
            });
        },
        alteraDocumentoFirmato(id) {
            appDb.prepare("UPDATE documenti_firmati SET testo = testo || ' [riga aggiunta dopo la firma]' WHERE id = ?").run(id);
        },
        manomettiAudit() {
            appDb.prepare("UPDATE log_audit SET esito = 'consentito' WHERE esito = 'negato'").run();
        },
        revocaTutto() {
            authDb.prepare('DELETE FROM user_permissions WHERE user_id = ?').run(utenteId);
        },
        adestioDb: {
            getDB: dominio => domini[dominio] || null,
            saveDB: async () => { salvataggi += 1; return true; },
            readConfig: () => ({ istituto_nome: 'Studio Test' })
        },
        electronApp: { getAppPath: () => radice },
        salvataggi: () => salvataggi,
        pulisci() {
            appDb.close();
            authDb.close();
            fs.rmSync(radice, { recursive: true, force: true });
        }
    };
}

function creaBroker() {
    const canali = new Map();
    return {
        registerApi(azione, gestore) {
            canali.set(azione, gestore);
        },
        async invoca(azione, payload = {}) {
            const gestore = canali.get(`dentalSuite:${azione}`);
            if (!gestore) throw new Error(`Canale non registrato: dentalSuite:${azione}`);
            return gestore(null, payload);
        },
        conteggio: () => canali.size
    };
}

module.exports = { creaHost, creaBroker };
