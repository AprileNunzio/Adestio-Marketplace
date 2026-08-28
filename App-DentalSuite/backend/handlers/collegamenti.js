'use strict';

const { validationError, forbiddenError } = require('../kernel/errors');
const consentiti = require('../domain/collegamenti/consentiti');

function electron() {
    return require('electron');
}

async function apri(payload = {}) {
    const richiesto = String(payload.indirizzo || '').trim();
    if (!richiesto) throw validationError('Indirizzo del collegamento mancante');

    const destinazione = consentiti.trova(richiesto);
    if (!destinazione) {
        throw forbiddenError('Collegamento non consentito da questa applicazione');
    }

    await electron().shell.openExternal(destinazione.indirizzo);
    return { aperto: true, id: destinazione.id, indirizzo: destinazione.indirizzo };
}

function elenco() {
    return { destinazioni: consentiti.DESTINAZIONI.map(voce => voce.id) };
}

module.exports = { apri, elenco };
