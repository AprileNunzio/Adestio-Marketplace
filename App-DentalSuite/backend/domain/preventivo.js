'use strict';

const money = require('./money');

const STATI = ['bozza', 'inviato', 'accettato', 'rifiutato', 'scaduto', 'annullato'];

const TRANSIZIONI = {
    bozza: ['inviato', 'annullato'],
    inviato: ['accettato', 'rifiutato', 'scaduto', 'annullato'],
    accettato: ['annullato'],
    rifiutato: ['bozza', 'annullato'],
    scaduto: ['bozza', 'annullato'],
    annullato: []
};

function totaleRiga(riga) {
    const lordo = money.round(Number(riga.prezzo_unitario || 0) * Number(riga.quantita || 1));
    return money.subtractPercent(lordo, riga.sconto_percentuale || 0);
}

function calcolaTotali(righe, scontoTestata = 0) {
    const normalizzate = righe.map((riga, indice) => ({
        ...riga,
        ordine: riga.ordine !== undefined ? riga.ordine : indice,
        totale_riga: totaleRiga(riga)
    }));
    const totaleLordo = money.sum(normalizzate.map(riga => riga.totale_riga));
    const totaleNetto = money.subtractPercent(totaleLordo, scontoTestata);
    return { righe: normalizzate, totale_lordo: totaleLordo, totale_netto: totaleNetto };
}

function puoTransitare(statoCorrente, statoTarget) {
    if (statoCorrente === statoTarget) return true;
    const consentiti = TRANSIZIONI[statoCorrente];
    return Array.isArray(consentiti) && consentiti.includes(statoTarget);
}

function residuoDaIncassare(preventivo, incassi) {
    const incassato = money.sum(incassi.map(incasso => incasso.importo || 0));
    return money.round(Number(preventivo.totale_netto || 0) - incassato);
}

module.exports = { calcolaTotali, totaleRiga, puoTransitare, residuoDaIncassare, STATI, TRANSIZIONI };
