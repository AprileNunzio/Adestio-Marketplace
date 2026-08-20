'use strict';

const { incassi, preventivi } = require('../repositories/financial');
const { pazienti } = require('../repositories/clinical');
const { validationError } = require('../kernel/errors');
const actor = require('../kernel/actor');
const money = require('../domain/money');
const { oggiIso } = require('../domain/rateizzazione');

const METODI = ['contanti', 'bancomat', 'carta_credito', 'bonifico', 'assegno', 'finanziamento'];
const TIPI_DOCUMENTO = ['ricevuta', 'fattura', 'acconto', 'saldo'];

function nellIntervallo(payload, riga) {
    if (payload.dal && riga.data_pagamento < payload.dal) return false;
    if (payload.al && riga.data_pagamento > payload.al) return false;
    return true;
}

function list(payload = {}) {
    const righe = payload.paziente_id
        ? incassi.findAll({ where: { paziente_id: payload.paziente_id } })
        : incassi.findAll({});
    const filtrate = righe.filter(riga => nellIntervallo(payload, riga));
    const anagrafiche = new Map(pazienti.findAll({ includeArchived: true }).map(p => [p.id, p]));
    return {
        righe: filtrate.map(riga => ({
            ...riga,
            paziente_nome: anagrafiche.has(riga.paziente_id)
                ? `${anagrafiche.get(riga.paziente_id).cognome} ${anagrafiche.get(riga.paziente_id).nome}`.trim()
                : ''
        })),
        totale: money.sum(filtrate.map(riga => riga.importo))
    };
}

async function registra(payload = {}) {
    const importo = money.round(payload.importo);
    if (!Number.isFinite(importo) || importo <= 0) {
        throw validationError("L'importo dell'incasso deve essere positivo");
    }
    if (payload.metodo_pagamento && !METODI.includes(payload.metodo_pagamento)) {
        throw validationError(`Metodo di pagamento non valido: ${payload.metodo_pagamento}`);
    }
    if (payload.tipo_documento && !TIPI_DOCUMENTO.includes(payload.tipo_documento)) {
        throw validationError(`Tipo documento non valido: ${payload.tipo_documento}`);
    }
    if (payload.paziente_id) pazienti.requireById(payload.paziente_id, { includeArchived: true });
    if (payload.preventivo_id) preventivi.requireById(payload.preventivo_id, { includeArchived: true });

    const id = await incassi.insert({
        ...payload,
        importo,
        data_pagamento: payload.data_pagamento || oggiIso()
    }, actor.stamp());
    return { id, importo };
}

async function remove(payload = {}) {
    incassi.requireById(payload.id, { includeArchived: true });
    await incassi.archive(payload.id);
    return { id: payload.id };
}

module.exports = { list, registra, remove, METODI, TIPI_DOCUMENTO };
