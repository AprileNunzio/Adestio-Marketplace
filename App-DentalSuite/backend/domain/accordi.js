'use strict';

const money = require('./money');

const AMBITI = ['prestazione', 'categoria', 'branca', 'tutte'];
const RUOLI = ['medico', 'assistente'];
const TIPI = ['percentuale', 'fisso'];

const PESO_AMBITO = { prestazione: 4, categoria: 3, branca: 2, tutte: 1 };

function vigente(accordo, data) {
    if (Number(accordo.attivo) !== 1) return false;
    if (accordo.valido_dal && data && accordo.valido_dal > data) return false;
    if (accordo.valido_al && data && accordo.valido_al < data) return false;
    return true;
}

function pertinente(accordo, prestazione) {
    if (accordo.ambito === 'tutte') return true;
    if (!prestazione) return false;
    if (accordo.ambito === 'prestazione') return accordo.riferimento === prestazione.id;
    if (accordo.ambito === 'categoria') return accordo.riferimento === prestazione.categoria;
    if (accordo.ambito === 'branca') return accordo.riferimento === prestazione.branca;
    return false;
}

function risolvi(accordi, prestazione, ruolo, data) {
    const candidati = (accordi || [])
        .filter(accordo => accordo.ruolo === ruolo)
        .filter(accordo => vigente(accordo, data))
        .filter(accordo => pertinente(accordo, prestazione));

    if (candidati.length === 0) return null;

    return candidati.sort((primo, secondo) => {
        const peso = (PESO_AMBITO[secondo.ambito] || 0) - (PESO_AMBITO[primo.ambito] || 0);
        if (peso !== 0) return peso;
        return String(secondo.valido_dal || '').localeCompare(String(primo.valido_dal || ''));
    })[0];
}

function applica(accordo, importo) {
    if (!accordo) return null;
    if (accordo.tipo === 'fisso') return money.round(accordo.valore);
    return money.percentOf(importo, accordo.valore);
}

function giorniDelMese(anno, mese) {
    return new Date(anno, mese + 1, 0).getDate();
}

function mensilitaMaturate(compensoMensile, dal, al) {
    const importo = money.round(compensoMensile || 0);
    if (importo <= 0) return { totale: 0, dettaglio: [] };

    const inizio = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dal || ''));
    const fine = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(al || ''));
    if (!inizio || !fine) return { totale: 0, dettaglio: [] };

    const partenza = new Date(Number(inizio[1]), Number(inizio[2]) - 1, Number(inizio[3]));
    const arrivo = new Date(Number(fine[1]), Number(fine[2]) - 1, Number(fine[3]));
    if (arrivo < partenza) return { totale: 0, dettaglio: [] };

    const dettaglio = [];
    let cursore = new Date(partenza.getFullYear(), partenza.getMonth(), 1);

    while (cursore <= arrivo) {
        const anno = cursore.getFullYear();
        const mese = cursore.getMonth();
        const giorniMese = giorniDelMese(anno, mese);
        const primoUtile = Math.max(1, anno === partenza.getFullYear() && mese === partenza.getMonth() ? partenza.getDate() : 1);
        const ultimoUtile = Math.min(
            giorniMese,
            anno === arrivo.getFullYear() && mese === arrivo.getMonth() ? arrivo.getDate() : giorniMese
        );
        const coperti = Math.max(0, ultimoUtile - primoUtile + 1);
        if (coperti > 0) {
            dettaglio.push({
                periodo: `${anno}-${String(mese + 1).padStart(2, '0')}`,
                giorni_coperti: coperti,
                giorni_mese: giorniMese,
                importo: money.round((importo * coperti) / giorniMese)
            });
        }
        cursore = new Date(anno, mese + 1, 1);
    }

    return { totale: money.sum(dettaglio.map(voce => voce.importo)), dettaglio };
}

module.exports = { AMBITI, RUOLI, TIPI, risolvi, applica, vigente, pertinente, mensilitaMaturate };
