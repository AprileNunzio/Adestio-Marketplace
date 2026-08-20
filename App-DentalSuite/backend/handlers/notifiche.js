'use strict';

const { notifiche } = require('../repositories/financial');
const { pazienti } = require('../repositories/clinical');
const { validationError, conflictError } = require('../kernel/errors');
const actor = require('../kernel/actor');
const { oggiIso } = require('../domain/rateizzazione');

const CANALI = ['whatsapp', 'sms', 'email', 'telefono'];

function listByPaziente(payload = {}) {
    if (!payload.paziente_id) throw validationError('Identificativo paziente mancante');
    return notifiche.findAll({ where: { paziente_id: payload.paziente_id } });
}

async function log(payload = {}) {
    if (!payload.paziente_id) throw validationError('Identificativo paziente mancante');
    if (!CANALI.includes(payload.tipo_canale)) {
        throw validationError(`Canale non valido: ${payload.tipo_canale}`);
    }
    const paziente = pazienti.requireById(payload.paziente_id, { includeArchived: true });
    if (Number(paziente.consenso_promemoria) !== 1) {
        throw conflictError('Il paziente non ha prestato consenso ai promemoria');
    }

    const id = await notifiche.insert({
        ...payload,
        destinatario: payload.destinatario || paziente.telefono || paziente.email || '',
        stato_esito: payload.stato_esito || 'registrata',
        data_invio: payload.data_invio || oggiIso()
    }, actor.stamp());
    return { id };
}

module.exports = { listByPaziente, log, CANALI };
