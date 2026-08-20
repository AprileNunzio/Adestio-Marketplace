'use strict';

const { trattamenti, pazienti } = require('../repositories/clinical');
const { staff, prestazioni } = require('../repositories/organization');
const { appuntamenti } = require('../repositories/facility');
const { incassi, spese, rate } = require('../repositories/financial');
const kpi = require('../domain/kpi');
const money = require('../domain/money');
const { oggiIso } = require('../domain/rateizzazione');

function intervallo(payload = {}) {
    return { dal: payload.dal || '', al: payload.al || '' };
}

function produzione(payload = {}) {
    const finestra = intervallo(payload);
    const righeTrattamenti = trattamenti.findAll({});
    const base = kpi.produzione(righeTrattamenti, finestra);
    const anagrafiche = pazienti.findAll({});
    const agenda = appuntamenti.findAll({});

    const conclusi = agenda.filter(app => app.stato === 'concluso').length;
    const disdetti = agenda.filter(app => app.stato === 'non_presentato' || app.stato === 'annullato').length;

    return {
        ...base,
        pazienti_attivi: anagrafiche.length,
        appuntamenti_totali: agenda.length,
        appuntamenti_conclusi: conclusi,
        tasso_assenza: agenda.length > 0 ? money.round((disdetti / agenda.length) * 100) : 0,
        valore_medio_trattamento: base.trattamenti_eseguiti > 0
            ? money.round(base.valore_eseguito / base.trattamenti_eseguiti)
            : 0
    };
}

function perMedico(payload = {}) {
    return kpi.perCollaboratore(
        trattamenti.findAll({}),
        staff.findAll({ includeArchived: true }),
        intervallo(payload)
    );
}

function perBranca(payload = {}) {
    return kpi.perBranca(
        trattamenti.findAll({}),
        prestazioni.findAll({ includeArchived: true }),
        intervallo(payload)
    );
}

function economia(payload = {}) {
    const finestra = intervallo(payload);
    const analisi = kpi.economia({
        incassi: incassi.findAll({}),
        spese: spese.findAll({}),
        trattamenti: trattamenti.findAll({})
    }, finestra);

    const esposizione = kpi.esposizioneRate(rate.findAll({}), payload.oggi || oggiIso());
    const marginalita = analisi.totale_incassi > 0
        ? money.round((analisi.margine_netto / analisi.totale_incassi) * 100)
        : 0;

    return { ...analisi, ...esposizione, marginalita_percentuale: marginalita };
}

module.exports = { produzione, perMedico, perBranca, economia };
