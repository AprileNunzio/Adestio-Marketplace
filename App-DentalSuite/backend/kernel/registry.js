'use strict';

const contract = require('../../core/contract.json');
const authz = require('./authz');
const actor = require('./actor');
const audit = require('./audit');
const { ok, fail } = require('./result');
const { codeOf, ErrorCode } = require('./errors');

const ESITO_CONSENTITO = 'consentito';
const ESITO_NEGATO = 'negato';
const ESITO_FALLITO = 'fallito';

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

function esitoDa(codice) {
    return codice === ErrorCode.FORBIDDEN || codice === ErrorCode.UNAUTHENTICATED
        ? ESITO_NEGATO
        : ESITO_FALLITO;
}

function traccia(actionId, spec, payload, esito, errore, avvio) {
    if (spec.traccia === false) return;
    audit.registra({
        azione: actionId,
        permesso: spec.permission,
        muta: spec.mutates === true,
        attoreId: actor.currentActorId(),
        payload,
        esito,
        codiceErrore: errore ? codeOf(errore) : '',
        messaggio: errore ? errore.message : '',
        durataMs: Date.now() - avvio
    });
}

function wrap(actionId, spec, method) {
    return async (event, payload) => {
        const avvio = Date.now();
        try {
            authz.assert(spec.permission);
            const data = await method(payload || {});
            traccia(actionId, spec, payload, ESITO_CONSENTITO, null, avvio);
            return ok(data);
        } catch (error) {
            const code = codeOf(error);
            if (code === ErrorCode.UNEXPECTED) {
                console.error(`[DentalSuite] ${actionId}`, error);
            }
            traccia(actionId, spec, payload, esitoDa(code), error, avvio);
            return fail(code, error.message || 'Errore imprevisto');
        }
    };
}

function registerAll(registerApi, handlers) {
    if (typeof registerApi !== 'function') {
        throw new Error('registerApi non iniettato da Adestio');
    }
    audit.reimposta();
    const actionIds = Object.keys(contract.actions);
    let count = 0;
    actionIds.forEach(actionId => {
        try {
            const spec = contract.actions[actionId];
            const method = resolveMethod(handlers, spec, actionId);
            registerApi(channelFor(actionId), wrap(actionId, spec, method));
            count += 1;
        } catch (e) {
            console.error(`[DentalSuite] Registrazione saltata per ${actionId}:`, e.message);
        }
    });
    return count;
}

module.exports = { registerAll, channelFor };
