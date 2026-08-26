'use strict';

const money = require('./money');

const ESEGUITO = 'eseguito';
const IN_CORSO = ['pianificato', 'in_corso'];
const PREVENTIVI_IMPEGNATIVI = ['accettato', 'in_corso'];

function sommaImporti(righe) {
    return money.sum(righe.map(riga => riga.importo || 0));
}

function eseguiti(trattamenti) {
    return trattamenti.filter(riga => riga.stato === ESEGUITO);
}

function daEseguire(trattamenti) {
    return trattamenti.filter(riga => IN_CORSO.includes(riga.stato));
}

function accettati(preventivi) {
    return preventivi.filter(riga => PREVENTIVI_IMPEGNATIVI.includes(riga.stato));
}

function rateAperte(rate) {
    return rate.filter(riga => riga.stato !== 'pagata');
}

function componi({ trattamenti = [], preventivi = [], incassi = [], rate = [], oggi = '' }) {
    const prestazioniEseguite = eseguiti(trattamenti);
    const prestazioniPianificate = daEseguire(trattamenti);
    const preventiviAccettati = accettati(preventivi);
    const aperte = rateAperte(rate);
    const scadute = aperte.filter(riga => riga.data_scadenza && oggi && riga.data_scadenza < oggi);

    const eseguito = sommaImporti(prestazioniEseguite);
    const pianificato = sommaImporti(prestazioniPianificate);
    const preventivato = money.sum(preventiviAccettati.map(riga => riga.totale_netto || 0));
    const incassato = sommaImporti(incassi);
    const saldo = money.round(eseguito - incassato);

    return {
        eseguito,
        pianificato,
        preventivato,
        incassato,
        saldo,
        a_debito: saldo > 0 ? saldo : 0,
        credito: saldo < 0 ? money.round(-saldo) : 0,
        in_pari: saldo === 0,
        prestazioni_eseguite: prestazioniEseguite.length,
        prestazioni_da_eseguire: prestazioniPianificate.length,
        preventivi_accettati: preventiviAccettati.length,
        movimenti_incasso: incassi.length,
        rate_aperte: aperte.length,
        rate_scadute: scadute.length,
        importo_rate_aperte: sommaImporti(aperte),
        importo_scaduto: sommaImporti(scadute),
        prossima_scadenza: aperte.length > 0
            ? { data: aperte[0].data_scadenza, importo: money.round(aperte[0].importo) }
            : null
    };
}

function etichettaSaldo(situazione) {
    if (situazione.a_debito > 0) return 'Da incassare';
    if (situazione.credito > 0) return 'Credito del paziente';
    return 'In pari';
}

function valoreSaldo(situazione) {
    if (situazione.a_debito > 0) return situazione.a_debito;
    if (situazione.credito > 0) return situazione.credito;
    return 0;
}

module.exports = { componi, etichettaSaldo, valoreSaldo, ESEGUITO };
