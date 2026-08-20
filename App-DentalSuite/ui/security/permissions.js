import { loadContract } from '../kernel/contract.js';

const WILDCARD = '*';

let snapshot = null;
let inFlight = null;

function currentUserId() {
    try {
        return sessionStorage.getItem('currentUserId') || null;
    } catch (e) {
        return null;
    }
}

function rbacApi() {
    const api = window.electronAPI && window.electronAPI.rbac;
    return api && typeof api.getEffectiveUserPermissions === 'function' ? api : null;
}

function normalize(raw) {
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.data)) return raw.data;
    return null;
}

async function fetchSnapshot() {
    const contract = await loadContract();
    const userId = currentUserId();
    if (!userId) {
        return { resolved: false, reason: 'Sessione utente non disponibile', granted: [], appId: contract.appId };
    }
    const api = rbacApi();
    if (!api) {
        return { resolved: false, reason: 'Servizio RBAC di Adestio non disponibile', granted: [], appId: contract.appId };
    }
    const granted = normalize(await api.getEffectiveUserPermissions(userId));
    if (!granted) {
        return { resolved: false, reason: 'Risposta RBAC non interpretabile', granted: [], appId: contract.appId };
    }
    return { resolved: true, reason: null, granted, appId: contract.appId };
}

export async function permissions() {
    if (snapshot) return snapshot;
    if (!inFlight) {
        inFlight = fetchSnapshot()
            .then(result => {
                snapshot = result;
                return result;
            })
            .catch(error => {
                inFlight = null;
                snapshot = { resolved: false, reason: error.message, granted: [], appId: null };
                return snapshot;
            });
    }
    return inFlight;
}

export function invalidate() {
    snapshot = null;
    inFlight = null;
}

export async function can(permissionId) {
    const state = await permissions();
    if (!state.resolved) return false;
    if (state.granted.includes(WILDCARD)) return true;
    if (!state.appId) return false;
    if (state.granted.includes(`${state.appId}:${WILDCARD}`)) return true;
    return state.granted.includes(`${state.appId}:${permissionId}`);
}

export async function canAny(permissionIds) {
    const checks = await Promise.all(permissionIds.map(can));
    return checks.some(Boolean);
}

export async function canAll(permissionIds) {
    const checks = await Promise.all(permissionIds.map(can));
    return checks.every(Boolean);
}

export async function isUnresolved() {
    const state = await permissions();
    return state.resolved === false;
}

export async function unresolvedReason() {
    const state = await permissions();
    return state.resolved ? null : state.reason;
}
