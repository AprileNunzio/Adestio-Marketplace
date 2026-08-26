'use strict';

const { incassi, preventivi } = require('../repositories/financial');
const { pazienti } = require('../repositories/clinical');
const { validationError } = require('../kernel/errors');
const actor = require('../kernel/actor');
const riferimenti = require('../kernel/riferimenti');
const money = require('../domain/money');
const { oggiIso } = require('../domain/rateizzazione');

const METODI = ['contanti', 'bancomat', 'carta_credito', 'bonifico', 'assegno', 'finanziamento'];
const TIPI_DOCUMENTO = ['ricevuta', 'fattura', 'acconto', 'saldo'];

function filtriDi(payload) {
    const filtri = [];
    if (payload.paziente_id) filtri.push({ colonna: 'paziente_id', operatore: 'eq', valore: payload.paziente_id });
    if (payload.dal) filtri.push({ colonna: 'data_pagamento', operatore: 'gte', valore: payload.dal });
    if (payload.al) filtri.push({ colonna: 'data_pagamento', operatore: 'lte', valore: payload.al });
    if (payload.metodo_pagamento) {
        filtri.push({ colonna: 'metodo_pagamento', operatore: 'eq', valore: payload.metodo_pagamento });
    }
    return filtri;
}

function list(payload = {}) {
    const righe = incassi.findAll({ filtri: filtriDi(payload) });
    const anagrafiche = riferimenti.mappaPerId(pazienti, riferimenti.raccogli(righe, 'paziente_id'));
    return {
        righe: righe.map(riga => ({
            ...riga,
            paziente_nome: anagrafiche.has(riga.paziente_id)
                ? `${anagrafiche.get(riga.paziente_id).cognome} ${anagrafiche.get(riga.paziente_id).nome}`.trim()
                : ''
        })),
        totale: money.sum(righe.map(riga => riga.importo))
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
