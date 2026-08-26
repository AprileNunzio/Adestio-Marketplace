'use strict';

const os = require('os');
const crypto = require('crypto');
const { postazione } = require('../repositories/rete');
const { tableExists, columnExists } = require('../kernel/database');
const cifratura = require('./cifratura');
const protocollo = require('./protocollo');

function disponibile() {
    return tableExists('rete_postazione');
}

let _marchio = null;

function marchioNodo() {
    if (_marchio) return _marchio;
    try {
        const interfacce = os.networkInterfaces();
        const macs = [];
        for (const nome of Object.keys(interfacce)) {
            for (const voce of interfacce[nome] || []) {
                if (voce && voce.mac && voce.mac !== '00:00:00:00:00:00' && !voce.internal) {
                    macs.push(voce.mac);
                }
            }
        }
        macs.sort();
        const semi = `${os.hostname()}|${macs[0] || 'senza-mac'}`;
        _marchio = crypto.createHash('sha256').update(semi).digest('hex').slice(0, 32);
    } catch (e) {
        _marchio = crypto.createHash('sha256').update(String(Date.now())).digest('hex').slice(0, 32);
    }
    return _marchio;
}

function identitaPerNodo() {
    return columnExists('rete_postazione', 'nodo');
}

function riga() {
    if (!disponibile()) return null;
    const righe = postazione.findAll({ includeArchived: true });
    if (righe.length === 0) return null;
    if (!identitaPerNodo()) return righe[0];
    const mio = marchioNodo();
    return righe.find(voce => voce.nodo === mio) || null;
}

function nomePredefinito() {
    try {
        return os.hostname() || 'Postazione';
    } catch (e) {
        return 'Postazione';
    }
}

async function rimuoviOrfane() {
    if (!disponibile() || !identitaPerNodo()) return 0;
    const mio = marchioNodo();
    const righe = postazione.findAll({ includeArchived: true });
    if (righe.length < 2) return 0;

    let rimosse = 0;
    for (const voce of righe) {
        if (voce.nodo === mio) continue;
        try {
            await postazione.hardRemove(voce.id);
            rimosse += 1;
            console.log(`[DentalSuite] Rimossa identita di postazione orfana "${voce.nome || voce.id}".`);
        } catch (e) {}
    }
    return rimosse;
}

async function assicura() {
    const esistente = riga();
    if (esistente) {
        await rimuoviOrfane();
        return esistente;
    }
    const identita = cifratura.generaIdentita();
    const nuova = {
        nome: nomePredefinito(),
        ruolo: protocollo.RUOLO_ARCHIVIO,
        porta: protocollo.PORTA_SERVIZIO,
        chiave_pubblica: identita.pubblica,
        chiave_privata: identita.privata,
        impronta: identita.impronta,
        attiva: 1,
        indirizzo_archivio: ''
    };
    if (identitaPerNodo()) nuova.nodo = marchioNodo();
    await postazione.insert(nuova);
    await rimuoviOrfane();
    return riga();
}

async function aggiorna(dati = {}) {
    const corrente = await assicura();
    const modifiche = {};
    if (dati.nome !== undefined) modifiche.nome = String(dati.nome).trim().slice(0, 60);
    if (dati.ruolo !== undefined && protocollo.RUOLI.includes(dati.ruolo)) modifiche.ruolo = dati.ruolo;
    if (dati.porta !== undefined) modifiche.porta = Number(dati.porta) || protocollo.PORTA_SERVIZIO;
    if (dati.attiva !== undefined) modifiche.attiva = dati.attiva ? 1 : 0;
    if (dati.indirizzo_archivio !== undefined) {
        modifiche.indirizzo_archivio = String(dati.indirizzo_archivio).trim();
    }
    await postazione.update(corrente.id, modifiche);
    return riga();
}

function indirizziLocali() {
    try {
        const interfacce = os.networkInterfaces();
        return Object.keys(interfacce)
            .reduce((tutti, nome) => tutti.concat(interfacce[nome] || []), [])
            .filter(voce => voce && voce.family === 'IPv4' && !voce.internal)
            .map(voce => voce.address);
    } catch (e) {
        return [];
    }
}

function scheda(corrente) {
    const voce = corrente || riga();
    if (!voce) return null;
    return {
        id: voce.id,
        nome: voce.nome,
        ruolo: voce.ruolo,
        etichetta_ruolo: protocollo.etichettaRuolo(voce.ruolo),
        porta: Number(voce.porta) || protocollo.PORTA_SERVIZIO,
        impronta: voce.impronta,
        chiave_pubblica: voce.chiave_pubblica,
        attiva: Number(voce.attiva) === 1,
        indirizzo_archivio: voce.indirizzo_archivio || '',
        indirizzi: indirizziLocali(),
        nodo: voce.nodo || '',
        versione_protocollo: protocollo.VERSIONE
    };
}

function segreto() {
    const voce = riga();
    return voce ? voce.chiave_privata : '';
}

module.exports = { disponibile, riga, assicura, aggiorna, scheda, segreto, indirizziLocali, marchioNodo, identitaPerNodo, rimuoviOrfane };
