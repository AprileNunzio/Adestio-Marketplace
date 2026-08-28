'use strict';

const GRAZIA_RICONCILIAZIONE_MS = 15000;
const PORTA_PREDEFINITA = 7345;

function estraiIp(valore) {
    const trovato = String(valore || '').match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/);
    return trovato ? trovato[0] : '';
}

function estraiPorta(valore) {
    const testo = String(valore || '');
    const taglio = testo.lastIndexOf(':');
    if (taglio <= 0) return 0;
    const porta = Number(testo.slice(taglio + 1));
    return Number.isFinite(porta) && porta > 0 && porta < 65536 ? porta : 0;
}

function recapitoNodo(voce) {
    if (!voce) return { ip: '', porta: 0 };
    return {
        ip: estraiIp(voce.ip) || estraiIp(voce.indirizzo) || estraiIp(voce.sessione_id),
        porta: Number(voce.porta) || estraiPorta(voce.indirizzo) || estraiPorta(voce.sessione_id)
    };
}

function recapitoRiga(riga) {
    if (!riga) return { ip: '', porta: 0 };
    return {
        ip: estraiIp(riga.indirizzo_consegna),
        porta: estraiPorta(riga.indirizzo_consegna) || PORTA_PREDEFINITA
    };
}

function corrisponde(riga, voce) {
    if (!riga || !voce) return false;
    if (riga.sessione_id && voce.sessione_id && riga.sessione_id === voce.sessione_id) return true;
    if (riga.impronta_postazione && voce.impronta && riga.impronta_postazione === voce.impronta) return true;
    const ipRiga = recapitoRiga(riga).ip;
    const ipNodo = recapitoNodo(voce).ip;
    return Boolean(ipRiga) && ipRiga === ipNodo;
}

function osservabile(voce) {
    return Boolean(voce) && voce.tipo_connessione === 'diretto' && Boolean(recapitoNodo(voce).ip);
}

function oltreLaGrazia(riga, adesso, graziaMs) {
    const apertaIl = Number(riga && riga.aperta_il) || 0;
    if (!apertaIl) return true;
    return adesso - apertaIl > graziaMs;
}

function smentitaDalNodo(riga, voce) {
    if (!osservabile(voce)) return false;
    if (!voce.in_seduta) return true;
    const remota = String(voce.trasmissione_id || '');
    return Boolean(remota) && remota !== String(riga.id);
}

function nodoDi(riga, destinazioni) {
    return (destinazioni || []).find(voce => corrisponde(riga, voce)) || null;
}

function righeDelNodo(aperte, voce) {
    return (aperte || []).filter(riga => corrisponde(riga, voce));
}

function criterioDaPayload(payload = {}, riga = null) {
    return {
        sessione_id: payload.sessione_id || (riga && riga.sessione_id) || '',
        impronta: payload.impronta || (riga && riga.impronta_postazione) || '',
        indirizzo: payload.indirizzo || payload.ip || (riga && riga.indirizzo_consegna) || ''
    };
}

function comeNodo(criterio = {}) {
    const recapito = recapitoNodo({
        ip: criterio.ip || '',
        indirizzo: criterio.indirizzo || '',
        sessione_id: criterio.sessione_id || ''
    });
    return {
        sessione_id: criterio.sessione_id || '',
        impronta: criterio.impronta || '',
        ip: recapito.ip,
        porta: recapito.porta,
        indirizzo: recapito.ip ? `${recapito.ip}:${recapito.porta || PORTA_PREDEFINITA}` : '',
        tipo_connessione: 'diretto'
    };
}

function risolviNodo(destinazioni, criterio) {
    const sonda = {
        sessione_id: criterio.sessione_id || '',
        impronta_postazione: criterio.impronta || '',
        indirizzo_consegna: criterio.indirizzo || criterio.ip || ''
    };
    return (destinazioni || []).find(voce => corrisponde(sonda, voce)) || null;
}

function fantasmi(aperte, destinazioni, adesso = Date.now(), graziaMs = GRAZIA_RICONCILIAZIONE_MS) {
    const nodi = (destinazioni || []).filter(osservabile);
    return (aperte || [])
        .filter(riga => oltreLaGrazia(riga, adesso, graziaMs))
        .filter(riga => smentitaDalNodo(riga, nodoDi(riga, nodi)))
        .map(riga => riga.id);
}

function recapitiDiChiusura(nodo, criterio) {
    const mappa = new Map();
    [nodo, comeNodo(criterio)].forEach(voce => {
        const recapito = recapitoNodo(voce);
        if (!recapito.ip) return;
        const porta = recapito.porta || PORTA_PREDEFINITA;
        mappa.set(`${recapito.ip}:${porta}`, { ip: recapito.ip, porta });
    });
    return [...mappa.values()];
}

module.exports = {
    GRAZIA_RICONCILIAZIONE_MS,
    PORTA_PREDEFINITA,
    estraiIp,
    recapitoNodo,
    recapitoRiga,
    corrisponde,
    osservabile,
    smentitaDalNodo,
    nodoDi,
    righeDelNodo,
    criterioDaPayload,
    comeNodo,
    risolviNodo,
    fantasmi,
    recapitiDiChiusura
};
