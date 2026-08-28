'use strict';

const consegna = require('./consegna');
const protocollo = require('./protocollo');
const scopertaMesh = require('./scoperta_mesh');
const identita = require('./identita');

const ROTTA = '/poltrone-studio';

function recapitiArchivio(locale) {
    const recapiti = [];
    const memorizzato = consegna.recapitoDa(locale && locale.indirizzo_archivio);
    if (memorizzato && memorizzato.ip) recapiti.push(memorizzato);
    return recapiti;
}

async function candidatiDaMesh() {
    const stazioni = await scopertaMesh.scansionaStazioni(true);
    return (stazioni || [])
        .filter(voce => voce && voce.ip && voce.ruolo === protocollo.RUOLO_ARCHIVIO)
        .map(voce => ({ ip: voce.ip, porta: Number(voce.porta) || protocollo.PORTA_SERVIZIO }));
}

function unifica(recapiti) {
    const mappa = new Map();
    for (const voce of recapiti) {
        if (!voce || !voce.ip) continue;
        const porta = Number(voce.porta) || protocollo.PORTA_SERVIZIO;
        mappa.set(`${voce.ip}:${porta}`, { ip: voce.ip, porta });
    }
    return [...mappa.values()];
}

async function richiedi() {
    const locale = identita.scheda();
    const recapiti = unifica([...recapitiArchivio(locale), ...(await candidatiDaMesh())]);

    if (recapiti.length === 0) {
        return { raggiunto: false, poltrone: [], sedi_configurate: 0, motivo: 'Nessuna segreteria raggiungibile in rete' };
    }

    let ultimoMotivo = 'La segreteria non ha risposto';
    for (const recapito of recapiti) {
        const esito = await consegna.interroga(recapito.ip, recapito.porta, ROTTA, {});
        if (esito.raggiunto && esito.dati && Array.isArray(esito.dati.poltrone)) {
            return {
                raggiunto: true,
                poltrone: esito.dati.poltrone,
                sedi_configurate: Number(esito.dati.sedi_configurate) || 0,
                origine: `${recapito.ip}:${recapito.porta}`
            };
        }
        ultimoMotivo = `La segreteria ${recapito.ip} non ha risposto`;
    }

    return { raggiunto: false, poltrone: [], sedi_configurate: 0, motivo: ultimoMotivo };
}

module.exports = { richiedi, ROTTA };
