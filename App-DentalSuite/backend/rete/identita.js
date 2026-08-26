'use strict';

const os = require('os');
const { postazione } = require('../repositories/rete');
const { tableExists } = require('../kernel/database');
const cifratura = require('./cifratura');
const protocollo = require('./protocollo');

function disponibile() {
    return tableExists('rete_postazione');
}

function riga() {
    if (!disponibile()) return null;
    const righe = postazione.findAll({ includeArchived: true });
    return righe.length > 0 ? righe[0] : null;
}

function nomePredefinito() {
    try {
        return os.hostname() || 'Postazione';
    } catch (e) {
        return 'Postazione';
    }
}

async function assicura() {
    const esistente = riga();
    if (esistente) return esistente;
    const identita = cifratura.generaIdentita();
    await postazione.insert({
        nome: nomePredefinito(),
        ruolo: protocollo.RUOLO_ARCHIVIO,
        porta: protocollo.PORTA_SERVIZIO,
        chiave_pubblica: identita.pubblica,
        chiave_privata: identita.privata,
        impronta: identita.impronta,
        attiva: 1,
        indirizzo_archivio: ''
    });
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
        versione_protocollo: protocollo.VERSIONE
    };
}

function segreto() {
    const voce = riga();
    return voce ? voce.chiave_privata : '';
}

module.exports = { disponibile, riga, assicura, aggiorna, scheda, segreto, indirizziLocali };
