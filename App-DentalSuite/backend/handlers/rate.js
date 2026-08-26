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

function calcolaIntervalloMese(meseStr) {
    try {
        if (!meseStr || !/^\d{4}-\d{2}$/.test(meseStr)) return null;
        const [anno, mese] = meseStr.split('-').map(Number);
        const ultimoGiorno = new Date(anno, mese, 0).getDate();
        const mm = String(mese).padStart(2, '0');
        return {
            dal: `${anno}-${mm}-01`,
            al: `${anno}-${mm}-${String(ultimoGiorno).padStart(2, '0')}`
        };
    } catch (_) {
        return null;
    }
}

function filtriScadenziario(payload) {
    const filtri = [];
    if (payload.stato === 'aperte' || (!payload.stato && payload.includi_pagate !== true)) {
        filtri.push({ colonna: 'stato', operatore: 'ne', valore: dominio.STATO_PAGATA });
    } else if (payload.stato === 'pagate') {
        filtri.push({ colonna: 'stato', operatore: 'eq', valore: dominio.STATO_PAGATA });
    }

    let dal = payload.dal;
    let al = payload.al;
    if (payload.mese) {
        const intervallo = calcolaIntervalloMese(payload.mese);
        if (intervallo) {
            dal = intervallo.dal;
            al = intervallo.al;
        }
    }

    if (dal) filtri.push({ colonna: 'data_scadenza', operatore: 'gte', valore: dal });
    if (al) filtri.push({ colonna: 'data_scadenza', operatore: 'lte', valore: al });
    if (payload.paziente_id) filtri.push({ colonna: 'paziente_id', operatore: 'eq', valore: payload.paziente_id });
    return filtri;
}

function scadenziario(payload = {}) {
    const oggi = payload.oggi || dominio.oggiIso();
    const listaRate = rate.findAll({ filtri: filtriScadenziario(payload), ordina: 'data_scadenza ASC' });
    const anagrafiche = riferimenti.mappaPerId(pazienti, riferimenti.raccogli(listaRate, 'paziente_id'));

    let righe = listaRate.map(riga => {
        const isPagata = riga.stato === dominio.STATO_PAGATA;
        const isScaduta = !isPagata && Boolean(riga.data_scadenza && riga.data_scadenza < oggi);
        const anag = anagrafiche.get(riga.paziente_id);
        return {
            ...riga,
            pagata: isPagata,
            scaduta: isScaduta,
            paziente_nome: anag ? `${anag.cognome} ${anag.nome}`.trim() : '',
            paziente_telefono: anag ? anag.telefono : '',
            paziente_cf: anag ? anag.codice_fiscale : ''
        };
    });

    if (payload.stato === 'scadute') {
        righe = righe.filter(r => r.scaduta);
    }

    if (payload.termine) {
        const t = String(payload.termine).toLowerCase().trim();
        righe = righe.filter(r =>
            (r.paziente_nome && r.paziente_nome.toLowerCase().includes(t)) ||
            (r.paziente_telefono && r.paziente_telefono.includes(t)) ||
            (r.paziente_cf && r.paziente_cf.toLowerCase().includes(t))
        );
    }

    const aperte = righe.filter(r => !r.pagata);
    const pagate = righe.filter(r => r.pagata);
    const scadute = righe.filter(r => r.scaduta);

    return {
        righe,
        totale_rate: righe.length,
        totale_importo: money.sum(righe.map(r => r.importo)),
        totale_aperto: money.sum(aperte.map(r => r.importo)),
        totale_scaduto: money.sum(scadute.map(r => r.importo)),
        totale_pagato: money.sum(pagate.map(r => r.importo)),
        conteggio_aperte: aperte.length,
        conteggio_scadute: scadute.length,
        conteggio_pagate: pagate.length
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
        note: `Incasso rata ${riga.numero_rata}`
    }, actor.stamp());

    return { id: riga.id, incasso_id: incassoId, stato: dominio.STATO_PAGATA };
}

module.exports = { listByPaziente, scadenziario, creaPiano, pagaRata };
