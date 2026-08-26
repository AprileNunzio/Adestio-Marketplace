'use strict';

const money = require('./money');

const STATO_ATTESA = 'attesa';
const STATO_PAGATA = 'pagata';
const STATO_SCADUTA = 'scaduta';

function formatIso(anno, mese, giorno) {
    const mm = String(mese + 1).padStart(2, '0');
    const dd = String(giorno).padStart(2, '0');
    return `${anno}-${mm}-${dd}`;
}

function addMesi(isoDate, mesi) {
    const parti = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate || ''));
    if (!parti) return isoDate;
    const anno = Number(parti[1]);
    const mese = Number(parti[2]) - 1;
    const giorno = Number(parti[3]);
    const target = new Date(anno, mese + mesi, 1);
    const ultimoGiorno = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    return formatIso(target.getFullYear(), target.getMonth(), Math.min(giorno, ultimoGiorno));
}

function oggiIso() {
    const adesso = new Date();
    return formatIso(adesso.getFullYear(), adesso.getMonth(), adesso.getDate());
}

function generaPiano(parametri) {
    const totale = money.round(parametri.totale_piano);
    const acconto = money.round(parametri.acconto_iniziale || 0);
    const numeroRate = Math.max(1, Math.trunc(parametri.numero_rate || 1));
    const cadenza = Math.max(1, Math.trunc(parametri.cadenza_mesi || 1));
    const primaScadenza = parametri.prima_scadenza || oggiIso();

    if (totale <= 0) throw new Error('Il totale del piano deve essere positivo');
    if (acconto < 0) throw new Error("L'acconto non può essere negativo");
    if (acconto > totale) throw new Error("L'acconto non può superare il totale del piano");

    const residuo = money.round(totale - acconto);
    const importi = money.splitEvenly(residuo, numeroRate);

    return importi.map((importo, indice) => ({
        numero_rata: indice + 1,
        importo,
        data_scadenza: addMesi(primaScadenza, indice * cadenza),
        stato: STATO_ATTESA
    }));
}

function statoPiano(rate) {
    if (rate.length === 0) return 'vuoto';
    return rate.every(rata => rata.stato === STATO_PAGATA) ? 'saldato' : 'attivo';
}

function scadute(rate, oggi = oggiIso()) {
    return rate.filter(rata => rata.stato !== STATO_PAGATA && rata.data_scadenza && rata.data_scadenza < oggi);
}

function residuoPiano(rate) {
    return money.sum(rate.filter(rata => rata.stato !== STATO_PAGATA).map(rata => rata.importo));
}

module.exports = { generaPiano, statoPiano, scadute, residuoPiano, addMesi, oggiIso, STATO_ATTESA, STATO_PAGATA, STATO_SCADUTA };
