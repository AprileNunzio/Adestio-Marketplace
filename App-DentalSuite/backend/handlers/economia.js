'use strict';

const { trattamenti, pazienti } = require('../repositories/clinical');
const { preventivi, incassi, rate } = require('../repositories/financial');
const { validationError } = require('../kernel/errors');
const dominio = require('../domain/situazione');
const identita = require('../domain/identita');
const { oggiIso } = require('../domain/rateizzazione');

function materiale(pazienteId) {
    return {
        trattamenti: trattamenti.findAll({ where: { paziente_id: pazienteId } }),
        preventivi: preventivi.findAll({ where: { paziente_id: pazienteId } }),
        incassi: incassi.findAll({ where: { paziente_id: pazienteId }, ordina: 'data_pagamento DESC' }),
        rate: rate.findAll({
            where: { paziente_id: pazienteId },
            filtri: [{ colonna: 'stato', operatore: 'ne', valore: 'pagata' }],
            ordina: 'data_scadenza ASC'
        })
    };
}

function paziente(payload = {}) {
    if (!payload.paziente_id) throw validationError('Identificativo paziente mancante');
    const anagrafica = pazienti.requireById(payload.paziente_id, { includeArchived: true });
    const dati = materiale(payload.paziente_id);
    const situazione = dominio.componi({ ...dati, oggi: payload.oggi || oggiIso() });

    return {
        paziente: { id: anagrafica.id, nominativo: identita.nominativo(anagrafica) },
        ...situazione,
        etichetta_saldo: dominio.etichettaSaldo(situazione),
        valore_saldo: dominio.valoreSaldo(situazione),
        incassi: dati.incassi
    };
}

module.exports = { paziente, materiale };
