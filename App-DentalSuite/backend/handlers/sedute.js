'use strict';

const { trasmissioni } = require('../repositories/trasmissione');
const actor = require('../kernel/actor');
const riconciliazione = require('../domain/riconciliazione');

const MOTIVO_SOSTITUZIONE = 'sostituita da una nuova scheda sullo stesso monitor';
const MOTIVO_RICONCILIAZIONE = 'seduta non più attiva sul monitor';

async function chiudiRighe(ids, motivo) {
    const chiuse = [];
    for (const id of ids) {
        await trasmissioni.update(id, {
            stato: 'chiusa',
            chiusa_il: Date.now(),
            motivo_chiusura: motivo
        }, actor.stamp());
        chiuse.push(id);
    }
    return chiuse;
}

async function chiudiPrecedenti(bersaglio, nuovaId) {
    const ids = trasmissioni.findAll({ where: { stato: 'aperta' } })
        .filter(riga => riga.id !== nuovaId && riconciliazione.corrisponde(riga, bersaglio))
        .map(riga => riga.id);

    const chiuse = await chiudiRighe(ids, MOTIVO_SOSTITUZIONE);
    return chiuse.length;
}

async function riconcilia(aperte, destinazioni) {
    return chiudiRighe(
        riconciliazione.fantasmi(aperte, destinazioni),
        MOTIVO_RICONCILIAZIONE
    );
}

module.exports = { chiudiPrecedenti, riconcilia, chiudiRighe };
