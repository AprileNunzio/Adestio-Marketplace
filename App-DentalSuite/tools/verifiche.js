'use strict';

const esiti = [];

function verifica(descrizione, condizione, dettaglio) {
    esiti.push({ descrizione, superato: Boolean(condizione), dettaglio: dettaglio || '' });
}

function assertOk(descrizione, risultato) {
    verifica(descrizione, risultato && risultato.success === true, risultato && risultato.error);
    return risultato && risultato.data;
}

function assertKo(descrizione, risultato, codiceAtteso) {
    const corrisponde = risultato
        && risultato.success === false
        && (!codiceAtteso || risultato.code === codiceAtteso);
    verifica(descrizione, corrisponde, risultato && `${risultato.code}: ${risultato.error}`);
}

function riepiloga() {
    const falliti = esiti.filter(voce => !voce.superato);
    esiti.forEach(voce => console.log(
        `${voce.superato ? 'OK  ' : 'FAIL'} ${voce.descrizione}${voce.dettaglio ? `  [${voce.dettaglio}]` : ''}`));
    console.log(`\n${esiti.length - falliti.length}/${esiti.length} verifiche superate.`);
    return falliti.length;
}

module.exports = { verifica, assertOk, assertKo, riepiloga };
