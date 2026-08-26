'use strict';

const { trattamenti, pazienti } = require('../repositories/clinical');
const { staff, prestazioni } = require('../repositories/organization');
const { appuntamenti } = require('../repositories/facility');
const { incassi, spese, rate } = require('../repositories/financial');
const kpi = require('../domain/kpi');
const money = require('../domain/money');
const { oggiIso } = require('../domain/rateizzazione');
const economiaHandler = require('./economia');

function intervallo(payload = {}) {
    return { dal: payload.dal || '', al: payload.al || '' };
}

function filtriPeriodo(colonna, finestra) {
    const filtri = [];
    if (finestra.dal) filtri.push({ colonna, operatore: 'gte', valore: finestra.dal });
    if (finestra.al) filtri.push({ colonna, operatore: 'lte', valore: finestra.al });
    return filtri;
}

function trattamentiDelPeriodo(finestra) {
    return trattamenti.findAll({ filtri: filtriPeriodo('data_trattamento', finestra) });
}

function creditiPazientiTotali() {
    try {
        const saldi = economiaHandler.saldiPazienti({ stato: 'tutti' });
        return {
            crediti_da_riscuotere: saldi.totale_da_riscuotere,
            pazienti_a_debito: saldi.pazienti_a_debito,
            anticipi_pazienti: saldi.totale_crediti,
            pazienti_a_credito: saldi.pazienti_a_credito
        };
    } catch (_) {
        return {
            crediti_da_riscuotere: 0,
            pazienti_a_debito: 0,
            anticipi_pazienti: 0,
            pazienti_a_credito: 0
        };
    }
}

function produzione(payload = {}) {
    const finestra = intervallo(payload);
    const base = kpi.produzione(trattamentiDelPeriodo(finestra), finestra);
    const agenda = appuntamenti.aggregate({
        totali: 'COUNT(*)',
        conclusi: "SUM(CASE WHEN stato = 'concluso' THEN 1 ELSE 0 END)",
        mancati: "SUM(CASE WHEN stato IN ('non_presentato', 'annullato') THEN 1 ELSE 0 END)"
    }, {});

    const totaliAgenda = Number(agenda.totali) || 0;
    const mancati = Number(agenda.mancati) || 0;
    const crediti = creditiPazientiTotali();

    return {
        ...base,
        pazienti_attivi: pazienti.count({}),
        appuntamenti_totali: totaliAgenda,
        appuntamenti_conclusi: Number(agenda.conclusi) || 0,
        tasso_assenza: totaliAgenda > 0 ? money.round((mancati / totaliAgenda) * 100) : 0,
        valore_medio_trattamento: base.trattamenti_eseguiti > 0
            ? money.round(base.valore_eseguito / base.trattamenti_eseguiti)
            : 0,
        ...crediti
    };
}

function perMedico(payload = {}) {
    const finestra = intervallo(payload);
    return kpi.perCollaboratore(
        trattamentiDelPeriodo(finestra),
        staff.findAll({ includeArchived: true }),
        finestra
    );
}

function perBranca(payload = {}) {
    const finestra = intervallo(payload);
    return kpi.perBranca(
        trattamentiDelPeriodo(finestra),
        prestazioni.findAll({ includeArchived: true }),
        finestra
    );
}

function cassa(payload = {}) {
    const finestra = intervallo(payload);
    const righeIncassi = incassi.findAll({ filtri: filtriPeriodo('data_pagamento', finestra) });
    const righeSpese = spese.findAll({ filtri: filtriPeriodo('data_spesa', finestra) });

    const analisi = kpi.economia({ incassi: righeIncassi, spese: righeSpese, trattamenti: [] }, finestra);
    const esposizione = kpi.esposizioneRate(
        rate.findAll({ filtri: [{ colonna: 'stato', operatore: 'ne', valore: 'pagata' }] }),
        payload.oggi || oggiIso()
    );
    const crediti = creditiPazientiTotali();

    return {
        totale_incassi: analisi.totale_incassi,
        totale_spese: analisi.totale_spese,
        saldo_cassa: money.round(analisi.totale_incassi - analisi.totale_spese),
        movimenti_incasso: righeIncassi.length,
        movimenti_spesa: righeSpese.length,
        flusso_mensile: kpi.flussoMensile(analisi),
        incassi_per_mese: analisi.incassi_per_mese,
        spese_per_mese: analisi.spese_per_mese,
        spese_per_categoria: analisi.spese_per_categoria,
        incassi_per_metodo: analisi.incassi_per_metodo,
        ...esposizione,
        ...crediti
    };
}

function economia(payload = {}) {
    const finestra = intervallo(payload);
    const analisi = kpi.economia({
        incassi: incassi.findAll({ filtri: filtriPeriodo('data_pagamento', finestra) }),
        spese: spese.findAll({ filtri: filtriPeriodo('data_spesa', finestra) }),
        trattamenti: trattamentiDelPeriodo(finestra)
    }, finestra);

    const esposizione = kpi.esposizioneRate(
        rate.findAll({ filtri: [{ colonna: 'stato', operatore: 'ne', valore: 'pagata' }] }),
        payload.oggi || oggiIso()
    );
    const crediti = creditiPazientiTotali();

    const marginalita = analisi.totale_incassi > 0
        ? money.round((analisi.margine_netto / analisi.totale_incassi) * 100)
        : 0;

    return {
        ...analisi,
        ...esposizione,
        ...crediti,
        marginalita_percentuale: marginalita,
        flusso_mensile: kpi.flussoMensile(analisi),
        compensi_per_collaboratore: kpi.quotePerCollaboratore(
            trattamentiDelPeriodo(finestra),
            staff.findAll({ includeArchived: true }),
            finestra
        )
    };
}

module.exports = { produzione, perMedico, perBranca, economia, cassa };
