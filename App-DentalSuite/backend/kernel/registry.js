'use strict';

const contract = require('../../core/contract.json');
const authz = require('./authz');
const { ok, fail } = require('./result');
const { codeOf, ErrorCode } = require('./errors');

function channelFor(actionId) {
    return `${contract.ipcNamespace}:${actionId}`;
}

function resolveMethod(handlers, spec, actionId) {
    const handler = handlers[spec.handler];
    if (!handler) {
        throw new Error(`Handler "${spec.handler}" assente per l'azione "${actionId}"`);
    }
    const method = handler[spec.method];
    if (typeof method !== 'function') {
        throw new Error(`Metodo "${spec.handler}.${spec.method}" inesistente per l'azione "${actionId}"`);
    }
    return method.bind(handler);
}

function wrap(actionId, spec, method) {
    return async (event, payload) => {
        try {
            authz.assert(spec.permission);
            const data = await method(payload || {});
            return ok(data);
        } catch (error) {
            const code = codeOf(error);
            if (code === ErrorCode.UNEXPECTED) {
                console.error(`[DentalSuite] ${actionId}`, error);
            }
            return fail(code, error.message || 'Errore imprevisto');
        }
    };
}

function registerAll(registerApi, handlers) {
    if (typeof registerApi !== 'function') {
        throw new Error('registerApi non iniettato da Adestio');
    }
    const actionIds = Object.keys(contract.actions);
    actionIds.forEach(actionId => {
        const spec = contract.actions[actionId];
        const method = resolveMethod(handlers, spec, actionId);
        registerApi(channelFor(actionId), wrap(actionId, spec, method));
    });
    return actionIds.length;
}

module.exports = { registerAll, channelFor };
