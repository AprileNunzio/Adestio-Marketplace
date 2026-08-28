'use strict';

const dgram = require('dgram');
const os = require('os');
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
        in_seduta: Boolean(dati.in_seduta),
        paziente_id: dati.paziente_id || null,
        paziente_nome: dati.paziente_nome || null,
        trasmissione_id: dati.trasmissione_id || null,
        stato_attivita: dati.stato_attivita || (dati.in_seduta ? 'in_visita' : 'libero'),
        visto_il: Date.now()
    });
}

function messaggio() {
    const locale = identita.scheda();
    if (!locale) return null;

    let inSeduta = false;
    let pazienteId = null;
    let pazienteNome = null;
    let trasmissioneId = null;
    let statoAttivita = 'libero';

    try {
        const seduta = require('../repositories/seduta_volatile');
        const s = seduta.istantanea();
        if (s && s.presente && s.dossier && s.dossier.paziente) {
            inSeduta = true;
            pazienteId = s.dossier.paziente.id || null;
            pazienteNome = `${s.dossier.paziente.cognome || ''} ${s.dossier.paziente.nome || ''}`.trim() || 'Paziente in seduta';
            trasmissioneId = s.trasmissione_id || null;
            statoAttivita = 'in_visita';
        }
    } catch (_) {}

    return Buffer.from(JSON.stringify({
        applicazione: 'adestio_dental_suite',
        versione_protocollo: protocollo.VERSIONE,
        id: locale.id,
        nome: locale.nome,
        ruolo: locale.ruolo,
        porta: locale.porta,
        impronta: locale.impronta,
        in_seduta: inSeduta,
        paziente_id: pazienteId,
        paziente_nome: pazienteNome,
        trasmissione_id: trasmissioneId,
        stato_attivita: statoAttivita,
        aggiornato_il: Date.now()
    }), 'utf8');
}

function bersagli() {
    const elenco = new Set([protocollo.GRUPPO_ANNUNCIO]);
    try {
        const interfacce = os.networkInterfaces();
        for (const nome of Object.keys(interfacce)) {
            for (const voce of interfacce[nome] || []) {
                if (!voce || voce.family !== 'IPv4' || voce.internal) continue;
                const parti = voce.address.split('.');
                if (parti.length !== 4) continue;
                parti[3] = '255';
                elenco.add(parti.join('.'));
            }
        }
    } catch (e) {
        ultimoErrore = e.message;
    }
    return [...elenco];
}

function diffondi() {
    if (!presa) return false;
    const locale = identita.riga();
    if (!locale || Number(locale.attiva) !== 1) return false;
    const corpo = messaggio();
    if (!corpo) return false;

    let inviati = 0;
    for (const bersaglio of bersagli()) {
        try {
            presa.send(corpo, 0, corpo.length, protocollo.PORTA_ANNUNCIO, bersaglio, errore => {
                if (errore && !['EACCES', 'EHOSTUNREACH', 'ENETUNREACH'].includes(errore.code)) {
                    ultimoErrore = errore.message;
                }
            });
            inviati += 1;
        } catch (errore) {
            ultimoErrore = errore.message;
        }
    }
    return inviati > 0;
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
    return {
        attivo: Boolean(presa),
        vicini: vicini().length,
        bersagli: presa ? bersagli() : [],
        ultimo_errore: ultimoErrore
    };
}

module.exports = { avvia, ferma, vicini, stato, diffondi };
