'use strict';

const { trasmissioni } = require('../repositories/trasmissione');
const actor = require('../kernel/actor');

const GRAZIA_RICONCILIAZIONE_MS = 15000;

async function chiudiPrecedenti(bersaglio, nuovaId) {
    const aperte = trasmissioni.findAll({ stato: 'aperta' }).filter(riga =>
        riga.id !== nuovaId
        && (riga.sessione_id === bersaglio.sessione_id
            || (bersaglio.impronta && riga.impronta_postazione === bersaglio.impronta)
            || (bersaglio.ip && riga.indirizzo_consegna && riga.indirizzo_consegna.includes(bersaglio.ip)))
    );

    for (const riga of aperte) {
        await trasmissioni.update(riga.id, {
            stato: 'chiusa',
            chiusa_il: Date.now(),
            motivo_chiusura: 'sostituita da una nuova scheda sullo stesso monitor'
        }, actor.stamp());
    }

    return aperte.length;
}

async function riconcilia(aperte, dest) {
    const orfane = [];

    for (const riga of aperte) {
        if (Date.now() - (riga.aperta_il || 0) < 25000) continue;

        const bersaglio = dest.find(voce =>
            voce.sessione_id === riga.sessione_id
            || (riga.impronta_postazione && voce.impronta === riga.impronta_postazione)
            || (voce.ip && riga.indirizzo_consegna && riga.indirizzo_consegna.includes(voce.ip))
        );

        if (!bersaglio) continue;
        if (!bersaglio.stato_osservato) continue;
        if (bersaglio.in_seduta) continue;

        await trasmissioni.update(riga.id, {
            stato: 'chiusa',
            chiusa_il: Date.now(),
            motivo_chiusura: 'seduta gia chiusa sul monitor'
        }, actor.stamp());
        orfane.push(riga.id);
    }

    return orfane;
}

module.exports = { chiudiPrecedenti, riconcilia };
