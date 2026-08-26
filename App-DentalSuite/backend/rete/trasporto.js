'use strict';

const protocollo = require('./protocollo');
const identita = require('./identita');
const servitore = require('./servitore');
const cliente = require('./cliente');
const canale = require('./canale');
const annuncio = require('./annuncio');
const sessioni = require('./sessioni');
const coda = require('./coda');

let ascoltatore = null;
let avviato = false;
let ultimoErrore = '';
let ultimoMotivo = '';

function inoltra(messaggio) {
    if (typeof ascoltatore !== 'function') return { accettato: false, motivo: 'Nessun ascoltatore registrato' };
    return ascoltatore(messaggio);
}

function ascolta(gestore) {
    ascoltatore = typeof gestore === 'function' ? gestore : null;
    return Boolean(ascoltatore);
}

async function avvia(portaPersonalizzata) {
    const locale = await identita.assicura();
    if (Number(locale.attiva) !== 1) {
        avviato = false;
        ultimoMotivo = 'disattivata';
        return { avviato: false, causa: 'disattivata', motivo: 'Rete di studio disattivata su questa postazione' };
    }

    try {
        const portaDaUsare = portaPersonalizzata || locale.porta || protocollo.PORTA_SERVIZIO;
        await servitore.avvia({
            porta: portaDaUsare,
            alMessaggio: messaggio => inoltra({
                origine: locale.ruolo === protocollo.RUOLO_ARCHIVIO ? protocollo.RUOLO_RIUNITO : protocollo.RUOLO_ARCHIVIO,
                tipo: messaggio.tipo,
                contenuto: messaggio.contenuto,
                sessione: messaggio.sessione,
                indirizzo: messaggio.indirizzo
            })
        });

        if (locale.indirizzo_archivio && typeof cliente.collega === 'function') {
            cliente.collega(locale.indirizzo_archivio).catch(() => {});
        }

        avviato = true;
        ultimoErrore = '';
        ultimoMotivo = '';
        return { avviato: true, ruolo: locale.ruolo, porta: portaDaUsare };
    } catch (errore) {
        avviato = false;
        ultimoErrore = errore.message;
        ultimoMotivo = 'errore';
        return { avviato: false, causa: 'errore', motivo: errore.message };
    }
}

async function ferma() {
    await servitore.ferma();
    cliente.stacca();
    annuncio.ferma();
    avviato = false;
    return true;
}

async function riavvia() {
    await ferma();
    return avvia();
}

function registraSchermo(sessioneId, schermo) {
    return sessioni.aggiornaSchermo(sessioneId, schermo);
}

function versoRiunito(sessioneId, tipo, contenuto) {
    return canale.invia(sessioneId, tipo, contenuto);
}

function versoTuttiIRiuniti(tipo, contenuto) {
    return canale.diffondi(tipo, contenuto);
}

async function versoArchivio(tipo, contenuto, destinatarioId) {
    try {
        return await cliente.invia(tipo, contenuto);
    } catch (errore) {
        await coda.accoda(destinatarioId || '', tipo, contenuto);
        throw errore;
    }
}

async function riallinea() {
    if (!cliente.stato().collegato) return { consegnati: 0, residui: coda.riepilogo().in_attesa };
    return coda.svuota(riga => cliente.invia(riga.tipo, riga.contenuto));
}

function stato() {
    const locale = identita.scheda();
    return {
        postazione: locale,
        avviato,
        attiva: Boolean(locale && locale.attiva),
        causa_arresto: avviato ? '' : ultimoMotivo,
        ultimo_errore: ultimoErrore,
        servizio: servitore.stato(),
        scoperta: annuncio.stato(),
        cliente: cliente.stato(),
        canali: canale.attivi(),
        sessioni: sessioni.elenco(),
        coda: coda.riepilogo()
    };
}

module.exports = {
    ascolta,
    avvia,
    ferma,
    riavvia,
    riallinea,
    registraSchermo,
    versoRiunito,
    versoTuttiIRiuniti,
    versoArchivio,
    stato
};
