'use strict';

const { spese } = require('../repositories/financial');
const { validationError } = require('../kernel/errors');
const actor = require('../kernel/actor');
const money = require('../domain/money');
const kpi = require('../domain/kpi');
const { oggiIso } = require('../domain/rateizzazione');

const CATEGORIE = [
    'materiali_consumo', 'laboratorio_odontotecnico', 'attrezzature', 'manutenzioni',
    'affitto', 'utenze', 'personale', 'consulenze', 'marketing', 'assicurazioni',
    'formazione', 'smaltimento_rifiuti', 'software', 'altro'
];

function filtriDi(payload) {
    const filtri = [];
    if (payload.dal) filtri.push({ colonna: 'data_spesa', operatore: 'gte', valore: payload.dal });
    if (payload.al) filtri.push({ colonna: 'data_spesa', operatore: 'lte', valore: payload.al });
    if (payload.categoria) filtri.push({ colonna: 'categoria', operatore: 'eq', valore: payload.categoria });
    return filtri;
}

function list(payload = {}) {
    const righe = spese.findAll({ filtri: filtriDi(payload) });
    return {
        righe,
        totale: money.sum(righe.map(riga => riga.importo)),
        per_categoria: kpi.raggruppa(righe, riga => riga.categoria, riga => riga.importo)
    };
}

async function registra(payload = {}) {
    const importo = money.round(payload.importo);
    if (!Number.isFinite(importo) || importo <= 0) {
        throw validationError("L'importo della spesa deve essere positivo");
    }
    if (!String(payload.descrizione || '').trim()) {
        throw validationError('La descrizione della spesa è obbligatoria');
    }
    if (payload.categoria && !CATEGORIE.includes(payload.categoria)) {
        throw validationError(`Categoria di spesa non valida: ${payload.categoria}`);
    }

    const id = payload.id
        ? await spese.update(payload.id, { ...payload, importo }, actor.stamp())
        : await spese.insert({
            ...payload,
            importo,
            data_spesa: payload.data_spesa || oggiIso()
        }, actor.stamp());
    return { id, importo };
}

async function remove(payload = {}) {
    spese.requireById(payload.id, { includeArchived: true });
    await spese.archive(payload.id);
    return { id: payload.id };
}

module.exports = { list, registra, remove, CATEGORIE };
