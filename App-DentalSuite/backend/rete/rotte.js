'use strict';

const protocollo = require('./protocollo');
const sigillo = require('./sigillo');

function esito(codice, corpo) {
    return { codice, corpo };
}

async function poltroneStudio() {
    const postazioni = require('../handlers/postazioni');
    const locali = postazioni.poltroneLocali();
    if (!locali) return esito(503, { errore: 'Archivio delle poltrone non disponibile su questo nodo' });
    return esito(200, { poltrone: locali.poltrone, sedi_configurate: locali.sedi_configurate });
}

function chiaveEffimera() {
    const offerta = sigillo.offriChiave();
    if (!offerta) return esito(503, { errore: 'Postazione non inizializzata' });
    return esito(200, offerta);
}

function caricoClinico(contenuto) {
    if (contenuto && contenuto.sigillo) return sigillo.apri(contenuto.sigillo);
    return contenuto || {};
}

async function trasmettiDiretto(contenuto, contesto) {
    const carico = caricoClinico(contenuto);
    const dossier = carico.dossier;
    if (!dossier) return esito(400, { errore: 'Dossier clinico mancante' });

    const seduta = require('../repositories/seduta_volatile');

    try {
        const versione = seduta.riponi(dossier, {
            trasmissione_id: contenuto.trasmissione_id || `tx-${Date.now()}`,
            origine: contenuto.origine || contesto.indirizzo,
            marca: carico.marca || null,
            impronta: carico.impronta_dossier || ''
        }, {
            ip: contesto.indirizzo,
            porta: Number(contenuto.origine_porta) || protocollo.PORTA_SERVIZIO
        });
        return esito(200, { successo: true, versione });
    } catch (rifiuto) {
        if (rifiuto.code !== 'CONFLICT') throw rifiuto;
        return esito(409, { successo: false, errore: rifiuto.message, scartato: true });
    }
}

async function chiudiDiretto(contenuto) {
    const trasmissioni = require('../handlers/trasmissioni');
    const risultato = await trasmissioni.chiudiPerRete(contenuto);
    return esito(200, { successo: true, ...risultato });
}

async function statoSeduta(contenuto) {
    const trasmissioni = require('../handlers/trasmissioni');
    return esito(200, trasmissioni.statoSeduta(contenuto));
}

async function sedutaChiusa(contenuto) {
    const trasmissioni = require('../handlers/trasmissioni');
    const risultato = await trasmissioni.segnalaChiusuraRemota(contenuto);
    return esito(200, { successo: true, ...risultato });
}

async function pazienteCambiato(contenuto) {
    const trasmissioni = require('../handlers/trasmissioni');
    const risultato = await trasmissioni.segnalaCambioPaziente(contenuto);
    return esito(200, { successo: true, ...risultato });
}

async function meshStatoBroadcast(contenuto, contesto) {
    const scopertaMesh = require('./scoperta_mesh');
    scopertaMesh.riceviStatoGossip({ ...contenuto, ip: contesto.indirizzo });
    return esito(200, { successo: true });
}

async function riceviAtto(contenuto) {
    const atti = require('../handlers/atti');
    const risultato = await atti.accogli({
        tipo: protocollo.MESSAGGI.atto,
        contenuto: contenuto && contenuto.atto ? contenuto.atto : contenuto
    });
    return esito(200, { successo: true, ...risultato });
}

async function allegatoContenuto(contenuto) {
    const allegati = require('../handlers/allegati');
    if (!contenuto || !contenuto.id) return esito(400, { errore: 'Identificativo allegato mancante' });
    const risultato = await allegati.contenuto(contenuto);
    if (!contenuto.effimera) return esito(200, { successo: true, ...risultato });
    return esito(200, { successo: true, sigillo: sigillo.sigilla(contenuto.effimera, risultato) });
}

async function richiediDossierAggiornato(contenuto) {
    if (!contenuto || !contenuto.paziente_id) return esito(400, { errore: 'Identificativo paziente mancante' });
    const composizione = require('../domain/composizione_dossier');
    const dossier = composizione.componiDossier(contenuto.paziente_id, contenuto.dentizione, contenuto.schermo);
    if (!dossier) return esito(404, { errore: 'Cartella clinica non componibile' });
    if (!contenuto.effimera) return esito(200, { successo: true, dossier });
    return esito(200, { successo: true, sigillo: sigillo.sigilla(contenuto.effimera, { dossier }) });
}

function dipendenzeTrasmissione() {
    const trasmissioni = require('../handlers/trasmissioni');
    return { destinazioni: trasmissioni.destinazioni, invia: trasmissioni.invia };
}

async function richiediPaziente(contenuto, contesto) {
    const richieste = require('../handlers/richieste_poltrona');
    try {
        const risultato = await richieste.pazienteRichiesto(contenuto, contesto, dipendenzeTrasmissione());
        return esito(200, { successo: true, ...risultato });
    } catch (errore) {
        const codice = errore.code === 'FORBIDDEN' ? 403 : (errore.code === 'NOT_FOUND' ? 404 : 400);
        return esito(codice, { successo: false, errore: errore.message });
    }
}

async function ripristinaSeduta(contenuto, contesto) {
    const richieste = require('../handlers/richieste_poltrona');
    try {
        const risultato = await richieste.sedutaDaRipristinare(contenuto, contesto, dipendenzeTrasmissione());
        return esito(200, { successo: true, ...risultato });
    } catch (errore) {
        return esito(400, { successo: false, errore: errore.message });
    }
}

const TABELLA = {
    '/poltrone-studio': poltroneStudio,
    '/chiave-effimera': chiaveEffimera,
    '/trasmetti-diretto': trasmettiDiretto,
    '/chiudi-diretto': chiudiDiretto,
    '/ricevi-atto': riceviAtto,
    '/allegato-contenuto': allegatoContenuto,
    '/richiedi-dossier-aggiornato': richiediDossierAggiornato,
    '/seduta-stato': statoSeduta,
    '/seduta-chiusa': sedutaChiusa,
    '/paziente-cambiato': pazienteCambiato,
    '/mesh-stato-broadcast': meshStatoBroadcast,
    '/richiedi-paziente': richiediPaziente,
    '/ripristina-seduta': ripristinaSeduta
};

function trova(percorso) {
    return TABELLA[String(percorso || '')] || null;
}

function percorsi() {
    return Object.keys(TABELLA);
}

module.exports = { trova, percorsi };
