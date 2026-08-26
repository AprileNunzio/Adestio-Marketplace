'use strict';

const dgram = require('dgram');
const protocollo = require('./protocollo');
const identita = require('./identita');

let presa = null;
let cadenza = null;
let ultimoErrore = '';
const vicinato = new Map();

function chiaveDi(dati, indirizzo) {
    return `${dati.id || ''}@${indirizzo}`;
}

function registra(dati, indirizzo) {
    if (!dati || dati.applicazione !== 'adestio_dental_suite') return;
    const locale = identita.riga();
    if (locale && dati.id === locale.id) return;
    vicinato.set(chiaveDi(dati, indirizzo), {
        id: dati.id,
        nome: dati.nome,
        ruolo: dati.ruolo,
        impronta: dati.impronta,
        indirizzo,
        porta: Number(dati.porta) || protocollo.PORTA_SERVIZIO,
        versione_protocollo: Number(dati.versione_protocollo) || 0,
        visto_il: Date.now()
    });
}

function messaggio() {
    const locale = identita.scheda();
    if (!locale) return null;
    return Buffer.from(JSON.stringify({
        applicazione: 'adestio_dental_suite',
        versione_protocollo: protocollo.VERSIONE,
        id: locale.id,
        nome: locale.nome,
        ruolo: locale.ruolo,
        porta: locale.porta,
        impronta: locale.impronta
    }), 'utf8');
}

function diffondi() {
    if (!presa) return false;
    const locale = identita.riga();
    if (!locale || locale.ruolo !== protocollo.RUOLO_ARCHIVIO) return false;
    const corpo = messaggio();
    if (!corpo) return false;
    try {
        presa.send(corpo, 0, corpo.length, protocollo.PORTA_ANNUNCIO, protocollo.GRUPPO_ANNUNCIO);
        return true;
    } catch (errore) {
        ultimoErrore = errore.message;
        return false;
    }
}

function avvia() {
    if (presa) return Promise.resolve(true);
    return new Promise(risolvi => {
        const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
        socket.on('error', errore => {
            ultimoErrore = errore.message;
            try {
                socket.close();
            } catch (e) {
                presa = null;
            }
            presa = null;
            risolvi(false);
        });
        socket.on('message', (corpo, mittente) => {
            try {
                registra(JSON.parse(corpo.toString('utf8')), mittente.address);
            } catch (e) {
                ultimoErrore = 'Annuncio ricevuto non interpretabile';
            }
        });
        socket.bind(protocollo.PORTA_ANNUNCIO, () => {
            try {
                socket.setBroadcast(true);
            } catch (e) {
                ultimoErrore = e.message;
            }
            presa = socket;
            diffondi();
            cadenza = setInterval(diffondi, protocollo.INTERVALLO_ANNUNCIO_MS);
            if (typeof cadenza.unref === 'function') cadenza.unref();
            risolvi(true);
        });
    });
}

function ferma() {
    if (cadenza) {
        clearInterval(cadenza);
        cadenza = null;
    }
    if (presa) {
        try {
            presa.close();
        } catch (e) {
            presa = null;
        }
        presa = null;
    }
    vicinato.clear();
    return true;
}

function vicini() {
    const limite = Date.now() - protocollo.VITA_ANNUNCIO_MS;
    [...vicinato.entries()].forEach(([chiave, voce]) => {
        if (voce.visto_il < limite) vicinato.delete(chiave);
    });
    return [...vicinato.values()].sort((a, b) => b.visto_il - a.visto_il);
}

function stato() {
    return { attivo: Boolean(presa), vicini: vicini().length, ultimo_errore: ultimoErrore };
}

module.exports = { avvia, ferma, vicini, stato, diffondi };
