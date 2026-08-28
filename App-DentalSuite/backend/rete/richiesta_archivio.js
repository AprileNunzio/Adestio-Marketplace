'use strict';

const consegna = require('./consegna');
const protocollo = require('./protocollo');
const scopertaMesh = require('./scoperta_mesh');
const identita = require('./identita');

function eArchivio() {
    const locale = identita.scheda();
    return Boolean(locale && locale.ruolo === protocollo.RUOLO_ARCHIVIO);
}

function recapitoMemorizzato() {
    const locale = identita.scheda();
    const memorizzato = consegna.recapitoDa(locale && locale.indirizzo_archivio);
    return memorizzato && memorizzato.ip ? [memorizzato] : [];
}

async function recapitiArchivio(forza = true) {
    const stazioni = await scopertaMesh.scansionaStazioni(forza);
    const daMesh = (stazioni || [])
        .filter(voce => voce && voce.ip && voce.ruolo === protocollo.RUOLO_ARCHIVIO)
        .map(voce => ({ ip: voce.ip, porta: Number(voce.porta) || protocollo.PORTA_SERVIZIO }));

    const mappa = new Map();
    for (const voce of [...recapitoMemorizzato(), ...daMesh]) {
        mappa.set(`${voce.ip}:${voce.porta}`, voce);
    }
    return [...mappa.values()];
}

async function invoca(rotta, corpo) {
    const recapiti = await recapitiArchivio();
    if (recapiti.length === 0) {
        return { riuscita: false, motivo: 'Nessuna segreteria raggiungibile in rete' };
    }

    const locale = identita.scheda();
    const carico = { ...corpo, impronta: locale ? locale.impronta : '' };

    let ultimoMotivo = 'La segreteria non ha risposto';
    for (const recapito of recapiti) {
        const esito = await consegna.conRitentativo(recapito.ip, recapito.porta, rotta, carico);
        if (esito.consegnato && esito.dati && esito.dati.successo !== false) {
            return { riuscita: true, dati: esito.dati, origine: `${recapito.ip}:${recapito.porta}` };
        }
        if (esito.dati && esito.dati.errore) ultimoMotivo = esito.dati.errore;
        else if (esito.motivo) ultimoMotivo = esito.motivo;
    }

    return { riuscita: false, motivo: ultimoMotivo };
}

function richiediPaziente(pazienteId, dentizione) {
    return invoca('/richiedi-paziente', { paziente_id: pazienteId, dentizione });
}

function ripristinaSeduta() {
    return invoca('/ripristina-seduta', {});
}

module.exports = { eArchivio, recapitiArchivio, invoca, richiediPaziente, ripristinaSeduta };
