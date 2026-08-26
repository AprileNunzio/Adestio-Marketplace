'use strict';

const { trasmissioni } = require('../repositories/trasmissione');
const actor = require('../kernel/actor');

const GRAZIA_RICONCILIAZIONE_MS = 15000;

async function chiudiPrecedenti(bersaglio, nuovaId) {
    const aperte = trasmissioni.findAll({ stato: 'aperta' }).filter(riga =>
        riga.id !== nuovaId
        && (riga.sessione_id === bersaglio.sessione_id
            || (bersaglio.impronta && riga.impronta_postazione === bersaglio.impronta))
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
    const perSessione = new Map(dest.map(voce => [voce.sessione_id, voce]));
    const perImpronta = new Map(dest.filter(v => v.impronta).map(voce => [voce.impronta, voce]));
    const orfane = [];

    for (const riga of aperte) {
        const bersaglio = perSessione.get(riga.sessione_id)
            || (riga.impronta_postazione ? perImpronta.get(riga.impronta_postazione) : null);

        if (!bersaglio) continue;
        if (!bersaglio.stato_osservato) continue;
        if (bersaglio.in_seduta) continue;
        if (Date.now() - (riga.aperta_il || 0) < GRAZIA_RICONCILIAZIONE_MS) continue;

        await trasmissioni.update(riga.id, {
            stato: 'chiusa',
            chiusa_il: Date.now(),
            motivo_chiusura: 'seduta gia chiusa sul monitor'
        }, actor.stamp());
        orfane.push(riga.id);
    }

    return orfane;
}

module.exports = { chiudiPrecedenti, riconcilia, GRAZIA_RICONCILIAZIONE_MS };
