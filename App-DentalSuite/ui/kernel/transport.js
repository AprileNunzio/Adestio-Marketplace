import { loadContract } from './contract.js';
import { fail } from './result.js';

const BRIDGE_ERROR = 'BRIDGE_UNAVAILABLE';
const CONTRACT_ERROR = 'CONTRACT_VIOLATION';
const TRANSPORT_ERROR = 'TRANSPORT_FAILURE';

function bridge() {
    return window.adestioNative && typeof window.adestioNative.callAppApi === 'function'
        ? window.adestioNative
        : null;
}

function unwrap(envelope) {
    if (!envelope || envelope.success !== true) {
        return fail(TRANSPORT_ERROR, (envelope && envelope.error) || 'Comunicazione con il backend fallita');
    }
    const inner = envelope.data;
    if (!inner || typeof inner.success !== 'boolean') {
        return fail(TRANSPORT_ERROR, 'Risposta del backend non conforme al contratto');
    }
    return inner;
}

export async function call(actionId, payload = {}) {
    let contract;
    try {
        contract = await loadContract();
    } catch (error) {
        return fail(CONTRACT_ERROR, error.message);
    }

    if (!contract.actions[actionId]) {
        return fail(CONTRACT_ERROR, `Azione non dichiarata nel contratto: ${actionId}`);
    }

    const native = bridge();
    if (!native) {
        return fail(BRIDGE_ERROR, 'Bridge IPC di Adestio non disponibile');
    }

    try {
        const envelope = await native.callAppApi({
            sourceApp: contract.appId,
            targetApp: contract.appId,
            action: `${contract.ipcNamespace}:${actionId}`,
            payload
        });
        return unwrap(envelope);
    } catch (error) {
        return fail(TRANSPORT_ERROR, error.message || 'Eccezione nella chiamata al backend');
    }
}

export async function callAll(requests) {
    const entries = Object.entries(requests);
    const results = await Promise.all(entries.map(([, req]) => call(req.action, req.payload || {})));
    return entries.reduce((acc, [key], index) => {
        acc[key] = results[index];
        return acc;
    }, {});
}
