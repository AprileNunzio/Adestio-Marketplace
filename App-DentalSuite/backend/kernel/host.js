'use strict';

let bridge = null;
let electronApp = null;

function configure(adestioDb, app) {
    if (!adestioDb || typeof adestioDb.getDB !== 'function') {
        throw new Error('Bridge Adestio non valido: getDB mancante');
    }
    bridge = adestioDb;
    electronApp = app && typeof app.getAppPath === 'function' ? app : null;
}

function isConfigured() {
    return bridge !== null;
}

function getDb(domain) {
    if (!bridge) throw new Error('Bridge Adestio non configurato');
    const handle = bridge.getDB(domain);
    if (!handle) throw new Error(`Database "${domain}" non disponibile`);
    return handle;
}

function tryGetDb(domain) {
    try {
        return getDb(domain);
    } catch (e) {
        return null;
    }
}

async function saveDb(domain) {
    if (!bridge || typeof bridge.saveDB !== 'function') return false;
    await bridge.saveDB(domain);
    return true;
}

function replicaSupportata() {
    return Boolean(bridge && typeof bridge.replica === 'function');
}

function replica(eventType, tabella, recordId, payload) {
    try {
        if (!replicaSupportata()) return false;
        return bridge.replica(eventType, tabella, recordId, payload);
    } catch (e) {
        return false;
    }
}

function readConfig() {
    if (!bridge || typeof bridge.readConfig !== 'function') return {};
    return bridge.readConfig() || {};
}

function appPath() {
    if (!electronApp) return null;
    try {
        return electronApp.getAppPath();
    } catch (e) {
        return null;
    }
}

module.exports = { configure, isConfigured, getDb, tryGetDb, saveDb, readConfig, appPath, replica, replicaSupportata };
