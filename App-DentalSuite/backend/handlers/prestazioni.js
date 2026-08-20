'use strict';

const { prestazioni } = require('../repositories/organization');
const { trattamenti } = require('../repositories/clinical');
const { validationError, conflictError } = require('../kernel/errors');
const compensi = require('../domain/compensi');
const money = require('../domain/money');

const TIPI_QUOTA = [compensi.QUOTA_PERCENTUALE, compensi.QUOTA_FISSA];

function decora(riga) {
    const ripartizione = compensi.ripartisci(riga, riga.prezzo_paziente);
    return {
        ...riga,
        quota_medico_calcolata: ripartizione.quota_medico,
        quota_segretaria_calcolata: ripartizione.quota_segretaria,
        margine_studio: ripartizione.margine_studio,
        marginalita_percentuale: riga.prezzo_paziente > 0
            ? money.round((ripartizione.margine_studio / riga.prezzo_paziente) * 100)
            : 0
    };
}

function valida(payload) {
    const errori = [];
    if (!String(payload.nome || '').trim()) errori.push('Il nome della prestazione è obbligatorio');
    if (Number(payload.prezzo_paziente) < 0) errori.push('Il prezzo non può essere negativo');
    if (payload.tipo_quota_medico && !TIPI_QUOTA.includes(payload.tipo_quota_medico)) {
        errori.push('Tipo quota medico non valido');
    }
    if (payload.tipo_quota_segretaria && !TIPI_QUOTA.includes(payload.tipo_quota_segretaria)) {
        errori.push('Tipo quota segreteria non valido');
    }
    if (payload.tipo_quota_medico === compensi.QUOTA_PERCENTUALE && Number(payload.valore_quota_medico) > 100) {
        errori.push('La percentuale medico non può superare 100');
    }
    if (Number(payload.durata_stimata_minuti) < 0) errori.push('La durata non può essere negativa');
    if (errori.length > 0) throw validationError(errori.join('. '));

    const controllo = compensi.ripartisci(payload, payload.prezzo_paziente || 0);
    if (controllo.margine_studio < 0) {
        throw validationError('Compensi e materiali superano il prezzo al paziente: margine negativo');
    }
}

function list(payload = {}) {
    return prestazioni.findAll({ includeArchived: payload.includeArchived === true }).map(decora);
}

function get(payload = {}) {
    return decora(prestazioni.requireById(payload.id, { includeArchived: true }));
}

async function create(payload = {}) {
    valida(payload);
    const id = await prestazioni.insert(payload);
    return { id };
}

async function update(payload = {}) {
    if (!payload.id) throw validationError('Identificativo prestazione mancante');
    const corrente = prestazioni.requireById(payload.id, { includeArchived: true });
    valida({ ...corrente, ...payload });
    await prestazioni.update(payload.id, payload);
    return { id: payload.id };
}

async function remove(payload = {}) {
    const collegati = trattamenti.findAll({ where: { prestazione_id: payload.id } });
    if (collegati.length > 0) {
        throw conflictError(`Prestazione utilizzata in ${collegati.length} trattamenti: disattivarla invece di eliminarla`);
    }
    await prestazioni.archive(payload.id);
    return { id: payload.id };
}

module.exports = { list, get, create, update, remove };
