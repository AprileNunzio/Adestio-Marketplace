'use strict';

const { odontogramma, pazienti } = require('../repositories/clinical');
const { validationError } = require('../kernel/errors');
const actor = require('../kernel/actor');
const denti = require('../domain/denti');

function get(payload = {}) {
    if (!payload.paziente_id) throw validationError('Identificativo paziente mancante');
    pazienti.requireById(payload.paziente_id, { includeArchived: true });
    const registrati = odontogramma.findAll({ where: { paziente_id: payload.paziente_id } });
    const dentizione = payload.dentizione === denti.DECIDUA ? denti.DECIDUA : denti.PERMANENTE;
    return {
        dentizione,
        arcate: denti.arcate(dentizione),
        stati: denti.STATI,
        denti: denti.mappaStati(dentizione, registrati)
    };
}

async function saveDente(payload = {}) {
    if (!payload.paziente_id) throw validationError('Identificativo paziente mancante');
    const numero = String(payload.numero_dente || '').trim();
    if (!denti.esiste(numero)) throw validationError(`Numero dente FDI non valido: ${numero}`);
    if (payload.stato && !denti.STATI.some(stato => stato.id === payload.stato)) {
        throw validationError(`Stato clinico non riconosciuto: ${payload.stato}`);
    }
    pazienti.requireById(payload.paziente_id, { includeArchived: true });

    const dati = {
        ...payload,
        numero_dente: numero,
        dentizione: denti.dentizioneDi(numero),
        superfici: denti.normalizzaSuperfici(payload.superfici)
    };
    const esistenti = odontogramma.findAll({ where: { paziente_id: payload.paziente_id, numero_dente: numero } });
    const id = esistenti.length > 0
        ? await odontogramma.update(esistenti[0].id, dati, actor.stamp())
        : await odontogramma.insert(dati, actor.stamp());
    return { id, numero_dente: numero };
}

module.exports = { get, saveDente };
