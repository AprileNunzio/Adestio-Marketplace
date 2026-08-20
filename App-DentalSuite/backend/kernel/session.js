'use strict';

const path = require('path');
const host = require('./host');

const SESSION_MODULE = ['backend', 'core', 'session_manager.js'];

let manager = null;
let probed = false;

function probe() {
    if (probed) return manager;
    probed = true;
    const base = host.appPath();
    if (!base) return null;
    try {
        const candidate = require(path.join(base, ...SESSION_MODULE));
        if (candidate && typeof candidate.getCurrentUserId === 'function') {
            manager = candidate;
        }
    } catch (e) {
        manager = null;
    }
    return manager;
}

function isResolvable() {
    return probe() !== null;
}

function currentUserId() {
    const sm = probe();
    if (!sm) return null;
    try {
        return sm.getCurrentUserId() || null;
    } catch (e) {
        return null;
    }
}

function reset() {
    manager = null;
    probed = false;
}

module.exports = { isResolvable, currentUserId, reset };
