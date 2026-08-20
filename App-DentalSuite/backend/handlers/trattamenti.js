'use strict';

const { trattamenti, pazienti } = require('../repositories/clinical');
const { prestazioni } = require('../repositories/organization');
const { validationError, conflictError } = require('../kernel/errors');
const actor = require('../kernel/actor');
const compensi = require('../domain/compensi');
const accordiDominio = require('../domain/accordi');
const { accordi } = require('../repositories/compensi');
const { staff } = require('../repositories/organization');
const money = require('../domain/money');

const STATI = ['pianificato', 'in_corso', 'eseguito', 'annullato'];

function quotaDaAccordo(staffId, prestazione, ruolo, data, importo) {
    if (!staffId) return null;
    const attivi = accordi.findAll({ where: { staff_id: staffId } });
    const accordo = accordiDominio.risolvi(attivi, prestazione, ruolo, data);
    if (accordo) return accordiDominio.applica(accordo, importo);

    const collaboratore = staff.findById(staffId, { includeArchived: true });
    if (collaboratore && Number(collaboratore.percentuale_default) > 0) {
        return money.percentOf(importo, collaboratore.percentuale_default);
    }
    return null;
}

function arricchisci(payload) {
    const prestazione = payload.prestazione_id ? prestazioni.findById(payload.prestazione_id) : null;
    const importo = payload.importo !== undefined && payload.importo !== ''
        ? money.round(payload.importo)
        : money.round(prestazione ? prestazione.prezzo_paziente : 0);

    const data = payload.data_trattamento || '';
    const sovrascritture = { ...payload };
    if (sovrascritture.quota_medico === undefined) {
        const quota = quotaDaAccordo(payload.medico_id, prestazione, 'medico', data, importo);
        if (quota !== null) sovrascritture.quota_medico = quota;
    }
    if (sovrascritture.quota_segretaria === undefined) {
        const quota = quotaDaAccordo(payload.segretaria_id, prestazione, 'assistente', data, importo);
        if (quota !== null) sovrascritture.quota_segretaria = quota;
    }

    const ripartizione = compensi.ripartisci(prestazione || {}, importo, sovrascritture);
    return {
        ...payload,
        descrizione: payload.descrizione || (prestazione ? prestazione.nome : ''),
        importo: ripartizione.importo,
        quota_medico: ripartizione.quota_medico,
        quota_segretaria: ripartizione.quota_segretaria,
        costo_materiali: ripartizione.costo_materiali
    };
}

function valida(payload) {
    if (!payload.paziente_id) throw validationError('Identificativo paziente mancante');
    if (payload.stato && !STATI.includes(payload.stato)) {
        throw validationError(`Stato trattamento non valido: ${payload.stato}`);
    }
    if (Number(payload.importo) < 0) throw validationError("L'importo non può essere negativo");
}

function listByPaziente(payload = {}) {
    if (!payload.paziente_id) throw validationError('Identificativo paziente mancante');
    const righe = trattamenti.findAll({ where: { paziente_id: payload.paziente_id } });
    const catalogo = new Map(prestazioni.findAll({ includeArchived: true }).map(p => [p.id, p]));
    return righe.map(riga => ({
        ...riga,
        prestazione: catalogo.get(riga.prestazione_id) || null,
        margine_studio: money.round(
            riga.importo - riga.quota_medico - riga.quota_segretaria - riga.costo_materiali
        )
    }));
}

async function add(payload = {}) {
    valida(payload);
    pazienti.requireById(payload.paziente_id, { includeArchived: true });
    const dati = arricchisci(payload);
    const id = await trattamenti.insert(dati, actor.stamp());
    return { id };
}

async function update(payload = {}) {
    if (!payload.id) throw validationError('Identificativo trattamento mancante');
    const corrente = trattamenti.requireById(payload.id, { includeArchived: true });
    if (corrente.liquidazione_id) {
        throw conflictError('Trattamento già liquidato: non è più modificabile');
    }
    valida({ ...corrente, ...payload });
    const dati = arricchisci({ ...corrente, ...payload });
    await trattamenti.update(payload.id, dati, actor.stamp());
    return { id: payload.id };
}

async function remove(payload = {}) {
    const corrente = trattamenti.requireById(payload.id, { includeArchived: true });
    if (corrente.liquidazione_id) {
        throw conflictError('Trattamento già liquidato: non è eliminabile');
    }
    await trattamenti.archive(payload.id);
    return { id: payload.id };
}

module.exports = { listByPaziente, add, update, remove, STATI };
