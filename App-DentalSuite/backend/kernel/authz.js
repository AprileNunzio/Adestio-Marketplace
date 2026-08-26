'use strict';

const contract = require('../../core/contract.json');
const catalogue = require('../../core/permissions.json');
const host = require('./host');
const session = require('./session');
const { forbiddenError, unauthenticatedError } = require('./errors');

const AUTH_DOMAIN = 'auth';
const WILDCARD = '*';
const APP_WILDCARD = `${contract.appId}:${WILDCARD}`;
const CACHE_TTL_MS = 5000;

const publicByDefault = new Set(
    catalogue.filter(p => p.default === true).map(p => p.id)
);

let cache = { userId: null, permissions: null, expiresAt: 0 };

function scopedId(permissionId) {
    return `${contract.appId}:${permissionId}`;
}

function querySuperadmin(db, userId) {
    try {
        const direct = db.query('SELECT is_superadmin FROM users WHERE id = ?', [userId]);
        if (direct.length > 0 && direct[0].is_superadmin === 1) return true;
    } catch (e) {}
    try {
        const viaGroup = db.query(
            `SELECT 1 AS found FROM groups g
             JOIN user_groups ug ON ug.group_id = g.id
             WHERE ug.user_id = ? AND ug.is_deleted = 0 AND g.is_superadmin = 1
             LIMIT 1`,
            [userId]
        );
        if (viaGroup.length > 0) return true;
    } catch (e) {}
    return false;
}

function queryGrantedPermissions(db, userId) {
    try {
        const rows = db.query(
            `SELECT permission_id FROM user_permissions WHERE user_id = ? AND is_deleted = 0
             UNION
             SELECT permission_id FROM group_permissions WHERE group_id IN (
                 SELECT group_id FROM user_groups WHERE user_id = ? AND is_deleted = 0
             ) AND is_deleted = 0`,
            [userId, userId]
        );
        return (rows || []).map(r => r.permission_id);
    } catch (e) {
        return [];
    }
}

function loadPermissions(userId) {
    const nowTs = Date.now();
    if (cache.userId === userId && cache.expiresAt > nowTs && cache.permissions) {
        return cache.permissions;
    }
    const db = host.tryGetDb(AUTH_DOMAIN);
    if (!db) return null;
    const permissions = querySuperadmin(db, userId)
        ? [WILDCARD]
        : queryGrantedPermissions(db, userId);
    cache = { userId, permissions, expiresAt: nowTs + CACHE_TTL_MS };
    return permissions;
}

function grants(permissions, permissionId) {
    if (!Array.isArray(permissions)) return false;
    return permissions.includes(WILDCARD)
        || permissions.includes(APP_WILDCARD)
        || permissions.includes(scopedId(permissionId));
}

function mode() {
    return session.isResolvable() ? 'strict' : 'degraded';
}

function assert(permissionId) {
    if (!permissionId) return;
    if (mode() === 'degraded') {
        if (publicByDefault.has(permissionId)) return;
        throw forbiddenError(
            `Permesso "${permissionId}" non verificabile: sessione utente non risolvibile dall'host`
        );
    }
    const userId = session.currentUserId();
    if (!userId) {
        throw unauthenticatedError('Nessun utente autenticato per questa operazione');
    }
    const permissions = loadPermissions(userId);
    if (permissions === null) {
        throw forbiddenError('Archivio permessi non raggiungibile');
    }
    if (!grants(permissions, permissionId)) {
        throw forbiddenError(`Permesso negato: ${permissionId}`);
    }
}

function invalidate() {
    cache = { userId: null, permissions: null, expiresAt: 0 };
}

module.exports = { assert, mode, invalidate, scopedId };
