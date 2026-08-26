'use strict';

const { pianiRateali, rate, incassi, preventivi } = require('../repositories/financial');
const { pazienti } = require('../repositories/clinical');
const { validationError, conflictError } = require('../kernel/errors');
const actor = require('../kernel/actor');
const riferimenti = require('../kernel/riferimenti');
const dominio = require('../domain/rateizzazione');
const money = require('../domain/money');

function rateDi(pianoId) {
    return rate.findAll({ where: { piano_id: pianoId } });
}

function decoraPiano(piano) {
    const elenco = rateDi(piano.id);
    return {
        ...piano,
        rate: elenco,
        residuo: dominio.residuoPiano(elenco),
        rate_scadute: dominio.scadute(elenco).length,
        stato_calcolato: dominio.statoPiano(elenco)
    };
}

function listByPaziente(payload = {}) {
    if (!payload.paziente_id) throw validationError('Identificativo paziente mancante');
    return pianiRateali
        .findAll({ where: { paziente_id: payload.paziente_id } })
        .map(decoraPiano);
}

function filtriScadenziario(payload) {
    const filtri = [{ colonna: 'stato', operatore: 'ne', valore: dominio.STATO_PAGATA }];
    if (payload.dal) filtri.push({ colonna: 'data_scadenza', operatore: 'gte', valore: payload.dal });
    if (payload.al) filtri.push({ colonna: 'data_scadenza', operatore: 'lte', valore: payload.al });
    if (payload.paziente_id) filtri.push({ colonna: 'paziente_id', operatore: 'eq', valore: payload.paziente_id });
    return filtri;
}

function scadenziario(payload = {}) {
    const oggi = payload.oggi || dominio.oggiIso();
    const aperte = rate.findAll({ filtri: filtriScadenziario(payload), ordina: 'data_scadenza ASC' });
    const anagrafiche = riferimenti.mappaPerId(pazienti, riferimenti.raccogli(aperte, 'paziente_id'));
    const righe = aperte
        .map(riga => ({
            ...riga,
            scaduta: Boolean(riga.data_scadenza && riga.data_scadenza < oggi),
            paziente_nome: anagrafiche.has(riga.paziente_id)
                ? `${anagrafiche.get(riga.paziente_id).cognome} ${anagrafiche.get(riga.paziente_id).nome}`.trim()
                : ''
        }));
    return {
        righe,
        totale_aperto: money.sum(righe.map(riga => riga.importo)),
        totale_scaduto: money.sum(righe.filter(riga => riga.scaduta).map(riga => riga.importo))
    };
}

async function creaPiano(payload = {}) {
    if (!payload.paziente_id) throw validationError('Selezionare il paziente');
    pazienti.requireById(payload.paziente_id, { includeArchived: true });
    if (payload.preventivo_id) preventivi.requireById(payload.preventivo_id, { includeArchived: true });

    let scadenze;
    try {
        scadenze = dominio.generaPiano(payload);
    } catch (errore) {
        throw validationError(errore.message);
    }

    const pianoId = await pianiRateali.insert({
        paziente_id: payload.paziente_id,
        preventivo_id: payload.preventivo_id || '',
        totale_piano: money.round(payload.totale_piano),
        acconto_iniziale: money.round(payload.acconto_iniziale || 0),
        numero_rate: scadenze.length,
        stato: 'attivo',
        note: payload.note || ''
    }, actor.stamp());

    for (const scadenza of scadenze) {
        await rate.insert({ ...scadenza, piano_id: pianoId, paziente_id: payload.paziente_id });
    }

    return { id: pianoId, rate_generate: scadenze.length };
}

async function pagaRata(payload = {}) {
    const riga = rate.requireById(payload.id, { includeArchived: true });
    if (riga.stato === dominio.STATO_PAGATA) {
        throw conflictError('Rata già saldata');
    }
    const dataPagamento = payload.data_pagamento || dominio.oggiIso();

    await rate.update(payload.id, {
        stato: dominio.STATO_PAGATA,
        data_pagamento: dataPagamento,
        metodo_pagamento: payload.metodo_pagamento || '',
        numero_ricevuta: payload.numero_ricevuta || ''
    });

    const incassoId = await incassi.insert({
        paziente_id: riga.paziente_id,
        rata_id: riga.id,
        tipo_documento: 'ricevuta',
        metodo_pagamento: payload.metodo_pagamento || 'contanti',
        importo: money.round(riga.importo),
        data_pagamento: dataPagamento,
        numero_documento: payload.numero_ricevuta || '',
        note: `Rata ${riga.numero_rata} piano ${riga.piano_id}`
    }, actor.stamp());

    const aggiornate = rateDi(riga.piano_id);
    await pianiRateali.update(riga.piano_id, { stato: dominio.statoPiano(aggiornate) });

    return { id: payload.id, incasso_id: incassoId, stato_piano: dominio.statoPiano(aggiornate) };
}

module.exports = { listByPaziente, scadenziario, creaPiano, pagaRata };
