'use strict';

const { prescrizioni, pazienti } = require('../repositories/clinical');
const { staff } = require('../repositories/organization');
const { validationError } = require('../kernel/errors');
const actor = require('../kernel/actor');
const riferimenti = require('../kernel/riferimenti');
const { oggiIso } = require('../domain/rateizzazione');

function listByPaziente(payload = {}) {
    if (!payload.paziente_id) throw validationError('Identificativo paziente mancante');
    const righe = prescrizioni.findAll({ where: { paziente_id: payload.paziente_id } });
    const medici = riferimenti.mappaPerId(staff, riferimenti.raccogli(righe, 'medico_id'));
    return righe.map(riga => ({
        ...riga,
        medico: medici.has(riga.medico_id)
            ? `${medici.get(riga.medico_id).cognome} ${medici.get(riga.medico_id).nome}`.trim()
            : ''
    }));
}

async function add(payload = {}) {
    if (!payload.paziente_id) throw validationError('Identificativo paziente mancante');
    if (!String(payload.farmaco || '').trim()) throw validationError('Il farmaco è obbligatorio');
    if (!payload.medico_id) throw validationError('La prescrizione richiede il medico prescrittore');
    pazienti.requireById(payload.paziente_id, { includeArchived: true });
    staff.requireById(payload.medico_id, { includeArchived: true });

    const durata = Number(payload.durata_giorni || 0);
    if (durata < 0 || durata > 365) throw validationError('Durata della terapia non plausibile');

    const id = await prescrizioni.insert(
        { ...payload, data_prescrizione: payload.data_prescrizione || oggiIso() },
        actor.stamp()
    );
    return { id };
}

async function remove(payload = {}) {
    await prescrizioni.archive(payload.id);
    return { id: payload.id };
}

module.exports = { listByPaziente, add, remove };
