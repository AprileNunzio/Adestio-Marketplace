'use strict';

const VERSIONE = 1;
const PORTA_SERVIZIO = 7345;
const PORTA_ANNUNCIO = 7346;
const GRUPPO_ANNUNCIO = '255.255.255.255';

const RUOLO_ARCHIVIO = 'segreteria';
const RUOLO_RIUNITO = 'riunito';
const RUOLI = [RUOLO_ARCHIVIO, RUOLO_RIUNITO];

const ROTTE = {
    stato: '/stato',
    accoppia: '/accoppia',
    avvio: '/avvio',
    canale: '/canale',
    messaggio: '/messaggio'
};

const MESSAGGI = {
    dossier: 'dossier',
    chiusura: 'chiusura',
    atto: 'atto',
    battito: 'battito',
    riscontro: 'riscontro',
    presenza: 'presenza',
    allegato: 'allegato'
};

const SCADENZA_CODICE_MS = 120000;
const TENTATIVI_MASSIMI_CODICE = 5;
const BATTITO_MS = 15000;
const VITA_ANNUNCIO_MS = 20000;
const INTERVALLO_ANNUNCIO_MS = 5000;
const DIMENSIONE_MASSIMA_CORPO = 8 * 1024 * 1024;

function etichettaRuolo(ruolo) {
    return ruolo === RUOLO_RIUNITO ? 'Riunito' : 'Segreteria';
}

function impostazioniDi(riga) {
    return {
        porta: Number(riga && riga.porta) || PORTA_SERVIZIO,
        ruolo: RUOLI.includes(riga && riga.ruolo) ? riga.ruolo : RUOLO_ARCHIVIO
    };
}

module.exports = {
    VERSIONE,
    PORTA_SERVIZIO,
    PORTA_ANNUNCIO,
    GRUPPO_ANNUNCIO,
    RUOLO_ARCHIVIO,
    RUOLO_RIUNITO,
    RUOLI,
    ROTTE,
    MESSAGGI,
    SCADENZA_CODICE_MS,
    TENTATIVI_MASSIMI_CODICE,
    BATTITO_MS,
    VITA_ANNUNCIO_MS,
    INTERVALLO_ANNUNCIO_MS,
    DIMENSIONE_MASSIMA_CORPO,
    etichettaRuolo,
    impostazioniDi
};
